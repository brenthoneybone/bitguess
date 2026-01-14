import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      $services: path.resolve(__dirname, './src/services'),
      $utils: path.resolve(__dirname, './src/utils'),
      $routes: path.resolve(__dirname, './src/routes'),
      $lambdas: path.resolve(__dirname, './src/lambdas'),
      '@bitguess/api-types': path.resolve(__dirname, '../packages/api-types/src/index.ts'),
      '@bitguess/config': path.resolve(__dirname, '../packages/config/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
  },
})
