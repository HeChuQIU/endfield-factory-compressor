"""SignalR Hub methods for the solver.

Registers RPC methods on the SignalR hub:
  - solve (StreamInvocation): accepts graph + config, streams progress + final result
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from solver.models import (
    LayoutSolution,
    ProductionGraph,
    SolverAttempt,
    SolverConfig,
)
from solver.signalr_hub import HubCallerContext, SignalRHub
from solver.z3_solver import solve_iterative

logger = logging.getLogger(__name__)


class SolverHub:
    """Registers solver methods on the SignalR hub."""

    @staticmethod
    def register(hub: SignalRHub):
        hub.on_stream("solve", SolverHub._solve_stream)

    @staticmethod
    async def _solve_stream(
        ctx: HubCallerContext, graph_data: dict[str, Any], config_data: dict[str, Any]
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream solver progress and final result to the client."""
        graph = ProductionGraph(**graph_data)
        config = SolverConfig(**config_data)

        logger.info(
            "Starting solve for %s (%d nodes)",
            graph.target_product,
            len(graph.nodes),
        )

        async for item in solve_iterative(graph, config):
            if isinstance(item, SolverAttempt):
                yield {"type": "attempt", "data": item.model_dump()}
            elif isinstance(item, LayoutSolution):
                yield {"type": "solution", "data": item.model_dump()}

        logger.info("Solve completed for %s", graph.target_product)
