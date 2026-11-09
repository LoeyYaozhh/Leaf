import { describe, expect, it } from 'vitest';
import { buildBiliEmbedUrl, extractBvid, recognizeSource } from '../src/domain/source';

/**
 * 来源识别（架构 §4.2 / A-8 / A-9 / A-10 / Q2）。
 * 全部为字符串 / 纯对象判定，不构造真实 File、不使用 DOM / 网络。
 */
const BVID = 'BV1GJ411x7h7';

/** 只在 node 环境里模拟 File 的 type 字段（recognizeSource 仅读取 file.type）。 */
function fakeFile(type: string): File {
  return { type } as unknown as File;
}

describe('extractBvid · 仅完整 URL 与纯 BV 号（Q2）', () => {
  it('纯 BV 号原样返回', () => {
    expect(extractBvid(BVID)).toBe(BVID);
  });

  it('完整 B 站 URL 提取出 BV 号', () => {
    expect(extractBvid(`https://www.bilibili.com/video/${BVID}`)).toBe(BVID);
    expect(extractBvid(`https://www.bilibili.com/video/${BVID}?spm_id_from=333`)).toBe(BVID);
  });

  it('首尾空白被 trim', () => {
    expect(extractBvid(`  ${BVID}  `)).toBe(BVID);
  });

  it('b23.tv 短链不解析，返回 null', () => {
    expect(extractBvid('https://b23.tv/abc123')).toBeNull();
    expect(extractBvid(`https://b23.tv/${BVID}`)).toBeNull();
  });

  it('空串 / 无 BV 号的外链 / 裸文本返回 null', () => {
    expect(extractBvid('')).toBeNull();
    expect(extractBvid('   ')).toBeNull();
    expect(extractBvid('https://www.xiaohongshu.com/explore/demo')).toBeNull();
    expect(extractBvid('随便一段文字')).toBeNull();
  });
});

describe('buildBiliEmbedUrl', () => {
  it('产出官方 iframe 地址（站内真播，不跳原站）', () => {
    expect(buildBiliEmbedUrl(BVID)).toBe(
      'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7&autoplay=0',
    );
  });
});

describe('recognizeSource · 三条站内路径 + 降级', () => {
  it('B 站链接 → bilibili（含 bvid / embedUrl / 原站链接）', () => {
    const url = `https://www.bilibili.com/video/${BVID}`;
    expect(recognizeSource({ url })).toEqual({
      kind: 'bilibili',
      bvid: BVID,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${BVID}&autoplay=0`,
      sourceUrl: url,
    });
  });

  it('无嵌入接口的外链 → 剪藏卡片（正文靠用户粘贴，不抓取）', () => {
    const url = 'https://www.xiaohongshu.com/explore/demo-mealprep';
    const result = recognizeSource({ url });
    expect(result.kind).toBe('clip');
    expect(result.sourceUrl).toBe(url);
    expect(result.bvid).toBeUndefined();
  });

  it('非 http(s) 输入不产生 sourceUrl', () => {
    expect(recognizeSource({ url: 'BV-not-a-url' }).sourceUrl).toBeUndefined();
  });

  it('粘贴正文 → 剪藏卡片', () => {
    expect(recognizeSource({ pastedText: '一段用户粘贴的正文' }).kind).toBe('clip');
  });

  it('无任何输入 → 剪藏卡片（纯文本笔记由编辑器写 clipBody）', () => {
    expect(recognizeSource({}).kind).toBe('clip');
  });

  it('本地图片 → local_image 并回填 assetId', () => {
    expect(recognizeSource({ file: fakeFile('image/png'), assetId: 'a1' })).toEqual({
      kind: 'local_image',
      assetId: 'a1',
    });
  });

  it('本地文本文件 → local_note 并回填 assetId', () => {
    expect(recognizeSource({ file: fakeFile('text/plain'), assetId: 'a2' })).toEqual({
      kind: 'local_note',
      assetId: 'a2',
    });
  });

  it('本地文件优先级高于链接', () => {
    const result = recognizeSource({
      file: fakeFile('image/jpeg'),
      url: `https://www.bilibili.com/video/${BVID}`,
      assetId: 'a3',
    });
    expect(result.kind).toBe('local_image');
    expect(result.assetId).toBe('a3');
  });
});
