<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { isTauri } from '$lib/ipc';

  let { children } = $props();

  onMount(() => {
    // macOS-only chrome (vibrancy, overlay titlebar, traffic-light inset) is gated on
    // this attribute, so a Linux dev build renders a plain opaque window.
    const platform = isTauri() && navigator.platform.startsWith('Mac') ? 'macos' : 'other';
    document.documentElement.dataset.platform = platform;
  });
</script>

{@render children()}
