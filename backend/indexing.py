import json
import time
import shutil
import threading
from pathlib import Path
from threading import Event as ThreadEvent

# Module-level state
_indexing_thread: threading.Thread | None = None
_indexing_cancel_event: ThreadEvent | None = None
_root_path: str = ""


def _read_config(tics_dir: Path) -> dict:
    try:
        with open(tics_dir / "config.json") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"indexed": 0}


def _write_config(tics_dir: Path, indexed: int, root_path: str = ""):
    config = {"indexed": indexed}
    if root_path:
        config["rootPath"] = root_path
    with open(tics_dir / "config.json", "w") as f:
        json.dump(config, f, indent=2)


def _ensure_tics_folder(root_path: str) -> Path:
    tics_dir = Path(root_path) / ".tics"
    tics_dir.mkdir(parents=True, exist_ok=True)

    for name in ["index.faiss", "index.pkl"]:
        placeholder = tics_dir / name
        if not placeholder.exists():
            placeholder.write_text("")

    meta_db = tics_dir / "meta.db"
    if not meta_db.exists():
        meta_db.write_text("")

    return tics_dir


def _process_single_image(image_index: int, tics_dir: Path):
    """Process and index a single image.

    Currently a mock — replaces this with actual FAISS embedding + index add.
    """
    time.sleep(0.1)


def _simulate_indexing(push_event, root_path: str, total_images: int, offset: int = 0):
    tics_dir = _ensure_tics_folder(root_path)
    _write_config(tics_dir, offset, root_path)

    push_event(
        {
            "type": "indexing_progress",
            "indexed": offset,
            "imgsPerSec": 0,
        }
    )

    sim_speed = 50
    last_push = time.time()

    for i in range(offset + 1, total_images + 1):
        if _indexing_cancel_event and _indexing_cancel_event.is_set():
            push_event({"type": "indexing_error", "error": "Cancelled"})
            return

        _process_single_image(i, tics_dir)
        _write_config(tics_dir, i, root_path)

        now = time.time()
        if now - last_push >= 0.2 or i == total_images:
            push_event(
                {
                    "type": "indexing_progress",
                    "indexed": i,
                    "imgsPerSec": sim_speed,
                }
            )
            last_push = now

        time.sleep(1.0 / sim_speed)

    push_event(
        {
            "type": "indexing_complete",
            "indexed": total_images,
        }
    )


def start_indexing(
    push_event, root_path: str, total_images: int, indexed_so_far: int = 0
) -> dict:
    """Start indexing in a background thread.

    When indexed_so_far > 0, preserves existing .tics/ folder and
    simulates only the remaining images (incremental mode).
    Otherwise clears .tics/ first for a full re-index.
    """
    global _indexing_thread, _indexing_cancel_event, _root_path

    if not root_path or not Path(root_path).is_dir():
        return {"status": "error", "error": "Invalid root path"}

    cancel_indexing()
    _root_path = root_path

    if indexed_so_far == 0:
        clear_index(root_path)

    _indexing_cancel_event = ThreadEvent()

    def run():
        _simulate_indexing(push_event, root_path, total_images, indexed_so_far)

    _indexing_thread = threading.Thread(target=run, daemon=True)
    _indexing_thread.start()

    return {"status": "started"}


def get_indexing_status(root_path: str = "") -> dict:
    global _root_path
    rp = root_path or _root_path
    if not rp:
        return {"indexed": 0, "state": "idle"}
    try:
        cfg = _read_config(Path(rp) / ".tics")
        return {
            "indexed": cfg.get("indexed", 0),
            "state": "complete",
        }
    except Exception:
        return {"indexed": 0, "state": "idle"}


def cancel_indexing():
    global _indexing_thread, _indexing_cancel_event

    if _indexing_cancel_event:
        _indexing_cancel_event.set()

    if _indexing_thread and _indexing_thread.is_alive():
        _indexing_thread.join(timeout=3)

    _indexing_thread = None
    _indexing_cancel_event = None


def clear_index(root_path: str):
    global _indexing_thread, _indexing_cancel_event, _root_path

    cancel_indexing()
    _root_path = ""

    tics_dir = Path(root_path) / ".tics"
    if tics_dir.exists():
        shutil.rmtree(tics_dir)
