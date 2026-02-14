"""FastAPI application with SignalR Hub for solver communication."""

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from solver.signalr_hub import SignalRHub
from solver.solver_hub import SolverHub

app = FastAPI(title="Endfield Factory Compressor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

hub = SignalRHub()
SolverHub.register(hub)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/solver")
async def solver_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        await hub.handle_connection(websocket)
    except WebSocketDisconnect:
        pass


def main():
    uvicorn.run("solver.app:app", host="0.0.0.0", port=8080, reload=True)


if __name__ == "__main__":
    main()
