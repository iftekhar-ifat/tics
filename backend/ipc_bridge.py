import sys
import json
import os
import asyncio
from pathlib import Path
import platform
import subprocess
import threading

from model_manager import (
    is_model_ready,
    download_model,
    cancel_download,
    _delete_model_files,
)
from hardware_info import get_system_info
from file_system import scan_folder


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

    async def handle_model_folder_info(_p):
        model_dir = MODEL_DIR
        size = 0
        if model_dir.exists() and model_dir.is_dir():
            for entry in model_dir.rglob("*"):
                if entry.is_file():
                    try:
                        size += entry.stat().st_size
                    except OSError:
                        pass
        return {"path": str(model_dir), "size": size}

    async def handle_model_folder_move(_p):
        new_dir = Path(_p.get("newDir", ""))
        if not new_dir or not new_dir.is_dir():
            raise ValueError("Invalid target directory")
        new_model_dir = new_dir / "models" / "clip-vit-b32"
        old_model_dir = MODEL_DIR
        old_model_dir_str = str(old_model_dir)
        # Copy files recursively
        import shutil
        if old_model_dir.exists():
            new_model_dir.mkdir(parents=True, exist_ok=True)
            for item in old_model_dir.rglob("*"):
                rel = item.relative_to(old_model_dir)
                target = new_model_dir / rel
                if item.is_file():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, target)
                elif item.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
            # Remove old model directory
            shutil.rmtree(old_model_dir)
        # Calculate size of moved folder
        size = 0
        if new_model_dir.exists() and new_model_dir.is_dir():
            for entry in new_model_dir.rglob("*"):
                if entry.is_file():
                    try:
                        size += entry.stat().st_size
                    except OSError:
                        pass
        # Update MODEL_DIR env so future runs use new location
        os.environ["TICS_DATA_DIR"] = str(new_dir)
        return {"path": str(new_model_dir), "size": size}

    handlers = {
        "folder.scan": lambda p: scan_folder(p.get("path", "")),
        "system.getOSInfo": lambda p: get_system_info(),
        "model.getStatus": handle_model_get_status,
        "model.download": handle_model_download,
        "model.cancelDownload": handle_model_cancel,
        "model.getFolderInfo": handle_model_folder_info,
        "model.moveFolder": handle_model_folder_move,
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
