/** 合集进度与顺序重排纯函数（架构 §3.2 / A-5 / A-12 P1）。 */
import type { Collection, CollectionProgress, ID } from '@/types/domain';

/**
 * 「第 N / M 条」进度（1-based）。内容不属于该合集时返回 null。
 */
export function collectionProgress(
  collection: Collection,
  contentId: ID,
): CollectionProgress | null {
  const position = collection.orderedContentIds.indexOf(contentId);
  if (position < 0) return null;
  return { index: position + 1, total: collection.orderedContentIds.length };
}

/**
 * 拖动排序：把 from 位置的元素移动到 to 位置，返回新的有序 ID 数组（不修改入参）。
 * 越界时原样返回副本。
 */
export function reorderCollection(collection: Collection, from: number, to: number): ID[] {
  const ids = collection.orderedContentIds.slice();
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length || from === to) {
    return ids;
  }
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);
  return ids;
}
