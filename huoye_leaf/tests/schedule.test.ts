import { getDay, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  deriveAllDueDates,
  deriveDueDates,
  matchesFrequency,
} from '../src/domain/schedule';
import type { DateRange, Frequency, ISODate } from '../src/types/domain';
import { AUTHOR, OTHER, makePlan } from './helpers';

/**
 * 应完成日集合唯一口径（架构 §4.5.1 / B-1 / B-3 / Q4）。
 *
 * 固定区间 2024-01-01(周一) ~ 2024-01-07(周日)，星期映射：
 * 01=一(1) 02=二(2) 03=三(3) 04=四(4) 05=五(5) 06=六(6) 07=日(0)
 */
const WEEK: ISODate[] = [
  '2024-01-01',
  '2024-01-02',
  '2024-01-03',
  '2024-01-04',
  '2024-01-05',
  '2024-01-06',
  '2024-01-07',
];
const RANGE: DateRange = { start: '2024-01-01', end: '2024-01-07' };

describe('matchesFrequency', () => {
  it('前提校验：2024-01-01 确为周一（getDay() === 1）', () => {
    expect(getDay(parseISO('2024-01-01'))).toBe(1);
    expect(getDay(parseISO('2024-01-07'))).toBe(0);
  });

  it('daily 任意日期全命中', () => {
    expect(matchesFrequency({ kind: 'daily' }, '2024-01-06')).toBe(true);
  });

  it('specific_weekdays 只命中指定星期', () => {
    const freq: Frequency = { kind: 'specific_weekdays', weekdays: [1, 3, 5] };
    expect(matchesFrequency(freq, '2024-01-01')).toBe(true);
    expect(matchesFrequency(freq, '2024-01-02')).toBe(false);
  });

  it('weekly_n 用 candidateWeekdays 判定，与 timesPerWeek 无关', () => {
    const freq: Frequency = {
      kind: 'weekly_n',
      timesPerWeek: 1,
      candidateWeekdays: [1, 3, 5],
    };
    expect(matchesFrequency(freq, '2024-01-03')).toBe(true);
    expect(matchesFrequency(freq, '2024-01-04')).toBe(false);
  });

  it('custom_dates 命中指定日期字符串', () => {
    const freq: Frequency = { kind: 'custom_dates', dates: ['2024-01-02', '2024-01-05'] };
    expect(matchesFrequency(freq, '2024-01-02')).toBe(true);
    expect(matchesFrequency(freq, '2024-01-03')).toBe(false);
  });

  it('非法日期返回 false（不抛异常）', () => {
    expect(matchesFrequency({ kind: 'daily' }, 'not-a-date')).toBe(false);
  });
});

describe('deriveDueDates · daily', () => {
  it('区间内每天都是应完成日，结果升序且天然去重', () => {
    const plan = makePlan({ frequency: { kind: 'daily' }, startDate: '2024-01-01' });
    const due = deriveDueDates(plan, RANGE);
    expect(due).toEqual(WEEK);
    expect([...due].sort()).toEqual(due); // 已升序
    expect(new Set(due).size).toBe(due.length); // 无重复
  });
});

describe('deriveDueDates · specific_weekdays', () => {
  it('只命中指定星期（一 / 三 / 五）', () => {
    const plan = makePlan({
      frequency: { kind: 'specific_weekdays', weekdays: [1, 3, 5] },
    });
    expect(deriveDueDates(plan, RANGE)).toEqual([
      '2024-01-01',
      '2024-01-03',
      '2024-01-05',
    ]);
  });

  it('未指定的星期不进入集合（仅周日）', () => {
    const plan = makePlan({ frequency: { kind: 'specific_weekdays', weekdays: [0] } });
    expect(deriveDueDates(plan, RANGE)).toEqual(['2024-01-07']);
  });
});

