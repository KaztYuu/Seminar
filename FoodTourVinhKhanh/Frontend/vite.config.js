import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Để Vite lắng nghe trên tất cả các địa chỉ (quan trọng cho ngrok)
    allowedHosts: [
      'ilse-unmasticated-toney.ngrok-free.dev' // Thêm domain ngrok của bạn vào đây
    ],
    hmr: {
      host: 'ilse-unmasticated-toney.ngrok-free.dev', // Domain ngrok của frontend
      protocol: 'wss', // Bắt buộc dùng wss cho https của ngrok
    },
  }
})
