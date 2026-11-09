import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Vite 配置：React 插件 + 最小 PWA + `@/` 路径别名。 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // Q9 裁定：最小 PWA。使用 public/manifest.webmanifest，插件不额外生成 manifest。
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: false,
      includeAssets: ['icons/*.png', 'manifest.webmanifest'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
