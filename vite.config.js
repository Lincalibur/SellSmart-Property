import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves a project site at username.github.io/repo-name/,
  // not the domain root, so every asset URL needs that prefix -- but only
  // there. The real deploy target (frontend/Dockerfile's nginx, serving
  // from "/") and local dev both need base to stay "/", so this only
  // kicks in for the GitHub Pages workflow, which sets GITHUB_PAGES=true
  // (.github/workflows/deploy-pages.yml).
  base: process.env.GITHUB_PAGES ? '/SellSmart-Property/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
})
