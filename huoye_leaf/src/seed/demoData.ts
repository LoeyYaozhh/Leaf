/**
 * 预置示例数据（架构 §2.3 / F-3 / Q6 / §5.7）。
 *
 * 规模：10 条内容（B 站可播 / 剪藏卡片 / 本地图片 / 笔记 / 外链兜底）、
 * 3 名成员、3 个计划、约 30 天打卡历史。
 *
 * 历史由 deriveDueDates() 同源生成，并刻意包含：
 * 请假(leave) / 漏打(pending) / 补卡(backfilled) / self_only / hiddenInSpace 计划 /
 * 提前请假(未来 leave) / 临时记录(planId undefined)，
 * 保证首次打开即可演示 C-2「切换身份后结果确有差异」。
 *
 * 所有占位图均为内联 SVG 字符串 → Blob（不出浏览器、永不失败）；
 * 外链封面仅用于演示 onError → PlaceholderImage。
 */
import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { DEFAULT_DOMAINS, DEFAULT_SPACE_ID, getTodayISO } from '@/constants/app';
import { deriveDueDates } from '@/domain/schedule';
import type {
  AppState,
  AssetRecord,
  CheckIn,
  CheckInSeed,
  CheckInStatus,
  CheckInVisibility,
  Cheer,
  Collection,
  ContentItem,
  ContentSpec,
  ID,
  ISODate,
  ISOTimestamp,
  Member,
  Plan,
} from '@/types/domain';

// ── 固定 ID（seed 使用稳定 ID，运行时新建一律 crypto.randomUUID） ──
const ME: ID = 'demo-member-me';
const MOM: ID = 'demo-member-mom';
const DAD: ID = 'demo-member-dad';

const PLAN_READ: ID = 'demo-plan-read';
const PLAN_FIT: ID = 'demo-plan-fit';
const PLAN_MEDITATION: ID = 'demo-plan-meditation';

const COL_STUDY: ID = 'demo-collection-study';
const COL_FIT: ID = 'demo-collection-fit';
const COL_LIFE: ID = 'demo-collection-life';

const C_BILI_1: ID = 'demo-content-bili-knowledge';
const C_BILI_2: ID = 'demo-content-bili-stretch';
const C_CLIP_1: ID = 'demo-content-clip-mealprep';
const C_CLIP_2: ID = 'demo-content-clip-running';
const C_IMAGE_1: ID = 'demo-content-image-desk';
const C_IMAGE_2: ID = 'demo-content-image-route';
const C_NOTE_1: ID = 'demo-content-note-book';
const C_NOTE_2: ID = 'demo-content-note-meditation';
const C_CLIP_3: ID = 'demo-content-clip-hiking';
const C_EXTERNAL: ID = 'demo-content-external-tutorial';

const A_COVER = (n: number): ID => `demo-asset-cover-${n}`;
const A_LOCAL = (n: number): ID => `demo-asset-local-${n}`;

function stamp(date: ISODate, clock = '09:00:00.000Z'): ISOTimestamp {
  return `${date}T${clock}`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return '&apos;';
    }
  });
}

