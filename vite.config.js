import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

let gitSha = process.env.VITE_GIT_SHA || process.env.GIT_SHA || 'unknown'
try {
  if (gitSha === 'unknown') {
    gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  }
} catch {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_SHA__:     JSON.stringify(gitSha),
  },
  server: {
    // Proxy /api/* to the Express server in dev mode so storage and update
    // endpoints work the same way as in production.
    proxy: {
      '/api': 'http://localhost:7879',
    },
  },
})
