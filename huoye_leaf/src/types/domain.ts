/**
 * 活页 / Leaf —— 唯一类型源（架构设计 §3.1）。
 *
 * 三条铁律在类型层的体现：
 * 1. ContentItem.completion 与 CheckIn.status 分属两个接口，不存在任何把二者连起来的方法；
 * 2. Frequency 是封闭联合，应完成日只由 domain/schedule.ts 推导，状态中无「连续天数」缓存字段；
 * 3. 不存在 PermissionLevel / AccessScope / FieldRule / globalIncognito 等概念，
 *    extensions 仅是不透明扩展位（F-4）。
 */

// ── 基础别名 ─────────────────────────────────────────────
export type ID = string;                  // crypto.randomUUID()
export type ISODate = string;             // 'yyyy-MM-dd' 本地日历日（排期/热力/连续）
export type ISOTimestamp = string;        // ISO 8601 UTC（收录时间/创建时间）
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0=周日

/** F-4 预留扩展位：不透明，本版不读写。禁止在此引入三级权限/访问范围概念 */
export type ReservedExtension = Record<string, unknown>;

/** 所有实体共享的空间扩展位；本版只有一个空间，无 UI 入口 */
export interface SpaceScoped {
  spaceId?: ID;                 // 默认 DEFAULT_SPACE_ID
  extensions?: ReservedExtension;  // 多空间 / 细粒度权限扩展位（本版不实现 UI）
}

// ── 来源与预览 ───────────────────────────────────────────
export type SourceKind =
  | 'bilibili'      // 官方 iframe 站内真播
  | 'clip'          // 剪藏卡片，站内阅读视图
  | 'local_image'   // 本地上传图片
  | 'local_note'    // 本地笔记 / 纯文本
  | 'external';     // 外链兜底（仅按钮使用）

export interface SourceDescriptor {
  kind: SourceKind;
  bvid?: string;                // extractBvid 产出
  embedUrl?: string;            // buildBiliEmbedUrl 产出
  sourceUrl?: string;           // 原站链接，仅「去原站」兜底按钮使用
  assetId?: ID;                 // 本地文件 → assets store
  coverUrl?: string;            // 外链封面（仅预置示例），必须 onError 占位
}

// ── 模块 A：内容 / 合集 ───────────────────────────────────
export type DomainType = string;          // 领域：健身/学习/爱好，A-11 可自定义增删
export type MediaKind = 'video' | 'image' | 'note';  // 固有属性，chip 视图过滤，不占主筛选维度
export type CompletionStatus = 'not_started' | 'in_progress' | 'done';  // ★ 内容完成状态（独立！）

