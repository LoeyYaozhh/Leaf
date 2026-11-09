/**
 * 来源识别纯函数（架构 §4.2 / A-8 / A-10 / Q2）。
 * 全链路禁止 fetch() 抓取外站正文；本文件只做字符串识别。
 */
import { BILI_EMBED_BASE } from '@/constants/app';
import type { RecognizeSourceInput, SourceDescriptor } from '@/types/domain';

/** BV 号：'BV' + 10 位字母数字。 */
const BVID_PATTERN = /BV[0-9A-Za-z]{10}/;
const PURE_BVID_PATTERN = /^BV[0-9A-Za-z]{10}$/;
const SHORT_LINK_PATTERN = /b23\.tv/i;
const HTTP_URL_PATTERN = /^https?:\/\//i;

/**
 * 提取 B 站 BV 号：仅支持「完整 URL」与「纯 BV 号」，不解析 b23.tv 短链（Q2）。
 * @param input 用户粘贴的链接或纯 BV 号
 * @returns BV 号；无法识别时返回 null
 */
export function extractBvid(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (SHORT_LINK_PATTERN.test(value)) return null;
  if (PURE_BVID_PATTERN.test(value)) return value;
  if (HTTP_URL_PATTERN.test(value)) {
    const matched = value.match(BVID_PATTERN);
    return matched ? matched[0] : null;
  }
  return null;
}

/** 构造官方 iframe 播放地址（站内真播，不跳原站）。 */
export function buildBiliEmbedUrl(bvid: string): string {
  return `${BILI_EMBED_BASE}?bvid=${encodeURIComponent(bvid)}&autoplay=0`;
}

/** 规范化原站链接：只保留 http(s) 完整 URL，其余返回 undefined。 */
function normalizeSourceUrl(url: string): string | undefined {
  const value = url.trim();
  return HTTP_URL_PATTERN.test(value) ? value : undefined;
}

/**
 * 识别来源并产出 SourceDescriptor。
 * 优先级：本地文件 > 链接（B 站 / 其他外链）> 粘贴正文 > 纯文本笔记。
 */
export function recognizeSource(input: RecognizeSourceInput): SourceDescriptor {
  const { url, file, pastedText, assetId } = input;

  if (file) {
    if (file.type.startsWith('image/')) {
      return { kind: 'local_image', assetId };
    }
    return { kind: 'local_note', assetId };
  }

  const candidate = (url ?? '').trim();
  if (candidate) {
    const bvid = extractBvid(candidate);
    if (bvid) {
      return {
        kind: 'bilibili',
        bvid,
        embedUrl: buildBiliEmbedUrl(bvid),
        sourceUrl: normalizeSourceUrl(candidate),
      };
    }
    // 小红书等无嵌入接口的来源 → 剪藏卡片（正文靠用户粘贴 / 预置示例）
    return {
      kind: 'clip',
      sourceUrl: normalizeSourceUrl(candidate),
      coverUrl: undefined,
    };
  }

  if (pastedText && pastedText.trim()) {
    return { kind: 'clip' };
  }

  // 无任何输入：视作纯文本笔记（正文由编辑器写入 clipBody）
  return { kind: 'clip' };
}
