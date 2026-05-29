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
from indexing import start_indexing, get_indexing_status, cancel_indexing, clear_index, search as search_index


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

    async def handle_model_cancel(_p):
        global _download_thread
        cancel_download()
        if _download_thread and _download_thread.is_alive():
            _download_thread.join(timeout=2)
        _delete_model_files()
        _download_thread = None
        return {"status": "cancelled"}

    async def handle_model_set_data_dir(p):
        new_dir = p.get("path", "")
        if new_dir:
            os.environ["TICS_DATA_DIR"] = new_dir
            return {"ok": True}
        return {"ok": False, "error": "No path provided"}

    async def handle_indexing_start(p):
        root_path = p.get("path", "")
        total_images = p.get("totalImages", 0)
        indexed_so_far = p.get("indexed_so_far", 0)

        def _on_indexing_event(event: dict):
            event_type = event.get("type", "unknown")
            event_data = {k: v for k, v in event.items() if k != "type"}
            push_event(event_type, event_data)

        result = start_indexing(_on_indexing_event, root_path, total_images, indexed_so_far)
        return result

    async def handle_indexing_get_status(p):
        return get_indexing_status(p.get("path", ""))

    async def handle_indexing_cancel(_p):
        cancel_indexing()
        return {"status": "cancelled"}

    async def handle_index_clear(p):
        root_path = p.get("path", "")
        if root_path:
            clear_index(root_path)
            return {"status": "cleared"}
        return {"status": "error", "error": "No root path provided"}

    async def handle_search(p):
        text = p.get("text", "")
        image_path = p.get("imagePath", "")
        root_path = p.get("rootPath", "")
        top_k = p.get("topK", 50)
        results = search_index(text, image_path, root_path, top_k)
        return {"results": results}

    handlers = {
        "system.getOSInfo": lambda p: get_system_info(),
        "model.getStatus": handle_model_get_status,
        "model.download": handle_model_download,
        "model.cancelDownload": handle_model_cancel,
        "model.setDataDir": handle_model_set_data_dir,
        "indexing.start": handle_indexing_start,
        "indexing.getStatus": handle_indexing_get_status,
        "indexing.cancel": handle_indexing_cancel,
        "index.clear": handle_index_clear,
        "indexing.search": handle_search,
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
