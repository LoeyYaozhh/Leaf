/**
 * 空间视图 hook（架构 §2.3 / C-2 / 铁律 3）。
 * 唯一入口 computeSpaceView；identity 切换只改 currentViewerId，本 hook 全量重算、不缓存。
 */
import { computeSpaceView } from '@/domain/visibility';
import { useAppStore } from '@/store/useAppStore';
import type { AppState, SpaceView } from '@/types/domain';

export function useSpaceView(): SpaceView {
  // 订阅整个 store：任何数据或身份变化都触发全量重算（不做增量补丁 / 不缓存结果）
  const store = useAppStore((state) => state);

  const snapshot: AppState = {
    spaceId: store.spaceId,
    extensions: store.extensions,
    contents: store.contents,
    collections: store.collections,
    plans: store.plans,
    checkIns: store.checkIns,
    members: store.members,
    cheers: store.cheers,
    domains: store.domains,
    currentViewerId: store.currentViewerId,
    activeTab: store.activeTab,
    selectedContentId: store.selectedContentId,
    selectedDate: store.selectedDate,
    detailView: store.detailView,
    hydrated: store.hydrated,
  };

  return computeSpaceView(snapshot, store.currentViewerId);
}
