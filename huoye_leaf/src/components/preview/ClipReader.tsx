/**
 * 剪藏卡片站内阅读视图（架构 §2.4 / A-9 / A-15 / Q3）。
 * 标题 / 封面 / 正文 / 图集 / 来源署名，正文靠用户粘贴或预置示例，绝不抓取外站。
 * 「去原站」仅作兜底按钮，必须用户主动点击；图集走本地上传。
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import { AssetImage, ContentCover } from '@/components/common/Feedback';
import { putAsset } from '@/storage/repository';
import { useAppStore } from '@/store/useAppStore';
import type { ContentItem, ID } from '@/types/domain';

function sourceHost(url: string | undefined): string {
  if (!url) return '用户粘贴 / 手动收录';
  try {
    return new URL(url).hostname;
  } catch {
    return '用户粘贴 / 手动收录';
  }
}

export default function ClipReader({ content }: { content: ContentItem }): JSX.Element {
  const updateContent = useAppStore((state) => state.updateContent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content.clipBody ?? '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setEditing(false);
    setDraft(content.clipBody ?? '');
  }, [content.id, content.clipBody]);

  const sourceUrl = content.source.sourceUrl;
  const images: ID[] = content.clipImageAssetIds ?? [];

  const saveBody = (): void => {
    updateContent({ ...content, clipBody: draft });
    setEditing(false);
  };

  /** 图集走本地上传（Q3），不引用外链图片。 */
  const uploadImages = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const ids: ID[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const id = await putAsset(file, { name: file.name, mime: file.type });
        ids.push(id);
      }
      if (ids.length > 0) {
        updateContent({ ...content, clipImageAssetIds: [...images, ...ids] });
      }
    } finally {
      setUploading(false);
    }
  };

  const openOriginal = (): void => {
    if (!sourceUrl) return;
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const paragraphs = (content.clipBody ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      <ContentCover content={content} height={180} />
      <Typography variant="h6">{content.title}</Typography>
      <Typography variant="caption" color="text.secondary">
        来源署名：{sourceHost(sourceUrl)} · 剪藏卡片（站内阅读）
      </Typography>
      <Divider />

      {editing ? (
        <Box className="flex flex-col gap-2">
          <TextField
            multiline
            minRows={6}
            fullWidth
            label="剪藏正文（粘贴 / 编辑后即时更新站内阅读视图）"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Box className="flex gap-2">
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveBody}
            >
              保存正文
            </Button>
            <Button size="small" color="inherit" onClick={() => setEditing(false)}>取消</Button>
          </Box>
        </Box>
      ) : (
        <Box className="flex flex-col gap-2">
          {paragraphs.length > 0 ? (
            paragraphs.map((line, index) => (
              <Typography key={`${index}-${line.slice(0, 8)}`} variant="body2" className="leading-relaxed">
                {line}
              </Typography>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              还没有正文。点「编辑正文」把剪藏内容粘贴进来即可（不做自动抓取）。
            </Typography>
          )}
          <Button
            size="small"
            variant="text"
            startIcon={<EditIcon />}
            onClick={() => setEditing(true)}
            className="self-start"
          >
            编辑正文
          </Button>
        </Box>
      )}

      {images.length > 0 && (
        <Box className="grid grid-cols-2 gap-2">
          {images.map((assetId, index) => (
            <AssetImage
              key={assetId}
              assetId={assetId}
              alt={`${content.title} 图 ${index + 1}`}
              height={140}
            />
          ))}
        </Box>
      )}

      <Box className="flex flex-wrap items-center gap-2">
        <Button component="label" size="small" variant="outlined" disabled={uploading}>
          {uploading ? '上传中…' : '本地上传图集'}
          <input
            hidden
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              void uploadImages(event.target.files);
              event.target.value = '';
            }}
          />
        </Button>
        {sourceUrl && (
          <Button
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            onClick={openOriginal}
          >
            去原站
          </Button>
        )}
      </Box>

      {content.note && (
        <>
          <Divider />
          <Typography variant="caption" color="text.secondary">备注：{content.note}</Typography>
        </>
      )}
    </Box>
  );
}
