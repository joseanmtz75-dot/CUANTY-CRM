import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/clients': 'http://localhost:3001',
      '/engine': 'http://localhost:3001',
      '/vendedores': 'http://localhost:3001',
      '/dashboard': 'http://localhost:3001',
      '/alerts': 'http://localhost:3001',
      '/chat': 'http://localhost:3001',
    }
  }
})
