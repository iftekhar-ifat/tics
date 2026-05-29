import json
import sys
import time
import shutil
import threading
from pathlib import Path
from threading import Event as ThreadEvent

import numpy as np
import faiss
from PIL import Image

from common import CLIP_DIM, _load_index, _save_index, _get_device
from model_manager import get_clip_model

# Module-level state
_indexing_thread: threading.Thread | None = None
_indexing_cancel_event: ThreadEvent | None = None
_root_path: str = ""

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".tiff",
    ".tif",
    ".avif",
    ".svg",
    ".ico",
    ".heic",
    ".heif",
}


def _read_config(tics_dir: Path) -> dict:
    try:
        with open(tics_dir / "config.json") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"indexed": 0}


def _write_config(
    tics_dir: Path, indexed: int, root_path: str = "", total_images: int = 0
):
    config = {"indexed": indexed, "totalImages": total_images}
    if root_path:
        config["rootPath"] = root_path
    tics_dir.mkdir(parents=True, exist_ok=True)
    with open(tics_dir / "config.json", "w") as f:
        json.dump(config, f, indent=2)


def _ensure_tics_folder(root_path: str) -> Path:
    tics_dir = Path(root_path) / ".tics"
    tics_dir.mkdir(parents=True, exist_ok=True)
    return tics_dir


def _get_image_files(root_path: str) -> list[Path]:
    root = Path(root_path)
    files: set[Path] = set()
    for ext in IMAGE_EXTENSIONS:
        files.update(root.rglob(f"*{ext}"))
        files.update(root.rglob(f"*{ext.upper()}"))
    return sorted(files)


def _embed_image(image_path: Path, model, processor, device: str):
    """Return L2-normalized CLIP embedding vector of shape (1, 512) or None."""
    import torch

    try:
        image = Image.open(image_path).convert("RGB")
    except Exception as e:
        print(f"[embed] Cannot open {image_path}: {e}", file=sys.stderr, flush=True)
        return None

    try:
        inputs = processor(images=image, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(device)
        with torch.no_grad():
            vision_outputs = model.vision_model(pixel_values=pixel_values)
            emb = model.visual_projection(vision_outputs.pooler_output)
        emb = emb.detach().cpu().numpy().astype(np.float32)
        faiss.normalize_L2(emb)
        return emb
    except Exception as e:
        print(
            f"[embed] Embedding failed for {image_path}: {e}",
            file=sys.stderr,
            flush=True,
        )
        import traceback

        traceback.print_exc(file=sys.stderr)
        return None


def _run_indexing(
    push_event, root_path: str, all_files: list[Path], indexed_so_far: int
):
    """Index images from all_files, skipping the first indexed_so_far entries."""
    tics_dir = _ensure_tics_folder(root_path)
    total = len(all_files)

    # Load existing index or create new one
    existing = _load_index(tics_dir) if indexed_so_far > 0 else None
    if existing is not None:
        index, existing_paths = existing
    else:
        index = faiss.IndexFlatIP(CLIP_DIM)
        existing_paths = []

    indexed_count = len(existing_paths)
    remaining = all_files[indexed_count:]

    if not remaining:
        push_event({"type": "indexing_complete", "indexed": total})
        return

    model, processor = get_clip_model()
    device = _get_device()
    last_push = time.time()
    start_time = time.time()

    try:
        for i, file_path in enumerate(remaining, start=indexed_count + 1):
            if _indexing_cancel_event and _indexing_cancel_event.is_set():
                push_event({"type": "indexing_error", "error": "Cancelled"})
                return

            emb = _embed_image(file_path, model, processor, device)
            if emb is not None:
                index.add(emb)
            existing_paths.append(str(file_path))

            _write_config(tics_dir, i, root_path, total)

            now = time.time()
            elapsed = now - start_time
            speed = i / elapsed if elapsed > 0 else 0
            if now - last_push >= 0.2:
                _save_index(tics_dir, index, existing_paths)
                push_event(
                    {
                        "type": "indexing_progress",
                        "indexed": i,
                        "imgsPerSec": round(speed, 1),
                    }
                )
                last_push = now
    except Exception as e:
        import traceback

        traceback.print_exc(file=sys.stderr)
        push_event({"type": "indexing_error", "error": str(e)})
        return

    _save_index(tics_dir, index, existing_paths)
    push_event({"type": "indexing_complete", "indexed": total})


def start_indexing(
    push_event, root_path: str, total_images: int, indexed_so_far: int = 0
) -> dict:
    global _indexing_thread, _indexing_cancel_event, _root_path

    if not root_path or not Path(root_path).is_dir():
        return {"status": "error", "error": "Invalid root path"}

    cancel_indexing()
    _root_path = root_path

    if indexed_so_far == 0:
        clear_index(root_path)

    all_files = _get_image_files(root_path)
    print(
        f"[indexing] Scanned {len(all_files)} images from {root_path}",
        flush=True,
        file=sys.stderr,
    )

    _indexing_cancel_event = ThreadEvent()

    def run():
        _run_indexing(push_event, root_path, all_files, indexed_so_far)

    _indexing_thread = threading.Thread(target=run, daemon=True)
    _indexing_thread.start()

    return {"status": "started", "imageCount": len(all_files)}


def get_indexing_status(root_path: str = "") -> dict:
    global _root_path, _indexing_thread
    rp = root_path or _root_path
    if not rp:
        return {"indexed": 0, "state": "idle"}
    is_running = _indexing_thread is not None and _indexing_thread.is_alive()
    if is_running:
        return {"indexed": 0, "state": "running"}
    try:
        cfg = _read_config(Path(rp) / ".tics")
        indexed = cfg.get("indexed", 0)
        total = cfg.get("totalImages", 0)
        state = "complete" if total > 0 and indexed >= total else "idle"
        return {"indexed": indexed, "state": state}
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

