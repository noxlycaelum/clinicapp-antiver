import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    allowedHosts: [
      'clinicapp-antiver.onrender.com'
    ],
    proxy: {
      '/api': {
        // Keeps localhost for your machine, but uses the Render port in production
        target: process.env.NODE_ENV === 'production'
          ? 'http://localhost:' + (process.env.PORT || '5000')
          : 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})