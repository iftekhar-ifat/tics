import sys
import json
import os
import asyncio
from pathlib import Path
import platform
import subprocess
import threading

try:
    import torch
    import psutil
except ImportError:
    torch = None
    psutil = None

from model_manager import (
    is_model_ready,
    download_model,
    cancel_download,
    _delete_model_files,
)


def push_event(event_type: str, data: dict = None):
    """Write a JSON push event line to stdout."""
    if data is None:
        data = {}
    event = {"type": event_type, "data": data}
    sys.stdout.write(json.dumps(event) + "\n")
    sys.stdout.flush()


async def emit_push(event: dict):
    """Async wrapper for push events (for model_manager callback)."""
    try:
        event_type = event.get("type", "unknown")
        event_data = {k: v for k, v in event.items() if k != "type"}
        push_event(event_type, event_data)
    except Exception as e:
        print(f"[emit_push] Error: {e}", file=sys.stderr, flush=True)


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
                    except Exception as e:
                        print(
                            f"[scan_folder] Could not get size of {file}: {e}",
                            file=sys.stderr,
                        )
    except Exception as e:
        print(f"[scan_folder] {e}", file=sys.stderr)

    return {"imageCount": image_count, "totalSize": total_size}


def _get_system_info_internal():
    """Get system OS info (blocking, runs in executor)."""
    if torch is None:
        return {
            "os": platform.system(),
            "device": "cpu",
            "deviceName": "CPU",
            "memory": "Unknown",
        }

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
        except Exception:
            pass

    memory = "Unknown"
    try:
        if device == "cuda":
            mem = torch.cuda.get_device_properties(0)
            memory = f"{round(mem.total_memory / (1024**3), 1)} GB"
        elif psutil is not None:
            vm = psutil.virtual_memory()
            memory = f"{round(vm.total / (1024**3), 1)} GB"
    except Exception:
        pass

    return {
        "os": platform.system(),
        "device": device,
        "deviceName": device_name,
        "memory": memory,
    }


_system_info_cache = None


async def get_system_info():
    """Get system OS info (cached after first call)."""
    global _system_info_cache
    if _system_info_cache is not None:
        return _system_info_cache
    loop = asyncio.get_event_loop()
    _system_info_cache = await loop.run_in_executor(None, _get_system_info_internal)
    return _system_info_cache


# Track active download thread
_download_thread = None


async def handle_request(request):
    """Process a single JSON-RPC request."""
    method = request.get("method")
    params = request.get("params", {})
    request_id = request.get("id")

    async def handle_model_get_status(_p):
        sys_info = await get_system_info()
        return {"ready": is_model_ready(), "device": sys_info["device"]}

    async def handle_model_download(_p):
        global _download_thread

        if is_model_ready():
            return {"status": "already_ready"}

        def run_download():
            from model_manager import download_model as download
            import asyncio

            try:
                asyncio.run(download(emit_push))
            except Exception as e:
                print(f"[download thread] Error: {e}", file=sys.stderr, flush=True)
                push_event("model_download_error", {"error": str(e)})

        _download_thread = threading.Thread(target=run_download, daemon=True)
        _download_thread.start()

        return {"status": "started"}

    def handle_model_cancel(_p):
        global _download_thread
        cancel_download()
        if _download_thread and _download_thread.is_alive():
            _download_thread.join(timeout=2)
        _delete_model_files()
        _download_thread = None
        return {"status": "cancelled"}

    handlers = {
        "folder.scan": lambda p: scan_folder(p.get("path", "")),
        "system.getOSInfo": lambda p: get_system_info(),
        "model.getStatus": handle_model_get_status,
        "model.download": handle_model_download,
        "model.cancelDownload": handle_model_cancel,
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

        traceback.print_exc(file=sys.stderr)
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
            request_id = None
            try:
                if "request" in dir():
                    request_id = request.get("id")
            except Exception:
                pass
            error_response = {
                "id": request_id,
                "error": {"code": -32603, "message": str(e)},
            }
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    asyncio.run(main_loop())
