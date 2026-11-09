/**
 * 内容卡片（架构 §2.5 / A-1 / A-2 / A-5）。
 * 封面、领域 chip、媒体属性、标签、收录时间、完成状态、合集进度角标。
 */
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import { ContentCover } from '@/components/common/Feedback';
import { COMPLETION_LABELS, MEDIA_LABELS, SOURCE_LABELS } from '@/constants/app';
import { collectionProgress } from '@/domain/collection';
import type { ContentCardProps, ContentItem } from '@/types/domain';

const COMPLETION_TONE: Record<ContentItem['completion'], 'default' | 'info' | 'success'> = {
  not_started: 'default',
  in_progress: 'info',
  done: 'success',
};

export default function ContentCard({
  content,
  collections,
  selected,
  onSelect,
}: ContentCardProps): JSX.Element {
  const firstCollection = collections.find((collection) =>
    content.collectionIds.includes(collection.id),
  );
  const progress = firstCollection
    ? collectionProgress(firstCollection, content.id)
    : null;

  return (
    <Card
      elevation={selected ? 6 : 1}
      className={`flex h-full flex-col overflow-hidden rounded-2xl transition-shadow ${
        selected ? 'ring-2 ring-[#2f6f5e]' : ''
      }`}
    >
      <CardActionArea
        onClick={() => onSelect(content.id)}
        className="flex h-full flex-col items-stretch"
      >
        <Box className="p-2">
          <ContentCover content={content} height={132} />
        </Box>

        <Box className="flex flex-1 flex-col gap-2 px-3 pb-3">
          <Box className="flex items-start justify-between gap-2">
            <Typography variant="subtitle2" className="line-clamp-2 leading-snug">
              {content.title}
            </Typography>
            {progress && (
              <Chip
                size="small"
                variant="outlined"
                label={`第 ${progress.index} / ${progress.total} 条`}
                className="shrink-0"
              />
            )}
          </Box>

          <Box className="flex flex-wrap gap-1">
            <Chip size="small" color="primary" label={content.domain} />
            <Chip size="small" variant="outlined" label={MEDIA_LABELS[content.media]} />
            <Chip size="small" variant="outlined" label={SOURCE_LABELS[content.source.kind]} />
          </Box>

          {content.tags.length > 0 && (
            <Typography variant="caption" color="text.secondary" className="line-clamp-1">
              #{content.tags.join('  #')}
            </Typography>
          )}

          <Box className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-1">
            <Typography variant="caption" color="text.secondary">
              {content.collectedAt.slice(0, 10)} 收录
            </Typography>
            <Box className="flex items-center gap-1">
              <Chip
                size="small"
                color={COMPLETION_TONE[content.completion]}
                label={COMPLETION_LABELS[content.completion]}
              />
              {content.publishedToSpace ? (
                <PublicIcon sx={{ fontSize: 15, color: '#2f6f5e' }} />
              ) : (
                <LockIcon sx={{ fontSize: 15, color: '#aab8b1' }} />
              )}
            </Box>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
