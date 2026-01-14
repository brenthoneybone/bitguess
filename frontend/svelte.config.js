import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
    alias: {
      $components: './src/lib/components',
      $utils: './src/lib/utils',
      $services: './src/lib/services',
      $types: './src/types',
      $routes: './src/routes',
      $src: './src',
    },
  },
}

export default config