export interface ContentItem extends SpaceScoped {
  id: ID;
  title: string;
  coverUrl?: string;
  coverAssetId?: ID;            // A-16 P2 预留字段
  source: SourceDescriptor;
  note: string;                 // 备注
  domain: DomainType;           // 领域类型（主筛选维度）
  media: MediaKind;             // 媒体属性（chip 只切视图）
  tags: string[];
  collectedAt: ISOTimestamp;    // 收录时间：主轴 + 默认排序
  contentDate?: ISODate;        // 内容日期：可补录元数据，不参与主排序（A-13）
  completion: CompletionStatus; // ★ 独立字段：绝不自动写入 CheckIn.status
  collectionIds: ID[];          // 可多归属、无嵌套
  linkedPlanIds: ID[];          // 关联计划：仅提供跳转，不联动状态（Q8）
  clipBody?: string;            // 剪藏卡片正文（用户粘贴 / 预置示例，禁止抓取）
  clipImageAssetIds?: ID[];     // 剪藏图集：本地上传（Q3）
  publishedToSpace: boolean;    // 资料库默认私有，仅手动发布可见（C-5）
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface Collection extends SpaceScoped {
  id: ID;
  name: string;
  orderedContentIds: ID[];      // 有序清单（A-5 / A-12 拖动排序 P1）
  publishedToSpace: boolean;    // 默认私有
  createdAt: ISOTimestamp;
}

// ── 模块 B：计划 / 打卡 ───────────────────────────────────
/** Q4：weekly_n 由用户指定候选星期，候选星期集合即排期日集合 */
export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekly_n'; timesPerWeek: number; candidateWeekdays: Weekday[] }
  | { kind: 'specific_weekdays'; weekdays: Weekday[] }
  | { kind: 'custom_dates'; dates: ISODate[] };

export interface Plan extends SpaceScoped {
  id: ID;
  name: string;
  memberId: ID;                 // 归属成员
  frequency: Frequency;
  startDate: ISODate;           // 排期生效起始
  endDate?: ISODate;
  hiddenInSpace: boolean;       // 计划级「不在空间显示」（C-4）
  linkedContentIds: ID[];       // 内容 ↔ 计划：仅日历页单向反查（Q8）
  linkedCollectionIds: ID[];
  createdAt: ISOTimestamp;
}

export type CheckInStatus = 'pending' | 'done' | 'leave';      // ★ 打卡三态（独立！）
export type CheckInVisibility = 'public' | 'self_only';        // 默认 public，无全局隐身

export interface CheckIn extends SpaceScoped {
  id: ID;
  memberId: ID;
  planId?: ID;                  // undefined = 不属于任何计划的「临时记录」（B-1）
  date: ISODate;                // 归属应完成日
  status: CheckInStatus;        // ★ 独立字段：绝不自动写入 ContentItem.completion
  visibility: CheckInVisibility;
  durationMin?: number;         // 时长（B-6 P1）
  note?: string;                // 备注（B-6 P1）
  linkedContentIds: ID[];       // 仅跳转，不联动状态（B-2 / A-6）
  linkedCollectionIds: ID[];
  backfilled: boolean;          // 是否补卡（Q5 与本人同规则）
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ── 模块 C：成员 / 加油 ───────────────────────────────────
export interface Member extends SpaceScoped {
  id: ID;
  name: string;
  avatarColor: string;
  joinedAt: ISOTimestamp;
}

export interface Cheer extends SpaceScoped {
  id: ID;
  checkInId: ID;
  memberId: ID;                 // 与 checkInId 组成唯一键：同一成员对同一打卡仅一次、可取消（Q7）
  createdAt: ISOTimestamp;
}

// ── 聚合状态与视图模型 ───────────────────────────────────
export type TabKey = 'leaf' | 'calendar' | 'space';   // 活页 / 日历页 / 家庭空间
export type DetailView = 'collection' | 'plan' | 'history' | 'members';

export interface AppState extends SpaceScoped {
  contents: ContentItem[];
  collections: Collection[];
  plans: Plan[];
  checkIns: CheckIn[];
  members: Member[];
  cheers: Cheer[];
  domains: DomainType[];        // A-11 自定义领域
  currentViewerId: ID;          // ★ 身份预览：只影响可见性重算，不写库、不改数据归属
  activeTab: TabKey;
  selectedContentId?: ID;
  selectedDate?: ISODate;
  detailView?: DetailView;
  hydrated: boolean;            // bootstrap 完成闸门
}

/** computeSpaceView 的输出：空间页唯一数据来源 */
export interface SpaceView {
  feed: CheckIn[];              // 已按 viewerId 过滤
  sharedContents: ContentItem[];
  sharedCollections: Collection[];
  cheerCountByCheckIn: Record<ID, number>;
  cheeredByViewer: Set<ID>;     // 供「加油」按钮态与取消（Q7）
}

export interface StreakResult { current: number; longest: number; }
export type HeatStatus = 'done' | 'leave' | 'pending' | 'off';  // off = 非排期日
export interface FilterCriteria {
  domain?: DomainType;
  tags?: string[];
  dateRange?: { start: ISODate; end: ISODate };   // 按收录时间
  completion?: CompletionStatus;
  media?: MediaKind;            // 仅视图 chip，不参与 AND 主维度串联
  keyword?: string;
}

// ── 补充的结构化契约（均在唯一类型源内定义，避免散落重复声明） ──

/** 查询区间，供 deriveDueDates / deriveAllDueDates 使用 */
export interface DateRange {
  start: ISODate;
  end: ISODate;
}

/** IndexedDB `assets` store 的记录结构（架构 §1.5）；不进入 AppState 快照 */
export interface AssetRecord {
  id: ID;
  blob: Blob;
  mime: string;
  name: string;
  createdAt: ISOTimestamp;
}

/** 内容全字段编辑表单的载荷（ContentEditor → addContent / updateContent） */
export type ContentDraft = Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>;

/** 计划全字段编辑表单的载荷 */
export type PlanDraft = Omit<Plan, 'id' | 'createdAt'>;

/**
 * Zustand 单 store 的 action 契约。
 * 注意：这里**没有**任何 syncXxx / markBothDone 联动 setter；
 * setContentCompletion 与 setCheckInStatus 各自只负责一个实体的一个字段。
 */
export interface AppActions {
  hydrate(state: AppState): void;
  persist(): void;

