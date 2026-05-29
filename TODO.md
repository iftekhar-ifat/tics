## Milestones

### Milestone 1: Real CLIP embedding + FAISS indexing (back-end) ✅
- [x] `backend/model_manager.py` — Add `get_clip_model()` singleton loader (cached, device-aware)
- [x] `backend/indexing.py` — Replace mock with real pipeline
- [x] `backend/indexing.py` — Removed dead `meta.db` placeholder
- [x] `backend/indexing.py` — Added `search()` function

### Milestone 2: Search endpoint + IPC wiring ✅
- [x] All IPC layers wired (ipc_bridge → ipcHandlers → preload → window.d.ts)

### Milestone 3: Frontend integration ✅
- [x] ChatInput submit → search → ImageGallery display
- [x] Image query processed in-memory (not saved to disk)
- [x] In-memory embedding via base64 → `vision_model` + `visual_projection`
- [x] `topK` configurable via `settings-store` (default 50)

### Milestone 4: Settings UI (pending)
- [ ] Add `topK` slider/input in settings panel
- [ ] Add result count label to gallery
