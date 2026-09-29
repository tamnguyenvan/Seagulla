<script lang="ts">
  import type { QueryChip } from '$lib/core/types';

  interface Props {
    value: string;
    chips: QueryChip[];
    refining?: boolean;
    onsearch?: (text: string) => void;
    onclear?: () => void;
  }

  let { value, chips, refining = false, onsearch, onclear }: Props = $props();

  let focused = $state(false);
  let draft = $state('');
  let input = $state<HTMLInputElement | undefined>(undefined);

  $effect(() => {
    draft = value;
  });

  export function focus() {
    input?.focus();
  }

  function submit(event: Event) {
    event.preventDefault();
    onsearch?.(draft);
  }
</script>

<form class="wrap" class:focused onsubmit={submit}>
  <span class="glass">⌕</span>

  {#each chips as chip (chip.raw + chip.kind)}
    <span class="chip" data-kind={chip.kind}>{chip.label}</span>
  {/each}

  <input
    bind:this={input}
    bind:value={draft}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        draft = '';
        onclear?.();
        input?.blur();
      }
    }}
    placeholder="Describe a moment…"
    spellcheck="false"
    aria-label="Search moments"
  />

  {#if draft}
    <button
      type="button"
      class="clear"
      onclick={() => {
        draft = '';
        onclear?.();
      }}
      aria-label="Clear search">✕</button
    >
  {/if}

  {#if refining}
    <span class="refining" aria-label="Refining results"></span>
  {/if}
</form>

<style>
  .wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 5px;
    width: 280px;
    height: 28px;
    padding: 0 8px;
    overflow: hidden;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    transition: width var(--duration-snappy) var(--ease-snappy);
  }

  .wrap.focused {
    width: 420px;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-accent-soft);
  }

  .glass {
    color: var(--color-text-tertiary);
    font-size: var(--text-callout);
  }

  input {
    flex: 1;
    min-width: 60px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: var(--text-body);
  }

  input::placeholder {
    color: var(--color-text-tertiary);
  }

  .chip {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: var(--radius-xs);
    background: var(--color-accent-soft);
    color: var(--color-accent);
    font-size: var(--text-caption);
    white-space: nowrap;
    animation: chip-in var(--duration-short) var(--ease-snappy);
  }

  @keyframes chip-in {
    from {
      opacity: 0;
      transform: scale(0.88);
    }
  }

  .clear {
    border: none;
    background: transparent;
    color: var(--color-text-tertiary);
    font-size: var(--text-caption);
  }

  .refining {
    position: absolute;
    inset: auto 0 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
    animation: sweep 1.1s linear infinite;
  }

  @keyframes sweep {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(100%);
    }
  }
</style>
