/**
 * 持久化仓库（架构 §2.3 / §4.1）。
 * AppState 走整快照读写；Blob 走独立 assets store，绝不进入快照。
 */
import { openDB } from '@/storage/db';
import { ASSETS_STORE, STATE_KEY, STATE_STORE } from '@/constants/app';
import type { AppState, AssetRecord, ID } from '@/types/domain';

/** 读取 AppState 快照；首次运行返回 undefined。 */
export async function readState(): Promise<AppState | undefined> {
  const db = await openDB();
  return db.get(STATE_STORE, STATE_KEY);
}

/** 写入 AppState 整快照。 */
export async function writeState(state: AppState): Promise<void> {
  const db = await openDB();
  await db.put(STATE_STORE, state, STATE_KEY);
}

/** store 订阅在微任务内合并调用的落盘入口（§1.5）。 */
export async function persistState(state: AppState): Promise<void> {
  await writeState(state);
}

/**
 * 写入一个本地资源并返回其 assetId。
 * 编辑器上传文件时使用；seed 使用 writeAsset 以固定 ID 写入。
 */
export async function putAsset(
  blob: Blob,
  options: { id?: ID; mime?: string; name?: string } = {},
): Promise<ID> {
  const id = options.id ?? crypto.randomUUID();
  const record: AssetRecord = {
    id,
    blob,
    mime: options.mime ?? blob.type ?? 'application/octet-stream',
    name: options.name ?? id,
    createdAt: new Date().toISOString(),
  };
  await writeAsset(record);
  return id;
}

/** 直接写入完整 AssetRecord（seed / importAll 使用）。 */
export async function writeAsset(record: AssetRecord): Promise<void> {
  const db = await openDB();
  await db.put(ASSETS_STORE, record);
}

/** 按 assetId 取资源；不存在返回 undefined。 */
export async function getAsset(id: ID): Promise<AssetRecord | undefined> {
  const db = await openDB();
  return db.get(ASSETS_STORE, id);
}

/** 删除资源。 */
export async function deleteAsset(id: ID): Promise<void> {
  const db = await openDB();
  await db.delete(ASSETS_STORE, id);
}

/** 导出全部数据（本地备份用，无 UI 入口）。 */
export async function exportAll(): Promise<{
  state: AppState | undefined;
  assets: AssetRecord[];
}> {
  const db = await openDB();
  const [state, assets] = await Promise.all([
    db.get(STATE_STORE, STATE_KEY),
    db.getAll(ASSETS_STORE),
  ]);
  return { state, assets };
}

/** 导入全部数据（本地恢复用，无 UI 入口）。 */
export async function importAll(payload: {
  state: AppState;
  assets: AssetRecord[];
}): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STATE_STORE, ASSETS_STORE], 'readwrite');
  await Promise.all([
    tx.objectStore(STATE_STORE).put(payload.state, STATE_KEY),
    ...payload.assets.map((record) => tx.objectStore(ASSETS_STORE).put(record)),
  ]);
  await tx.done;
}
