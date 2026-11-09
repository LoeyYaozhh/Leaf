/**
 * 测试数据工厂（Arrange 阶段复用）。
 *
 * 只构造纯数据对象，不引入 DOM / jsdom / 网络 / 浏览器 API。
 * 所有字段按 src/types/domain.ts 的唯一类型源补齐，保证类型正确、无隐式 any。
 */
import type {
  AppState,
  CheckIn,
  Cheer,
  Collection,
  ContentItem,
  ID,
  ISODate,
  Plan,
  SourceDescriptor,
} from '../src/types/domain';

/** 作者 / 其他成员 / 第三成员（稳定 ID，便于真值表断言）。 */
export const AUTHOR: ID = 'm1';
export const OTHER: ID = 'm2';
export const THIRD: ID = 'm3';

/** 固定「今天」：canBackfill / computeStreak 的边界用例不依赖系统时钟。 */
export const TODAY: ISODate = '2024-01-15';

const DEFAULT_SOURCE: SourceDescriptor = { kind: 'clip' };

export function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'p1',
    name: '测试计划',
    memberId: AUTHOR,
    frequency: { kind: 'daily' },
    startDate: '2024-01-01',
    hiddenInSpace: false,
    linkedContentIds: [],
    linkedCollectionIds: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'k1',
    memberId: AUTHOR,
    date: TODAY,
    status: 'done',
    visibility: 'public',
    linkedContentIds: [],
    linkedCollectionIds: [],
    backfilled: false,
    createdAt: '2024-01-15T08:00:00.000Z',
    updatedAt: '2024-01-15T08:00:00.000Z',
    ...overrides,
  };
}

export function makeContent(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'c1',
    title: '默认标题',
    source: { ...DEFAULT_SOURCE },
    note: '默认备注',
    domain: '学习',
    media: 'note',
    tags: ['默认标签'],
    collectedAt: '2024-01-01T10:00:00.000Z',
    completion: 'not_started',
    collectionIds: [],
    linkedPlanIds: [],
    publishedToSpace: false,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  };
}

export function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col1',
    name: '默认合集',
    orderedContentIds: [],
    publishedToSpace: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeCheer(
  checkInId: ID,
  memberId: ID,
  id: ID = `ch-${checkInId}-${memberId}`,
): Cheer {
  return {
    id,
    checkInId,
    memberId,
    createdAt: '2024-01-15T12:00:00.000Z',
  };
}

/** 最小完整 AppState：所有必填数组与字段齐备。 */
export function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    contents: [],
    collections: [],
    plans: [],
    checkIns: [],
    members: [],
    cheers: [],
    domains: ['健身', '学习', '爱好'],
    currentViewerId: AUTHOR,
    activeTab: 'leaf',
    hydrated: true,
    ...overrides,
  };
}
