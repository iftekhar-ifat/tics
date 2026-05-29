import base64
import sys
from io import BytesIO
from pathlib import Path

import faiss
import numpy as np
import torch
from PIL import Image

from common import _load_index, _get_device
from model_manager import get_clip_model


def search(
    query_text: str = "",
    query_image_path: str = "",
    query_image_data: str = "",
    root_path: str = "",
    top_k: int = 50,
) -> list[dict]:
    """Search indexed images by text and/or image (path or base64 data). Returns [{path, name, score}]."""

    if not root_path:
        print("[search] Empty root_path", file=sys.stderr, flush=True)
        return []

    tics_dir = Path(root_path) / ".tics"
    loaded = _load_index(tics_dir)
    if loaded is None:
        print(f"[search] Index not found at {tics_dir}", file=sys.stderr, flush=True)
        return []
    index, paths = loaded
    if index.ntotal == 0:
        print("[search] Index is empty", file=sys.stderr, flush=True)
        return []

    model, processor = get_clip_model()
    device = _get_device()

    def _open_query_image():
        if query_image_data:
            raw = base64.b64decode(query_image_data)
            return Image.open(BytesIO(raw)).convert("RGB")
        return Image.open(query_image_path).convert("RGB")

    try:
        has_text = bool(query_text)
        has_image = bool(query_image_path) or bool(query_image_data)

        if has_text and has_image:
            text_inputs = processor(
                text=[query_text], return_tensors="pt", padding=True
            )
            image = _open_query_image()
            image_inputs = processor(images=image, return_tensors="pt")
            with torch.no_grad():
                text_out = model.text_model(
                    input_ids=text_inputs["input_ids"].to(device),
                    attention_mask=text_inputs["attention_mask"].to(device),
                )
                vision_out = model.vision_model(
                    pixel_values=image_inputs["pixel_values"].to(device)
                )
            text_emb = model.text_projection(text_out.pooler_output)
            image_emb = model.visual_projection(vision_out.pooler_output)
            emb = (text_emb + image_emb) / 2
        elif has_text:
            text_inputs = processor(
                text=[query_text], return_tensors="pt", padding=True
            )
            with torch.no_grad():
                text_out = model.text_model(
                    input_ids=text_inputs["input_ids"].to(device),
                    attention_mask=text_inputs["attention_mask"].to(device),
                )
            emb = model.text_projection(text_out.pooler_output)
        elif has_image:
            image = _open_query_image()
            image_inputs = processor(images=image, return_tensors="pt")
            with torch.no_grad():
                vision_out = model.vision_model(
                    pixel_values=image_inputs["pixel_values"].to(device)
                )
            emb = model.visual_projection(vision_out.pooler_output)
        else:
            print("[search] No query input", file=sys.stderr, flush=True)
            return []
    except Exception as e:
        print(f"[search] Error processing query: {e}", file=sys.stderr, flush=True)
        import traceback

        traceback.print_exc(file=sys.stderr)
        return []

    emb = emb.detach().cpu().numpy().astype(np.float32)
    faiss.normalize_L2(emb)

    top_k = min(top_k, index.ntotal)
    scores, indices = index.search(emb, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(paths):
            continue
        p = Path(paths[idx])
        results.append(
            {
                "path": str(p),
                "name": p.name,
                "score": round(float(score), 4),
            }
        )

    return results
