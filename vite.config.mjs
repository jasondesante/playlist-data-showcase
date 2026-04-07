import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    // Inject Node.js globals that browser polyfill packages expect (global, process, Buffer)
    {
      name: 'inject-node-globals',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>
          <script>
            // Polyfill Node.js globals for @ar.io/wayfinder-core and arweave
            window.global = window.global || window;
            window.process = window.process || { env: {}, browser: true, version: '' };
          </script>`
        );
      },
    },
  ],
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
  // crypto-browserify polyfills introduce code-splitting, which requires ES format
  // for worker bundles (Vite defaults workers to IIFE which doesn't support code-splitting)
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      // Polyfill Node.js built-ins for browser.
      // Required by @ar.io/wayfinder-core (crypto) and arweave (stream, crypto).
      crypto: 'crypto-browserify',
      'node:crypto': 'crypto-browserify',
      stream: 'stream-browserify',
      'node:stream': 'stream-browserify',
      events: 'events',
      'node:events': 'events',
      buffer: 'buffer',
      'node:buffer': 'buffer',
      util: 'util',
      'node:util': 'util',
      assert: 'assert',
      'node:assert': 'assert',
      // These have no browser polyfill — shim as empty modules
      'async_hooks': path.resolve('./src/utils/emptyModule.ts'),
      'node:async_hooks': path.resolve('./src/utils/emptyModule.ts'),
      vm: path.resolve('./src/utils/emptyModule.ts'),
      'node:vm': path.resolve('./src/utils/emptyModule.ts'),
    },
  },
})
