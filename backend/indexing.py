import json
import sys
import time
import shutil
import pickle
import threading
import platform
from pathlib import Path
from threading import Event as ThreadEvent

import numpy as np
import faiss
from PIL import Image

from model_manager import get_clip_model

# Module-level state
_indexing_thread: threading.Thread | None = None
_indexing_cancel_event: ThreadEvent | None = None
_root_path: str = ""

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.avif', '.svg', '.ico', '.heic', '.heif'}
CLIP_DIM = 512


def _read_config(tics_dir: Path) -> dict:
    try:
        with open(tics_dir / "config.json") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"indexed": 0}


def _write_config(tics_dir: Path, indexed: int, root_path: str = "", total_images: int = 0):
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


def _load_index(tics_dir: Path):
    """Load existing FAISS index and paths list, or return None."""
    index_path = tics_dir / "index.faiss"
    pkl_path = tics_dir / "index.pkl"
    if index_path.exists() and pkl_path.exists() and index_path.stat().st_size > 0:
        index = faiss.read_index(str(index_path))
        with open(pkl_path, "rb") as f:
            paths = pickle.load(f)
        return index, paths
    return None


def _save_index(tics_dir: Path, index: faiss.Index, paths: list[str]):
    tmp_index = tics_dir / "index.faiss.tmp"
    tmp_pkl = tics_dir / "index.pkl.tmp"
    faiss.write_index(index, str(tmp_index))
    with open(tmp_pkl, "wb") as f:
        pickle.dump(paths, f)
    tmp_index.replace(tics_dir / "index.faiss")
    tmp_pkl.replace(tics_dir / "index.pkl")


def _get_device():
    import torch
    if torch.cuda.is_available():
        return "cuda"
    if platform.system() == "Darwin" and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _embed_image(image_path: Path, model, processor, device: str):
    """Return L2-normalized CLIP embedding vector of shape (1, 512) or None."""
    import torch
    try:
        image = Image.open(image_path).convert("RGB")
    except Exception:
        return None

    try:
        inputs = processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            emb = model.get_image_features(**inputs)
        emb = emb.cpu().numpy().astype(np.float32)
        faiss.normalize_L2(emb)
        return emb
    except Exception:
        return None


def _run_indexing(push_event, root_path: str, all_files: list[Path], indexed_so_far: int):
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
                push_event({
                    "type": "indexing_progress",
                    "indexed": i,
                    "imgsPerSec": round(speed, 1),
                })
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
    print(f"[indexing] Scanned {len(all_files)} images from {root_path}", flush=True, file=sys.stderr)

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


def search(
    query_text: str = "",
    query_image_path: str = "",
    root_path: str = "",
    top_k: int = 50,
) -> list[dict]:
    """Search indexed images by text and/or image. Returns [{path, name, score}]."""
    if not root_path:
        return []

    tics_dir = Path(root_path) / ".tics"
    loaded = _load_index(tics_dir)
    if loaded is None:
        return []
    index, paths = loaded
    if index.ntotal == 0:
        return []

    model, processor = get_clip_model()
    device = _get_device()

    import torch

    if query_text and query_image_path:
        text_inputs = processor(text=[query_text], return_tensors="pt", padding=True).to(device)
        image = Image.open(query_image_path).convert("RGB")
        image_inputs = processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            text_emb = model.get_text_features(**text_inputs)
            image_emb = model.get_image_features(**image_inputs)
        emb = (text_emb + image_emb) / 2
    elif query_text:
        text_inputs = processor(text=[query_text], return_tensors="pt", padding=True).to(device)
        with torch.no_grad():
            emb = model.get_text_features(**text_inputs)
    elif query_image_path:
        image = Image.open(query_image_path).convert("RGB")
        image_inputs = processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            emb = model.get_image_features(**image_inputs)
    else:
        return []

    emb = emb.cpu().numpy().astype(np.float32)
    faiss.normalize_L2(emb)

    top_k = min(top_k, index.ntotal)
    scores, indices = index.search(emb, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(paths):
            continue
        p = Path(paths[idx])
        results.append({
            "path": str(p),
            "name": p.name,
            "score": round(float(score), 4),
        })

    return results
