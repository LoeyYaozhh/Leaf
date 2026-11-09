/**
 * 本地图片 / 笔记站内预览（架构 §2.4 / A-7）。
 * objectURL 由 useAssetUrl 惰性生成、卸载 revoke；笔记正文读 Blob.text()，不抓取外站。
 */
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { AssetImage, PlaceholderImage } from '@/components/common/Feedback';
import { useAssetText } from '@/hooks/useAssetUrl';
import type { ContentItem } from '@/types/domain';

export default function LocalPreview({ content }: { content: ContentItem }): JSX.Element {
  const isNote = content.source.kind === 'local_note';
  const assetId = content.source.assetId;
  const textState = useAssetText(isNote ? assetId : undefined);
  const body = textState.text || content.clipBody || '';

  return (
    <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      {!isNote &&
        (assetId ? (
          <AssetImage assetId={assetId} alt={content.title} height={240} />
        ) : (
          <PlaceholderImage label="本地图片资源缺失" height={240} />
        ))}

      <Typography variant="h6">{content.title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {isNote ? '本地笔记 · 站内阅读' : '本地图片 · 浏览器本地库'}
      </Typography>
      <Divider />

      {isNote && (
        textState.loading ? (
          <Box className="flex flex-col gap-2">
            <Skeleton variant="rounded" height={20} />
            <Skeleton variant="rounded" height={20} />
            <Skeleton variant="rounded" height={20} />
          </Box>
        ) : textState.failed || !body ? (
          <Typography variant="body2" color="text.secondary">
            笔记正文资源不可用，可在编辑里重新粘贴正文。
          </Typography>
        ) : (
          <Box className="whitespace-pre-wrap rounded-xl bg-[#f5f7f5] p-3">
            <Typography variant="body2" component="pre" className="whitespace-pre-wrap font-sans leading-relaxed">
              {body}
            </Typography>
          </Box>
        )
      )}

      {content.note && (
        <Typography variant="caption" color="text.secondary">备注：{content.note}</Typography>
      )}
    </Box>
  );
}
