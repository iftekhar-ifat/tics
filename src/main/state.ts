/**
 * Centralized application state for the main process
 */
import { BrowserWindow } from 'electron'

// ============ State ============

export type BackendStatus = 'starting' | 'running' | 'stopped' | 'error'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateState {
  status: UpdateStatus
  version?: string
  downloadedVersion?: string
  progressPercent?: number
  message?: string
}

let backendStatus: BackendStatus = 'stopped'
let updateState: UpdateState = { status: 'idle' }
let mainWindow: BrowserWindow | null = null

// ============ Event callbacks ============

let onBackendStatusChanged: ((status: BackendStatus) => void) | null = null
let onUpdateStateChanged: ((state: UpdateState) => void) | null = null

export function setBackendStatusCallback(cb: (status: BackendStatus) => void): void {
  onBackendStatusChanged = cb
}

export function setUpdateStateCallback(cb: (state: UpdateState) => void): void {
  onUpdateStateChanged = cb
}

function broadcastBackendStatus(): void {
  if (onBackendStatusChanged) {
    onBackendStatusChanged(backendStatus)
  }
}

function broadcastUpdateState(): void {
  if (onUpdateStateChanged) {
    onUpdateStateChanged(updateState)
  }
}

// ============ Backend status API ============

export function setBackendStatus(status: BackendStatus): void {
  backendStatus = status
  broadcastBackendStatus()
}

export function getBackendStatus(): BackendStatus {
  return backendStatus
}

// ============ Update state API ============

export function setUpdateState(state: UpdateState): void {
  updateState = state
  broadcastUpdateState()
}

export function getUpdateState(): UpdateState {
  return updateState
}

// ============ Main window API ============

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}