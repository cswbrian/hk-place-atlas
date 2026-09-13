import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  server: {
    proxy: {
      '/landsd-api': {
        target: 'https://mapapi.geodata.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/landsd-api/, ''),
      },
    },
  },
})