  setActiveTab(tab: TabKey): void;
  setSelectedContentId(id?: ID): void;
  setSelectedDate(date?: ISODate): void;
  setDetailView(view?: DetailView): void;
  navigateToContent(id: ID): void;
  navigateToPlan(id: ID): void;

  addContent(item: ContentItem): void;
  updateContent(item: ContentItem): void;
  removeContent(id: ID): void;
  setContentCompletion(id: ID, status: CompletionStatus): void;
  publishContent(id: ID, published: boolean): void;
  addCollection(collection: Collection): void;
  updateCollection(collection: Collection): void;
  removeCollection(id: ID): void;
  publishCollection(id: ID, published: boolean): void;
  addDomain(name: DomainType): void;
  removeDomain(name: DomainType): void;

  upsertPlan(plan: Plan): void;
  removePlan(id: ID): void;
  setPlanHidden(id: ID, hidden: boolean): void;
  upsertCheckIn(checkIn: CheckIn): void;
  removeCheckIn(id: ID): void;
  setCheckInStatus(id: ID, status: CheckInStatus): void;
  setCheckInVisibility(id: ID, visibility: CheckInVisibility): void;
  setCheckInMeta(id: ID, meta: { durationMin?: number; note?: string }): void;
  backfillFor(targetMemberId: ID, date: ISODate, planId?: ID): void;

