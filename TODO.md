- [x] Settings Page
  - [x] Folder Settings
  - [x] File Index Settings (real IPC calls, FAISS still mocked)
  - [x] Make the file indexing functioning (creates `.tics/` folder, real image count, simulated progress)

- [x] Sidebar change issue while changing route

- [x] Backend indexing RPC methods (`indexing.start`, `indexing.getStatus`, `indexing.cancel`, `index.clear`)
- [x] `.tics/` folder structure created in root folder with placeholder FAISS/pickle/SQLite files
- [x] Real folder scanning for image count (both Electron main process and Python sidecar)
- [x] Indexing push events (`indexing_progress`, `indexing_complete`, `indexing_error`)
- [x] Onboarding step 4 wired to real backend calls
- [x] Sidebar indexing panel wired to real backend calls
- [x] Settings indexing panel wired to real backend calls

### Remaining

- [ ] Actual FAISS embedding + search (still mocked)
- [ ] File watcher for new images
- [ ] Search UI (text/image-text)
- [ ] Results gallery
