import type { IndexProgress, LibraryStats, Moment, SearchBatch } from '$lib/core/types';
import type { Backend } from './backend';

/**
 * Bridge to the Rust core.
 *
 * Imported lazily so the app still runs in a plain browser, which is how the UI is
 * developed on Linux without a Tauri build.
 */
export class TauriBackend implements Backend {
  readonly kind = 'tauri' as const;

  private async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, args);
  }

  getLibrary(): Promise<LibraryStats> {
    return this.invoke<LibraryStats>('get_library');
  }

  listMoments(options: { volumeId?: string; starred?: boolean } = {}): Promise<Moment[]> {
    return this.invoke<Moment[]>('list_moments', options);
  }

  async *search(query: string, signal?: AbortSignal): AsyncGenerator<SearchBatch> {
    const { Channel } = await import('@tauri-apps/api/core');

    const queue: SearchBatch[] = [];
    let notify: (() => void) | undefined;
    let finished = false;

    const channel = new Channel<SearchBatch | { done: true }>();
    channel.onmessage = (message) => {
      if ('done' in message) finished = true;
      else queue.push(message);
      notify?.();
    };

    await this.invoke('search', { query, channel });

    while (!finished || queue.length > 0) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      const next = queue.shift();
      if (next) {
        yield next;
        continue;
      }
      await new Promise<void>((resolve) => {
        notify = resolve;
      });
      notify = undefined;
    }
  }

  watchIndexing(onProgress: (progress: IndexProgress[]) => void): () => void {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const stop = await listen<IndexProgress[]>('indexing:progress', (event) =>
        onProgress(event.payload)
      );
      if (disposed) stop();
      else unlisten = stop;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }

  setStarred(momentId: string, starred: boolean): Promise<void> {
    return this.invoke('set_starred', { momentId, starred });
  }
}
