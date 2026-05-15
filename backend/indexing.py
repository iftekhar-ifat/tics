import os
import json
import time
import shutil
import threading
from pathlib import Path
from threading import Event as ThreadEvent

# Module-level state
_indexing_thread: threading.Thread | None = None
_indexing_cancel_event: ThreadEvent | None = None
_indexing_state: dict = {
    "state": "idle",
    "indexed": 0,
    "total": 0,
    "root_path": "",
}

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
    ".tiff", ".tif", ".svg", ".ico", ".heic", ".heif", ".avif",
}


def _count_images(root_path: str) -> int:
    """Count image files recursively in a directory."""
    count = 0
    try:
        for entry in os.scandir(root_path):
            if entry.is_dir(follow_symlinks=False):
                count += _count_images(entry.path)
            elif entry.is_file():
                ext = Path(entry.name).suffix.lower()
                if ext in IMAGE_EXTENSIONS:
                    count += 1
    except PermissionError:
        pass
    return count


def _create_tics_folder(root_path: str, total_images: int) -> Path:
    """Create .tics directory with placeholder files inside root_path."""
    tics_dir = Path(root_path) / ".tics"
    tics_dir.mkdir(parents=True, exist_ok=True)

    config = {
        "totalImages": total_images,
        "indexedAt": None,
        "indexed": 0,
    }
    with open(tics_dir / "config.json", "w") as f:
        json.dump(config, f, indent=2)

    for name in ["index.faiss", "index.pkl"]:
        placeholder = tics_dir / name
        if not placeholder.exists():
            placeholder.write_text("")

    meta_db = tics_dir / "meta.db"
    if not meta_db.exists():
        meta_db.write_text("")

    return tics_dir


def _simulate_indexing(push_event, root_path: str, total_images: int):
    """Simulate FAISS indexing with real progress tracking."""
    global _indexing_state

    tics_dir = _create_tics_folder(root_path, total_images)
    _indexing_state = {
        "state": "running",
        "indexed": 0,
        "total": total_images,
        "root_path": root_path,
    }

    push_event({
        "type": "indexing_progress",
        "indexed": 0,
        "total": total_images,
        "imgsPerSec": 0,
    })

    sim_speed = 50  # simulated images per second
    last_push = time.time()

    for i in range(1, total_images + 1):
        if _indexing_cancel_event and _indexing_cancel_event.is_set():
            _indexing_state["state"] = "idle"
            push_event({"type": "indexing_error", "error": "Cancelled"})
            return

        _indexing_state["indexed"] = i

        now = time.time()
        if now - last_push >= 0.2 or i == total_images:
            push_event({
                "type": "indexing_progress",
                "indexed": i,
                "total": total_images,
                "imgsPerSec": sim_speed,
            })
            last_push = now

        time.sleep(1.0 / sim_speed)

    config_path = tics_dir / "config.json"
    if config_path.exists():
        try:
            with open(config_path) as f:
                config = json.load(f)
            config["indexedAt"] = time.time()
            config["indexed"] = total_images
            with open(config_path, "w") as f:
                json.dump(config, f, indent=2)
        except Exception:
            pass

    _indexing_state["state"] = "complete"
    push_event({
        "type": "indexing_complete",
        "indexed": total_images,
        "total": total_images,
    })


def start_indexing(push_event, root_path: str, total_images: int = 0) -> dict:
    """Start indexing in a background thread.

    Returns dict with status and totalImages count.
    """
    global _indexing_thread, _indexing_cancel_event

    if not root_path or not Path(root_path).is_dir():
        return {"status": "error", "error": "Invalid root path"}

    # Cancel any existing indexing
    cancel_indexing()

    # If no totalImages passed, scan the folder
    if total_images <= 0:
        push_event({
            "type": "indexing_progress",
            "indexed": 0,
            "total": 0,
            "imgsPerSec": 0,
            "phase": "scanning",
        })
        total_images = _count_images(root_path)

    _indexing_cancel_event = ThreadEvent()
    _indexing_state["state"] = "starting"

    def run():
        _simulate_indexing(push_event, root_path, total_images)

    _indexing_thread = threading.Thread(target=run, daemon=True)
    _indexing_thread.start()

    return {"status": "started", "totalImages": total_images}


def get_indexing_status() -> dict:
    """Return current indexing state."""
    return {
        "state": _indexing_state["state"],
        "indexed": _indexing_state["indexed"],
        "total": _indexing_state["total"],
    }


def cancel_indexing():
    """Cancel in-progress indexing."""
    global _indexing_thread, _indexing_cancel_event, _indexing_state

    if _indexing_cancel_event:
        _indexing_cancel_event.set()

    if _indexing_thread and _indexing_thread.is_alive():
        _indexing_thread.join(timeout=3)

    _indexing_thread = None
    _indexing_cancel_event = None

    if _indexing_state["state"] == "running":
        _indexing_state["state"] = "idle"


def clear_index(root_path: str):
    """Remove .tics directory from root_path."""
    global _indexing_state

    tics_dir = Path(root_path) / ".tics"
    if tics_dir.exists():
        shutil.rmtree(tics_dir)
    _indexing_state["state"] = "idle"
    _indexing_state["indexed"] = 0
    _indexing_state["total"] = 0
