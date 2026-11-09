/**
 * 内容新建 / 编辑（架构 §2.5 / A-1 / A-7 / A-9 / A-11 / A-13 / A-15 / Q3 / C-5）。
 * - 全字段可读写；粘贴链接自动识别来源（B 站 → iframe，其他 → 剪藏卡片）
 * - 本地小文件真实上传进 IndexedDB assets，站内预览
 * - 领域可自定义增删；内容日期可补录但不参与主排序
 * - publishedToSpace 默认 false，需手动「发到空间」
 * 全链路无 fetch()；剪藏正文靠用户粘贴。
 */
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  COMPLETION_LABELS,
  DEFAULT_SPACE_ID,
  MEDIA_LABELS,
  SOURCE_LABELS,
  newId,
} from '@/constants/app';
import { recognizeSource } from '@/domain/source';
import { putAsset } from '@/storage/repository';
import { useAppStore } from '@/store/useAppStore';
import type {
  CompletionStatus,
  ContentEditorProps,
  ContentItem,
  ID,
  MediaKind,
  SourceDescriptor,
} from '@/types/domain';

const COMPLETION_OPTIONS: ReadonlyArray<CompletionStatus> = [
  'not_started',
  'in_progress',
  'done',
];
const MEDIA_OPTIONS: ReadonlyArray<MediaKind> = ['video', 'image', 'note'];

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,，、\s]+/)
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    ),
  );
}

