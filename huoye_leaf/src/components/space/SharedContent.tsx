/**
 * 发到空间的内容 / 合集（架构 §2.6 / C-5）。
 * ★ 只渲染 useSpaceView() 产出的 sharedContents / sharedCollections。
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { ContentCover, EmptyState } from '@/components/common/Feedback';
import { COMPLETION_LABELS, MEDIA_LABELS } from '@/constants/app';
import { useAppStore } from '@/store/useAppStore';
import type { SpaceView } from '@/types/domain';

export default function SharedContent({ view }: { view: SpaceView }): JSX.Element {
  const publishContent = useAppStore((state) => state.publishContent);
  const publishCollection = useAppStore((state) => state.publishCollection);
  const navigateToContent = useAppStore((state) => state.navigateToContent);

  const isEmpty =
    view.sharedContents.length === 0 && view.sharedCollections.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        title="空间里还没有资料库内容"
        description="资料库默认私有。到活页的内容详情里打开「发到空间」，或在合集清单里发布合集，家人才能看到。"
      />
    );
  }

  return (
    <Box className="flex flex-col gap-3">
      {view.sharedCollections.length > 0 && (
        <Box className="flex flex-wrap gap-2">
          {view.sharedCollections.map((collection) => (
            <Box
              key={collection.id}
              className="flex items-center gap-2 rounded-xl border border-[#e3e9e5] bg-white px-3 py-2"
            >
              <Box className="min-w-0">
                <Typography variant="subtitle2">合集：{collection.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  共 {collection.orderedContentIds.length} 条
                </Typography>
              </Box>
              <Button
                size="small"
                color="inherit"
                onClick={() => publishCollection(collection.id, false)}
              >
                从空间移除
              </Button>
            </Box>
          ))}
        </Box>
      )}

      {view.sharedContents.length > 0 && (
        <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {view.sharedContents.map((content) => (
            <Box
              key={content.id}
              className="flex flex-col gap-2 rounded-2xl border border-[#e3e9e5] bg-white p-3"
            >
              <Box
                className="cursor-pointer"
                onClick={() => navigateToContent(content.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') navigateToContent(content.id);
                }}
              >
                <ContentCover content={content} height={120} />
              </Box>
              <Typography variant="subtitle2">{content.title}</Typography>
              <Box className="flex flex-wrap gap-1">
                <Chip size="small" color="primary" label={content.domain} />
                <Chip size="small" variant="outlined" label={MEDIA_LABELS[content.media]} />
                <Chip size="small" variant="outlined" label={COMPLETION_LABELS[content.completion]} />
              </Box>
              <Box className="flex items-center justify-between gap-2">
                <Button size="small" onClick={() => navigateToContent(content.id)}>
                  站内预览
                </Button>
                <Button size="small" color="inherit" onClick={() => publishContent(content.id, false)}>
                  从空间移除
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
