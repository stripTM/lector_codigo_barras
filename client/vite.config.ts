import { resolve } from 'node:path';
import basicSsl from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const SERVER_URL = 'http://localhost:3000';

export default defineConfig({
  // basicSsl sirve el dev server por HTTPS con un certificado autofirmado,
  // necesario para que getUserMedia (la cámara del escáner) funcione desde
  // un móvil de la red local.
  plugins: [vue(), basicSsl()],
  build: {
    rollupOptions: {
      input: {
        checkout: resolve(import.meta.dirname, 'index.html'),
        scanner: resolve(import.meta.dirname, 'scanner.html'),
      },
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': SERVER_URL,
      '/ws': { target: SERVER_URL, ws: true },
    },
  },
});
