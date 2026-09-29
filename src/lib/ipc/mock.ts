import type {
  Codec,
  IndexProgress,
  LibraryStats,
  MatchEvidence,
  Moment,
  SearchBatch,
  Space,
  Volume
} from '$lib/core/types';
import type { FrameRate } from '$lib/core/timecode';
import { BackendError, DEFAULT_PHYSICS, type Backend, type MockPhysics } from './backend';
import { mulberry32, pick, range } from './random';

const CODECS: Codec[] = ['H.264', 'HEVC', 'ProRes', 'R3D', 'BRAW'];
const RATES: FrameRate[] = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
const ASPECTS = [16 / 9, 16 / 9, 16 / 9, 2.39, 4 / 3, 1, 9 / 16];

const SUBJECTS = [
  'interview',
  'coastline',
  'kitchen',
  'drone shot',
  'crowd',
  'sunset',
  'workshop',
  'city street',
  'forest path',
  'harbour',
  'rehearsal',
  'market',
  'rain on glass',
  'portrait',
  'wide landscape',
  'hands working',
  'train window',
  'night traffic'
];

const LINES = [
  'we moved here in the spring',
  'it took about three years to finish',
  'nobody really expected it to work',
  'my grandmother built this by hand',
  'you can see the whole valley from up here',
  'we start again at six tomorrow',
  'that was the first take and we kept it'
];

const VOLUME_NAMES = [
  'Archive 01',
  'Archive 02',
  'Archive 03',
  'Archive 07',
  'Coastline Doc',
  'Client — Meridian',
  'B-Roll 2025',
  'B-Roll 2026',
  'Interviews Master',
  'Scratch SSD',
  'LTO Restore',
  'Field Recordings'
];

const SPACES: Array<Omit<Space, 'count'>> = [
  { id: 'sp-interviews', name: 'Interviews', icon: '🎙', query: 'interview' },
  { id: 'sp-coast', name: 'B-roll — coastline', icon: '🌊', query: 'coastline' },
  { id: 'sp-selects', name: 'Client selects', icon: '⭐️', query: 'portrait' },
  { id: 'sp-night', name: 'Night exteriors', icon: '🌙', query: 'night traffic' }
];

const abortError = () => new DOMException('aborted', 'AbortError');

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    // An async generator body does not run until the first next(), by which time the
    // caller may already have aborted. Checking upfront is not an optimisation.
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true }
    );
  });

/**
 * In-memory engine with realistic behaviour.
 *
 * It lies about content — the footage is procedural — but never about physics. Latency,
 * progressive results, failures and scale are real, because a UI designed against instant,
 * perfect, infinite results dies on contact with the actual engine.
 */
export class MockBackend implements Backend {
  readonly kind = 'mock' as const;

  private readonly physics: MockPhysics;
  private readonly random: () => number;
  private readonly moments: Moment[];
  private readonly volumes: Volume[];
  private readonly subjects: string[];
  private readonly lines: string[];

  constructor(physics: Partial<MockPhysics> = {}) {
    this.physics = { ...DEFAULT_PHYSICS, ...physics };
    this.random = mulberry32(this.physics.seed);

    this.volumes = this.buildVolumes();
    this.moments = this.buildMoments();
    this.subjects = this.moments.map(() => pick(this.random, SUBJECTS));
    this.lines = this.moments.map(() => pick(this.random, LINES));

    for (const volume of this.volumes) {
      volume.momentCount = this.moments.filter((m) => m.volumeId === volume.id).length;
    }
  }

  private buildVolumes(): Volume[] {
    return VOLUME_NAMES.map((name, index) => {
      const roll = this.random();
      const status: Volume['status'] = index < 2 ? 'indexing' : roll < 0.3 ? 'offline' : 'online';
      return {
        id: `vol-${index}`,
        name,
        status,
        progress: status === 'indexing' ? range(this.random, 0.05, 0.85) : undefined,
        momentCount: 0,
        capacityBytes: Math.floor(range(this.random, 2, 40)) * 1_000_000_000_000,
        colorIndex: index % 6
      };
    });
  }

  private buildMoments(): Moment[] {
    const moments: Moment[] = new Array(this.physics.momentCount);
    for (let i = 0; i < this.physics.momentCount; i++) {
      const volume = pick(this.random, this.volumes);
      const inSeconds = range(this.random, 0, 3600);
      const duration = range(this.random, 0.8, 14);
      moments[i] = {
        id: `m-${i}`,
        assetId: `a-${Math.floor(i / 12)}`,
        volumeId: volume.id,
        inSeconds,
        outSeconds: inSeconds + duration,
        aspect: pick(this.random, ASPECTS),
        codec: pick(this.random, CODECS),
        fps: pick(this.random, RATES),
        startFrame: Math.floor(range(this.random, 0, 500_000)),
        hue: Math.floor(this.random() * 360),
        hasDialogue: this.random() < 0.35,
        starred: this.random() < 0.02
      };
    }
    return moments;
  }

