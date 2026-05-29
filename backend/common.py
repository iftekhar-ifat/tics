import pickle
import platform
from pathlib import Path

import numpy as np
import faiss

CLIP_DIM = 512


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
    if (
        platform.system() == "Darwin"
        and hasattr(torch.backends, "mps")
        and torch.backends.mps.is_available()
    ):
        return "mps"
    return "cpu"
