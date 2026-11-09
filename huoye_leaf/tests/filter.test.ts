import { describe, expect, it } from 'vitest';
import { filterContents, searchContents, sortByCollectedAt } from '../src/domain/filter';
import type { ContentItem, ID } from '../src/types/domain';
import { makeCollection, makeContent } from './helpers';

/**
 * 三条内容覆盖各搜索字段：
 * - a：剪藏正文（clipBody）+ 视频；b：另一条剪藏正文 + 图片；c：笔记正文（clipBody）+ 笔记
 * 注：实现中剪藏卡片与本地笔记的正文统一存于 ContentItem.clipBody（见 ContentEditor.tsx:180-192），
 *     searchContents 因此能同时命中两者；note 字段对应「备注」。
 */
const contents: ContentItem[] = [
  makeContent({
    id: 'a',
    title: 'B 站知识体系视频 Bilibili Tips',
    note: '方法论备注',
    domain: '学习',
    media: 'video',
    tags: ['知识管理', 'B站', '标签命中词'],
    collectedAt: '2024-01-02T10:00:00.000Z',
    completion: 'done',
    collectionIds: ['col-study'],
    clipBody: '剪藏正文讲番茄工作法与专注间隔',
  }),
  makeContent({
    id: 'b',
    title: '跑步拉伸图解',
    note: '小腿放松',
    domain: '健身',
    media: 'image',
    tags: ['跑步'],
    collectedAt: '2024-01-05T10:00:00.000Z',
    completion: 'not_started',
    collectionIds: ['col-fit'],
    clipBody: '剪藏正文提到髂胫束与拉伸节奏',
  }),
  makeContent({
    id: 'c',
    title: '读书笔记',
    note: '元认知',
    domain: '学习',
    media: 'note',
    tags: ['读书', '元认知'],
    collectedAt: '2024-01-09T10:00:00.000Z',
    completion: 'in_progress',
    collectionIds: ['col-study'],
    clipBody: '笔记正文里有一段关于复利曲线的记录',
  }),
];

const collections = [
  makeCollection({ id: 'col-study', name: '学习清单', orderedContentIds: ['a', 'c'] }),
  makeCollection({ id: 'col-fit', name: '健身跟练', orderedContentIds: ['b'] }),
];

const ids = (items: ContentItem[]): ID[] => items.map((item) => item.id);

describe('filterContents · 多条件 AND（A-3）', () => {
  it('空条件返回全部', () => {
    expect(ids(filterContents(contents, {}))).toEqual(['a', 'b', 'c']);
  });

  it('单条件：领域类型', () => {
    expect(ids(filterContents(contents, { domain: '学习' }))).toEqual(['a', 'c']);
  });

  it('单条件：完成状态', () => {
    expect(ids(filterContents(contents, { completion: 'done' }))).toEqual(['a']);
  });

  it('标签为「与」关系：需同时含全部选中标签', () => {
    expect(ids(filterContents(contents, { tags: ['知识管理', 'B站'] }))).toEqual(['a']);
    expect(ids(filterContents(contents, { tags: ['知识管理', '跑步'] }))).toEqual([]);
  });

  it('单条件：收录时间区间（按 collectedAt 的日历日）', () => {
    expect(
      ids(filterContents(contents, { dateRange: { start: '2024-01-05', end: '2024-01-09' } })),
    ).toEqual(['b', 'c']);
  });

  it('多条件同时生效为交集', () => {
    expect(
      ids(
        filterContents(contents, {
          domain: '学习',
          completion: 'done',
          tags: ['知识管理'],
          dateRange: { start: '2024-01-01', end: '2024-01-03' },
        }),
      ),
    ).toEqual(['a']);
  });

  it('多条件互斥时返回空集', () => {
    expect(ids(filterContents(contents, { domain: '健身', completion: 'done' }))).toEqual([]);
  });

  it('media chip 作为独立可选视图过滤条件', () => {
    expect(ids(filterContents(contents, { media: 'note' }))).toEqual(['c']);
  });
});

describe('searchContents · 全字段搜索（A-4）', () => {
  const cases: Array<{ label: string; keyword: string; expected: ID[] }> = [
    { label: '命中标题', keyword: '知识体系', expected: ['a'] },
    { label: '命中备注 note', keyword: '小腿', expected: ['b'] },
    { label: '命中标签 tags', keyword: '标签命中词', expected: ['a'] },
    { label: '命中合集名', keyword: '学习清单', expected: ['a', 'c'] },
    { label: '命中另一合集名', keyword: '健身跟练', expected: ['b'] },
    { label: '命中剪藏正文 clipBody', keyword: '番茄工作法', expected: ['a'] },
    { label: '命中另一条剪藏正文', keyword: '髂胫束', expected: ['b'] },
    { label: '命中笔记正文 clipBody', keyword: '复利曲线', expected: ['c'] },
    { label: '大小写不敏感', keyword: 'bilibili tips', expected: ['a'] },
    { label: '关键词首尾空白被 trim', keyword: '  小腿  ', expected: ['b'] },
    { label: '无命中返回空集', keyword: '不存在的词xyz', expected: [] },
  ];

  it.each(cases)('$label', ({ keyword, expected }) => {
    expect(ids(searchContents(contents, keyword, collections))).toEqual(expected);
  });

  it('空关键词 / 纯空白返回全部内容（且是新数组）', () => {
    const empty = searchContents(contents, '', collections);
    expect(ids(empty)).toEqual(['a', 'b', 'c']);
    expect(empty).not.toBe(contents);

    const blank = searchContents(contents, '   ', collections);
    expect(ids(blank)).toEqual(['a', 'b', 'c']);
  });

  it('搜索不修改入参数组', () => {
    const snapshot = JSON.stringify(contents);
    searchContents(contents, '复利曲线', collections);
    expect(JSON.stringify(contents)).toBe(snapshot);
  });

  it('合集名映射缺失的 collectionId 不导致误命中或抛错', () => {
    const orphan = makeContent({ id: 'orphan', collectionIds: ['col-missing'] });
    expect(ids(searchContents([orphan], '学习清单', collections))).toEqual([]);
    expect(ids(searchContents([orphan], 'orphan', collections))).toEqual([]);
  });
});

describe('sortByCollectedAt · 收录时间倒序（A-3）', () => {
  it('按 collectedAt 倒序排列', () => {
    const shuffled = [contents[1], contents[2], contents[0]];
    expect(ids(sortByCollectedAt(shuffled))).toEqual(['c', 'b', 'a']);
  });

  it('不修改入参数组（返回副本）', () => {
    const shuffled = [contents[1], contents[0], contents[2]];
    const result = sortByCollectedAt(shuffled);
    expect(ids(shuffled)).toEqual(['b', 'a', 'c']);
    expect(result).not.toBe(shuffled);
  });

  it('contentDate 不参与排序（仅按 collectedAt）', () => {
    const withContentDate = contents.map((item) => ({
      ...item,
      contentDate: item.id === 'a' ? '2024-06-01' : '2020-01-01',
    }));
    expect(ids(sortByCollectedAt(withContentDate))).toEqual(['c', 'b', 'a']);
  });
});
