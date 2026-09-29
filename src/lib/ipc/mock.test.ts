import { describe, expect, it } from 'vitest';
import { MockBackend } from './mock';
import { BackendError } from './backend';
import type { SearchBatch } from '$lib/core/types';

const small = () => new MockBackend({ momentCount: 4000, failureRate: 0, seed: 7 });

async function collect(backend: MockBackend, query: string): Promise<SearchBatch[]> {
  const batches: SearchBatch[] = [];
  for await (const batch of backend.search(query)) batches.push(batch);
  return batches;
}

describe('determinism', () => {
  it('produces identical libraries from the same seed', async () => {
    const a = await new MockBackend({ momentCount: 500, seed: 42 }).listMoments();
    const b = await new MockBackend({ momentCount: 500, seed: 42 }).listMoments();
    expect(a.map((m) => m.id + m.hue + m.codec)).toEqual(b.map((m) => m.id + m.hue + m.codec));
  });

  it('produces different libraries from different seeds', async () => {
    const a = await new MockBackend({ momentCount: 500, seed: 1 }).listMoments();
    const b = await new MockBackend({ momentCount: 500, seed: 2 }).listMoments();
    expect(a.map((m) => m.hue)).not.toEqual(b.map((m) => m.hue));
  });
});

describe('fixture shape', () => {
  it('generates the requested number of moments', async () => {
    const moments = await small().listMoments();
    expect(moments).toHaveLength(4000);
  });

  it('spreads moments across every volume', async () => {
    const backend = small();
    const library = await backend.getLibrary();
    expect(library.volumes.length).toBeGreaterThanOrEqual(12);
    expect(library.volumes.every((v) => v.momentCount > 0)).toBe(true);
  });

  it('includes offline and indexing volumes, because the UI must handle both', async () => {
    const { volumes } = await small().getLibrary();
    expect(volumes.some((v) => v.status === 'offline')).toBe(true);
    expect(volumes.some((v) => v.status === 'indexing')).toBe(true);
  });

  it('produces moments with a positive duration and a sane aspect', async () => {
    for (const moment of await small().listMoments()) {
      expect(moment.outSeconds).toBeGreaterThan(moment.inSeconds);
      expect(moment.aspect).toBeGreaterThan(0);
      expect(moment.aspect).toBeLessThan(4);
    }
  });

  it('filters by volume', async () => {
    const backend = small();
    const { volumes } = await backend.getLibrary();
    const target = volumes[0]!;
    const moments = await backend.listMoments({ volumeId: target.id });
    expect(moments.length).toBe(target.momentCount);
    expect(moments.every((m) => m.volumeId === target.id)).toBe(true);
  });
});

describe('staged search — the physics that matter', () => {
  it('yields recall before ranked', async () => {
    const batches = await collect(small(), 'interview');
    expect(batches.map((b) => b.stage)).toEqual(['recall', 'ranked']);
  });

  it('takes measurable time — results are never instant', async () => {
    const started = Date.now();
    await collect(small(), 'interview');
    expect(Date.now() - started).toBeGreaterThanOrEqual(80 + 200);
  });

  it('reports elapsed time that increases across stages', async () => {
    const [recall, ranked] = await collect(small(), 'interview');
    expect(ranked!.elapsedMs).toBeGreaterThan(recall!.elapsedMs);
  });

  it('reorders between stages, so the grid must survive results changing', async () => {
    const [recall, ranked] = await collect(small(), 'interview');
    const overlap = ranked!.moments.filter((m) => recall!.moments.some((r) => r.id === m.id));
    expect(overlap.length).toBeGreaterThan(0);

    const recallOrder = overlap.map((m) => recall!.moments.findIndex((r) => r.id === m.id));
    const rankedOrder = overlap.map((_, index) => index);
    expect(recallOrder).not.toEqual(rankedOrder);
  });

  it('attaches evidence only once ranked', async () => {
    const [recall, ranked] = await collect(small(), 'interview');
    expect(recall!.moments.every((m) => m.evidence === undefined)).toBe(true);
    expect(ranked!.moments.every((m) => (m.evidence?.length ?? 0) > 0)).toBe(true);
  });

  it('returns nothing for a query with no terms', async () => {
    const batches = await collect(small(), '   ');
    expect(batches.every((b) => b.moments.length === 0)).toBe(true);
  });

  it('can be aborted mid-flight', async () => {
    const backend = small();
    const controller = new AbortController();
    const iterator = backend.search('interview', controller.signal);
    controller.abort();
    await expect(iterator.next()).rejects.toThrow();
  });
});

describe('failure injection', () => {
  it('fails when the configured rate demands it', async () => {
    const backend = new MockBackend({ momentCount: 200, failureRate: 1, seed: 3 });
    await expect(collect(backend, 'interview')).rejects.toBeInstanceOf(BackendError);
  });

  it('never fails when the rate is zero', async () => {
    const backend = new MockBackend({ momentCount: 200, failureRate: 0, seed: 3 });
    await expect(collect(backend, 'interview')).resolves.toBeDefined();
  });
});

describe('indexing progress', () => {
  it('emits progress for indexing volumes and stops when unsubscribed', async () => {
    const backend = small();
    const seen: number[] = [];
    const stop = backend.watchIndexing((progress) => seen.push(progress.length));
    await new Promise((r) => setTimeout(r, 1600));
    stop();
    const count = seen.length;
    expect(count).toBeGreaterThan(0);
    expect(seen.every((n) => n > 0)).toBe(true);
    await new Promise((r) => setTimeout(r, 900));
    expect(seen.length).toBe(count);
  });
});

describe('mutation', () => {
  it('persists a star', async () => {
    const backend = small();
    const [first] = await backend.listMoments();
    await backend.setStarred(first!.id, true);
    const after = await backend.listMoments();
    expect(after.find((m) => m.id === first!.id)?.starred).toBe(true);
  });
});
