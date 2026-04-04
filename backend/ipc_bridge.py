import sys
import json
import os
import asyncio
from pathlib import Path
import platform
import subprocess

# Paths
TICS_DATA_DIR = os.environ.get("TICS_DATA_DIR", str(Path.home() / ".tics"))
MODEL_DIR = Path(TICS_DATA_DIR) / "models" / "clip-vit-b32"
SENTINEL_FILE = MODEL_DIR / "download_complete"


def is_model_ready() -> bool:
    return SENTINEL_FILE.exists()


async def scan_folder(dir_path: str):
    """Scan a folder for images."""
    IMAGE_EXTENSIONS = {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tiff",
        ".tif",
        ".svg",
        ".ico",
        ".heic",
        ".heif",
        ".avif",
    }

    image_count = 0
    total_size = 0

    try:
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in IMAGE_EXTENSIONS:
                    image_count += 1
                    try:
                        total_size += os.path.getsize(os.path.join(root, file))
                    except:
                        pass
    except:
        pass

    return {"imageCount": image_count, "totalSize": total_size}


def get_system_info():
    """Get system OS info."""
    import torch

    device = "cpu"
    device_name = "CPU"

    if torch.cuda.is_available():
        device = "cuda"
        device_name = f"CUDA: {torch.cuda.get_device_name(0)}"
    elif platform.system() == "Darwin":
        try:
            if torch.backends.mps.is_available():
                device = "mps"
                device_name = "Apple MPS"
        except:
            pass

    memory = "Unknown"
    try:
        if device == "cuda":
            mem = torch.cuda.get_device_properties(0)
            memory = f"{round(mem.total_memory / (1024**3), 1)} GB"
        else:
            import psutil

            memory = f"{round(psutil.virtual_memory().available / (1024**3), 1)} GB"
    except:
        pass

    return {
        "os": platform.system(),
        "device": device,
        "deviceName": device_name,
        "memory": memory,
    }


async def handle_request(request):
    """Process a single JSON-RPC request."""
    method = request.get("method")
    params = request.get("params", {})
    request_id = request.get("id")

    handlers = {
        "folder.scan": lambda p: scan_folder(p.get("path", "")),
        "system.getOSInfo": lambda p: get_system_info(),
        "model.getStatus": lambda p: {
            "ready": is_model_ready(),
            "device": "cuda" if get_system_info()["device"] == "cuda" else "cpu",
        },
        "model.download": lambda p: {"status": "started"},  # TODO: implement
        "model.cancelDownload": lambda p: {"status": "cancelled"},  # TODO: implement
    }

    try:
        handler = handlers.get(method)
        if handler:
            result = await handler(params)
            return {"id": request_id, "result": result}
        else:
            return {
                "id": request_id,
                "error": {"code": -32601, "message": f"Unknown method: {method}"},
            }
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"id": request_id, "error": {"code": -32603, "message": str(e)}}


async def main_loop():
    """Main IPC loop - read JSON-RPC from stdin, write to stdout."""
    print("[IPC] Bridge started", flush=True)

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line.strip())
            response = await handle_request(request)
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except json.JSONDecodeError:
            continue
        except Exception as e:
            error_response = {"id": None, "error": {"code": -32603, "message": str(e)}}
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    asyncio.run(main_loop())
