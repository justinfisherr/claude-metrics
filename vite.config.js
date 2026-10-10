import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL || '/claude-metrics/',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'docs',
  },
})
