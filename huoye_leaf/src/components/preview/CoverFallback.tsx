/**
 * 降级封面卡（架构 §2.4 / A-8 / A-14）。
 * B 站 iframe 超时 / 手动降级 / 外链来源时显示；
 * 「去原站」仅作兜底按钮，必须用户主动点击才跳外站。
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ContentCover } from '@/components/common/Feedback';
import { SOURCE_LABELS } from '@/constants/app';
import type { CoverFallbackProps } from '@/types/domain';

export default function CoverFallback({
  content,
  reason,
  onRetry,
}: CoverFallbackProps): JSX.Element {
  const sourceUrl = content.source.sourceUrl;

  const openOriginal = (): void => {
    if (!sourceUrl) return;
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      <ContentCover content={content} height={200} />
      <Typography variant="subtitle1">{content.title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {SOURCE_LABELS[content.source.kind]}
        {reason ? ` · ${reason}` : ''}
      </Typography>
      <Typography variant="body2" color="text.secondary" className="leading-relaxed">
        {content.note || '嵌入不可用，已自动降级为封面卡。内容仍在活页里，可稍后重试或去原站查看。'}
      </Typography>
      <Box className="flex flex-wrap gap-2">
        {sourceUrl && (
          <Button
            variant="contained"
            size="small"
            endIcon={<OpenInNewIcon />}
            onClick={openOriginal}
          >
            去原站
          </Button>
        )}
        {onRetry && (
          <Button variant="outlined" size="small" onClick={onRetry}>
            重试站内播放
          </Button>
        )}
      </Box>
    </Box>
  );
}
