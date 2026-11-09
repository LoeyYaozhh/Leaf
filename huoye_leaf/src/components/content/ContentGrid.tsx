/**
 * 内容列表 / 卡片网格（架构 §2.5 / A-3）。
 * 默认收录时间倒序（由 LeafPage 传入已排好序的数组），空态友好提示。
 */
import Box from '@mui/material/Box';
import ContentCard from '@/components/content/ContentCard';
import { EmptyState } from '@/components/common/Feedback';
import type { ContentGridProps } from '@/types/domain';

export default function ContentGrid({
  contents,
  collections,
  selectedContentId,
  onSelect,
}: ContentGridProps): JSX.Element {
  if (contents.length === 0) {
    return (
      <EmptyState
        title="没有符合条件的内容"
        description="试着清除几个筛选条件，或点「新增内容」把 B 站链接、剪藏卡片、本地图片与笔记收进活页。"
      />
    );
  }

  return (
    <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {contents.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          collections={collections}
          selected={selectedContentId === content.id}
          onSelect={onSelect}
        />
      ))}
    </Box>
  );
}
