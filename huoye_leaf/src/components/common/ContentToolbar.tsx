/**
 * 内容工具栏（架构 §2.4 / A-2 / A-3 / A-4）。
 * - 全字段搜索框（标题 / 备注 / 标签 / 合集名 / 剪藏与笔记正文）
 * - 媒体属性 chip：全部 / 视频 / 图片 / 笔记，只做视图过滤，不与领域筛选串联成主维度
 * - 筛选行：类型(领域) × 标签 × 时间(收录时间) × 完成状态，多条件 AND，已选条件可单独清除
 */
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { COMPLETION_LABELS, MEDIA_LABELS } from '@/constants/app';
import type {
  CompletionStatus,
  ContentToolbarProps,
  DomainType,
  FilterCriteria,
  MediaKind,
} from '@/types/domain';

const MEDIA_OPTIONS: ReadonlyArray<{ value: MediaKind | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'video', label: MEDIA_LABELS.video },
  { value: 'image', label: MEDIA_LABELS.image },
  { value: 'note', label: MEDIA_LABELS.note },
];

const COMPLETION_OPTIONS: ReadonlyArray<CompletionStatus> = [
  'not_started',
  'in_progress',
  'done',
];

export default function ContentToolbar({
  criteria,
  onChange,
  domains,
  allTags,
  resultCount,
  totalCount,
}: ContentToolbarProps): JSX.Element {
  const patch = (partial: Partial<FilterCriteria>): void => {
    onChange({ ...criteria, ...partial });
  };

  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (criteria.domain) {
    activeChips.push({
      key: 'domain',
      label: `类型：${criteria.domain}`,
      clear: () => patch({ domain: undefined }),
    });
  }
  (criteria.tags ?? []).forEach((tag) => {
    activeChips.push({
      key: `tag-${tag}`,
      label: `标签：${tag}`,
      clear: () => patch({ tags: (criteria.tags ?? []).filter((item) => item !== tag) }),
    });
  });
  if (criteria.dateRange?.start || criteria.dateRange?.end) {
    activeChips.push({
      key: 'range',
      label: `收录：${criteria.dateRange.start || '…'} ~ ${criteria.dateRange.end || '…'}`,
      clear: () => patch({ dateRange: undefined }),
    });
  }
  if (criteria.completion) {
    activeChips.push({
      key: 'completion',
      label: `状态：${COMPLETION_LABELS[criteria.completion]}`,
      clear: () => patch({ completion: undefined }),
    });
  }
  if (criteria.keyword) {
    activeChips.push({
      key: 'keyword',
      label: `搜索：${criteria.keyword}`,
      clear: () => patch({ keyword: undefined }),
    });
  }

  const hasAnyCondition = activeChips.length > 0 || Boolean(criteria.media);

  return (
    <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      {/* 全字段搜索 + 媒体属性 chip（chip 独立成行，只做视图过滤） */}
      <Box className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <TextField
          fullWidth
          size="small"
          placeholder="搜索标题 / 备注 / 标签 / 合集名 / 剪藏与笔记正文"
          value={criteria.keyword ?? ''}
          onChange={(event) => patch({ keyword: event.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: criteria.keyword ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="清空搜索" onClick={() => patch({ keyword: undefined })}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Box className="flex shrink-0 flex-wrap items-center gap-1.5">
          {MEDIA_OPTIONS.map((option) => {
            const selected = option.value === 'all' ? !criteria.media : criteria.media === option.value;
            return (
              <Chip
                key={option.value}
                label={option.label}
                size="small"
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => patch({ media: option.value === 'all' ? undefined : option.value })}
              />
            );
          })}
        </Box>
      </Box>

      {/* 多条件 AND 筛选行 */}
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <FormControl size="small" fullWidth>
          <InputLabel id="filter-domain-label">领域类型</InputLabel>
          <Select
            labelId="filter-domain-label"
            label="领域类型"
            value={criteria.domain ?? ''}
            onChange={(event) => patch({ domain: event.target.value || undefined })}
          >
            <MenuItem value="">全部领域</MenuItem>
            {domains.map((domain) => (
              <MenuItem key={domain} value={domain}>{domain}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel id="filter-tags-label">标签</InputLabel>
          <Select
            labelId="filter-tags-label"
            label="标签"
            multiple
            value={criteria.tags ?? []}
            onChange={(event) => {
              const raw = event.target.value;
              patch({ tags: Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(',') });
            }}
            renderValue={(selected) => {
              const list: string[] = Array.isArray(selected)
                ? selected.map(String)
                : String(selected ?? '').split(',').filter(Boolean);
              return list.length === 0 ? '全部标签' : list.join('、');
            }}
          >
            {allTags.map((tag) => (
              <MenuItem key={tag} value={tag}>{tag}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="date"
          label="收录起"
          value={criteria.dateRange?.start ?? ''}
          onChange={(event) =>
            patch({
              dateRange: {
                start: event.target.value,
                end: criteria.dateRange?.end ?? '',
              },
            })
          }
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="收录止"
          value={criteria.dateRange?.end ?? ''}
          onChange={(event) =>
            patch({
              dateRange: {
                start: criteria.dateRange?.start ?? '',
                end: event.target.value,
              },
            })
          }
          InputLabelProps={{ shrink: true }}
        />

        <FormControl size="small" fullWidth>
          <InputLabel id="filter-completion-label">完成状态</InputLabel>
          <Select
            labelId="filter-completion-label"
            label="完成状态"
            value={criteria.completion ?? ''}
            onChange={(event) =>
              patch({ completion: (event.target.value || undefined) as CompletionStatus | undefined })
            }
          >
            <MenuItem value="">全部状态</MenuItem>
            {COMPLETION_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>{COMPLETION_LABELS[status]}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 已选条件可单独清除 */}
      <Box className="flex flex-wrap items-center gap-2">
        <Typography variant="caption" color="text.secondary">
          共 {resultCount} / {totalCount} 条
        </Typography>
        {activeChips.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            size="small"
            variant="outlined"
            onDelete={chip.clear}
          />
        ))}
        {hasAnyCondition && (
          <Chip
            label="清除全部条件"
            size="small"
            color="secondary"
            variant="outlined"
            onClick={() => onChange({})}
          />
        )}
      </Box>
    </Box>
  );
}
