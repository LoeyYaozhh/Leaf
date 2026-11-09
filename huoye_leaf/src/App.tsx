import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AppShell from '@/components/layout/AppShell';
import { useAppStore } from '@/store/useAppStore';

/** bootstrap 完成前的骨架屏；hydrated=false 时绝不渲染三模块。 */
function BootstrapSkeleton(): JSX.Element {
  return (
    <Box className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#f5f7f5]">
      <Box className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2f6f5e] text-3xl text-white">
        叶
      </Box>
      <CircularProgress size={26} sx={{ color: '#2f6f5e' }} />
      <Typography variant="body2" color="text.secondary">
        正在打开你的活页…
      </Typography>
    </Box>
  );
}

/** 根组件：hydrate 门禁 + AppShell（三 tab 分发在壳内）。 */
export default function App(): JSX.Element {
  const hydrated = useAppStore((state) => state.hydrated);
  if (!hydrated) {
    return <BootstrapSkeleton />;
  }
  return <AppShell />;
}
