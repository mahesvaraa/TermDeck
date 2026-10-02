import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts']
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@preload': resolve(__dirname, 'src/preload'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