  addMember(member: Member): void;
  removeMember(id: ID): void;
  setCurrentViewerId(id: ID): void;
  toggleCheer(checkInId: ID): void;
}

export type AppStore = AppState & AppActions;

// ─────────────────────────────────────────────────────────────────────────────
// 补充契约（架构 §八：所有命名类型只在 src/types/domain.ts 定义）
//
// 领域函数入参 / 出参、IndexedDB schema、hooks 返回值、组件 props、seed 规格一律
// 集中在本文件；其余文件只允许 `import type` 引用，不得再声明 interface / type。
// 唯一例外：src/vite-env.d.ts 的 ambient module declaration（§2.1 明确其职责）。
// ─────────────────────────────────────────────────────────────────────────────

/** recognizeSource 的输入载荷；assetId 由调用方在 putAsset() 之后回填，保持 domain 无 IO。 */
export interface RecognizeSourceInput {
  url?: string;
  file?: File;
  pastedText?: string;
  assetId?: ID;
}

/** collectionProgress 的返回值：「第 N / M 条」，index 为 1-based。 */
export interface CollectionProgress {
  index: number;
  total: number;
}

/** 三个 tab 的定义（活页 / 日历页 / 家庭空间）。 */
export interface TabDefinition {
  key: TabKey;
  label: string;
}

/**
 * IndexedDB schema（idb 泛型约束）。
 * 刻意用 type alias 而非 interface：对象字面量类型带隐式索引签名，
 * 可满足 idb 的 `DBSchema` 约束，且本文件不 import 任何运行时模块。
 */
export type LeafDBSchema = {
  state: { key: string; value: AppState };
  assets: { key: string; value: AssetRecord };
};

/** useAssetUrl 的返回状态。 */
export interface AssetUrlState {
  url: string | undefined;
  loading: boolean;
  failed: boolean;
}

/** useAssetText 的返回状态。 */
export interface AssetTextState {
  text: string;
  loading: boolean;
  failed: boolean;
}

/** useResponsive 的返回状态（全项目唯一视口真源）。 */
export interface ResponsiveState {
  isWide: boolean;
  breakpoint: number;
  previewMode: 'panel' | 'overlay';
}

// ── 组件 props ─────────────────────────────────────────────
export interface ContentToolbarProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  domains: DomainType[];
  allTags: string[];
  resultCount: number;
  totalCount: number;
}

export interface PreviewPanelProps {
  mode: 'panel' | 'overlay';
}

export interface CoverFallbackProps {
  content: ContentItem;
  reason?: string;
  onRetry?: () => void;
}

export interface ContentCardProps {
  content: ContentItem;
  collections: Collection[];
  selected: boolean;
  onSelect: (id: ID) => void;
}

export interface ContentGridProps {
  contents: ContentItem[];
  collections: Collection[];
  selectedContentId: ID | undefined;
  onSelect: (id: ID) => void;
}

export interface ContentEditorProps {
  open: boolean;
  content?: ContentItem;
  onClose: () => void;
}

export interface CollectionViewProps {
  open: boolean;
  onClose: () => void;
}

export interface StreakCardsProps {
  dueDates: ISODate[];
  statusByDate: Record<ISODate, CheckInStatus>;
  today: ISODate;
  viewerName: string;
}

export interface MonthHeatmapProps {
  dueDates: ISODate[];
  statusByDate: Record<ISODate, CheckInStatus>;
  today: ISODate;
  selectedDate: ISODate;
  onSelect: (date: ISODate) => void;
}

export interface DayDetailProps {
  date: ISODate;
  dueDates: ISODate[];
  today: ISODate;
}

export interface CheckInRowProps {
  checkIn: CheckIn;
  date: ISODate;
  today: ISODate;
  contents: ContentItem[];
  collections: Collection[];
  planName: string;
}

/** Frequency 的 kind 判别别名（计划表单用）。 */
export type FrequencyKind = Frequency['kind'];

export interface PlanManagerProps {
  open: boolean;
  onClose: () => void;
}

/** 计划编辑表单的局部状态（纯 UI，不落盘）。 */
export interface FormState {
  name: string;
  memberId: ID;
  kind: FrequencyKind;
  timesPerWeek: number;
  candidateWeekdays: Weekday[];
  weekdays: Weekday[];
  datesText: string;
  startDate: ISODate;
  endDate: ISODate;
  hiddenInSpace: boolean;
  linkedContentIds: ID[];
  linkedCollectionIds: ID[];
}

export interface HistoryViewProps {
  open: boolean;
  onClose: () => void;
  dueDates: ISODate[];
  statusByDate: Record<ISODate, CheckInStatus>;
  today: ISODate;
}

export interface MemberManagerProps {
  open: boolean;
  onClose: () => void;
}

// ── 预置示例数据的构造规格 ─────────────────────────────────
export interface ContentSpec {
  id: ID;
  title: string;
  source: SourceDescriptor;
  note: string;
  domain: string;
  media: ContentItem['media'];
  tags: string[];
  collectedOffset: number;
  contentDate?: ISODate;
  completion: ContentItem['completion'];
  collectionIds: ID[];
  linkedPlanIds: ID[];
  clipBody?: string;
  clipImageAssetIds?: ID[];
  publishedToSpace: boolean;
  coverAssetId?: ID;
  coverUrl?: string;
}

export interface CheckInSeed {
  memberId: ID;
  planId?: ID;
  date: ISODate;
  status: CheckInStatus;
  visibility: CheckInVisibility;
  backfilled: boolean;
  durationMin?: number;
  note?: string;
  linkedContentIds?: ID[];
  linkedCollectionIds?: ID[];
}
