<script lang="ts">
  import type { LibraryStats } from '$lib/core/types';
  import type { ActiveView } from '$lib/stores/app.svelte';

  interface Props {
    library?: LibraryStats;
    view: ActiveView;
    indexingByVolume?: Map<string, number>;
    onnavigate?: (view: ActiveView) => void;
  }

  let { library, view, indexingByVolume = new Map(), onnavigate }: Props = $props();

  const primary = $derived([
    { id: 'all', icon: '◫', label: 'All Moments', count: library?.totalMoments ?? 0 },
    { id: 'inbox', icon: '⇣', label: 'Inbox', count: library?.inbox ?? 0 },
    { id: 'starred', icon: '★', label: 'Starred', count: library?.starred ?? 0 },
    { id: 'tags', icon: '⊞', label: 'Tags', count: 152 },
    { id: 'trash', icon: '␥', label: 'Trash', count: 0 }
  ]);

  const isActive = (kind: string, id?: string) =>
    view.kind === kind && (id === undefined || view.id === id);
</script>

<nav class="sidebar">
  <div class="pill-row">
    <button class="pill" title="Add a volume or folder">＋</button>
    <button class="pill" title="Toggle sidebar">▤</button>
  </div>

  <ul class="group">
    {#each primary as item (item.id)}
      <li>
        <button
          class="row"
          class:active={isActive(item.id === 'all' ? 'all' : item.id)}
          onclick={() =>
            onnavigate?.({
              kind: item.id === 'starred' ? 'starred' : 'all',
              title: item.label
            })}
        >
          <span class="icon">{item.icon}</span>
          <span class="label">{item.label}</span>
          <span class="count tabular">{item.count.toLocaleString()}</span>
        </button>
      </li>
    {/each}
  </ul>

  <p class="section">Volumes</p>
  <ul class="group">
    {#each library?.volumes ?? [] as volume (volume.id)}
      {@const progress = indexingByVolume.get(volume.id)}
      <li>
        <button
          class="row"
          class:active={isActive('volume', volume.id)}
          class:offline={volume.status === 'offline'}
          onclick={() => onnavigate?.({ kind: 'volume', id: volume.id, title: volume.name })}
          title={volume.status === 'offline' ? `Plug in ${volume.name} to access` : volume.name}
        >
          <span class="dot" data-status={volume.status}></span>
          <span class="label">{volume.name}</span>
          {#if progress !== undefined}
            <span class="ring" style:--p={progress}></span>
          {:else}
            <span class="count tabular">{volume.momentCount.toLocaleString()}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  <p class="section">Spaces</p>
  <ul class="group">
    {#each library?.spaces ?? [] as space (space.id)}
      <li>
        <button
          class="row"
          class:active={isActive('space', space.id)}
          onclick={() => onnavigate?.({ kind: 'space', id: space.id, title: space.name })}
        >
          <span class="emoji">{space.icon}</span>
          <span class="label">{space.name}</span>
          <span class="count tabular">{space.count.toLocaleString()}</span>
        </button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    height: 100%;
    padding: 0 8px 8px;
    overflow-y: auto;
    border-right: 1px solid var(--color-border-subtle);
    background: color-mix(in srgb, var(--color-canvas) 60%, transparent);
  }

  .pill-row {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
    padding: 10px 4px;
    /* Clears the traffic lights on macOS. */
    margin-top: var(--traffic-light-inset);
  }

  .pill {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 999px;
    background: var(--color-surface);
    box-shadow: var(--shadow-e1);
    color: var(--color-text-secondary);
    font-size: var(--text-callout);
  }

  .section {
    margin: 16px 6px 4px;
    font-size: var(--text-caption);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 28px;
    padding: 0 8px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--text-body);
    text-align: left;
    transition: background var(--duration-micro) var(--ease-out-micro);
  }

  .row:hover {
    background: color-mix(in srgb, var(--color-text-primary) 5%, transparent);
  }

  .row.active {
    background: var(--color-accent-soft);
  }

  .row.active .icon,
  .row.active .label {
    color: var(--color-accent);
  }

  .row.offline .label,
  .row.offline .count {
    opacity: 0.6;
  }

  .icon,
  .emoji {
    width: 16px;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--text-callout);
  }

  .label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    color: var(--color-text-tertiary);
    font-size: var(--text-caption);
  }

  .dot {
    width: 8px;
    height: 8px;
    margin: 0 4px;
    border-radius: 999px;
  }

  .dot[data-status='online'] {
    background: var(--color-success);
  }
  .dot[data-status='offline'] {
    background: var(--color-text-tertiary);
  }
  .dot[data-status='indexing'] {
    background: var(--color-indexing);
  }

  .ring {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: conic-gradient(
      var(--color-indexing) calc(var(--p) * 360deg),
      var(--color-border-subtle) 0
    );
    mask: radial-gradient(circle, transparent 54%, black 56%);
  }
</style>
