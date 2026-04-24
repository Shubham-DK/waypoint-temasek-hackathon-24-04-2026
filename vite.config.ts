import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src',
  plugins: [
    webExtension({
      manifest: 'manifest.json',
      disableAutoLaunch: true,
      htmlViteConfig: {
        plugins: [react()],
      },
    }),
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
