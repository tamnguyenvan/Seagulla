<script lang="ts">
  import MomentCard from '$lib/components/MomentCard.svelte';
  import SearchField from '$lib/components/SearchField.svelte';
  import ThroughputHUD from '$lib/components/ThroughputHUD.svelte';
  import type { Moment } from '$lib/core/types';

  // Components land here — in every state, both themes — before they land in the product.
  // docs/ui-ux-spec.md §14.
  let theme = $state<'light' | 'dark'>('light');

  $effect(() => {
    document.documentElement.dataset.theme = theme;
  });

  const base: Moment = {
    id: 'demo',
    assetId: 'a-1',
    volumeId: 'vol-0',
    inSeconds: 12,
    outSeconds: 18.5,
    aspect: 16 / 9,
    codec: 'ProRes',
    fps: 29.97,
    startFrame: 107892,
    hue: 210,
    hasDialogue: true,
    starred: false
  };

  const states: Array<{ label: string; moment: Moment; selected?: boolean; improved?: boolean }> = [
    { label: 'Rest', moment: base },
    { label: 'Selected', moment: base, selected: true },
    { label: 'Rank improved', moment: { ...base, id: 'd2' }, improved: true },
    { label: 'Starred', moment: { ...base, id: 'd3', starred: true } },
    { label: 'No dialogue', moment: { ...base, id: 'd4', hasDialogue: false } },
    { label: 'R3D, portrait', moment: { ...base, id: 'd5', codec: 'R3D', aspect: 9 / 16 } },
    { label: 'H.264, square', moment: { ...base, id: 'd6', codec: 'H.264', aspect: 1 } },
    { label: 'Anamorphic', moment: { ...base, id: 'd7', codec: 'BRAW', aspect: 2.39 } }
  ];
</script>

<div class="gallery">
  <header>
    <h1>Design System</h1>
    <button onclick={() => (theme = theme === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  </header>

  <section>
    <h2>Moment card</h2>
    <p class="note">Hover to scrub — cursor position maps to the moment's time range.</p>
    <div class="row">
      {#each states as state (state.moment.id + state.label)}
        <figure style:width="200px">
          <MomentCard moment={state.moment} selected={state.selected} improved={state.improved} />
          <figcaption>{state.label}</figcaption>
        </figure>
      {/each}
    </div>
  </section>

  <section>
    <h2>Search field</h2>
    <div class="row">
      <SearchField value="" chips={[]} />
      <SearchField
        value="interview kitchen"
        chips={[{ kind: 'date', label: 'March', raw: 'march' }]}
        refining
      />
    </div>
  </section>

  <section>
    <h2>Throughput HUD</h2>
    <div class="hud-host">
      <ThroughputHUD
        progress={[
          {
            volumeId: 'vol-0',
            realtimeFactor: 4.2,
            completed: 8400,
            total: 20000,
            etaSeconds: 2100
          },
          {
            volumeId: 'vol-1',
            realtimeFactor: 3.7,
            completed: 1200,
            total: 18000,
            etaSeconds: 4600
          }
        ]}
      />
    </div>
  </section>

  <section>
    <h2>Type scale</h2>
    <p style:font-size="var(--text-display)">Display · 28/34</p>
    <p style:font-size="var(--text-title1)">Title 1 · 22/28</p>
    <p style:font-size="var(--text-title2)">Title 2 · 17/22</p>
    <p style:font-size="var(--text-headline)">Headline · 15/20</p>
    <p style:font-size="var(--text-body)">Body · 13/18</p>
    <p style:font-size="var(--text-caption)">Caption · 11/14</p>
  </section>
</div>

<style>
  .gallery {
    height: 100vh;
    overflow-y: auto;
    padding: 24px 32px 64px;
    background: var(--color-canvas);
    color: var(--color-text-primary);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  h1 {
    margin: 0;
    font-size: var(--text-display);
  }

  h2 {
    margin: 0 0 4px;
    font-size: var(--text-headline);
  }

  .note {
    margin: 0 0 12px;
    color: var(--color-text-tertiary);
    font-size: var(--text-body);
  }

  section {
    margin-bottom: 40px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  figcaption {
    margin-top: 6px;
    color: var(--color-text-secondary);
    font-size: var(--text-caption);
  }

  figure {
    margin: 0;
  }

  .hud-host {
    position: relative;
    height: 120px;
    border-radius: var(--radius-lg);
    background: var(--color-sunken);
  }

  button {
    height: 26px;
    padding: 0 12px;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--text-body);
  }
</style>
