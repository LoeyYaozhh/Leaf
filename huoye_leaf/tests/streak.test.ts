import { describe, expect, it } from 'vitest';
import {
  buildStatusByDate,
  canBackfill,
  computeStreak,
  getHeatmapStatus,
} from '../src/domain/streak';
import type { CheckInStatus, ISODate } from '../src/types/domain';
import { AUTHOR, OTHER, TODAY, makeCheckIn } from './helpers';

/** 6 个连续应完成日；「今天」固定为最后一天，未来日期单独构造。 */
const D: ISODate[] = [
  '2024-01-09',
  '2024-01-10',
  '2024-01-11',
  '2024-01-12',
  '2024-01-13',
  '2024-01-14',
];
const STREAK_TODAY: ISODate = '2024-01-14';

function statusMap(entries: Array<[ISODate, CheckInStatus]>): Record<ISODate, CheckInStatus> {
  const result: Record<ISODate, CheckInStatus> = {};
  for (const [date, status] of entries) result[date] = status;
  return result;
}

const allDone = (): Record<ISODate, CheckInStatus> =>
  statusMap(D.map((date) => [date, 'done'] as [ISODate, CheckInStatus]));

describe('computeStreak · 全 done', () => {
  it('当前连续 = 最长连续 = 应完成日天数', () => {
    expect(computeStreak(D, allDone(), STREAK_TODAY)).toEqual({ current: 6, longest: 6 });
  });
});

describe('computeStreak · 漏打应完成日', () => {
  it('漏掉最近一个应完成日 → 当前连续清零，longest 保留此前峰值', () => {
    const status = { ...allDone(), '2024-01-14': 'pending' as CheckInStatus };
    expect(computeStreak(D, status, STREAK_TODAY)).toEqual({ current: 0, longest: 5 });
  });

  it('中间漏一个应完成日 → 连续被打断，longest 保留峰值，current 从断点后重算', () => {
    const status = { ...allDone(), '2024-01-12': 'pending' as CheckInStatus };
    expect(computeStreak(D, status, STREAK_TODAY)).toEqual({ current: 2, longest: 3 });
  });
});

describe('computeStreak · 请假 leave', () => {
  it('leave 不中断也不计入：done 跨过请假日继续累加', () => {
    const status = { ...allDone(), '2024-01-11': 'leave' as CheckInStatus };
    expect(computeStreak(D, status, STREAK_TODAY)).toEqual({ current: 5, longest: 5 });
  });

  it('最小用例：done / leave / done → current=longest=2（leave 不加 1、不清零）', () => {
    const due: ISODate[] = ['2024-01-09', '2024-01-10', '2024-01-11'];
    const status = statusMap([
      ['2024-01-09', 'done'],
      ['2024-01-10', 'leave'],
      ['2024-01-11', 'done'],
    ]);
    expect(computeStreak(due, status, '2024-01-11')).toEqual({ current: 2, longest: 2 });
  });
});

describe('computeStreak · pending / 缺失 / 未来 / 休息日', () => {
  it('pending 与 statusByDate 缺失都令当前连续中断', () => {
    const due: ISODate[] = ['2024-01-09', '2024-01-10', '2024-01-11'];
    const status = statusMap([['2024-01-09', 'done']]); // 后两天缺失 → 视为 pending
    expect(computeStreak(due, status, '2024-01-11')).toEqual({ current: 0, longest: 1 });
  });

  it('未来应完成日不计入（即使状态为 done）', () => {
    const due: ISODate[] = [...D, '2024-01-15', '2024-01-16'];
    const status = statusMap(due.map((date) => [date, 'done'] as [ISODate, CheckInStatus]));
    expect(computeStreak(due, status, STREAK_TODAY)).toEqual({ current: 6, longest: 6 });
  });

  it('休息日（本就不在 dueDates 内）不中断连续', () => {
    const due: ISODate[] = ['2024-01-09', '2024-01-11']; // 01-10 为休息日
    const status = statusMap([
      ['2024-01-09', 'done'],
      ['2024-01-10', 'pending'], // 非应完成日上的 pending 不参与计算
      ['2024-01-11', 'done'],
    ]);
    expect(computeStreak(due, status, '2024-01-11')).toEqual({ current: 2, longest: 2 });
  });

  it('空应完成日集合返回 { current: 0, longest: 0 }', () => {
    expect(computeStreak([], allDone(), STREAK_TODAY)).toEqual({ current: 0, longest: 0 });
  });
});

describe('canBackfill · 7 天补卡窗口（Q5）', () => {
  const cases: Array<[ISODate, boolean, string]> = [
    ['2024-01-15', true, '今天（差 0 天）可补'],
    ['2024-01-08', true, '第 7 天可补'],
    ['2024-01-07', false, '第 8 天不可补'],
    ['2024-01-16', false, '未来日期不可补'],
    ['not-a-date', false, '非法日期不可补'],
  ];

  it.each(cases)('%s → %s（%s）', (date, expected) => {
    expect(canBackfill(date, TODAY)).toBe(expected);
  });
});

describe('getHeatmapStatus · 月历四态', () => {
  it('done / leave / pending / off（非排期日）', () => {
    const due: ISODate[] = [
      '2024-01-10',
      '2024-01-11',
      '2024-01-12',
      '2024-01-13',
    ];
    const status = statusMap([
      ['2024-01-10', 'done'],
      ['2024-01-11', 'leave'],
      ['2024-01-12', 'pending'],
    ]);

    expect(getHeatmapStatus('2024-01-10', due, status)).toBe('done');
    expect(getHeatmapStatus('2024-01-11', due, status)).toBe('leave');
    expect(getHeatmapStatus('2024-01-12', due, status)).toBe('pending');
    expect(getHeatmapStatus('2024-01-13', due, status)).toBe('pending'); // 应完成日但缺记录
    expect(getHeatmapStatus('2024-01-14', due, status)).toBe('off'); // 非排期日
  });
});

describe('buildStatusByDate · 每日状态聚合', () => {
  it('同一天多条打卡取最优（done > leave > pending），且只聚合指定成员', () => {
    const checkIns = [
      makeCheckIn({ id: 'k1', memberId: AUTHOR, date: '2024-01-10', status: 'pending' }),
      makeCheckIn({ id: 'k2', memberId: AUTHOR, date: '2024-01-10', status: 'leave' }),
      makeCheckIn({ id: 'k3', memberId: AUTHOR, date: '2024-01-10', status: 'done' }),
      makeCheckIn({ id: 'k4', memberId: OTHER, date: '2024-01-11', status: 'done' }),
    ];
    const map = buildStatusByDate(checkIns, AUTHOR);
    expect(map['2024-01-10']).toBe('done');
    expect(map['2024-01-11']).toBeUndefined();
  });

  it('临时记录（planId undefined）也参与聚合，但只有落在 dueDates 内的日期才影响连续', () => {
    const checkIns = [
      makeCheckIn({ id: 'k-temp', planId: undefined, date: '2024-01-20', status: 'done' }),
    ];
    const map = buildStatusByDate(checkIns, AUTHOR);
    expect(map['2024-01-20']).toBe('done');
    // 非应完成日上的 done 不改变连续天数
    expect(computeStreak(D, map, STREAK_TODAY)).toEqual({ current: 0, longest: 0 });
  });
});
