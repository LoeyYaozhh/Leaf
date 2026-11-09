/**
 * 内容详情（架构 §2.5 / A-6 / C-5 / Q8）。
 * ★ 内容完成状态是独立字段：切换只写 completion，绝不写 CheckIn.status；
 *   关联计划仅跳转（navigateToPlan），不联动任何状态；
 *   「发到空间」是手动发布动作，默认私有。
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import ContentEditor from '@/components/content/ContentEditor';
import { ConfirmDialog } from '@/components/common/Feedback';
import PreviewRouter from '@/components/preview/PreviewRouter';
import { COMPLETION_LABELS, MEDIA_LABELS, SOURCE_LABELS } from '@/constants/app';
import { collectionProgress } from '@/domain/collection';
import { useAppStore } from '@/store/useAppStore';
import type { CompletionStatus, ContentItem } from '@/types/domain';

const COMPLETION_OPTIONS: ReadonlyArray<CompletionStatus> = [
  'not_started',
  'in_progress',
  'done',
];

export default function ContentDetail({ content }: { content: ContentItem }): JSX.Element {
  const collections = useAppStore((state) => state.collections);
  const plans = useAppStore((state) => state.plans);
  const setContentCompletion = useAppStore((state) => state.setContentCompletion);
  const publishContent = useAppStore((state) => state.publishContent);
  const removeContent = useAppStore((state) => state.removeContent);
  const setSelectedContentId = useAppStore((state) => state.setSelectedContentId);
  const navigateToPlan = useAppStore((state) => state.navigateToPlan);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const linkedPlans = plans.filter((plan) => content.linkedPlanIds.includes(plan.id));
  const ownedCollections = collections.filter((collection) =>
    content.collectionIds.includes(collection.id),
  );

  return (
    <Box className="flex flex-col gap-3">
      {/* 站内预览三路径 */}
      <PreviewRouter content={content} />

      <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
        <Box className="flex items-start justify-between gap-2">
          <Box className="min-w-0">
            <Typography variant="subtitle1">{content.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {SOURCE_LABELS[content.source.kind]} · {MEDIA_LABELS[content.media]} · {content.domain}
            </Typography>
          </Box>
          <Box className="flex shrink-0">
            <IconButton size="small" aria-label="编辑内容" onClick={() => setEditing(true)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="删除内容" onClick={() => setConfirmDelete(true)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box className="flex flex-wrap gap-1">
          {content.tags.map((tag) => (
            <Chip key={tag} size="small" variant="outlined" label={`#${tag}`} />
          ))}
        </Box>

        <Typography variant="caption" color="text.secondary">
          收录时间 {content.collectedAt.slice(0, 10)}
          {content.contentDate ? ` · 内容日期 ${content.contentDate}（不参与排序）` : ''}
        </Typography>

        <Divider />

        {/* ★ 独立完成状态：只写 contents[].completion */}
        <FormControl size="small" fullWidth>
          <InputLabel id="detail-completion-label">内容完成状态（独立于打卡）</InputLabel>
          <Select
            labelId="detail-completion-label"
            label="内容完成状态（独立于打卡）"
            value={content.completion}
            onChange={(event) =>
              setContentCompletion(content.id, event.target.value as CompletionStatus)
            }
          >
            {COMPLETION_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>{COMPLETION_LABELS[status]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary" className="leading-relaxed">
          两套状态互不自动同步：改这里不会改变任何打卡状态，改打卡也不会改这里。
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={content.publishedToSpace}
              onChange={(event) => publishContent(content.id, event.target.checked)}
            />
          }
          label="发到空间（关闭则其他成员不可见）"
        />

        <Divider />

        {/* 关联计划：仅跳转，不联动状态 */}
        <Typography variant="subtitle2">关联计划</Typography>
        {linkedPlans.length > 0 ? (
          <Box className="flex flex-wrap gap-2">
            {linkedPlans.map((plan) => (
              <Button
                key={plan.id}
                size="small"
                variant="outlined"
                onClick={() => navigateToPlan(plan.id)}
              >
                {plan.name}
              </Button>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">暂无关联计划</Typography>
        )}

        <Typography variant="subtitle2">所属合集</Typography>
        {ownedCollections.length > 0 ? (
          <Box className="flex flex-col gap-1">
            {ownedCollections.map((collection) => {
              const progress = collectionProgress(collection, content.id);
              return (
                <Typography key={collection.id} variant="caption" color="text.secondary">
                  {collection.name}
                  {progress ? ` · 第 ${progress.index} / ${progress.total} 条` : ''}
                  {collection.publishedToSpace ? ' · 已发到空间' : ''}
                </Typography>
              );
            })}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">未加入合集</Typography>
        )}
      </Box>

      <ContentEditor open={editing} content={content} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={confirmDelete}
        title="删除这条内容？"
        message="只删除内容本身，不会改动打卡状态；已加入的合集会保留其余条目。"
        confirmLabel="删除"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeContent(content.id);
          setSelectedContentId(undefined);
          setConfirmDelete(false);
        }}
      />
    </Box>
  );
}
