import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 阻断持久化层：测试进程不接触 IndexedDB / 网络 / 浏览器 API。
 * 双保险：注入的 state 使用 hydrated:false，store 的订阅回调会在首行直接 return
 * （见 useAppStore.ts:306-308），因此即使 mock 未被解析命中也不会触发任何落盘。
 */
vi.mock('../src/storage/repository', () => ({
  persistState: vi.fn().mockResolvedValue(undefined),
  readState: vi.fn(),
  writeState: vi.fn(),
  putAsset: vi.fn(),
  getAsset: vi.fn(),
  deleteAsset: vi.fn(),
  writeAsset: vi.fn(),
  exportAll: vi.fn(),
  importAll: vi.fn(),
}));

import { getTodayISO } from '../src/constants/app';
import { useAppStore } from '../src/store/useAppStore';
import { makeCheckIn, makeContent, makeState } from './helpers';

/**
 * 每次用例前重置为最小 AppState，保证测试独立、幂等。
 * checkIn.date 取 getTodayISO()，使 setCheckInStatus('done') 落入 7 天补卡窗口（差 0 天）。
 */
function resetStore(): void {
  const today = getTodayISO();
  useAppStore.setState(
    makeState({
      contents: [makeContent({ id: 'c1', completion: 'not_started' })],
      checkIns: [
        makeCheckIn({
          id: 'k1',
          date: today,
          status: 'pending',
          visibility: 'public',
        }),
      ],
      hydrated: false,
    }),
  );
}

beforeEach(resetStore);

describe('铁律 1 · 内容完成状态与打卡状态互不自动同步（A-6）', () => {
  it('setContentCompletion 只写 contents，checkIns 数组内容与引用都不变', () => {
    // Arrange
    const checkInsBefore = useAppStore.getState().checkIns;
    const snapshot = JSON.parse(JSON.stringify(checkInsBefore)) as typeof checkInsBefore;

    // Act
    useAppStore.getState().setContentCompletion('c1', 'done');

    // Assert
    const after = useAppStore.getState();
    expect(after.contents.find((item) => item.id === 'c1')?.completion).toBe('done');
    expect(after.checkIns).toEqual(snapshot);
    expect(after.checkIns).toBe(checkInsBefore); // 引用不变：完全没有触碰 checkIns
  });

  it('setCheckInStatus 只写 checkIns，contents 数组内容与引用都不变', () => {
    const contentsBefore = useAppStore.getState().contents;
    const snapshot = JSON.parse(JSON.stringify(contentsBefore)) as typeof contentsBefore;

    useAppStore.getState().setCheckInStatus('k1', 'done');

    const after = useAppStore.getState();
    expect(after.checkIns.find((item) => item.id === 'k1')?.status).toBe('done');
    expect(after.contents).toEqual(snapshot);
    expect(after.contents).toBe(contentsBefore);
  });

  it('两个方向连续操作也不产生任何联动', () => {
    useAppStore.getState().setContentCompletion('c1', 'in_progress');
    expect(useAppStore.getState().checkIns[0]?.status).toBe('pending');

    useAppStore.getState().setCheckInStatus('k1', 'leave');
    expect(useAppStore.getState().contents[0]?.completion).toBe('in_progress');
  });

  it('store 不暴露任何 syncXxx / markBothDone 之类联动 setter（运行时反射）', () => {
    const actionNames = Object.entries(useAppStore.getState())
      .filter(([, value]) => typeof value === 'function')
      .map(([key]) => key);

    expect(actionNames).toContain('setContentCompletion');
    expect(actionNames).toContain('setCheckInStatus');
    expect(actionNames.some((name) => /^sync|markBoth|markAllDone/i.test(name))).toBe(false);
  });
});

describe('铁律 3 · 身份切换只改 currentViewerId（C-2）', () => {
  it('setCurrentViewerId 不触碰任何业务数组', () => {
    const before = useAppStore.getState();
    const { contents, checkIns, plans, collections, cheers, members } = before;

    before.setCurrentViewerId('m2');

    const after = useAppStore.getState();
    expect(after.currentViewerId).toBe('m2');
    expect(after.contents).toBe(contents);
    expect(after.checkIns).toBe(checkIns);
    expect(after.plans).toBe(plans);
    expect(after.collections).toBe(collections);
    expect(after.cheers).toBe(cheers);
    expect(after.members).toBe(members);
  });
});
