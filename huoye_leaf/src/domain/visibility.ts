/**
 * 空间可见性 —— ★ 全项目唯一入口（架构 §4.5.3 / C-2~C-6 / Q7）。
 *
 * 六级真值表（主理人拍板口径）：
 * | visibility   | hiddenInSpace | viewer | 空间动态流 |
 * | public       | false          | 任意   | 可见       |
 * | public       | true           | 任意   | 隐藏       |
 * | self_only    | false          | 作者   | 可见(私密标记) |
 * | self_only    | false          | 他人   | 隐藏       |
 * | self_only    | true           | 作者   | 可见(私密标记) | ← 短路优先于计划开关
 * | self_only    | true           | 他人   | 隐藏       |
 */
import type {
  AppState,
  CheckIn,
  Cheer,
  Collection,
  ContentItem,
  ID,
  ISOTimestamp,
  Plan,
  SpaceView,
} from '@/types/domain';

/**
 * 单条打卡是否对某身份可见。
 * 规则 1（最高优先）：self_only 一旦设定即短路返回，结论不再被计划开关改写；
 * 作者本人在空间页仍可见（带「仅自己」标记），切到其他成员即消失。
 */
export function isCheckInVisibleInSpace(
  checkIn: CheckIn,
  plan: Plan | undefined,
  viewerId: ID,
): boolean {
  if (checkIn.visibility === 'self_only') {
    return viewerId === checkIn.memberId;
  }
  if (plan?.hiddenInSpace) {
    return false;
  }
  return true;
}

/** 资料库默认私有；内容 / 合集仅手动「发到空间」才可见（C-5）。 */
export function isContentVisibleInSpace(content: ContentItem, _viewerId: ID): boolean {
  return content.publishedToSpace === true;
}

/** 合集与内容同一口径。 */
export function isCollectionVisibleInSpace(collection: Collection, _viewerId: ID): boolean {
  return collection.publishedToSpace === true;
}

/** 某条打卡的加油总数。 */
export function cheerCount(checkInId: ID, cheers: Cheer[]): number {
  let count = 0;
  for (const cheer of cheers) {
    if (cheer.checkInId === checkInId) count += 1;
  }
  return count;
}

/** 某成员是否已对某条打卡加过油（Q7 去重）。 */
export function hasCheered(checkInId: ID, memberId: ID, cheers: Cheer[]): boolean {
  return cheers.some((cheer) => cheer.checkInId === checkInId && cheer.memberId === memberId);
}

/**
 * 加油去重切换：存在即删除，否则新增。纯函数，id / createdAt 由调用方注入。
 */
export function toggleCheer(
  checkInId: ID,
  memberId: ID,
  cheers: Cheer[],
  id: ID,
  createdAt: ISOTimestamp,
): Cheer[] {
  const existing = cheers.find(
    (cheer) => cheer.checkInId === checkInId && cheer.memberId === memberId,
  );
  if (existing) {
    return cheers.filter((cheer) => cheer.id !== existing.id);
  }
  return [...cheers, { id, checkInId, memberId, createdAt }];
}

/**
 * ★ 空间页唯一数据来源：按 viewerId 全量重算，不缓存、不增量补丁。
 * 身份切换只改 state.currentViewerId 并重新调用本函数。
 */
export function computeSpaceView(state: AppState, viewerId: ID): SpaceView {
  const planById = new Map<ID, Plan>(state.plans.map((plan) => [plan.id, plan]));

  const feed = state.checkIns
    .filter((checkIn) => checkIn.status === 'done')  // 动态流只展示已完成的打卡
    .filter((checkIn) =>
      isCheckInVisibleInSpace(
        checkIn,
        checkIn.planId ? planById.get(checkIn.planId) : undefined,
        viewerId,
      ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const cheerCountByCheckIn: Record<ID, number> = {};
  for (const cheer of state.cheers) {
    cheerCountByCheckIn[cheer.checkInId] = (cheerCountByCheckIn[cheer.checkInId] ?? 0) + 1;
  }

  const cheeredByViewer = new Set<ID>(
    state.cheers
      .filter((cheer) => cheer.memberId === viewerId)
      .map((cheer) => cheer.checkInId),
  );

  return {
    feed,
    sharedContents: state.contents.filter((content) =>
      isContentVisibleInSpace(content, viewerId),
    ),
    sharedCollections: state.collections.filter((collection) =>
      isCollectionVisibleInSpace(collection, viewerId),
    ),
    cheerCountByCheckIn,
    cheeredByViewer,
  };
}
