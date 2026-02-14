import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
const repository = process.env.GITHUB_REPOSITORY
const repositoryName = repository?.split('/')[1]

export default defineConfig({
  base: repositoryName ? `/${repositoryName}/` : '/',
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
})
