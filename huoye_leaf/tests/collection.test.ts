import { describe, expect, it } from 'vitest';
import { collectionProgress, reorderCollection } from '../src/domain/collection';
import type { Collection } from '../src/types/domain';
import { makeCollection } from './helpers';

/** 合集进度与顺序重排（架构 §3.2 / A-5 / A-12 P1）。 */
function ordered(ids: string[]): Collection {
  return makeCollection({ id: 'col1', orderedContentIds: ids });
}

describe('collectionProgress ·「第 N / M 条」（1-based）', () => {
  it('返回 1-based 序号与总数', () => {
    expect(collectionProgress(ordered(['c1', 'c2', 'c3']), 'c2')).toEqual({ index: 2, total: 3 });
  });

  it('首条返回 index=1', () => {
    expect(collectionProgress(ordered(['c1', 'c2']), 'c1')).toEqual({ index: 1, total: 2 });
  });

  it('内容不属于该合集时返回 null', () => {
    expect(collectionProgress(ordered(['c1', 'c2']), 'cX')).toBeNull();
  });

  it('空合集返回 null', () => {
    expect(collectionProgress(ordered([]), 'c1')).toBeNull();
  });
});

describe('reorderCollection · 拖动排序（A-12 P1）', () => {
  it('把首条移动到末尾', () => {
    expect(reorderCollection(ordered(['c1', 'c2', 'c3']), 0, 2)).toEqual(['c2', 'c3', 'c1']);
  });

  it('把末条移动到首位', () => {
    expect(reorderCollection(ordered(['c1', 'c2', 'c3']), 2, 0)).toEqual(['c3', 'c1', 'c2']);
  });

  it('越界 / 相同位置原样返回副本', () => {
    expect(reorderCollection(ordered(['c1', 'c2']), -1, 1)).toEqual(['c1', 'c2']);
    expect(reorderCollection(ordered(['c1', 'c2']), 0, 5)).toEqual(['c1', 'c2']);
    expect(reorderCollection(ordered(['c1', 'c2']), 1, 1)).toEqual(['c1', 'c2']);
  });

  it('不修改入参数组（纯函数）', () => {
    const collection = ordered(['c1', 'c2', 'c3']);
    const result = reorderCollection(collection, 0, 2);
    expect(collection.orderedContentIds).toEqual(['c1', 'c2', 'c3']);
    expect(result).not.toBe(collection.orderedContentIds);
  });
});
