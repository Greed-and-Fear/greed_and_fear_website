import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { exec, type ExecException } from 'child_process'
import type { IncomingMessage, ServerResponse } from 'http'

const REPO_PATH = 'E:/greed_and_fear'
const LOG_FILE = path.join(REPO_PATH, 'data', 'history.jsonl')
const RUNNER_FILE = path.join(REPO_PATH, 'src', 'runIndicator.js')

function readHistory(limit = 60) {
  try {
    if (!fs.existsSync(LOG_FILE)) return []
    const content = fs.readFileSync(LOG_FILE, 'utf8').trim()
    if (!content) return []
    const lines = content.split('\n').filter(Boolean)
    return lines
      .slice(-limit)
      .map((line: string) => JSON.parse(line))
      .reverse()
  } catch (err) {
    console.error('Error reading history.jsonl:', err)
    return []
  }
}

function preMarketApiPlugin(): Plugin {
  return {
    name: 'pre-market-api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url) return next()
        const parsedUrl = new URL(req.url, 'http://localhost')

        if (parsedUrl.pathname === '/api/premarket/latest' || parsedUrl.pathname === '/api/latest') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          const history = readHistory(1)
          return res.end(JSON.stringify(history[0] || null))
        }

        if (parsedUrl.pathname === '/api/premarket/history' || parsedUrl.pathname === '/api/history') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          const limit = Number(parsedUrl.searchParams.get('limit')) || 60
          const history = readHistory(limit)
          return res.end(JSON.stringify(history))
        }

        if (req.method === 'POST' && (parsedUrl.pathname === '/api/premarket/run-now' || parsedUrl.pathname === '/api/run-now')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          exec(`node "${RUNNER_FILE}"`, { cwd: REPO_PATH }, (error: ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => {
            if (error) {
              console.error('runIndicator error:', stderr.toString() || error.message)
              res.statusCode = 500
              return res.end(JSON.stringify({ error: error.message }))
            }
            try {
              const strOutput = stdout.toString()
              const jsonMatch = strOutput.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                return res.end(jsonMatch[0])
              }
              const history = readHistory(1)
              return res.end(JSON.stringify(history[0] || { ok: true }))
            } catch {
              const history = readHistory(1)
              return res.end(JSON.stringify(history[0] || { ok: true }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), preMarketApiPlugin()],
  server: {
    proxy: {
      '/api/indicator': {
        target: 'http://localhost:4173',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/indicator/, '/api'),
      },
    },
  },
})