/** 内联 SVG data-URI 内容 → Blob（不出浏览器、永不失败）。 */
export function makePlaceholderImage(label: string, tone = '#2f6f5e'): Blob {
  const safe = escapeXml(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${tone}"/><stop offset="100%" stop-color="#9fc4b3"/>
  </linearGradient></defs>
  <rect width="640" height="400" fill="url(#g)"/>
  <circle cx="500" cy="90" r="130" fill="#ffffff" opacity="0.10"/>
  <circle cx="120" cy="340" r="90" fill="#ffffff" opacity="0.08"/>
  <text x="40" y="205" font-size="34" fill="#ffffff" font-family="sans-serif" font-weight="700">${safe}</text>
  <text x="40" y="250" font-size="18" fill="#ffffff" opacity="0.85" font-family="sans-serif">活页 · 本地占位图（离线可预览）</text>
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

function makeTextBlob(text: string): Blob {
  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

/** 构造 10 条内容，覆盖三条站内预览路径 + 降级封面卡。 */
function buildContents(today: ISODate): ContentItem[] {
  const specs: ContentSpec[] = [
    {
      id: C_BILI_1,
      title: '【学习】如何建立个人知识体系',
      source: {
        kind: 'bilibili',
        bvid: 'BV1GJ411x7h7',
        embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7&autoplay=0',
        sourceUrl: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      },
      note: '官方 iframe 站内真播示例；嵌入受限时自动降级封面卡。',
      domain: '学习',
      media: 'video',
      tags: ['知识管理', 'B站', '方法论'],
      collectedOffset: 2,
      completion: 'in_progress',
      collectionIds: [COL_STUDY],
      linkedPlanIds: [PLAN_READ],
      publishedToSpace: true,
      coverAssetId: A_COVER(1),
    },
    {
      id: C_BILI_2,
      title: '15 分钟居家拉伸跟练',
      source: {
        kind: 'bilibili',
        bvid: 'BV1xx411c7mD',
        embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&autoplay=0',
        sourceUrl: 'https://www.bilibili.com/video/BV1xx411c7mD',
      },
      note: '训练日跟练用，配合「每周三练」计划。',
      domain: '健身',
      media: 'video',
      tags: ['拉伸', '跟练', 'B站'],
      collectedOffset: 6,
      completion: 'not_started',
      collectionIds: [COL_FIT],
      linkedPlanIds: [PLAN_FIT],
      publishedToSpace: true,
      coverAssetId: A_COVER(2),
    },
    {
      id: C_CLIP_1,
      title: '小红书 · 一周减脂备餐清单',
      source: {
        kind: 'clip',
        sourceUrl: 'https://www.xiaohongshu.com/explore/demo-mealprep',
      },
      note: '正文为用户粘贴，站内阅读视图打开，不做自动抓取。',
      domain: '爱好',
      media: 'image',
      tags: ['备餐', '剪藏', '图集'],
      collectedOffset: 9,
      contentDate: format(subDays(parseISO(today), 12), 'yyyy-MM-dd'),
      completion: 'done',
      collectionIds: [COL_LIFE],
      linkedPlanIds: [],
      clipBody:
        '一周备餐的核心是先定蛋白质，再配蔬菜与主食。\n\n' +
        '周日统一处理鸡胸肉、藜麦与西兰花，分装成 5 盒冷藏。' +
        '关键词：鸡胸肉、藜麦、备餐盒、冷藏 3 天。\n\n' +
        '周三补一次绿叶菜，避免最后一盒口感变差。图集里是分装顺序与调味表。',
      clipImageAssetIds: [A_LOCAL(3), A_LOCAL(4)],
      publishedToSpace: false,
      coverUrl: 'https://images.example.invalid/xhs-mealprep-cover.jpg', // 故意失效，演示 onError 占位
    },
    {
      id: C_CLIP_2,
      title: '小红书 · 跑步前后拉伸图解',
      source: {
        kind: 'clip',
        sourceUrl: 'https://www.xiaohongshu.com/explore/demo-running',
      },
      note: '重点看髂胫束与小腿后侧的放松动作。',
      domain: '健身',
      media: 'image',
      tags: ['跑步', '剪藏', '拉伸'],
      collectedOffset: 13,
      completion: 'not_started',
      collectionIds: [COL_FIT],
      linkedPlanIds: [PLAN_FIT],
      clipBody:
        '跑前做动态热身，跑后做静态拉伸。髂胫束不要直接滚压痛点，' +
        '先放松阔筋膜张肌。小腿后侧靠墙拉伸每次 30 秒，左右各两组。',
      clipImageAssetIds: [A_LOCAL(5)],
      publishedToSpace: false,
      coverAssetId: A_COVER(3),
    },
    {
      id: C_IMAGE_1,
      title: '我的书桌与书架',
      source: { kind: 'local_image', assetId: A_LOCAL(1) },
      note: '本地上传的真实 Blob，objectURL 站内预览，刷新不丢。',
      domain: '学习',
      media: 'image',
      tags: ['书桌', '本地图片'],
      collectedOffset: 17,
      contentDate: format(subDays(parseISO(today), 20), 'yyyy-MM-dd'),
      completion: 'done',
      collectionIds: [COL_STUDY, COL_LIFE],   // A-5 多归属
      linkedPlanIds: [PLAN_READ],
      publishedToSpace: true,
      coverAssetId: A_LOCAL(1),
    },
    {
      id: C_IMAGE_2,
      title: '公园晨跑路线图',
      source: { kind: 'local_image', assetId: A_LOCAL(2) },
      note: '周末 5 公里环线，随手拍下来存进活页。',
      domain: '健身',
      media: 'image',
      tags: ['跑步', '路线', '本地图片'],
      collectedOffset: 21,
      completion: 'not_started',
      collectionIds: [COL_FIT],
      linkedPlanIds: [PLAN_FIT],
      publishedToSpace: false,
      coverAssetId: A_LOCAL(2),
    },
    {
      id: C_NOTE_1,
      title: '《认知觉醒》读书笔记',
      source: { kind: 'local_note', assetId: A_LOCAL(6) },
      note: '本地笔记正文可被全字段搜索命中（试试搜「元认知」）。',
      domain: '学习',
      media: 'note',
      tags: ['读书笔记', '元认知'],
      collectedOffset: 5,
      completion: 'in_progress',
      collectionIds: [COL_STUDY],
      linkedPlanIds: [PLAN_READ],
      clipBody:
        '第七章讲到「元认知」：能够站在更高一层观察自己的思考过程，' +
        '才谈得上主动选择而不是被惯性推着走。\n\n' +
        '我的落地做法：每天阅读后写三句话，分别记录「我原本以为」「书里说」「我准备改」。',
      publishedToSpace: true,
      coverAssetId: A_COVER(4),
    },
    {
      id: C_NOTE_2,
      title: '冥想呼吸练习记录',
      source: { kind: 'local_note', assetId: A_LOCAL(7) },
      note: '属于「不在空间显示」的计划，仅自己可见。',
      domain: '爱好',
      media: 'note',
      tags: ['冥想', '私密'],
      collectedOffset: 11,
      completion: 'not_started',
      collectionIds: [COL_LIFE],
      linkedPlanIds: [PLAN_MEDITATION],
      clipBody:
        '4-7-8 呼吸法：吸气 4 秒、屏息 7 秒、呼气 8 秒，一轮做 4 组。' +
        '第三组开始肩膀会明显放松，走神时不用评判，回到计数即可。',
      publishedToSpace: false,
      coverAssetId: A_COVER(5),
    },
    {
      id: C_CLIP_3,
      title: '公众号 · 周末亲子徒步清单',
      source: {
        kind: 'clip',
        sourceUrl: 'https://mp.weixin.qq.com/s/demo-family-hiking',
      },
      note: '一家人周末用的装备清单，已发到空间。',
      domain: '爱好',
      media: 'note',
      tags: ['徒步', '亲子', '剪藏'],
      collectedOffset: 25,
      completion: 'done',
      collectionIds: [COL_LIFE],
      linkedPlanIds: [],
      clipBody:
        '轻装路线：每人 1 升水、能量棒、防晒帽、创可贴。' +
        '带孩子走的时候把目标定在「找到三种不同形状的叶子」，比单纯赶路有效得多。',
      publishedToSpace: true,
      coverAssetId: A_COVER(6),
    },
    {
      id: C_EXTERNAL,
      title: '外站教程（需去原站）',
      source: {
        kind: 'external',
        sourceUrl: 'https://example.com/tutorial',
      },
      note: '无嵌入接口的来源，站内显示封面卡，「去原站」需用户主动点击。',
      domain: '学习',
      media: 'note',
      tags: ['外链', '兜底'],
      collectedOffset: 28,
      completion: 'not_started',
      collectionIds: [],
      linkedPlanIds: [],
      publishedToSpace: false,
      coverAssetId: A_COVER(7),
    },
  ];

  return specs.map((spec) => {
    const date = format(subDays(parseISO(today), spec.collectedOffset), 'yyyy-MM-dd');
    return {
      id: spec.id,
      spaceId: DEFAULT_SPACE_ID,
      title: spec.title,
      coverUrl: spec.coverUrl,
      coverAssetId: spec.coverAssetId,
      source: spec.source,
      note: spec.note,
      domain: spec.domain,
      media: spec.media,
      tags: spec.tags,
      collectedAt: stamp(date, '10:00:00.000Z'),
      contentDate: spec.contentDate,
      completion: spec.completion,
      collectionIds: spec.collectionIds,
      linkedPlanIds: spec.linkedPlanIds,
      clipBody: spec.clipBody,
      clipImageAssetIds: spec.clipImageAssetIds,
      publishedToSpace: spec.publishedToSpace,
      createdAt: stamp(date, '10:00:00.000Z'),
      updatedAt: stamp(date, '10:00:00.000Z'),
    };
  });
}

/** 3 个计划：daily / weekly_n(指定候选星期) / specific_weekdays + 隐藏计划。 */
function buildPlans(today: ISODate): Plan[] {
  const startDate = format(subDays(parseISO(today), 30), 'yyyy-MM-dd');
  const createdAt = stamp(startDate, '08:00:00.000Z');
  return [
    {
      id: PLAN_READ,
      spaceId: DEFAULT_SPACE_ID,
      name: '每天阅读 20 分钟',
      memberId: ME,
      frequency: { kind: 'daily' },
      startDate,
      hiddenInSpace: false,
      linkedContentIds: [C_BILI_1, C_NOTE_1, C_IMAGE_1],
      linkedCollectionIds: [COL_STUDY],
      createdAt,
    },
    {
      id: PLAN_FIT,
      spaceId: DEFAULT_SPACE_ID,
      name: '每周三练（一 / 三 / 五）',
      memberId: ME,
      frequency: { kind: 'weekly_n', timesPerWeek: 3, candidateWeekdays: [1, 3, 5] },
      startDate,
      hiddenInSpace: false,
      linkedContentIds: [C_BILI_2, C_CLIP_2, C_IMAGE_2],
      linkedCollectionIds: [COL_FIT],
      createdAt,
    },
    {
      id: PLAN_MEDITATION,
      spaceId: DEFAULT_SPACE_ID,
      name: '晨间冥想（不在空间显示）',
      memberId: ME,
      frequency: { kind: 'specific_weekdays', weekdays: [1, 2, 3, 4, 5] },
      startDate,
      hiddenInSpace: true,
      linkedContentIds: [C_NOTE_2],
      linkedCollectionIds: [COL_LIFE],
      createdAt,
    },
  ];
}

/** 3 个合集：有序、无嵌套、一条内容可多归属。 */
function buildCollections(today: ISODate): Collection[] {
  const base = stamp(format(subDays(parseISO(today), 30), 'yyyy-MM-dd'));
  return [
    {
      id: COL_STUDY,
      spaceId: DEFAULT_SPACE_ID,
      name: '学习清单',
      orderedContentIds: [C_BILI_1, C_NOTE_1, C_IMAGE_1],
      publishedToSpace: true,
      createdAt: base,
    },
    {
      id: COL_FIT,
      spaceId: DEFAULT_SPACE_ID,
      name: '健身跟练',
      orderedContentIds: [C_BILI_2, C_CLIP_2, C_IMAGE_2],
      publishedToSpace: false,
      createdAt: base,
    },
    {
      id: COL_LIFE,
      spaceId: DEFAULT_SPACE_ID,
      name: '生活灵感',
      orderedContentIds: [C_CLIP_1, C_IMAGE_1, C_CLIP_3, C_NOTE_2],
      publishedToSpace: false,
      createdAt: base,
    },
  ];
}

/**
 * 用 deriveDueDates 生成 ~30 天历史（同源口径），并刻意注入各类案例。
 */
function buildCheckInSeeds(plans: Plan[], today: ISODate): CheckInSeed[] {
  const seeds: CheckInSeed[] = [];
  const range = {
    start: format(subDays(parseISO(today), 29), 'yyyy-MM-dd'),
    end: today,
  };

  for (const plan of plans) {
    const dueDates = deriveDueDates(plan, range);
    dueDates.forEach((date, index) => {
      const distance = differenceInCalendarDays(parseISO(today), parseISO(date));
      let status: CheckInStatus = 'done';
      let visibility: CheckInVisibility = 'public';
      let backfilled = false;
      let note: string | undefined;
      let durationMin: number | undefined;

      // 漏打：每天计划周期性留一个 pending，确保当前连续被清零过又恢复
      if (plan.id === PLAN_READ && index % 13 === 7) {
        status = 'pending';
        note = '那天加班，漏打了';
      }
      // 提前请假：leave 不中断也不计入
      if (index % 11 === 4) {
        status = 'leave';
        note = '提前请假，休息一天';
      }
      // 补卡：只标记最近 7 天内的记录
      if (status === 'done' && distance <= 7 && index % 5 === 2) {
        backfilled = true;
        note = '补卡：当天忘记点完成，第二天补上';
      }
      // 单条「仅自己」：只打在 done 上，保证动态流中出现明显差异
      if (status === 'done' && index % 9 === 3) {
        visibility = 'self_only';
        note = '只给自己看的记录';
      }
      // ★ self_only + hiddenInSpace 同时成立 → 短路规则：作者本人仍可见
      if (plan.id === PLAN_MEDITATION && index === 2) {
        status = 'done';
        visibility = 'self_only';
        note = '隐藏计划里的仅自己记录（作者仍可见）';
      }

      if (status === 'done') {
        durationMin = 20 + (index % 4) * 5;
      }

      seeds.push({
        memberId: ME,
        planId: plan.id,
        date,
        status,
        visibility,
        backfilled,
        durationMin,
        note,
        linkedContentIds:
          status === 'done' && index % 4 === 0 ? plan.linkedContentIds.slice(0, 1) : [],
        linkedCollectionIds:
          status === 'done' && index % 6 === 0 ? plan.linkedCollectionIds.slice(0, 1) : [],
      });
    });
  }

  // 未来排期日：不允许写 done，但允许「提前请假」
  const futureLeave: ISODate = format(addDays(parseISO(today), 2), 'yyyy-MM-dd');
  seeds.push({
    memberId: ME,
    planId: PLAN_READ,
    date: futureLeave,
    status: 'leave',
    visibility: 'public',
    backfilled: false,
    note: '提前请假：后天要出门',
  });

  // 妈妈的临时记录（planId undefined），含一条仅自己
  [1, 4, 8, 12].forEach((offset, index) => {
    seeds.push({
      memberId: MOM,
      date: format(subDays(parseISO(today), offset), 'yyyy-MM-dd'),
      status: 'done',
      visibility: index === 1 ? 'self_only' : 'public',
      backfilled: false,
      durationMin: 35,
      note: index === 1 ? '妈妈自己的小记录' : '晚饭后全家散步 35 分钟',
      linkedContentIds: [C_CLIP_3],
      linkedCollectionIds: [COL_LIFE],
    });
  });

  // 爸爸的临时记录，含一条仅自己
  [2, 6, 10].forEach((offset, index) => {
    seeds.push({
      memberId: DAD,
      date: format(subDays(parseISO(today), offset), 'yyyy-MM-dd'),
      status: 'done',
      visibility: index === 2 ? 'self_only' : 'public',
      backfilled: false,
      durationMin: 30,
      note: index === 2 ? '爸爸自己的小记录' : '陪练拉伸 30 分钟',
    });
  });

  return seeds;
}

function buildCheckIns(seeds: CheckInSeed[]): CheckIn[] {
  return seeds.map((seed, index) => {
    const createdAt = stamp(seed.date, `08:${String(10 + (index % 40)).padStart(2, '0')}:00.000Z`);
    return {
      id: `demo-checkin-${String(index + 1).padStart(3, '0')}`,
      spaceId: DEFAULT_SPACE_ID,
      memberId: seed.memberId,
      planId: seed.planId,
      date: seed.date,
      status: seed.status,
      visibility: seed.visibility,
      durationMin: seed.durationMin,
      note: seed.note,
      linkedContentIds: seed.linkedContentIds ?? [],
      linkedCollectionIds: seed.linkedCollectionIds ?? [],
      backfilled: seed.backfilled,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function buildCheers(checkIns: CheckIn[], today: ISODate): Cheer[] {
  const candidates = checkIns
    .filter((checkIn) => checkIn.status === 'done' && checkIn.visibility === 'public')
    .slice(0, 8);
  const cheers: Cheer[] = [];
  candidates.forEach((checkIn, index) => {
    const giver = index % 3 === 0 ? ME : index % 3 === 1 ? MOM : DAD;
    if (giver === checkIn.memberId) return;
    cheers.push({
      id: `demo-cheer-${index + 1}`,
      spaceId: DEFAULT_SPACE_ID,
      checkInId: checkIn.id,
      memberId: giver,
      createdAt: stamp(today, `12:${String(index).padStart(2, '0')}:00.000Z`),
    });
  });
  return cheers;
}

/** 生成完整 AppState（首次运行）。 */
export function buildDemoData(): AppState {
  const today = getTodayISO();
  const members: Member[] = [
    {
      id: ME,
      spaceId: DEFAULT_SPACE_ID,
      name: '小叶（我）',
      avatarColor: '#2f6f5e',
      joinedAt: stamp(format(subDays(parseISO(today), 60), 'yyyy-MM-dd')),
    },
    {
      id: MOM,
      spaceId: DEFAULT_SPACE_ID,
      name: '妈妈',
      avatarColor: '#e07a5f',
      joinedAt: stamp(format(subDays(parseISO(today), 58), 'yyyy-MM-dd')),
    },
    {
      id: DAD,
      spaceId: DEFAULT_SPACE_ID,
      name: '爸爸',
      avatarColor: '#3d5a80',
      joinedAt: stamp(format(subDays(parseISO(today), 57), 'yyyy-MM-dd')),
    },
  ];

  const contents = buildContents(today);
  const plans = buildPlans(today);
  const collections = buildCollections(today);
  const checkIns = buildCheckIns(buildCheckInSeeds(plans, today));

  return {
    spaceId: DEFAULT_SPACE_ID,
    contents,
    collections,
    plans,
    checkIns,
    members,
    cheers: buildCheers(checkIns, today),
    domains: [...DEFAULT_DOMAINS],
    currentViewerId: ME,
    activeTab: 'leaf',
    hydrated: false,
  };
}

/**
 * 依据 AppState 中引用的 assetId 生成示例资源记录（内联 SVG / 纯文本 Blob）。
 * hydrate.bootstrap() 首次运行时逐个 writeAsset()。
 */
export function buildDemoAssets(state: AppState): AssetRecord[] {
  const records: AssetRecord[] = [];
  const seen = new Set<ID>();
  const createdAt = new Date().toISOString();
  const tones = ['#2f6f5e', '#3d5a80', '#9c6644', '#6a4c93', '#1982c4', '#e07a5f'];

  const add = (id: ID, blob: Blob, mime: string, name: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    records.push({ id, blob, mime, name, createdAt });
  };

  state.contents.forEach((content, index) => {
    const tone = tones[index % tones.length];

    if (content.coverAssetId) {
      add(
        content.coverAssetId,
        makePlaceholderImage(content.title, tone),
        'image/svg+xml',
        `${content.coverAssetId}.svg`,
      );
    }

    const assetId = content.source.assetId;
    if (assetId) {
      if (content.source.kind === 'local_note') {
        add(
          assetId,
          makeTextBlob(content.clipBody ?? content.note),
          'text/plain',
          `${assetId}.txt`,
        );
      } else {
        add(
          assetId,
          makePlaceholderImage(content.title, tone),
          'image/svg+xml',
          `${assetId}.svg`,
        );
      }
    }

    (content.clipImageAssetIds ?? []).forEach((clipId, clipIndex) => {
      add(
        clipId,
        makePlaceholderImage(`${content.title} · 图 ${clipIndex + 1}`, tone),
        'image/svg+xml',
        `${clipId}.svg`,
      );
    });
  });

  return records;
}
