/**
 * 预览容器（架构 §2.4 / F-1）。
 * 宽屏右侧常驻面板 / 窄屏全屏页。业务组件（ContentDetail + PreviewRouter）完全复用，
 * 只有容器形态不同；形态选择由 AppShell 依据 useResponsive() 的结果决定。
 */
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ContentDetail from '@/components/content/ContentDetail';
import { EmptyState } from '@/components/common/Feedback';
import { useAppStore } from '@/store/useAppStore';
import type { PreviewPanelProps } from '@/types/domain';

/** 内容不存在时的空态。 */
function PreviewEmpty(): JSX.Element {
  return (
    <EmptyState
      title="选一条内容，站内直接看"
      description="B 站视频、剪藏卡片、本地图片与笔记都在这里打开，不用来回跳原站。"
    />
  );
}

/** 面板主体：标题 + ContentDetail（内含 PreviewRouter 三路径分发）。 */
function PreviewBody({ contentId }: { contentId: string | undefined }): JSX.Element {
  const content = useAppStore((state) =>
    state.contents.find((item) => item.id === contentId),
  );
  if (!content) return <PreviewEmpty />;
  return <ContentDetail content={content} />;
}

export default function PreviewPanel({ mode }: PreviewPanelProps): JSX.Element {
  const selectedContentId = useAppStore((state) => state.selectedContentId);
  const setSelectedContentId = useAppStore((state) => state.setSelectedContentId);
  const close = (): void => setSelectedContentId(undefined);

  if (mode === 'overlay') {
    return (
      <Dialog fullScreen open={Boolean(selectedContentId)} onClose={close}>
        <AppBar position="static" elevation={0} color="transparent" className="border-b border-[#e3e9e5] bg-white">
          <Toolbar className="min-h-[56px] justify-between">
            <Typography variant="subtitle1">站内预览</Typography>
            <IconButton edge="end" aria-label="关闭预览" onClick={close}>
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7f5] p-3">
          <PreviewBody contentId={selectedContentId} />
        </Box>
      </Dialog>
    );
  }

  return (
    <Box className="flex h-full min-h-0 flex-col">
      <Box className="flex items-center justify-between border-b border-[#e3e9e5] px-4 py-3">
        <Typography variant="subtitle1">站内预览</Typography>
        {selectedContentId && (
          <IconButton size="small" aria-label="清除选中内容" onClick={close}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box className="min-h-0 flex-1 overflow-y-auto p-4">
        <PreviewBody contentId={selectedContentId} />
      </Box>
    </Box>
  );
}
