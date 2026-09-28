import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// `base: './'` keeps every asset path relative, so the built site works on
// https://<user>.github.io/<repo>/ as well as on a custom domain.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
});
