/**
 * B 站官方 iframe 站内真播（架构 §2.4 / A-8 / Q2 / §4.2）。
 * 跨域 iframe 的 onError 不可靠，采用「EMBED_TIMEOUT_MS 超时 + 用户手动降级 + 封面卡兜底」。
 * 全链路禁止 fetch() 抓取外站正文。
 */
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CoverFallback from '@/components/preview/CoverFallback';
import { EMBED_TIMEOUT_MS } from '@/constants/app';
import { buildBiliEmbedUrl } from '@/domain/source';
import type { ContentItem } from '@/types/domain';

export default function BilibiliPlayer({ content }: { content: ContentItem }): JSX.Element {
  const [loaded, setLoaded] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const embedUrl = useMemo(() => {
    if (content.source.bvid) return buildBiliEmbedUrl(content.source.bvid);
    return content.source.embedUrl;
  }, [content.source.bvid, content.source.embedUrl]);

  // 内容切换时重置探测状态
  useEffect(() => {
    setLoaded(false);
    setDegraded(false);
    setTimedOut(false);
  }, [content.id, embedUrl]);

  useEffect(() => {
    if (!embedUrl || degraded || loaded) return undefined;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
      setDegraded(true);
    }, EMBED_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [embedUrl, degraded, loaded]);

  const retry = (): void => {
    setLoaded(false);
    setTimedOut(false);
    setDegraded(false);
  };

  if (!embedUrl || degraded) {
    return (
      <CoverFallback
        content={content}
        reason={
          timedOut
            ? `站内嵌入超时（${EMBED_TIMEOUT_MS / 1000}s），可能是 UP 主禁止嵌入或当前离线`
            : '站内嵌入不可用'
        }
        onRetry={retry}
      />
    );
  }

  return (
    <Box className="flex flex-col gap-2 rounded-2xl border border-[#e3e9e5] bg-white p-3">
      <Box className="relative w-full overflow-hidden rounded-xl bg-black" sx={{ aspectRatio: '16 / 9' }}>
        <Box
          component="iframe"
          src={embedUrl}
          title={`B 站内嵌播放：${content.title}`}
          onLoad={() => setLoaded(true)}
          allow="fullscreen; autoplay; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </Box>
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="caption" color="text.secondary">
          {loaded ? '已加载官方播放器（站内播放，不跳原站）' : '正在加载官方播放器…'}
        </Typography>
        <Button size="small" variant="text" onClick={() => setDegraded(true)}>
          无法播放？降级为封面卡
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" className="leading-relaxed">
        {content.note}
      </Typography>
    </Box>
  );
}
