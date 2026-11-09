/**
 * 应完成日集合推导 —— ★ 全项目唯一口径（架构 §4.5.1 / B-1 / B-3 / Q4）。
 * 排期、月历热力、当前/最长连续、历史反查一律复用本文件，禁止页面内自行遍历日期。
 */
import { eachDayOfInterval, format, getDay, isValid, parseISO } from 'date-fns';
import type { DateRange, Frequency, ID, ISODate, Plan, Weekday } from '@/types/domain';

/**
 * 频率命中判定。
 * - daily：全命中；
 * - specific_weekdays：命中指定星期；
 * - weekly_n：candidateWeekdays 直接作为排期日集合，timesPerWeek 不参与推导（Q4）；
 * - custom_dates：命中 dates 集合。
 */
export function matchesFrequency(freq: Frequency, date: ISODate): boolean {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return false;
  const weekday = getDay(parsed) as Weekday;
  switch (freq.kind) {
    case 'daily':
      return true;
    case 'specific_weekdays':
      return freq.weekdays.includes(weekday);
    case 'weekly_n':
      return freq.candidateWeekdays.includes(weekday);
    case 'custom_dates':
      return freq.dates.includes(date);
    default:
      return false;
  }
}

/**
 * 给定计划与查询区间，返回「应完成日集合」：区间内落在生效期且命中频率的日历日，
 * 升序、字符串 ISODate、天然去重。请假是打卡状态，不是排期，不进集合。
 */
export function deriveDueDates(plan: Plan, range: DateRange): ISODate[] {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  if (!isValid(start) || !isValid(end) || start > end) return [];

  const result = new Set<ISODate>();
  for (const day of eachDayOfInterval({ start, end })) {
    const iso = format(day, 'yyyy-MM-dd');
    if (iso < plan.startDate) continue;
    if (plan.endDate && iso > plan.endDate) continue;
    if (!matchesFrequency(plan.frequency, iso)) continue;
    result.add(iso);
  }
  return Array.from(result).sort();
}

/**
 * 某成员全部计划的应完成日去重并集（顶部数字卡口径，架构 §5.5）。
 * 严格复用 deriveDueDates，保证与连续天数同源。
 */
export function deriveAllDueDates(plans: Plan[], memberId: ID, range: DateRange): ISODate[] {
  const result = new Set<ISODate>();
  for (const plan of plans) {
    if (plan.memberId !== memberId) continue;
    for (const date of deriveDueDates(plan, range)) {
      result.add(date);
    }
  }
  return Array.from(result).sort();
}
