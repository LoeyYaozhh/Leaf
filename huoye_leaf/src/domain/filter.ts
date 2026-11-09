/**
 * 内容查询纯函数（架构 §3.2 / A-3 / A-4）。
 * - filterContents：多条件 AND（类型 × 标签 × 时间 × 完成状态），media 作为独立 chip 视图过滤；
 * - searchContents：全字段搜索，含剪藏正文与笔记正文、合集名；
 * - sortByCollectedAt：收录时间倒序（唯一默认排序主轴）。
 */
import type { Collection, ContentItem, FilterCriteria } from '@/types/domain';

/**
 * 多条件 AND 筛选。keyword 不在此处理（由 searchContents 负责），
 * media 为顶部 chip 的视图级过滤，不参与主筛选行的维度串联。
 */
export function filterContents(
  contents: ContentItem[],
  criteria: FilterCriteria,
): ContentItem[] {
  const tags = criteria.tags ?? [];
  return contents.filter((content) => {
    if (criteria.domain && content.domain !== criteria.domain) return false;

    if (tags.length > 0 && !tags.every((tag) => content.tags.includes(tag))) return false;

    if (criteria.dateRange) {
      const day = content.collectedAt.slice(0, 10);
      if (day < criteria.dateRange.start || day > criteria.dateRange.end) return false;
    }

    if (criteria.completion && content.completion !== criteria.completion) return false;

    if (criteria.media && content.media !== criteria.media) return false;

    return true;
  });
}

/**
 * 本地全字段搜索：标题 / 备注 / 领域 / 标签 / 合集名 / 剪藏与笔记正文 / 来源链接。
 * 不做任何网络请求（A-10）。
 */
export function searchContents(
  contents: ContentItem[],
  keyword: string,
  collections: Collection[],
): ContentItem[] {
  const query = keyword.trim().toLowerCase();
  if (!query) return contents.slice();

  const nameById = new Map<string, string>(
    collections.map((collection) => [collection.id, collection.name.toLowerCase()]),
  );

  return contents.filter((content) => {
    const collectionNames = content.collectionIds.map((id) => nameById.get(id) ?? '');
    const haystack: string[] = [
      content.title,
      content.note,
      content.domain,
      content.clipBody ?? '',
      content.source.sourceUrl ?? '',
      content.source.bvid ?? '',
      ...content.tags,
      ...collectionNames,
    ];
    return haystack.some((part) => part.toLowerCase().includes(query));
  });
}

/** 收录时间倒序（A-3：收录时间为主轴与默认排序；contentDate 不参与）。 */
export function sortByCollectedAt(contents: ContentItem[]): ContentItem[] {
  return contents.slice().sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
}
