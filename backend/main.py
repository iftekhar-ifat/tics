from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import random
import torch

from model_manager import is_model_ready, download_model, cancel_download

# Application state
connected_websockets: set[WebSocket] = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    print("[Backend] Starting FastAPI server...")

    # Start background task to broadcast messages
    asyncio.create_task(broadcast_status())

    yield

    print("[Backend] Shutting down FastAPI server...")
    # Close all WebSocket connections
    for ws in connected_websockets:
        await ws.close()
    connected_websockets.clear()


async def broadcast_status():
    """Background task to broadcast status updates to all connected WebSocket clients."""
    counter = 0
    while True:
        await asyncio.sleep(2)  # Send update every 2 seconds
        counter += 1

        status_message = {
            "type": "status",
            "data": {
                "counter": counter,
                "message": f"Backend running - update #{counter}",
                "timestamp": asyncio.get_event_loop().time(),
            },
        }

        # Broadcast to all connected websockets
        disconnected = set()
        for ws in connected_websockets:
            try:
                await ws.send_json(status_message)
            except Exception:
                disconnected.add(ws)

        # Clean up disconnected websockets
        for ws in disconnected:
            connected_websockets.discard(ws)


async def broadcast_ws_message(message: dict):
    """Send a message to all connected WebSocket clients."""
    disconnected = set()
    for ws in connected_websockets:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        connected_websockets.discard(ws)


app = FastAPI(title="TICS Backend API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint returning backend status."""
    return {
        "status": "ok",
        "message": "TICS Backend API is running",
        "endpoints": {
            "http": {
                "GET /": "Root endpoint",
                "GET /health": "Health check",
                "GET /api/status": "Get current status",
            },
            "websocket": {"ws": "WebSocket endpoint for real-time updates"},
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "connected_websockets": len(connected_websockets)}


@app.get("/api/status")
async def get_status():
    """Get current status from backend."""
    return {
        "status": "running",
        "uptime": "N/A",
        "connected_clients": len(connected_websockets),
        "random_value": random.randint(1, 100),
    }


@app.get("/model/status")
async def model_status():
    """Check if the CLIP model is downloaded and ready."""
    ready = is_model_ready()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return {"ready": ready, "device": device}


@app.post("/model/download")
async def trigger_model_download():
    """Trigger model download in the background."""
    if is_model_ready():
        return {"status": "already_ready"}

    asyncio.create_task(download_model(broadcast_ws_message))
    return {"status": "started"}


@app.post("/model/download/cancel")
async def cancel_model_download():
    """Cancel an in-progress model download."""
    cancel_download()
    return {"status": "cancelled"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication."""
    await websocket.accept()
    connected_websockets.add(websocket)

    try:
        # Send welcome message
        await websocket.send_json(
            {
                "type": "welcome",
                "data": {
                    "message": "Connected to TICS Backend",
                    "client_count": len(connected_websockets),
                },
            }
        )

        # Handle incoming messages
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type", "unknown")

                # Echo back with processing
                response = {
                    "type": "echo",
                    "original_type": message_type,
                    "data": {"received": message.get("data", {}), "processed": True},
                }
                await websocket.send_json(response)

            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "data": {"message": "Invalid JSON"}}
                )

    except WebSocketDisconnect:
        print("[Backend] Client disconnected")
    finally:
        connected_websockets.discard(websocket)


if __name__ == "__main__":
    import uvicorn
    import argparse

    parser = argparse.ArgumentParser(description="TICS Backend API")
    parser.add_argument(
        "--port", type=int, default=8765, help="Port to run the server on"
    )
    args = parser.parse_args()

    # Run the server on the specified port
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
