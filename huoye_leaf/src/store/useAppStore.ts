/**
 * Zustand 单 store（架构 §1.4 / §2.3 / §八）。
 *
 * - 组件一律用 selector 订阅，禁止直接改 state；
 * - action 先 set()，再由订阅在微任务内合并 persistState(snapshot)；
 * - ★ 铁律 1：setContentCompletion 只改 contents[].completion；
 *   setCheckInStatus 只改 checkIns[].status；不存在任何 syncXxx / markBothDone；
 * - ★ 铁律 3：setCurrentViewerId 只改 currentViewerId，不写库、不缓存可见性结果；
 * - UI 导航状态用 silent 更新（不落盘，刷新回默认 tab，§5.8）。
 */
import { create } from 'zustand';
import { canBackfill } from '@/domain/streak';
import { toggleCheer as pureToggleCheer } from '@/domain/visibility';
import { DEFAULT_SPACE_ID, getTodayISO, newId } from '@/constants/app';
import { persistState } from '@/storage/repository';
import type {
  AppState,
  AppStore,
  CheckIn,
  CheckInStatus,
  CheckInVisibility,
  Collection,
  CompletionStatus,
  ContentItem,
  DetailView,
  DomainType,
  ID,
  ISODate,
  ISOTimestamp,
  Member,
  Plan,
  TabKey,
} from '@/types/domain';

function nowISO(): ISOTimestamp {
  return new Date().toISOString();
}

/** 空态（hydrate 之前的占位，避免任何组件读到 undefined）。 */
export function createEmptyState(): AppState {
  return {
    spaceId: DEFAULT_SPACE_ID,
    contents: [],
    collections: [],
    plans: [],
    checkIns: [],
    members: [],
    cheers: [],
    domains: ['健身', '学习', '爱好'],
    currentViewerId: '',
    activeTab: 'leaf',
    hydrated: false,
  };
}