describe('deriveDueDates · weekly_n（Q4 裁定）', () => {
  it('candidateWeekdays 作为排期日：timesPerWeek=1 但候选 3 天仍排出 3 天', () => {
    const plan = makePlan({
      frequency: { kind: 'weekly_n', timesPerWeek: 1, candidateWeekdays: [1, 3, 5] },
    });
    expect(deriveDueDates(plan, RANGE)).toEqual([
      '2024-01-01',
      '2024-01-03',
      '2024-01-05',
    ]);
  });

  it('timesPerWeek 不参与推导：N=5 但候选只有周一时仅排出周一', () => {
    const plan = makePlan({
      frequency: { kind: 'weekly_n', timesPerWeek: 5, candidateWeekdays: [1] },
    });
    expect(deriveDueDates(plan, RANGE)).toEqual(['2024-01-01']);
  });
});

describe('deriveDueDates · custom_dates', () => {
  it('只命中指定日期，且自动去重、升序、过滤区间外日期', () => {
    const plan = makePlan({
      frequency: {
        kind: 'custom_dates',
        dates: ['2024-01-05', '2024-01-02', '2024-01-05', '2024-02-01'],
      },
    });
    expect(deriveDueDates(plan, RANGE)).toEqual(['2024-01-02', '2024-01-05']);
  });

  it('自定义日期全部落在区间外时返回空数组', () => {
    const plan = makePlan({ frequency: { kind: 'custom_dates', dates: ['2023-12-31'] } });
    expect(deriveDueDates(plan, RANGE)).toEqual([]);
  });
});

describe('deriveDueDates · 生效区间 startDate / endDate', () => {
  it('startDate 之前的日期不命中', () => {
    const plan = makePlan({ frequency: { kind: 'daily' }, startDate: '2024-01-04' });
    expect(deriveDueDates(plan, RANGE)).toEqual([
      '2024-01-04',
      '2024-01-05',
      '2024-01-06',
      '2024-01-07',
    ]);
  });

  it('endDate 之后的日期不命中', () => {
    const plan = makePlan({
      frequency: { kind: 'daily' },
      startDate: '2024-01-01',
      endDate: '2024-01-03',
    });
    expect(deriveDueDates(plan, RANGE)).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
    ]);
  });

  it('start > end 返回空数组', () => {
    const plan = makePlan({ frequency: { kind: 'daily' } });
    expect(deriveDueDates(plan, { start: '2024-01-07', end: '2024-01-01' })).toEqual([]);
  });

  it('非法日期区间返回空数组', () => {
    const plan = makePlan({ frequency: { kind: 'daily' } });
    expect(deriveDueDates(plan, { start: 'not-a-date', end: '2024-01-07' })).toEqual([]);
  });
});

describe('deriveDueDates · 请假与休息日', () => {
  it('请假是打卡状态而非排期：请假日仍是应完成日，且函数不读取任何打卡数据', () => {
    const plan = makePlan({ frequency: { kind: 'daily' }, startDate: '2024-01-01' });
    const leaveDate: ISODate = '2024-01-03'; // 概念上这一天被设为 leave
    const due = deriveDueDates(plan, RANGE);

    expect(due).toContain(leaveDate); // 请假不把该日移出集合
    expect(due).toEqual(WEEK); // 集合只由 plan + range 决定
    expect(deriveDueDates(plan, RANGE)).toEqual(due); // 无隐藏状态 / 无副作用
  });

  it('休息日（频率不匹配的日期）天然不在集合内', () => {
    const plan = makePlan({ frequency: { kind: 'specific_weekdays', weekdays: [1, 3, 5] } });
    const due = deriveDueDates(plan, RANGE);
    expect(due).not.toContain('2024-01-06'); // 周六
    expect(due).not.toContain('2024-01-07'); // 周日
  });
});

describe('deriveAllDueDates', () => {
  it('同一成员多计划取并集、去重、升序，且忽略其他成员的计划', () => {
    const p1 = makePlan({
      id: 'p1',
      memberId: AUTHOR,
      frequency: { kind: 'custom_dates', dates: ['2024-01-02', '2024-01-03'] },
    });
    const p2 = makePlan({
      id: 'p2',
      memberId: AUTHOR,
      frequency: { kind: 'custom_dates', dates: ['2024-01-03', '2024-01-05'] },
    });
    const p3 = makePlan({ id: 'p3', memberId: OTHER, frequency: { kind: 'daily' } });

    expect(deriveAllDueDates([p1, p2, p3], AUTHOR, RANGE)).toEqual([
      '2024-01-02',
      '2024-01-03',
      '2024-01-05',
    ]);
  });
});
