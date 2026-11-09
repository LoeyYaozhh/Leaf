import { describe, expect, it } from 'vitest';
import {
  cheerCount,
  computeSpaceView,
  hasCheered,
  isCheckInVisibleInSpace,
  isCollectionVisibleInSpace,
  isContentVisibleInSpace,
  toggleCheer,
} from '../src/domain/visibility';
import type { CheckInVisibility, ID } from '../src/types/domain';
import {
  AUTHOR,
  OTHER,
  THIRD,
  makeCheckIn,
  makeCheer,
  makeCollection,
  makeContent,
  makePlan,
  makeState,
} from './helpers';

/**
 * 架构 §4.5.3 六行可见性真值表，逐行通过 computeSpaceView 断言。
 * | visibility | hiddenInSpace | viewer | 空间动态流 |
 */
interface TruthRow {
  label: string;
  visibility: CheckInVisibility;
  hidden: boolean;
  viewer: ID;
  expected: boolean;
}

const TRUTH_TABLE: TruthRow[] = [
  {
    label: 'public + hidden=false → 任意 viewer 可见（默认公开 C-3）',
    visibility: 'public',
    hidden: false,
    viewer: OTHER,
    expected: true,
  },
  {
    label: 'public + hidden=true → 全不可见（计划级隐藏 C-4）',
    visibility: 'public',
    hidden: true,
    viewer: OTHER,
    expected: false,
  },
  {
    label: 'self_only + hidden=false → 作者本人可见（带私密标记）',
    visibility: 'self_only',
    hidden: false,
    viewer: AUTHOR,
    expected: true,
  },
  {
    label: 'self_only + hidden=false → 其他成员不可见',
    visibility: 'self_only',
    hidden: false,
    viewer: OTHER,
    expected: false,
  },
  {
    label: 'self_only + hidden=true → 作者仍可见（仅自己短路优先于计划开关）',
    visibility: 'self_only',
    hidden: true,
    viewer: AUTHOR,
    expected: true,
  },
  {
    label: 'self_only + hidden=true → 其他成员不可见',
    visibility: 'self_only',
    hidden: true,
    viewer: OTHER,
    expected: false,
  },
];

describe('computeSpaceView · 六行真值表（架构 §4.5.3）', () => {
  it.each(TRUTH_TABLE)('$label', ({ visibility, hidden, viewer, expected }) => {
    const plan = makePlan({ id: 'p1', hiddenInSpace: hidden });
    const checkIn = makeCheckIn({
      id: 'k1',
      memberId: AUTHOR,
      planId: 'p1',
      visibility,
      status: 'done',
    });
    const state = makeState({ plans: [plan], checkIns: [checkIn] });

    // 唯一入口 computeSpaceView 的结论
    expect(computeSpaceView(state, viewer).feed.some((ci) => ci.id === 'k1')).toBe(expected);
    // 与底层判定函数一致
    expect(isCheckInVisibleInSpace(checkIn, plan, viewer)).toBe(expected);
  });

  it('public + hidden=false 对作者与其他成员都可见', () => {
    const plan = makePlan({ id: 'p1', hiddenInSpace: false });
    const checkIn = makeCheckIn({ id: 'k1', memberId: AUTHOR, planId: 'p1', visibility: 'public', status: 'done' });
    const state = makeState({ plans: [plan], checkIns: [checkIn] });
    for (const viewer of [AUTHOR, OTHER, THIRD]) {
      expect(computeSpaceView(state, viewer).feed.some((ci) => ci.id === 'k1')).toBe(true);
    }
  });

  it('临时记录（planId undefined）不受计划级隐藏影响，默认公开', () => {
    const plan = makePlan({ id: 'p1', hiddenInSpace: true });
    const temp = makeCheckIn({ id: 'k-temp', planId: undefined, status: 'done' });
    const state = makeState({ plans: [plan], checkIns: [temp] });
    expect(computeSpaceView(state, OTHER).feed.map((ci) => ci.id)).toEqual(['k-temp']);
  });
});

describe('computeSpaceView · 动态流只含 done', () => {
  it('pending / leave 不进动态流（日历页仍完整可见）', () => {
    const state = makeState({
      checkIns: [
        makeCheckIn({ id: 'k-done', status: 'done' }),
        makeCheckIn({ id: 'k-pending', status: 'pending' }),
        makeCheckIn({ id: 'k-leave', status: 'leave' }),
      ],
    });
    expect(computeSpaceView(state, OTHER).feed.map((ci) => ci.id)).toEqual(['k-done']);
  });

  it('动态流按 createdAt 倒序', () => {
    const state = makeState({
      checkIns: [
        makeCheckIn({ id: 'old', createdAt: '2024-01-01T08:00:00.000Z' }),
        makeCheckIn({ id: 'new', createdAt: '2024-01-10T08:00:00.000Z' }),
        makeCheckIn({ id: 'mid', createdAt: '2024-01-05T08:00:00.000Z' }),
      ],
    });
    expect(computeSpaceView(state, AUTHOR).feed.map((ci) => ci.id)).toEqual([
      'new',
      'mid',
      'old',
    ]);
  });
});

