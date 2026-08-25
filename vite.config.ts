import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tradebrains-api': {
        target: 'https://portal.tradebrains.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tradebrains-api/, '/api/company/sector-data/all-stocks'),
      },
    },
  },
})