/** 从 store 抽出纯 AppState 快照（剥离所有 action 函数，不含 Blob）。 */
function toSnapshot(store: AppStore): AppState {
  return {
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
}

let skipNextPersist = false;
let persistScheduled = false;

export const useAppStore = create<AppStore>()((set, get) => {
  /** 静默更新：只作用于 UI 导航 / 身份预览，不触发落盘。 */
  const silent = (partial: Partial<AppStore>): void => {
    skipNextPersist = true;
    set(partial);
    skipNextPersist = false;
  };

  const replaceById = <T extends { id: ID }>(items: T[], item: T): T[] => {
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index < 0) return [item, ...items];
    return items.map((entry) => (entry.id === item.id ? item : entry));
  };

  return {
    ...createEmptyState(),

    // ── 引导 / 持久化 ──────────────────────────────────
    hydrate: (state) => silent({ ...state, hydrated: true }),

    persist: () => {
      void persistState(toSnapshot(get())).catch((error: unknown) => {
        console.error('[活页] 持久化失败', error);
      });
    },

    // ── UI 导航（不落盘） ──────────────────────────────
    setActiveTab: (tab: TabKey) => silent({ activeTab: tab, detailView: undefined }),
    setSelectedContentId: (id) => silent({ selectedContentId: id }),
    setSelectedDate: (date) => silent({ selectedDate: date }),
    setDetailView: (view) => silent({ detailView: view }),

    /** 关联跳转统一入口：只改 UI 选中，绝不改写任何状态字段。 */
    navigateToContent: (id) =>
      silent({ activeTab: 'leaf', selectedContentId: id, detailView: undefined }),

    /** 关联计划跳转：切到日历页并打开计划管理。 */
    navigateToPlan: (_id) => silent({ activeTab: 'calendar', detailView: 'plan' }),

    // ── 模块 A：内容 / 合集 / 领域 ─────────────────────
    addContent: (item) => set({ contents: [item, ...get().contents] }),

    updateContent: (item) =>
      set({
        contents: get().contents.map((entry) =>
          entry.id === item.id ? { ...item, updatedAt: nowISO() } : entry,
        ),
      }),

    removeContent: (id) => set({ contents: get().contents.filter((entry) => entry.id !== id) }),

    /** ★ 铁律 1：只改 contents[].completion 这一个字段，绝不触碰 checkIns。 */
    setContentCompletion: (id, status: CompletionStatus) =>
      set({
        contents: get().contents.map((entry) =>
          entry.id === id ? { ...entry, completion: status } : entry,
        ),
      }),

    publishContent: (id, published) =>
      set({
        contents: get().contents.map((entry) =>
          entry.id === id
            ? { ...entry, publishedToSpace: published, updatedAt: nowISO() }
            : entry,
        ),
      }),

    addCollection: (collection: Collection) =>
      set({ collections: [...get().collections, collection] }),

    updateCollection: (collection: Collection) =>
      set({
        collections: get().collections.map((entry) =>
          entry.id === collection.id ? collection : entry,
        ),
      }),

    removeCollection: (id) =>
      set({ collections: get().collections.filter((entry) => entry.id !== id) }),

    publishCollection: (id, published) =>
      set({
        collections: get().collections.map((entry) =>
          entry.id === id ? { ...entry, publishedToSpace: published } : entry,
        ),
      }),

    addDomain: (name: DomainType) => {
      const trimmed = name.trim();
      if (!trimmed || get().domains.includes(trimmed)) return;
      set({ domains: [...get().domains, trimmed] });
    },

    removeDomain: (name: DomainType) =>
      set({ domains: get().domains.filter((entry) => entry !== name) }),

    // ── 模块 B：计划 / 打卡 ────────────────────────────
    upsertPlan: (plan: Plan) => set({ plans: replaceById(get().plans, plan) }),

    removePlan: (id) => set({ plans: get().plans.filter((entry) => entry.id !== id) }),

    setPlanHidden: (id, hidden) =>
      set({
        plans: get().plans.map((entry) =>
          entry.id === id ? { ...entry, hiddenInSpace: hidden } : entry,
        ),
      }),

    upsertCheckIn: (incoming: CheckIn) => {
      // 未来排期日不允许写 done（但允许提前请假 leave）
      const checkIn: CheckIn =
        incoming.status === 'done' && incoming.date > getTodayISO()
          ? { ...incoming, status: 'pending' }
          : incoming;
      set({ checkIns: replaceById(get().checkIns, checkIn) });
    },

    removeCheckIn: (id) => set({ checkIns: get().checkIns.filter((entry) => entry.id !== id) }),

    /** ★ 铁律 1：只改 checkIns[].status 这一个字段，绝不触碰 contents。 */
    setCheckInStatus: (id, status: CheckInStatus) => {
      const current = get().checkIns.find((entry) => entry.id === id);
      if (!current) return;
      // 未来排期日不可写 done；超 7 天的补卡同样被窗口拒绝；leave 始终允许
      if (
        status === 'done' &&
        current.status !== 'done' &&
        !canBackfill(current.date, getTodayISO())
      ) {
        return;
      }
      set({
        checkIns: get().checkIns.map((entry) =>
          entry.id === id ? { ...entry, status } : entry,
        ),
      });
    },

    setCheckInVisibility: (id, visibility: CheckInVisibility) =>
      set({
        checkIns: get().checkIns.map((entry) =>
          entry.id === id ? { ...entry, visibility, updatedAt: nowISO() } : entry,
        ),
      }),

    setCheckInMeta: (id, meta) =>
      set({
        checkIns: get().checkIns.map((entry) =>
          entry.id === id
            ? { ...entry, ...meta, updatedAt: nowISO() }
            : entry,
        ),
      }),

    /**
     * 替家人补打卡（Q5）：同受 7 天窗口，记录归属目标成员并计入其连续天数。
     * 只写 checkIns 一个数组。
     */
    backfillFor: (targetMemberId: ID, date: ISODate, planId?: ID) => {
      if (!canBackfill(date, getTodayISO())) return;

      const existing = get().checkIns.find(
        (entry) =>
          entry.memberId === targetMemberId &&
          entry.date === date &&
          entry.planId === planId,
      );
      const timestamp = nowISO();

      if (existing) {
        set({
          checkIns: get().checkIns.map((entry) =>
            entry.id === existing.id
              ? { ...entry, status: 'done', backfilled: true, updatedAt: timestamp }
              : entry,
          ),
        });
        return;
      }

      const created: CheckIn = {
        id: newId(),
        spaceId: DEFAULT_SPACE_ID,
        memberId: targetMemberId,
        planId,
        date,
        status: 'done',
        visibility: 'public',
        linkedContentIds: [],
        linkedCollectionIds: [],
        backfilled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      set({ checkIns: [created, ...get().checkIns] });
    },

    // ── 模块 C：成员 / 身份 / 加油 ─────────────────────
    addMember: (member: Member) => set({ members: [...get().members, member] }),

    removeMember: (id) => {
      const members = get().members.filter((entry) => entry.id !== id);
      const currentViewerId =
        get().currentViewerId === id ? (members[0]?.id ?? '') : get().currentViewerId;
      set({ members, currentViewerId });
    },

    /** ★ 铁律 3：只改一个字段，不写库、不缓存；身份切换后由 useSpaceView 全量重算。 */
    setCurrentViewerId: (id) => silent({ currentViewerId: id }),

    /** Q7：同一成员对同一打卡仅一次、可取消。 */
    toggleCheer: (checkInId) =>
      set({
        cheers: pureToggleCheer(
          checkInId,
          get().currentViewerId,
          get().cheers,
          newId(),
          nowISO(),
        ),
      }),
  };
});

/** 订阅：action 先 set()，此处在微任务内合并为一次 persistState(snapshot)。 */
useAppStore.subscribe((state) => {
  if (!state.hydrated || skipNextPersist) return;
  if (persistScheduled) return;
  persistScheduled = true;
  queueMicrotask(() => {
    persistScheduled = false;
    const snapshot = toSnapshot(useAppStore.getState());
    void persistState(snapshot).catch((error: unknown) => {
      console.error('[活页] 持久化失败', error);
    });
  });
});
