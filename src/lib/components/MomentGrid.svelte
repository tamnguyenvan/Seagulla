<script lang="ts">
  import { layoutMasonry, visibleRange, type MasonryItem } from '$lib/core/masonry';
  import type { Moment } from '$lib/core/types';
  import MomentCard from './MomentCard.svelte';

  interface Props {
    moments: Moment[];
    selectedId?: string;
    improved?: Set<string>;
    columnWidth?: number;
    onselect?: (id: string) => void;
    onstar?: (id: string) => void;
    onpointermove?: () => void;
  }

  let {
    moments,
    selectedId,
    improved = new Set<string>(),
    columnWidth = 240,
    onselect,
    onstar,
    onpointermove
  }: Props = $props();

  // The renderer is deliberately swappable: layout is pure (src/lib/core/masonry.ts) and
  // this component only windows it. A canvas/WebGL renderer can replace this file without
  // touching callers — the escape hatch described in implementation-plan.md §5.
  const GUTTER = 12;

  let viewport = $state<HTMLElement | undefined>(undefined);
  let scrollTop = $state(0);
  let width = $state(1000);
  let height = $state(800);

  const items = $derived<MasonryItem[]>(moments.map((m) => ({ id: m.id, aspect: m.aspect })));
  const layout = $derived(
    layoutMasonry(items, {
      containerWidth: width,
      targetColumnWidth: columnWidth,
      gutter: GUTTER,
      minColumns: 1,
      maxColumns: 12
    })
  );
  const cells = $derived(visibleRange(layout, scrollTop, height));
  const byId = $derived(new Map(moments.map((m) => [m.id, m])));

  function measure(node: HTMLElement) {
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    });
    observer.observe(node);
    width = node.clientWidth;
    height = node.clientHeight;
    return { destroy: () => observer.disconnect() };
  }
</script>

<div
  class="viewport"
  role="grid"
  aria-label="Moments"
  aria-rowcount={moments.length}
  tabindex="0"
  bind:this={viewport}
  use:measure
  onscroll={(e) => (scrollTop = (e.currentTarget as HTMLElement).scrollTop)}
  onpointermove={() => onpointermove?.()}
>
  <div class="canvas" style:height={`${layout.totalHeight}px`}>
    {#each cells as cell (cell.id)}
      {@const moment = byId.get(cell.id)}
      {#if moment}
        <div
          class="cell"
          style:transform={`translate3d(${cell.x}px, ${cell.y}px, 0)`}
          style:width={`${cell.width}px`}
          style:height={`${cell.height}px`}
        >
          <MomentCard
            {moment}
            selected={moment.id === selectedId}
            improved={improved.has(moment.id)}
            {onselect}
            {onstar}
          />
        </div>
      {/if}
    {/each}
  </div>

  {#if moments.length === 0}
    <div class="empty">
      <p class="headline">Nothing here yet</p>
      <p class="sub">Index a volume, or try a different description.</p>
    </div>
  {/if}
</div>

<style>
  .viewport {
    position: relative;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px;
    contain: strict;
  }

  .canvas {
    position: relative;
    width: 100%;
  }

  .cell {
    position: absolute;
    top: 0;
    left: 0;
    will-change: transform;
  }

  .empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    text-align: center;
    gap: 4px;
  }

  .headline {
    margin: 0;
    font-size: var(--text-title2);
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .sub {
    margin: 0;
    font-size: var(--text-body);
    color: var(--color-text-tertiary);
  }
</style>
