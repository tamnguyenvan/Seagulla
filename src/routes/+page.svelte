<script lang="ts">
  import { onMount } from 'svelte';
  import Inspector from '$lib/components/Inspector.svelte';
  import MomentGrid from '$lib/components/MomentGrid.svelte';
  import SearchField from '$lib/components/SearchField.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ThroughputHUD from '$lib/components/ThroughputHUD.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { backend } from '$lib/ipc';

  let search = $state<ReturnType<typeof SearchField> | undefined>(undefined);

  const indexingByVolume = $derived(
    new Map(app.indexing.map((p) => [p.volumeId, p.total === 0 ? 0 : p.completed / p.total]))
  );

  onMount(() => {
    void app.init();
    return () => app.dispose();
  });

  function onKeydown(event: KeyboardEvent) {
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key === 'f') {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('input[aria-label="Search moments"]')?.focus();
    } else if (meta && event.key === 'b') {
      event.preventDefault();
      app.sidebarOpen = !app.sidebarOpen;
    } else if (meta && event.key === 'i') {
      event.preventDefault();
      app.inspectorOpen = !app.inspectorOpen;
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="shell grain">
  {#if app.sidebarOpen}
    <Sidebar
      library={app.library}
      view={app.view}
      {indexingByVolume}
      onnavigate={(view) => app.selectView(view)}
    />
  {/if}

  <main>
    <header data-tauri-drag-region>
      <div class="nav">
        <button class="ghost" aria-label="Back">‹</button>
        <button class="ghost" aria-label="Forward">›</button>
      </div>

      <div class="title">
        <span class="name">{app.view.title}</span>
        <span class="count tabular">{app.visibleMoments.length.toLocaleString()}</span>
      </div>

      <div class="actions">
        <SearchField
          bind:this={search}
          value={app.query}
          chips={app.chips}
          refining={app.refining}
          onsearch={(text) => app.search(text)}
          onclear={() => app.clearSearch()}
        />
        <button
          class="ghost"
          aria-label="Toggle inspector"
          onclick={() => (app.inspectorOpen = !app.inspectorOpen)}>▤</button
        >
      </div>
    </header>

    <div class="content">
      {#if app.error}
        <div class="banner">{app.error}</div>
      {/if}

      {#if app.loading}
        <div class="loading">Opening library…</div>
      {:else}
        <MomentGrid
          moments={app.visibleMoments}
          selectedId={app.selectedId}
          improved={app.improved}
          onselect={(id) => (app.selectedId = id)}
          onstar={(id) => app.toggleStar(id)}
          onpointermove={() => app.pointerMoved()}
        />
      {/if}

      <ThroughputHUD progress={app.indexing} />
    </div>
  </main>

  {#if app.inspectorOpen}
    <Inspector moment={app.selected} />
  {/if}
</div>

<style>
  .shell {
    position: relative;
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  main {
    position: relative;
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    background: var(--color-canvas);
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    height: var(--toolbar-height);
    padding: 0 12px;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .nav {
    display: flex;
    gap: 2px;
  }

  .title {
    display: flex;
    flex: 1;
    align-items: baseline;
    justify-content: center;
    gap: 8px;
  }

  .name {
    font-size: var(--text-title2);
    font-weight: 600;
  }

  .count {
    color: var(--color-text-tertiary);
    font-size: var(--text-caption);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ghost {
    width: 26px;
    height: 26px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--text-title2);
    line-height: 1;
  }

  .ghost:hover {
    background: color-mix(in srgb, var(--color-text-primary) 6%, transparent);
  }

  .content {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .banner {
    padding: 8px 20px;
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    color: var(--color-danger);
    font-size: var(--text-body);
  }

  .loading {
    display: grid;
    height: 100%;
    place-content: center;
    color: var(--color-text-tertiary);
    font-size: var(--text-body);
  }
</style>
