import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Tauri serves a static bundle; SPA fallback, no prerendering.
    adapter: adapter({ fallback: 'index.html', strict: false }),
    alias: { $lib: 'src/lib' }
  }
};
