import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    https: {
      key: fs.readFileSync(new URL('./cert/key.pem', import.meta.url)),
      cert: fs.readFileSync(new URL('./cert/cert.pem', import.meta.url)),
    },
    fs: {
      allow: [
        '.',
        path.resolve('./src/../playlist-data-engine'),
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
})