  private maybeFail(): void {
    if (this.random() < this.physics.failureRate) {
      throw new BackendError('The index could not be read. Retrying may succeed.', true);
    }
  }

  async getLibrary(): Promise<LibraryStats> {
    await delay(range(this.random, 20, 90));
    return {
      totalMoments: this.moments.length,
      volumes: this.volumes,
      spaces: SPACES.map((space) => ({
        ...space,
        count: this.scoreAll(space.query).length
      })),
      starred: this.moments.filter((m) => m.starred).length,
      inbox: Math.floor(this.moments.length * 0.004)
    };
  }

  async listMoments(options: { volumeId?: string; starred?: boolean } = {}): Promise<Moment[]> {
    await delay(range(this.random, 30, 120));
    return this.moments.filter(
      (m) =>
        (options.volumeId === undefined || m.volumeId === options.volumeId) &&
        (options.starred !== true || m.starred)
    );
  }

  /** Cheap lexical relevance over the procedural corpus. */
  private scoreAll(query: string): Array<{ moment: Moment; score: number; index: number }> {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const hits: Array<{ moment: Moment; score: number; index: number }> = [];
    for (let i = 0; i < this.moments.length; i++) {
      const subject = this.subjects[i] ?? '';
      const line = this.lines[i] ?? '';
      let score = 0;
      for (const term of terms) {
        if (subject.includes(term)) score += 0.6;
        if (line.includes(term)) score += 0.3;
      }
      if (score > 0) {
        const moment = this.moments[i];
        if (moment) hits.push({ moment, score, index: i });
      }
    }
    return hits;
  }

  async *search(query: string, signal?: AbortSignal): AsyncGenerator<SearchBatch> {
    const started = Date.now();
    const { recallMinMs, recallMaxMs, rankedMinMs, rankedMaxMs } = this.physics;

    await delay(range(this.random, recallMinMs, recallMaxMs), signal);
    this.maybeFail();

    const hits = this.scoreAll(query);

    // Stage 1: cheap recall. Deliberately imperfect ordering, and seeded with a few
    // plausible false positives — handling those gracefully is a core UX problem.
    const recall = hits
      .map((hit) => ({
        ...hit,
        noisy: hit.score + range(this.random, -0.25, 0.25)
      }))
      .sort((a, b) => b.noisy - a.noisy)
      .slice(0, 120)
      .map(({ moment, noisy }) => ({ ...moment, score: Math.max(0, noisy) }));

    yield { stage: 'recall', query, moments: recall, elapsedMs: Date.now() - started };

    await delay(range(this.random, rankedMinMs, rankedMaxMs), signal);
    this.maybeFail();

    // Stage 2: true ordering plus evidence. This *reorders* what the user is already
    // looking at, which is exactly the behaviour the grid must survive.
    const ranked = hits
      .sort((a, b) => b.score - a.score)
      .slice(0, 60)
      .map(({ moment, score, index }) => ({
        ...moment,
        score,
        evidence: this.evidenceFor(index, query)
      }));

    yield { stage: 'ranked', query, moments: ranked, elapsedMs: Date.now() - started };
  }

  private evidenceFor(index: number, query: string): MatchEvidence[] {
    const evidence: MatchEvidence[] = [];
    const subject = this.subjects[index] ?? '';
    const line = this.lines[index] ?? '';
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.some((t) => subject.includes(t))) {
      evidence.push({ kind: 'visual', detail: subject, confidence: range(this.random, 0.6, 0.98) });
    }
    if (terms.some((t) => line.includes(t))) {
      evidence.push({
        kind: 'dialogue',
        detail: `“${line}”`,
        confidence: range(this.random, 0.5, 0.95)
      });
    }
    if (evidence.length === 0) {
      evidence.push({ kind: 'visual', detail: subject, confidence: range(this.random, 0.3, 0.6) });
    }
    return evidence;
  }

  watchIndexing(onProgress: (progress: IndexProgress[]) => void): () => void {
    const indexing = this.volumes.filter((v) => v.status === 'indexing');
    const timer = setInterval(() => {
      const snapshot: IndexProgress[] = indexing.map((volume) => {
        volume.progress = Math.min(1, (volume.progress ?? 0) + 0.004);
        return {
          volumeId: volume.id,
          realtimeFactor: this.physics.realtimeFactor + range(this.random, -0.4, 0.4),
          completed: Math.floor((volume.progress ?? 0) * volume.momentCount),
          total: volume.momentCount,
          etaSeconds: Math.floor((1 - (volume.progress ?? 0)) * 4200)
        };
      });
      onProgress(snapshot);
    }, 700);

    return () => clearInterval(timer);
  }

  async setStarred(momentId: string, starred: boolean): Promise<void> {
    const moment = this.moments.find((m) => m.id === momentId);
    if (moment) moment.starred = starred;
  }
}
