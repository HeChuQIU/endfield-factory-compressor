"""Lightweight SignalR JSON Hub Protocol implementation over WebSocket.

Implements the subset of SignalR Hub Protocol v2 (JSON) needed for
bidirectional RPC between the React frontend and the Python solver backend.

Protocol reference:
  https://learn.microsoft.com/en-us/aspnet/core/signalr/hubprotocol

Message types:
  1 = Invocation        (client→server or server→client)
  2 = StreamItem        (server→client, for progress updates)
  3 = Completion        (server→client, final result or error)
  6 = Ping
  7 = Close
"""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from collections.abc import AsyncIterator, Callable, Coroutine
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

RECORD_SEPARATOR = "\x1e"


@dataclass
class HubCallerContext:
    """Context passed to hub method handlers."""

    connection_id: str
    websocket: WebSocket


@dataclass
class SignalRHub:
    """A minimal SignalR JSON Hub Protocol server."""

    _methods: dict[str, Callable[..., Coroutine[Any, Any, Any]]] = field(
        default_factory=dict
    )
    _stream_methods: dict[
        str, Callable[..., Coroutine[Any, Any, AsyncIterator[Any]]]
    ] = field(default_factory=dict)

    _connection_counter: int = field(default=0)

    def on(self, method_name: str, handler: Callable[..., Coroutine[Any, Any, Any]]):
        """Register a hub method (request-response)."""
        self._methods[method_name.lower()] = handler

    def on_stream(
        self,
        method_name: str,
        handler: Callable[..., Coroutine[Any, Any, AsyncIterator[Any]]],
    ):
        """Register a streaming hub method (server→client stream)."""
        self._stream_methods[method_name.lower()] = handler

    async def handle_connection(self, websocket: WebSocket):
        """Handle a single WebSocket connection's full lifecycle."""
        self._connection_counter += 1
        ctx = HubCallerContext(
            connection_id=f"conn-{self._connection_counter}",
            websocket=websocket,
        )

        # --- Handshake ---
        raw = await websocket.receive_text()
        handshake_msg = raw.rstrip(RECORD_SEPARATOR)
        try:
            hs = json.loads(handshake_msg)
        except json.JSONDecodeError:
            await self._send(websocket, {"error": "Invalid handshake JSON"})
            return

        if hs.get("protocol") != "json" or hs.get("version") != 1:
            await self._send(websocket, {"error": "Unsupported protocol"})
            return

        await self._send(websocket, {})
        logger.info("SignalR handshake completed: %s", ctx.connection_id)

        # --- Message loop ---
        try:
            while True:
                raw = await websocket.receive_text()
                for part in raw.split(RECORD_SEPARATOR):
                    part = part.strip()
                    if not part:
                        continue
                    msg = json.loads(part)
                    await self._dispatch(ctx, msg)
        except Exception:
            logger.debug("Connection closed: %s", ctx.connection_id)

    async def _dispatch(self, ctx: HubCallerContext, msg: dict[str, Any]):
        msg_type = msg.get("type")

        if msg_type == 6:  # Ping
            await self._send(ctx.websocket, {"type": 6})
            return

        if msg_type == 1:  # Invocation
            target = (msg.get("target") or "").lower()
            args = msg.get("arguments", [])
            invocation_id = msg.get("invocationId")
            await self._handle_invocation(ctx, target, args, invocation_id)
            return

        if msg_type == 4:  # StreamInvocation
            target = (msg.get("target") or "").lower()
            args = msg.get("arguments", [])
            invocation_id = msg.get("invocationId")
            if invocation_id:
                await self._handle_stream_invocation(
                    ctx, target, args, invocation_id
                )
            return

        if msg_type == 5:  # CancelInvocation
            # TODO: implement cancellation via CancellationToken
            return

        logger.warning("Unknown message type: %s", msg_type)

    async def _handle_invocation(
        self,
        ctx: HubCallerContext,
        target: str,
        args: list[Any],
        invocation_id: str | None,
    ):
        handler = self._methods.get(target)
        if not handler:
            if invocation_id:
                await self._send_completion(
                    ctx.websocket,
                    invocation_id,
                    error=f"Unknown method: {target}",
                )
            return

        try:
            result = await handler(ctx, *args)
            if invocation_id:
                await self._send_completion(
                    ctx.websocket, invocation_id, result=result
                )
        except Exception as exc:
            logger.error("Error in %s: %s", target, traceback.format_exc())
            if invocation_id:
                await self._send_completion(
                    ctx.websocket, invocation_id, error=str(exc)
                )

    async def _handle_stream_invocation(
        self,
        ctx: HubCallerContext,
        target: str,
        args: list[Any],
        invocation_id: str,
    ):
        handler = self._stream_methods.get(target)
        if not handler:
            await self._send_completion(
                ctx.websocket, invocation_id, error=f"Unknown stream method: {target}"
            )
            return

        try:
            async for item in await handler(ctx, *args):
                await self._send_stream_item(ctx.websocket, invocation_id, item)
            await self._send_completion(ctx.websocket, invocation_id)
        except Exception as exc:
            logger.error("Stream error in %s: %s", target, traceback.format_exc())
            await self._send_completion(
                ctx.websocket, invocation_id, error=str(exc)
            )

    # --- Wire helpers ---

    async def _send(self, ws: WebSocket, payload: dict[str, Any]):
        await ws.send_text(json.dumps(payload) + RECORD_SEPARATOR)

    async def _send_stream_item(
        self, ws: WebSocket, invocation_id: str, item: Any
    ):
        await self._send(ws, {"type": 2, "invocationId": invocation_id, "item": item})

    async def _send_completion(
        self,
        ws: WebSocket,
        invocation_id: str,
        *,
        result: Any = None,
        error: str | None = None,
    ):
        msg: dict[str, Any] = {"type": 3, "invocationId": invocation_id}
        if error is not None:
            msg["error"] = error
        elif result is not None:
            msg["result"] = result
        await self._send(ws, msg)

    @staticmethod
    async def send_to_client(ws: WebSocket, method: str, *args: Any):
        """Send a server→client invocation (fire-and-forget)."""
        msg = {"type": 1, "target": method, "arguments": list(args)}
        await ws.send_text(json.dumps(msg) + RECORD_SEPARATOR)