export default function ContentEditor({
  open,
  content,
  onClose,
}: ContentEditorProps): JSX.Element {
  const contents = useAppStore((state) => state.contents);
  const collections = useAppStore((state) => state.collections);
  const plans = useAppStore((state) => state.plans);
  const domains = useAppStore((state) => state.domains);
  const addContent = useAppStore((state) => state.addContent);
  const updateContent = useAppStore((state) => state.updateContent);
  const addDomain = useAppStore((state) => state.addDomain);
  const removeDomain = useAppStore((state) => state.removeDomain);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [clipBody, setClipBody] = useState('');
  const [note, setNote] = useState('');
  const [domain, setDomain] = useState('');
  const [media, setMedia] = useState<MediaKind>('note');
  const [tagsText, setTagsText] = useState('');
  const [contentDate, setContentDate] = useState('');
  const [completion, setCompletion] = useState<CompletionStatus>('not_started');
  const [collectionIds, setCollectionIds] = useState<ID[]>([]);
  const [linkedPlanIds, setLinkedPlanIds] = useState<ID[]>([]);
  const [clipImageAssetIds, setClipImageAssetIds] = useState<ID[]>([]);
  const [coverAssetId, setCoverAssetId] = useState<ID | undefined>(undefined);
  const [published, setPublished] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 打开 / 切换编辑对象时重置表单
  useEffect(() => {
    if (!open) return;
    const availableDomains = useAppStore.getState().domains;
    setTitle(content?.title ?? '');
    setUrl(content?.source.sourceUrl ?? '');
    setFile(null);
    setCoverFile(null);
    setClipBody(content?.clipBody ?? '');
    setNote(content?.note ?? '');
    setDomain(content?.domain ?? availableDomains[0] ?? '学习');
    setMedia(content?.media ?? 'note');
    setTagsText((content?.tags ?? []).join('、'));
    setContentDate(content?.contentDate ?? '');
    setCompletion(content?.completion ?? 'not_started');
    setCollectionIds(content?.collectionIds ?? []);
    setLinkedPlanIds(content?.linkedPlanIds ?? []);
    setClipImageAssetIds(content?.clipImageAssetIds ?? []);
    setCoverAssetId(content?.coverAssetId);
    setPublished(content?.publishedToSpace ?? false);
    setNewDomain('');
    setError('');
    // 只在打开 / 切换编辑对象时重置，避免领域增删等操作清空正在编辑的表单
  }, [open, content?.id]);

  const recognized: SourceDescriptor = useMemo(() => {
    if (file) return recognizeSource({ file });
    if (url.trim()) return recognizeSource({ url });
    return recognizeSource({ pastedText: clipBody });
  }, [file, url, clipBody]);

  const uploadClipImages = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    const ids: ID[] = [];
    for (const item of Array.from(files)) {
      if (!item.type.startsWith('image/')) continue;
      ids.push(await putAsset(item, { name: item.name, mime: item.type }));
    }
    if (ids.length > 0) {
      setClipImageAssetIds((previous) => [...previous, ...ids]);
    }
  };

  const handleAddDomain = (): void => {
    const value = newDomain.trim();
    if (!value) return;
    addDomain(value);
    setDomain(value);
    setNewDomain('');
  };

  const handleRemoveDomain = (name: string): void => {
    if (domains.length <= 1) return;
    removeDomain(name);
    if (domain === name) {
      setDomain(domains.find((item) => item !== name) ?? domains[0]);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }
    setSaving(true);
    setError('');

    try {
      let source: SourceDescriptor;
      if (file) {
        const assetId = await putAsset(file, { name: file.name, mime: file.type });
        source = recognizeSource({ file, assetId });
      } else if (url.trim()) {
        source = recognizeSource({ url });
      } else if (content) {
        source = { ...content.source };
      } else {
        source = recognizeSource({ pastedText: clipBody });
      }

      let body = clipBody;
      // 本地笔记：正文既写进 clipBody（A-4 搜索命中），也存成真实文本 Blob（A-7 站内预览）
      if (source.kind === 'local_note') {
        if (file && !body.trim()) body = await file.text();
        const text = body || note || title;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const assetId = await putAsset(blob, {
          id: source.assetId,
          name: `${title}.txt`,
          mime: 'text/plain',
        });
        source = { ...source, assetId };
        body = text;
      }

      let nextCoverAssetId = coverAssetId;
      if (coverFile) {
        nextCoverAssetId = await putAsset(coverFile, {
          name: coverFile.name,
          mime: coverFile.type,
        });
      } else if (source.kind === 'local_image' && source.assetId && !nextCoverAssetId) {
        nextCoverAssetId = source.assetId;
      }

      const timestamp = new Date().toISOString();
      const item: ContentItem = {
        id: content?.id ?? newId(),
        spaceId: DEFAULT_SPACE_ID,
        title: title.trim(),
        coverUrl: content?.coverUrl,
        coverAssetId: nextCoverAssetId,
        source,
        note: note.trim(),
        domain: domain || '学习',
        media,
        tags: parseTags(tagsText),
        collectedAt: content?.collectedAt ?? timestamp,
        contentDate: contentDate || undefined,
        completion,
        collectionIds,
        linkedPlanIds,
        clipBody: body || undefined,
        clipImageAssetIds: clipImageAssetIds.length > 0 ? clipImageAssetIds : undefined,
        publishedToSpace: published,
        createdAt: content?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };

      if (content) {
        updateContent(item);
      } else {
        addContent(item);
      }
      onClose();
    } catch (cause) {
      console.error('[活页] 保存内容失败', cause);
      setError('保存失败，请检查本地文件后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>{content ? '编辑内容' : '新增内容'}</DialogTitle>
      <DialogContent dividers>
        <Box className="flex flex-col gap-4 py-1">
          <Typography variant="subtitle2">来源与预览</Typography>
          <TextField
            fullWidth
            size="small"
            label="来源链接（B 站 / 小红书 / 公众号等，可留空）"
            placeholder="https://www.bilibili.com/video/BV... 或直接粘贴 BV 号"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            helperText="B 站链接自动识别为站内 iframe；其他来源生成剪藏卡片，正文靠粘贴，不做自动抓取。"
          />

          <Box className="flex flex-wrap items-center gap-2">
            <Button component="label" size="small" variant="outlined">
              选择本地文件（图片 / 文本）
              <input
                hidden
                type="file"
                accept="image/*,text/*,.md,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <Button component="label" size="small" variant="outlined">
              上传封面（可选）
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <Button component="label" size="small" variant="outlined">
              剪藏图集（本地上传）
              <input
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  void uploadClipImages(event.target.files);
                  event.target.value = '';
                }}
              />
            </Button>
            <Chip size="small" color="primary" variant="outlined" label={`识别为：${SOURCE_LABELS[recognized.kind]}`} />
            {file && <Chip size="small" label={file.name} onDelete={() => setFile(null)} />}
            {coverFile && <Chip size="small" label={coverFile.name} onDelete={() => setCoverFile(null)} />}
            {clipImageAssetIds.length > 0 && (
              <Chip
                size="small"
                label={`图集 ${clipImageAssetIds.length} 张`}
                onDelete={() => setClipImageAssetIds([])}
              />
            )}
          </Box>

          <TextField
            fullWidth
            multiline
            minRows={3}
            size="small"
            label="剪藏 / 笔记正文（可被全字段搜索命中）"
            value={clipBody}
            onChange={(event) => setClipBody(event.target.value)}
          />

          <Divider />
          <Typography variant="subtitle2">字段</Typography>

          <TextField
            required
            fullWidth
            size="small"
            label="标题"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="备注"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="标签（用逗号 / 顿号分隔）"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
          />

          <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormControl size="small" fullWidth>
              <InputLabel id="editor-domain-label">领域类型</InputLabel>
              <Select
                labelId="editor-domain-label"
                label="领域类型"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              >
                {domains.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="editor-media-label">媒体属性（顶部 chip 视图）</InputLabel>
              <Select
                labelId="editor-media-label"
                label="媒体属性（顶部 chip 视图）"
                value={media}
                onChange={(event) => setMedia(event.target.value as MediaKind)}
              >
                {MEDIA_OPTIONS.map((item) => (
                  <MenuItem key={item} value={item}>{MEDIA_LABELS[item]}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="editor-completion-label">内容完成状态</InputLabel>
              <Select
                labelId="editor-completion-label"
                label="内容完成状态"
                value={completion}
                onChange={(event) => setCompletion(event.target.value as CompletionStatus)}
              >
                {COMPLETION_OPTIONS.map((item) => (
                  <MenuItem key={item} value={item}>{COMPLETION_LABELS[item]}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              type="date"
              label="内容日期（可补录，不参与排序）"
              value={contentDate}
              onChange={(event) => setContentDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="editor-collections-label">所属合集（可多归属）</InputLabel>
              <Select
                labelId="editor-collections-label"
                label="所属合集（可多归属）"
                multiple
                value={collectionIds}
                onChange={(event) => {
                  const raw = event.target.value;
                  setCollectionIds(Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(','));
                }}
                renderValue={(selected) => {
                  const list: string[] = Array.isArray(selected)
                    ? selected.map(String)
                    : String(selected ?? '').split(',').filter(Boolean);
                  return list.length === 0
                    ? '无'
                    : list
                        .map((id) => collections.find((c) => c.id === id)?.name ?? id)
                        .join('、');
                }}
              >
                {collections.map((collection) => (
                  <MenuItem key={collection.id} value={collection.id}>{collection.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="editor-plans-label">关联计划（仅跳转，不联动状态）</InputLabel>
              <Select
                labelId="editor-plans-label"
                label="关联计划（仅跳转，不联动状态）"
                multiple
                value={linkedPlanIds}
                onChange={(event) => {
                  const raw = event.target.value;
                  setLinkedPlanIds(Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(','));
                }}
                renderValue={(selected) => {
                  const list: string[] = Array.isArray(selected)
                    ? selected.map(String)
                    : String(selected ?? '').split(',').filter(Boolean);
                  return list.length === 0
                    ? '无'
                    : list
                        .map((id) => plans.find((p) => p.id === id)?.name ?? id)
                        .join('、');
                }}
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* A-11 领域自定义增删 */}
          <Box className="flex flex-col gap-2 rounded-xl bg-[#f5f7f5] p-3">
            <Typography variant="caption" color="text.secondary">领域类型管理（可增删，用于筛选）</Typography>
            <Box className="flex flex-wrap gap-1">
              {domains.map((item) => (
                <Chip
                  key={item}
                  size="small"
                  label={item}
                  onDelete={() => handleRemoveDomain(item)}
                  deleteIcon={<DeleteOutlineIcon />}
                />
              ))}
            </Box>
            <Box className="flex items-center gap-2">
              <TextField
                size="small"
                label="新增领域"
                value={newDomain}
                onChange={(event) => setNewDomain(event.target.value)}
              />
              <Button size="small" startIcon={<AddIcon />} onClick={handleAddDomain}>新增</Button>
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
              />
            }
            label="发到空间（资料库默认私有，手动发布后其他成员才可见）"
          />

          {error && <Typography variant="body2" color="error">{error}</Typography>}
          {contents.length === 0 && !content && (
            <Typography variant="caption" color="text.secondary">
              当前资料库为空，保存后列表会立即出现这条内容。
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
