import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Separate from vite.config.ts so unit tests do not pay for the SvelteKit pipeline.
export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
  },
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'node'
  }
});
