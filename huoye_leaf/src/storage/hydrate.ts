/**
 * 启动恢复 / 首次运行 seed（架构 §1.5 / §4.1 / F-2 / F-3）。
 * 首次运行：buildDemoData() → writeState() + 示例占位图写入 assets；已有数据：直接恢复。
 */
import { openDB } from '@/storage/db';
import { readState, writeAsset, writeState } from '@/storage/repository';
import { buildDemoAssets, buildDemoData } from '@/seed/demoData';
import { DEFAULT_SPACE_ID } from '@/constants/app';
import type { AppState } from '@/types/domain';

/**
 * 规范化快照：补齐所有数组字段、修正失效的 currentViewerId，
 * 并把纯 UI 导航状态复位（刷新回默认 tab，但数据完整保留，§5.8）。
 */
export function normalizeState(raw: AppState): AppState {
  const members = Array.isArray(raw.members) ? raw.members : [];
  const viewerExists = members.some((member) => member.id === raw.currentViewerId);
  const currentViewerId = viewerExists ? raw.currentViewerId : (members[0]?.id ?? '');

  return {
    spaceId: raw.spaceId ?? DEFAULT_SPACE_ID,
    extensions: raw.extensions,
    contents: Array.isArray(raw.contents) ? raw.contents : [],
    collections: Array.isArray(raw.collections) ? raw.collections : [],
    plans: Array.isArray(raw.plans) ? raw.plans : [],
    checkIns: Array.isArray(raw.checkIns) ? raw.checkIns : [],
    members,
    cheers: Array.isArray(raw.cheers) ? raw.cheers : [],
    domains: Array.isArray(raw.domains) && raw.domains.length > 0 ? raw.domains : ['健身', '学习', '爱好'],
    currentViewerId,
    activeTab: 'leaf',
    selectedContentId: undefined,
    selectedDate: undefined,
    detailView: undefined,
    hydrated: true,
  };
}

/** bootstrap：返回可直接灌入 store 的 AppState；任何存储异常都退化为内存示例数据。 */
export async function bootstrap(): Promise<AppState> {
  let state: AppState | undefined;

  try {
    await openDB();
    state = await readState();

    if (!state) {
      const demo = buildDemoData();
      await writeState(demo);
      for (const record of buildDemoAssets(demo)) {
        await writeAsset(record);
      }
      state = demo;
    }
  } catch (error) {
    console.error('[活页] 本地库不可用，本次使用内存示例数据', error);
    state = buildDemoData();
  }

  return normalizeState(state ?? buildDemoData());
}
