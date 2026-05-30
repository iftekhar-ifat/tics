# Tics — Text · Image · Context · Search

A local-first, privacy-focused desktop app for searching your personal image library using natural language, a reference image, or both combined. Everything runs on-device — no cloud, no telemetry.

## Features

- **Multimodal search** — search by text, image, or a blend of both
- **AI-chat-style input** — type a query, paste/drag an image, or both
- **CLIP embeddings** — ViT-B/32 model generates 512-dim vectors for both text and images
- **FAISS similarity search** — fast vector search with cosine similarity ranking
- **Image indexing** — batch-index your entire image library with progress tracking
- **File watcher** — automatically detects new images in your root folder
- **Upload to root** — move images into your library from other locations
- **Query in-memory** — reference images are never saved to disk
- **Customizable search defaults** — top-K count, text/image fusion weight, sort order
- **Configurable model folder** — download from HuggingFace or adopt an existing model directory

## Tech stack

| Layer          | Technology                                                       |
| -------------- | ---------------------------------------------------------------- |
| Desktop shell  | Electron                                                         |
| Frontend       | React, TypeScript, Tailwind CSS 4                                |
| Bundler        | electron-vite                                                    |
| UI components  | Shadcn + Phosphor icons                                          |
| State          | Zustand with persist middleware                                  |
| Routing        | TanStack Router                                                  |
| Python backend | spawned child process, stdin/stdout JSON-RPC IPC                 |
| Embeddings     | CLIP ViT-B/32 (for now) via HuggingFace `transformers` + `torch` |
| Vector search  | FAISS (`IndexFlatIP` — inner product / cosine similarity)        |
| File watching  | chokidar (Electron side)                                         |
| Packaging      | PyInstaller (Python) + electron-builder (Electron)               |
| Python env     | UV package manager                                               |

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** (`npm install -g pnpm`)
- **Python** ≥ 3.11
- **UV** (`pip install uv`)

## Setup

### 1. Clone and install frontend dependencies

```bash
pnpm install
```

### 2. Install Python dependencies

```bash
cd backend
uv sync
cd ..
```

### 3. Development

```bash
pnpm dev
```

This starts both the Vite dev server (renderer) and launches the Electron window. The Python sidecar is spawned automatically by the Electron main process on startup.

On first launch, the onboarding wizard will guide you through:

1. Selecting a root folder of images
2. Hardware detection (CUDA / MPS / CPU)
3. Downloading the CLIP model from HuggingFace
4. Indexing your images
