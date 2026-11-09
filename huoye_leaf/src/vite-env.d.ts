/// <reference types="vite/client" />

/**
 * virtual:pwa-register 的 ambient 模块声明（架构 §2.1 明确指定本文件职责）。
 *
 * 这里只做第三方虚拟模块的环境声明，不定义任何领域类型；options 用内联类型字面量，
 * 避免与「所有命名类型只在 src/types/domain.ts 定义」的口径冲突。
 * 项目自行声明而非依赖 `vite-plugin-pwa/client`：tsconfig.json 的 types 仅含 vite/client。
 */
declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: unknown) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}