describe('computeSpaceView · 内容 / 合集仅 publishedToSpace 可见（C-5）', () => {
  it('只返回已手动发布的内容与合集，且与 viewerId 无关', () => {
    const published = makeContent({ id: 'c-pub', publishedToSpace: true });
    const privateOne = makeContent({ id: 'c-priv', publishedToSpace: false });
    const pubCol = makeCollection({ id: 'col-pub', publishedToSpace: true });
    const privCol = makeCollection({ id: 'col-priv', publishedToSpace: false });
    const state = makeState({
      contents: [published, privateOne],
      collections: [pubCol, privCol],
    });

    for (const viewer of [AUTHOR, OTHER]) {
      const view = computeSpaceView(state, viewer);
      expect(view.sharedContents.map((c) => c.id)).toEqual(['c-pub']);
      expect(view.sharedCollections.map((c) => c.id)).toEqual(['col-pub']);
    }
    expect(isContentVisibleInSpace(published, OTHER)).toBe(true);
    expect(isContentVisibleInSpace(privateOne, OTHER)).toBe(false);
    expect(isCollectionVisibleInSpace(pubCol, OTHER)).toBe(true);
    expect(isCollectionVisibleInSpace(privCol, OTHER)).toBe(false);
  });
});

describe('computeSpaceView · 切换 viewerId 结果确有差异（C-2）', () => {
  it('作者能看到仅自己条目，其他成员看不到，feed 长度不同', () => {
    const state = makeState({
      plans: [makePlan({ id: 'p1', hiddenInSpace: false })],
      checkIns: [
        makeCheckIn({
          id: 'k-public',
          memberId: AUTHOR,
          planId: 'p1',
          visibility: 'public',
          status: 'done',
        }),
        makeCheckIn({
          id: 'k-private',
          memberId: AUTHOR,
          planId: 'p1',
          visibility: 'self_only',
          status: 'done',
        }),
      ],
    });

    const asAuthor = computeSpaceView(state, AUTHOR);
    const asOther = computeSpaceView(state, OTHER);

    expect(asAuthor.feed.some((ci) => ci.id === 'k-private')).toBe(true);
    expect(asOther.feed.some((ci) => ci.id === 'k-private')).toBe(false);
    expect(asAuthor.feed).toHaveLength(2);
    expect(asOther.feed).toHaveLength(1);
    expect(asAuthor.feed.length).not.toBe(asOther.feed.length);
  });

  it('切换身份只影响可见性结果，不修改传入的 state（纯函数、不缓存）', () => {
    const checkIn = makeCheckIn({ id: 'k1', visibility: 'self_only', status: 'done' });
    const state = makeState({ checkIns: [checkIn] });
    const snapshot = JSON.stringify(state);

    computeSpaceView(state, AUTHOR);
    computeSpaceView(state, OTHER);

    expect(JSON.stringify(state)).toBe(snapshot);
    expect(state.currentViewerId).toBe(AUTHOR);
  });
});

describe('computeSpaceView · 加油计数与按钮态（Q7）', () => {
  it('cheerCountByCheckIn 聚合正确、cheeredByViewer 按 viewerId 区分', () => {
    const state = makeState({
      checkIns: [
        makeCheckIn({ id: 'k1', status: 'done' }),
        makeCheckIn({ id: 'k2', status: 'done' }),
      ],
      cheers: [
        makeCheer('k1', AUTHOR),
        makeCheer('k1', OTHER),
        makeCheer('k2', OTHER),
      ],
    });

    const asAuthor = computeSpaceView(state, AUTHOR);
    expect(asAuthor.cheerCountByCheckIn['k1']).toBe(2);
    expect(asAuthor.cheerCountByCheckIn['k2']).toBe(1);
    expect(asAuthor.cheerCountByCheckIn['k3'] ?? 0).toBe(0);
    expect(asAuthor.cheeredByViewer.has('k1')).toBe(true);
    expect(asAuthor.cheeredByViewer.has('k2')).toBe(false);

    const asOther = computeSpaceView(state, OTHER);
    expect([...asOther.cheeredByViewer].sort()).toEqual(['k1', 'k2']);

    const asThird = computeSpaceView(state, THIRD);
    expect(asThird.cheeredByViewer.size).toBe(0);
  });

  it('cheerCount / hasCheered / toggleCheer 去重且可取消', () => {
    const initial = [makeCheer('k1', AUTHOR, 'ch1')];
    expect(cheerCount('k1', initial)).toBe(1);
    expect(cheerCount('k2', initial)).toBe(0);
    expect(hasCheered('k1', AUTHOR, initial)).toBe(true);
    expect(hasCheered('k1', OTHER, initial)).toBe(false);

    const added = toggleCheer('k1', OTHER, initial, 'ch2', '2024-01-15T12:00:00.000Z');
    expect(added).toHaveLength(2);
    expect(hasCheered('k1', OTHER, added)).toBe(true);

    const removed = toggleCheer('k1', AUTHOR, added, 'ch3', '2024-01-15T13:00:00.000Z');
    expect(removed.map((cheer) => cheer.id)).toEqual(['ch2']);
    expect(initial).toHaveLength(1); // 入参未被修改（纯函数）
  });
});
