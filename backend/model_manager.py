import os
import asyncio
import shutil
import time
from pathlib import Path
from threading import Event as ThreadEvent, Lock

import requests
from huggingface_hub import hf_hub_download, hf_hub_url

REPO_ID = "openai/clip-vit-base-patch32"
MODEL_FILES = [
    "pytorch_model.bin",
    "config.json",
    "preprocessor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
    "merges.txt",
]
SENTINEL_FILE = "download_complete"
CHUNK_SIZE = 1024 * 1024

_cancel_event: ThreadEvent | None = None
_progress_lock = Lock()
_downloaded_bytes = 0
_total_bytes = 0
_completed_bytes = 0
_start_time = 0.0


def cancel_download():
    if _cancel_event is not None:
        _cancel_event.set()


def get_model_dir() -> Path:
    data_dir = os.environ.get("TICS_DATA_DIR", "")
    if not data_dir:
        raise RuntimeError("TICS_DATA_DIR environment variable is not set")
    return Path(data_dir) / "models" / "clip-vit-b32"


def is_model_ready() -> bool:
    model_dir = get_model_dir()
    return (model_dir / SENTINEL_FILE).exists()


def _delete_model_files():
    model_dir = get_model_dir()
    if model_dir.exists():
        shutil.rmtree(model_dir)


def _download_pytorch_model(model_dir: Path):
    """Download pytorch_model.bin with streaming for granular progress. Returns (success, file_size)."""
    global _downloaded_bytes, _total_bytes, _start_time

    filename = "pytorch_model.bin"
    file_path = model_dir / filename

    token = os.environ.get("HF_TOKEN")
    url = hf_hub_url(REPO_ID, filename)
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    response = requests.get(url, stream=True, headers=headers, timeout=30)
    response.raise_for_status()

    content_length = response.headers.get("Content-Length")
    if content_length:
        with _progress_lock:
            _total_bytes = int(content_length)

    with open(file_path, "wb") as f:
        first_chunk = True
        for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
            if _cancel_event and _cancel_event.is_set():
                return False, 0

            if chunk:
                f.write(chunk)
                with _progress_lock:
                    if first_chunk:
                        _start_time = time.time()
                        first_chunk = False
                    _downloaded_bytes += len(chunk)

    return True, _total_bytes


def _download_all(model_dir: Path):
    global _completed_bytes, _downloaded_bytes

    for filename in MODEL_FILES:
        if _cancel_event and _cancel_event.is_set():
            return

        if filename == "pytorch_model.bin":
            success, _ = _download_pytorch_model(model_dir)
            if not success:
                return
        else:
            hf_hub_download(
                repo_id=REPO_ID,
                filename=filename,
                local_dir=str(model_dir),
            )


async def download_model(broadcast_fn):
    """Download all model files, emitting overall progress via broadcast_fn."""
    global _cancel_event, _downloaded_bytes, _total_bytes, _completed_bytes, _start_time

    _cancel_event = ThreadEvent()
    _downloaded_bytes = 0
    _completed_bytes = 0
    _total_bytes = 350 * 1024 * 1024
    _start_time = 0.0

    model_dir = get_model_dir()
    model_dir.mkdir(parents=True, exist_ok=True)

    if is_model_ready():
        _cancel_event = None
        await broadcast_fn({"type": "model_download_complete"})
        return

    loop = asyncio.get_running_loop()
    download_task = loop.run_in_executor(None, _download_all, model_dir)

    last_broadcast = 0

    try:
        while not download_task.done():
            with _progress_lock:
                downloaded = _downloaded_bytes
                start = _start_time

            speed_mbps = 0.0
            if start > 0:
                elapsed = time.time() - start
                if elapsed > 0:
                    speed_mbps = (downloaded / (1024 * 1024)) / elapsed

            percent = (
                round((downloaded / _total_bytes) * 100, 1) if _total_bytes > 0 else 0
            )
            percent = min(percent, 99.9)

            now = asyncio.get_event_loop().time()
            if now - last_broadcast >= 0.2:
                last_broadcast = now
                await broadcast_fn(
                    {
                        "type": "model_download",
                        "percent": percent,
                        "speed": round(speed_mbps, 1),
                    }
                )

            if _cancel_event.is_set():
                await broadcast_fn({"type": "model_download_cancelled"})
                _delete_model_files()
                _cancel_event = None
                return

            await asyncio.sleep(0.1)

        await download_task

        if _cancel_event and _cancel_event.is_set():
            await broadcast_fn({"type": "model_download_cancelled"})
            _delete_model_files()
            _cancel_event = None
            return

        sentinel = model_dir / SENTINEL_FILE
        sentinel.write_text("ok")
        await broadcast_fn({"type": "model_download_complete"})

    except Exception as e:
        _delete_model_files()
        await broadcast_fn({"type": "model_download_error", "error": str(e)})
    finally:
        _cancel_event = None
