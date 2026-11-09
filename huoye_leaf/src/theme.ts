/** MUI 主题（§1.3）：断点 lg 与 Tailwind screens.lg 同时对齐到 1024。 */
import { createTheme } from '@mui/material/styles';
import { LG_BREAKPOINT } from '@/constants/app';

export const theme = createTheme({
  palette: {
    primary: { main: '#2f6f5e', dark: '#245448', light: '#5b9684', contrastText: '#ffffff' },
    secondary: { main: '#e07a5f', contrastText: '#ffffff' },
    success: { main: '#2f6f5e' },
    warning: { main: '#e0a458' },
    background: { default: '#f5f7f5', paper: '#ffffff' },
    text: { primary: '#22302b', secondary: '#63716b' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, -apple-system, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: LG_BREAKPOINT,
      xl: 1536,
    },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none' } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
  },
});
