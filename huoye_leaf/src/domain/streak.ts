/**
 * 连续天数 / 补卡窗口 / 热力状态（架构 §4.5.2 / B-3 / B-4 / Q5）。
 * 与 schedule.ts 同源：本文件只接收 dueDates，绝不自行推排期。
 */
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { BACKFILL_WINDOW_DAYS } from '@/constants/app';
import type {
  CheckIn,
  CheckInStatus,
  HeatStatus,
  ID,
  ISODate,
  StreakResult,
} from '@/types/domain';

/**
 * 计算当前连续与最长连续。
 * - 只取 d <= today 的应完成日；休息日不在集合内，天然不中断；
 * - leave → continue（不中断、不计入）；
 * - done → running++ 并更新 longest；
 * - pending / 缺失 → running=0；从最近应完成日往前扫时 break。
 */
export function computeStreak(
  dueDates: ISODate[],
  statusByDate: Record<ISODate, CheckInStatus>,
  today: ISODate,
): StreakResult {
  const past = dueDates.filter((date) => date <= today).sort();

  let running = 0;
  let longest = 0;
  for (const date of past) {
    const status = statusByDate[date] ?? 'pending';
    if (status === 'leave') continue;
    if (status === 'done') {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = past.length - 1; i >= 0; i -= 1) {
    const status = statusByDate[past[i]] ?? 'pending';
    if (status === 'leave') continue;
    if (status === 'done') {
      current += 1;
      continue;
    }
    break;
  }

  return { current, longest };
}

/** 补卡窗口：0 <= differenceInCalendarDays(today, date) <= 7（含今天与第 7 天）。 */
export function canBackfill(date: ISODate, today: ISODate): boolean {
  const target = parseISO(date);
  const base = parseISO(today);
  if (!isValid(target) || !isValid(base)) return false;
  const diff = differenceInCalendarDays(base, target);
  return diff >= 0 && diff <= BACKFILL_WINDOW_DAYS;
}

/** 月历四态：done / leave / pending / off（off = 非排期日）。 */
export function getHeatmapStatus(
  date: ISODate,
  dueDates: ISODate[],
  statusByDate: Record<ISODate, CheckInStatus>,
): HeatStatus {
  if (!dueDates.includes(date)) return 'off';
  const status = statusByDate[date];
  if (status === 'done') return 'done';
  if (status === 'leave') return 'leave';
  return 'pending';
}

const STATUS_PRIORITY: Record<CheckInStatus, number> = {
  pending: 0,
  leave: 1,
  done: 2,
};

/**
 * 将某成员的打卡聚合为「每日一个状态」的字典，供 computeStreak / getHeatmapStatus 使用。
 * 同一天多条打卡时取最优状态（done > leave > pending），临时记录同样参与聚合
 * 但只有落在 dueDates 内的日期才会影响连续天数。
 */
export function buildStatusByDate(
  checkIns: CheckIn[],
  memberId: ID,
): Record<ISODate, CheckInStatus> {
  const result: Record<ISODate, CheckInStatus> = {};
  for (const checkIn of checkIns) {
    if (checkIn.memberId !== memberId) continue;
    const previous = result[checkIn.date];
    if (!previous || STATUS_PRIORITY[checkIn.status] > STATUS_PRIORITY[previous]) {
      result[checkIn.date] = checkIn.status;
    }
  }
  return result;
}
