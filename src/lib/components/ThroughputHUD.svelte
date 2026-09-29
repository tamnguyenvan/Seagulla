<script lang="ts">
  import type { IndexProgress } from '$lib/core/types';

  interface Props {
    progress: IndexProgress[];
  }

  let { progress }: Props = $props();
  let expanded = $state(false);

  const average = $derived(
    progress.length === 0
      ? 0
      : progress.reduce((sum, p) => sum + p.realtimeFactor, 0) / progress.length
  );
</script>

{#if progress.length > 0}
  <div class="hud" class:expanded>
    <button class="pill" onclick={() => (expanded = !expanded)}>
      <span class="spinner"></span>
      <span class="tabular">{average.toFixed(1)}×</span>
      <span class="sep">·</span>
      <span>{progress.length} volume{progress.length === 1 ? '' : 's'}</span>
    </button>

    {#if expanded}
      <ul>
        {#each progress as item (item.volumeId)}
          <li>
            <span class="name">{item.volumeId}</span>
            <span class="tabular"
              >{item.completed.toLocaleString()} / {item.total.toLocaleString()}</span
            >
            <span class="tabular eta">{Math.round(item.etaSeconds / 60)} min</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .hud {
    position: absolute;
    right: 16px;
    bottom: 16px;
    border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--color-surface) 82%, transparent);
    backdrop-filter: blur(18px);
    box-shadow: var(--shadow-e4);
    overflow: hidden;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--text-body);
    font-family: var(--font-mono);
  }

  .sep,
  .eta {
    color: var(--color-text-tertiary);
  }

  .spinner {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 2px solid var(--color-indexing);
    border-top-color: transparent;
    animation: spin 900ms linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0 14px 12px;
    list-style: none;
    font-size: var(--text-caption);
  }

  li {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    white-space: nowrap;
  }

  .name {
    color: var(--color-text-secondary);
  }
</style>
