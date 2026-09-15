import { createReadStream, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

function serveBdbiarCsv(): Plugin {
  const file = fileURLToPath(new URL('./BDBIAR_Central_and_Western.csv', import.meta.url))
  const mount = '/BDBIAR_Central_and_Western.csv'
  return {
    name: 'bdbiar-csv',
    configureServer(server) {
      server.middlewares.use(mount, (_req, res) => {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        createReadStream(file).pipe(res)
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'BDBIAR_Central_and_Western.csv',
        source: readFileSync(file),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveBdbiarCsv()],
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
      '/csdi-api': {
        target:
          'https://portal.csdi.gov.hk/server/services/common/landsd_rcd_1637211194312_35158/MapServer/WFSServer',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/csdi-api/, ''),
      },
    },
  },
})
