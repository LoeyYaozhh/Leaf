import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { registerSW } from 'virtual:pwa-register';
import App from '@/App';
import { theme } from '@/theme';
import { bootstrap } from '@/storage/hydrate';
import { useAppStore } from '@/store/useAppStore';
import '@/styles/index.css';

// Q9：注册最小 PWA（autoUpdate，无后台同步 / 推送 / 外站缓存）
registerSW({ immediate: true });

const container = document.getElementById('root');
if (!container) {
  throw new Error('[活页] 找不到 #root 挂载点');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    {/* §1.3：emotion 样式先注入，Tailwind utilities 后注入从而可覆盖布局 */}
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);

// F-2：启动恢复 / 首次运行 seed。hydrated 由 bootstrap 结果驱动，App.tsx 显示骨架屏。
void (async (): Promise<void> => {
  try {
    const state = await bootstrap();
    useAppStore.setState({ ...state, hydrated: true });
  } catch (error) {
    // 持久化层失败时也保证界面可用（退化为内存态）
    console.error('[活页] bootstrap 失败，退化为内存态', error);
    useAppStore.setState({ hydrated: true });
  }
})();
