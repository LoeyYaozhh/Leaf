/**
 * 全局常量与展示文案（架构 §2.1）。
 * 存储键、断点、补卡窗口、超时等一律集中于此，禁止在业务文件里硬编码。
 */
import { format } from 'date-fns';
import type {
  CheckInStatus,
  CheckInVisibility,
  CompletionStatus,
  DomainType,
  HeatStatus,
  ISODate,
  MediaKind,
  SourceKind,
  TabDefinition,
  Weekday,
} from '@/types/domain';

// ── 存储（Q1，架构 §1.5 / §八） ────────────────────────────
export const DB_NAME = 'huoye_leaf_db' as const;
export const DB_VERSION = 1 as const;
export const STATE_STORE = 'state' as const;
export const ASSETS_STORE = 'assets' as const;
export const STATE_KEY = 'app_state' as const;

// ── 空间 / 规则口径 ───────────────────────────────────────
export const DEFAULT_SPACE_ID = 'space_default' as const;
export const BACKFILL_WINDOW_DAYS = 7 as const;
export const LG_BREAKPOINT = 1024 as const;
export const LG_MEDIA_QUERY = `(min-width:${LG_BREAKPOINT}px)` as const;
export const EMBED_TIMEOUT_MS = 8000 as const;
export const STREAK_RULE_VERSION = 'v1' as const;
export const BILI_EMBED_BASE = 'https://player.bilibili.com/player.html' as const;
export const SPACE_NAME = '我们的家' as const;

/** 本地日历日（唯一取时钟的辅助函数，放在常量层以保持 domain/** 纯函数） */
export function getTodayISO(): ISODate {
  return format(new Date(), 'yyyy-MM-dd');
}

/** 统一 ID 生成（原生 crypto.randomUUID，带安全降级）。 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `leaf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── 三个 tab（§八：第三个不叫「共享内容」） ─────────────────
export const TABS: ReadonlyArray<TabDefinition> = [
  { key: 'leaf', label: '活页' },
  { key: 'calendar', label: '日历页' },
  { key: 'space', label: '家庭空间' },
];

export const DEFAULT_DOMAINS: DomainType[] = ['健身', '学习', '爱好'];

// ── 文案映射 ─────────────────────────────────────────────
export const MEDIA_LABELS: Record<MediaKind, string> = {
  video: '视频',
  image: '图片',
  note: '笔记',
};

export const COMPLETION_LABELS: Record<CompletionStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  done: '已完成',
};

export const CHECKIN_STATUS_LABELS: Record<CheckInStatus, string> = {
  pending: '未完成',
  done: '已完成',
  leave: '请假',
};

export const VISIBILITY_LABELS: Record<CheckInVisibility, string> = {
  public: '空间公开',
  self_only: '仅自己',
};

export const HEAT_LABELS: Record<HeatStatus, string> = {
  done: '已完成',
  leave: '请假',
  pending: '未完成',
  off: '非排期日',
};

/** 月历热力四态配色（浅色底 + 深色字，保证对比度） */
export const HEAT_COLORS: Record<HeatStatus, string> = {
  done: '#2f6f5e',
  leave: '#e0a458',
  pending: '#e8b4ae',
  off: '#eef1ee',
};

export const HEAT_TEXT_COLORS: Record<HeatStatus, string> = {
  done: '#ffffff',
  leave: '#4a3410',
  pending: '#6b2b25',
  off: '#8b958f',
};

export const SOURCE_LABELS: Record<SourceKind, string> = {
  bilibili: 'B 站视频',
  clip: '剪藏卡片',
  local_image: '本地图片',
  local_note: '本地笔记',
  external: '外链',
};

export const FREQUENCY_LABELS: Record<
  'daily' | 'weekly_n' | 'specific_weekdays' | 'custom_dates',
  string
> = {
  daily: '每天',
  weekly_n: '每周 N 次（指定候选星期）',
  specific_weekdays: '指定星期',
  custom_dates: '自定义日期',
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

export const WEEKDAYS: ReadonlyArray<Weekday> = [0, 1, 2, 3, 4, 5, 6];

export const MEMBER_PALETTE: ReadonlyArray<string> = [
  '#2f6f5e',
  '#e07a5f',
  '#3d5a80',
  '#9c6644',
  '#6a4c93',
  '#1982c4',
];

/** 补卡窗口说明（Q5：0 ≤ differenceInCalendarDays(today, date) ≤ 7） */
export const BACKFILL_HINT = `仅可补最近 ${BACKFILL_WINDOW_DAYS} 天内的日历日（含今天），未来排期日不可写「已完成」`;
