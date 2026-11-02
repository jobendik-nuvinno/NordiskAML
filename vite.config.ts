import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative stier: samme bygg fungerer lokalt og på GitHub Pages (/NordiskAML/). Rutingen er hash-basert.
  base: './',
  plugins: [react(), tailwindcss()],
})
