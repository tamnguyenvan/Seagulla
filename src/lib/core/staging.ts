/**
 * Decides when a reordered result set may be shown.
 *
 * Stage-2 reranking changes the order of results the user is already reaching for.
 * Reordering under a moving pointer is the single most irritating thing this UI could
 * do, so a ranked batch is held until the pointer has been still for `idleMs`.
 *
 * docs/ui-ux-spec.md §5.
 */
export class ReorderGate {
  private lastPointerMove = 0;
  private pending: (() => void) | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly idleMs = 400,
    private readonly now: () => number = () => Date.now()
  ) {}

  /** Call on every pointer move over the results region. */
  pointerMoved(): void {
    this.lastPointerMove = this.now();
    if (this.pending) this.schedule();
  }

  /** Runs `apply` once the pointer has been idle long enough. */
  request(apply: () => void): void {
    this.pending = apply;
    this.schedule();
  }

  private schedule(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    const remaining = Math.max(0, this.idleMs - (this.now() - this.lastPointerMove));
    this.timer = setTimeout(() => this.flush(), remaining);
  }

  /** Applies immediately, ignoring pointer state. */
  flush(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    const apply = this.pending;
    this.pending = undefined;
    apply?.();
  }

  get hasPending(): boolean {
    return this.pending !== undefined;
  }

  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
  }
}
