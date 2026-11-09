/**
 * IndexedDB 连接（架构 §1.5 / Q1）。
 * 库 huoye_leaf_db v1，两个 store：
 * - state ：固定 key 'app_state'，单个 AppState JSON 快照（不含 Blob）
 * - assets：keyPath 'id'，存 AssetRecord（含 Blob）
 */
import { openDB as idbOpenDB, type IDBPDatabase } from 'idb';
import { ASSETS_STORE, DB_NAME, DB_VERSION, STATE_STORE } from '@/constants/app';
import type { LeafDBSchema } from '@/types/domain';

let connection: Promise<IDBPDatabase<LeafDBSchema>> | null = null;

/** 幂等地打开（含版本迁移）；同一页面只建立一次连接。 */
export function openDB(): Promise<IDBPDatabase<LeafDBSchema>> {
  if (!connection) {
    connection = idbOpenDB<LeafDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STATE_STORE)) {
          database.createObjectStore(STATE_STORE);
        }
        if (!database.objectStoreNames.contains(ASSETS_STORE)) {
          database.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        }
      },
      blocked() {
        console.warn('[活页] IndexedDB 升级被其他标签页阻塞');
      },
      blocking() {
        console.warn('[活页] 其他标签页正在等待本页关闭数据库');
      },
    });
  }
  return connection;
}
