import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * QA 测试专用配置（与 vite.config.ts 解耦，不改动任何现有配置）。
 *
 * 为什么需要独立配置：
 * 1. src/domain/** 内部使用 `@/` 路径别名（见 vite.config.ts），这里显式声明同一别名，
 *    保证 `vitest run` 能解析 `import ... from '@/types/domain'` 等语句；
 * 2. vite.config.ts 挂载了 VitePWA 插件与 React 插件，纯函数单测无需加载它们，
 *    独立配置可完全隔离，避免构建期插件干扰测试进程；
 * 3. test.environment = 'node'：全部用例不依赖 DOM / jsdom / 网络 / 浏览器 API。
 *
 * 本文件只被 vitest 读取；Vite 的 dev / build 仍只读 vite.config.ts，行为不受影响。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
