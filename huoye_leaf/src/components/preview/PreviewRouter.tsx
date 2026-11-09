/**
 * 站内预览分发（架构 §2.4 / §4.2 / A-7~A-10）。
 * 依 SourceDescriptor.kind 分发三条站内路径 + 降级封面卡；全链路无 fetch()。
 */
import BilibiliPlayer from '@/components/preview/BilibiliPlayer';
import ClipReader from '@/components/preview/ClipReader';
import CoverFallback from '@/components/preview/CoverFallback';
import LocalPreview from '@/components/preview/LocalPreview';
import type { ContentItem } from '@/types/domain';

export default function PreviewRouter({ content }: { content: ContentItem }): JSX.Element {
  switch (content.source.kind) {
    case 'bilibili':
      return <BilibiliPlayer content={content} />;
    case 'clip':
      return <ClipReader content={content} />;
    case 'local_image':
    case 'local_note':
      return <LocalPreview content={content} />;
    case 'external':
      return <CoverFallback content={content} reason="该来源没有嵌入接口" />;
    default:
      return <CoverFallback content={content} reason="未知来源类型" />;
  }
}
