import type { IndexProgress, LibraryStats, Moment, SearchBatch } from '$lib/core/types';

/**
 * The boundary between the UI and the engines.
 *
 * Two implementations exist: a TypeScript mock that runs in a plain browser, and a Tauri
 * bridge that forwards to the Rust core. The UI is written against this interface only,
 * so neither implementation can leak into components.
 */
export interface Backend {
  readonly kind: 'mock' | 'tauri';

  getLibrary(): Promise<LibraryStats>;

  /** All moments, ordered for browsing. */
  listMoments(options?: { volumeId?: string; starred?: boolean }): Promise<Moment[]>;

  /**
   * Search, yielding progressively.
   *
   * Yields a `recall` batch first, then a `ranked` batch that reorders it and attaches
   * match evidence. Callers must handle results changing underneath them — that is the
   * real behaviour, not a mock artefact.
   */
  search(query: string, signal?: AbortSignal): AsyncGenerator<SearchBatch>;

  /** Live indexing progress per volume. */
  watchIndexing(onProgress: (progress: IndexProgress[]) => void): () => void;

  setStarred(momentId: string, starred: boolean): Promise<void>;
}

/** Tunable failure and latency characteristics, exposed in the debug panel. */
export interface MockPhysics {
  recallMinMs: number;
  recallMaxMs: number;
  rankedMinMs: number;
  rankedMaxMs: number;
  failureRate: number;
  realtimeFactor: number;
  momentCount: number;
  seed: number;
}

export const DEFAULT_PHYSICS: MockPhysics = {
  recallMinMs: 80,
  recallMaxMs: 400,
  rankedMinMs: 200,
  rankedMaxMs: 900,
  failureRate: 0.02,
  realtimeFactor: 3,
  momentCount: 100_000,
  seed: 20260929
};

export class BackendError extends Error {
  constructor(
    message: string,
    readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'BackendError';
  }
}
