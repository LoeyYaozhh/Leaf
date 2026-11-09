import type { Config } from 'tailwindcss';

/**
 * Tailwind v3 配置（§1.3 MUI 共存四约束）：
 * 1. 关闭 preflight，避免 Tailwind base reset 覆盖 MUI 的 button/svg/table 基础样式；
 * 2. screens.lg 与 MUI theme.breakpoints.values.lg 对齐为 1024px；
 * 3. Tailwind 只负责布局 / 间距 / 响应式，交互组件交给 MUI。
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    screens: {
      sm: '600px',
      md: '900px',
      lg: '1024px',
      xl: '1536px',
      '2xl': '1536px',
    },
    extend: {},
  },
  plugins: [],
};

export default config;
