import type { Backend } from './backend';
import { MockBackend } from './mock';
import { TauriBackend } from './tauri';

export * from './backend';
export { MockBackend } from './mock';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

let current: Backend | undefined;

/** True when running inside a Tauri webview rather than a plain browser. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
}

/**
 * The active backend.
 *
 * Mock in a browser, Tauri inside the app. Selection happens here and nowhere else —
 * components never learn which one they are talking to.
 */
export function backend(): Backend {
  current ??= isTauri() ? new TauriBackend() : new MockBackend();
  return current;
}

/** Replaces the active backend. Used by the debug panel and by tests. */
export function setBackend(next: Backend): void {
  current = next;
}
