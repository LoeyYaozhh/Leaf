/**
 * 响应式唯一真源（架构 §1.3 / §八 / F-1）。
 * useMediaQuery('(min-width:1024px)') 是全项目唯一的视口判定；
 * 其他组件不得自行判断视口，一律读本 hook。
 */
import { useMediaQuery } from '@mui/material';
import { LG_BREAKPOINT, LG_MEDIA_QUERY } from '@/constants/app';
import type { ResponsiveState } from '@/types/domain';

export function useResponsive(): ResponsiveState {
  const isWide = useMediaQuery(LG_MEDIA_QUERY, { noSsr: true });
  return {
    isWide,
    breakpoint: LG_BREAKPOINT,
    previewMode: isWide ? 'panel' : 'overlay',
  };
}
