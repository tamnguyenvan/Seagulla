import { backend } from '$lib/ipc';
import { BackendError } from '$lib/ipc/backend';
import { ReorderGate } from '$lib/core/staging';
import { parseQuery } from '$lib/core/query';
import type { IndexProgress, LibraryStats, Moment, QueryChip } from '$lib/core/types';

export type ViewKind = 'all' | 'starred' | 'volume' | 'space' | 'search';

export interface ActiveView {
  kind: ViewKind;
  id?: string;
  title: string;
}

/** Central application state. One instance, created in the root layout. */
export class AppState {
  library = $state<LibraryStats | undefined>(undefined);
  moments = $state<Moment[]>([]);
  view = $state<ActiveView>({ kind: 'all', title: 'All Moments' });

  query = $state('');
  chips = $state<QueryChip[]>([]);
  /** Results currently on screen. Replaced by stage 2 once the pointer settles. */
  results = $state<Moment[] | undefined>(undefined);
  /** True between the recall batch and the ranked batch landing. */
  refining = $state(false);
  /** Ids whose rank improved in the last rerank, for the pulse. */
  improved = $state<Set<string>>(new Set());

  selectedId = $state<string | undefined>(undefined);
  inspectorOpen = $state(true);
  sidebarOpen = $state(true);
  indexing = $state<IndexProgress[]>([]);
  error = $state<string | undefined>(undefined);
  loading = $state(true);

  private gate = new ReorderGate(400);
  private searchToken = 0;
  private stopIndexing: (() => void) | undefined;

  get selected(): Moment | undefined {
    const pool = this.results ?? this.moments;
    return pool.find((m) => m.id === this.selectedId);
  }

  get visibleMoments(): Moment[] {
    return this.results ?? this.moments;
  }

  async init(): Promise<void> {
    this.loading = true;
    try {
      this.library = await backend().getLibrary();
      this.moments = await backend().listMoments();
      this.error = undefined;
    } catch (cause) {
      this.error = cause instanceof BackendError ? cause.message : 'Could not open the library.';
    } finally {
      this.loading = false;
    }

    this.stopIndexing = backend().watchIndexing((progress) => {
      this.indexing = progress;
    });
  }

  dispose(): void {
    this.stopIndexing?.();
    this.gate.dispose();
  }

  pointerMoved(): void {
    this.gate.pointerMoved();
  }

  async selectView(view: ActiveView): Promise<void> {
    this.view = view;
    this.query = '';
    this.chips = [];
    this.results = undefined;
    this.selectedId = undefined;

    try {
      if (view.kind === 'starred') {
        this.moments = await backend().listMoments({ starred: true });
      } else if (view.kind === 'volume' && view.id) {
        this.moments = await backend().listMoments({ volumeId: view.id });
      } else {
        this.moments = await backend().listMoments();
      }
      this.error = undefined;
    } catch (cause) {
      this.error = cause instanceof BackendError ? cause.message : 'Could not read that view.';
    }
  }

  /**
   * Runs a search, surfacing recall immediately and holding the reranked order until
   * the pointer settles. See docs/ui-ux-spec.md §5.
   */
  async search(text: string): Promise<void> {
    const token = ++this.searchToken;
    this.query = text;

    const parsed = parseQuery(text);
    this.chips = parsed.chips;

    if (!parsed.semantic) {
      this.results = undefined;
      this.refining = false;
      return;
    }

    this.view = { kind: 'search', title: `“${parsed.semantic}”` };
    this.refining = true;
    this.error = undefined;

    try {
      for await (const batch of backend().search(parsed.semantic)) {
        if (token !== this.searchToken) return;

        if (batch.stage === 'recall') {
          this.results = batch.moments;
          continue;
        }

        const previous = this.results ?? [];
        const improved = new Set<string>();
        batch.moments.forEach((moment, next) => {
          const before = previous.findIndex((m) => m.id === moment.id);
          if (before === -1 || next < before) improved.add(moment.id);
        });

        this.gate.request(() => {
          if (token !== this.searchToken) return;
          this.results = batch.moments;
          this.improved = improved;
          this.refining = false;
          setTimeout(() => {
            if (token === this.searchToken) this.improved = new Set();
          }, 600);
        });
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      this.error = cause instanceof BackendError ? cause.message : 'Search failed.';
      this.refining = false;
    }
  }

  clearSearch(): void {
    this.searchToken++;
    this.query = '';
    this.chips = [];
    this.results = undefined;
    this.refining = false;
    this.view = { kind: 'all', title: 'All Moments' };
  }

  async toggleStar(momentId: string): Promise<void> {
    const moment = this.visibleMoments.find((m) => m.id === momentId);
    if (!moment) return;
    moment.starred = !moment.starred;
    await backend().setStarred(momentId, moment.starred);
  }
}

export const app = new AppState();
