/**
 * 通用反馈组件（架构 §2.4 / A-8 / A-14 / Q3）。
 * 所有 <img> 失败一律降级到 PlaceholderImage，绝不出现破图。
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip, { type ChipProps } from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import InboxIcon from '@mui/icons-material/Inbox';
import { useAssetUrl } from '@/hooks/useAssetUrl';
import type { ContentItem, ID } from '@/types/domain';
import type { ReactNode } from 'react';

/** 占位图：外链封面 / Blob 失败时的统一兜底。 */
export function PlaceholderImage({
  label = '暂无封面',
  height = 160,
}: {
  label?: string;
  height?: number;
}): JSX.Element {
  return (
    <Box
      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#eef2ef] text-[#8b958f]"
      sx={{ height }}
    >
      <ImageNotSupportedIcon fontSize="large" />
      <Typography variant="caption" className="px-3 text-center leading-tight">
        {label}
      </Typography>
    </Box>
  );
}

/**
 * 内容封面：优先本地 Blob（objectURL），其次外链 coverUrl；
 * 两者失败都通过 onError → PlaceholderImage。
 */
export function ContentCover({
  content,
  height = 160,
}: {
  content: ContentItem;
  height?: number;
}): JSX.Element {
  const asset = useAssetUrl(content.coverAssetId);
  const [broken, setBroken] = useState(false);
  const src = asset.url ?? content.coverUrl ?? content.source.coverUrl;

  useEffect(() => {
    setBroken(false);
  }, [src, asset.url]);

  if (asset.loading && !src) {
    return <Skeleton variant="rounded" height={height} />;
  }
  if (!src || broken || asset.failed) {
    return <PlaceholderImage label={content.title} height={height} />;
  }
  return (
    <Box
      component="img"
      src={src}
      alt={content.title}
      onError={() => setBroken(true)}
      className="w-full rounded-xl object-cover"
      sx={{ height }}
    />
  );
}

/** 本地资源图片（assetId → objectURL），失败同样占位。 */
export function AssetImage({
  assetId,
  alt,
  height = 180,
}: {
  assetId?: ID;
  alt: string;
  height?: number;
}): JSX.Element {
  const asset = useAssetUrl(assetId);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [asset.url]);

  if (asset.loading) return <Skeleton variant="rounded" height={height} />;
  if (!asset.url || asset.failed || broken) {
    return <PlaceholderImage label={alt} height={height} />;
  }
  return (
    <Box
      component="img"
      src={asset.url}
      alt={alt}
      onError={() => setBroken(true)}
      className="w-full rounded-xl object-cover"
      sx={{ height }}
    />
  );
}

/** 空态。 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <Box className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d5ded8] bg-white px-6 py-12 text-center">
      <InboxIcon sx={{ fontSize: 42, color: '#aab8b1' }} />
      <Typography variant="subtitle1">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" className="max-w-md leading-relaxed">
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

/** 统一状态 Chip（完成状态 / 打卡三态 / 热力状态 / 私密标记）。 */
export function StatusChip({
  label,
  tone = 'default',
  size = 'small',
  variant = 'filled',
}: {
  label: ReactNode;
  tone?: ChipProps['color'];
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}): JSX.Element {
  return <Chip label={label} color={tone} size={size} variant={variant} />;
}

/** 二次确认对话框。 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">{cancelLabel}</Button>
        <Button onClick={onConfirm} variant="contained" color="primary">{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
