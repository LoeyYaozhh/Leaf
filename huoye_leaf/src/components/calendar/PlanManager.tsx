/**
 * 计划管理二级页（架构 §2.6 / B-1 / C-4 / Q4 / 铁律 2）。
 * 频率配置：每天 / 每周 N 次（指定候选星期）/ 指定星期 / 自定义日期；
 * weekly_n.timesPerWeek 只作 UI 校验提示，不参与 deriveDueDates 推导。
 */
import { useMemo, useState } from 'react';
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
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { addDays, format, parseISO } from 'date-fns';
import { ConfirmDialog } from '@/components/common/Feedback';
import {
  DEFAULT_SPACE_ID,
  FREQUENCY_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  getTodayISO,
  newId,
} from '@/constants/app';
import { deriveDueDates } from '@/domain/schedule';
import { useAppStore } from '@/store/useAppStore';
import type {
  FormState,
  Frequency,
  FrequencyKind,
  ID,
  ISODate,
  Plan,
  PlanManagerProps,
  Weekday,
} from '@/types/domain';

const KINDS: ReadonlyArray<FrequencyKind> = [
  'daily',
  'weekly_n',
  'specific_weekdays',
  'custom_dates',
];

function emptyForm(memberId: ID, today: ISODate): FormState {
  return {
    name: '',
    memberId,
    kind: 'daily',
    timesPerWeek: 3,
    candidateWeekdays: [1, 3, 5],
    weekdays: [0, 6],
    datesText: '',
    startDate: today,
    endDate: '',
    hiddenInSpace: false,
    linkedContentIds: [],
    linkedCollectionIds: [],
  };
}

function formFromPlan(plan: Plan): FormState {
  const base = emptyForm(plan.memberId, plan.startDate);
  const frequency = plan.frequency;
  return {
    ...base,
    name: plan.name,
    memberId: plan.memberId,
    kind: frequency.kind,
    timesPerWeek: frequency.kind === 'weekly_n' ? frequency.timesPerWeek : 3,
    candidateWeekdays:
      frequency.kind === 'weekly_n' ? [...frequency.candidateWeekdays] : [1, 3, 5],
    weekdays:
      frequency.kind === 'specific_weekdays' ? [...frequency.weekdays] : [0, 6],
    datesText: frequency.kind === 'custom_dates' ? frequency.dates.join(', ') : '',
    startDate: plan.startDate,
    endDate: plan.endDate ?? '',
    hiddenInSpace: plan.hiddenInSpace,
    linkedContentIds: [...plan.linkedContentIds],
    linkedCollectionIds: [...plan.linkedCollectionIds],
  };
}

function buildFrequency(form: FormState): Frequency {
  switch (form.kind) {
    case 'weekly_n':
      return {
        kind: 'weekly_n',
        timesPerWeek: Math.max(1, form.timesPerWeek),
        candidateWeekdays: [...form.candidateWeekdays].sort(),
      };
    case 'specific_weekdays':
      return { kind: 'specific_weekdays', weekdays: [...form.weekdays].sort() };
    case 'custom_dates':
      return {
        kind: 'custom_dates',
        dates: Array.from(
          new Set(
            form.datesText
              .split(/[,，、\s]+/)
              .map((value) => value.trim())
              .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
          ),
        ).sort(),
      };
    case 'daily':
    default:
      return { kind: 'daily' };
  }
}

export default function PlanManager({ open, onClose }: PlanManagerProps): JSX.Element {
  const plans = useAppStore((state) => state.plans);
  const contents = useAppStore((state) => state.contents);
  const collections = useAppStore((state) => state.collections);
  const members = useAppStore((state) => state.members);
  const currentViewerId = useAppStore((state) => state.currentViewerId);
  const upsertPlan = useAppStore((state) => state.upsertPlan);
  const removePlan = useAppStore((state) => state.removePlan);
  const setPlanHidden = useAppStore((state) => state.setPlanHidden);

  const today = getTodayISO();
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(currentViewerId, today));
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [error, setError] = useState('');

  const patch = (partial: Partial<FormState>): void => setForm((prev) => ({ ...prev, ...partial }));

  const frequency = useMemo(() => buildFrequency(form), [form]);
  const previewPlan: Plan = useMemo(
    () => ({
      id: editingId ?? 'preview',
      spaceId: DEFAULT_SPACE_ID,
      name: form.name || '预览计划',
      memberId: form.memberId,
      frequency,
      startDate: form.startDate || today,
      endDate: form.endDate || undefined,
      hiddenInSpace: form.hiddenInSpace,
      linkedContentIds: form.linkedContentIds,
      linkedCollectionIds: form.linkedCollectionIds,
      createdAt: new Date().toISOString(),
    }),
    [editingId, form, frequency, today],
  );

  const previewDates = useMemo(
    () =>
      deriveDueDates(previewPlan, {
        start: today,
        end: format(addDays(parseISO(today), 13), 'yyyy-MM-dd'),
      }),
    [previewPlan, today],
  );

  const startCreate = (): void => {
    setEditingId(null);
    setForm(emptyForm(currentViewerId, today));
    setError('');
  };

  const startEdit = (plan: Plan): void => {
    setEditingId(plan.id);
    setForm(formFromPlan(plan));
    setError('');
  };

  const handleSave = (): void => {
    if (!form.name.trim()) {
      setError('请填写计划名称');
      return;
    }
    if (!form.startDate) {
      setError('请选择生效起始日');
      return;
    }
    if (form.kind === 'weekly_n' && form.candidateWeekdays.length === 0) {
      setError('每周 N 次需要至少指定一个候选星期');
      return;
    }
    if (form.kind === 'specific_weekdays' && form.weekdays.length === 0) {
      setError('指定星期需要至少选一天');
      return;
    }
    if (
      form.kind === 'custom_dates' &&
      frequency.kind === 'custom_dates' &&
      frequency.dates.length === 0
    ) {
      setError('自定义日期需要至少一个 yyyy-MM-dd 日期');
      return;
    }

    const existing = plans.find((plan) => plan.id === editingId);
    upsertPlan({
      ...previewPlan,
      id: existing?.id ?? newId(),
      name: form.name.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    startCreate();
  };

  const toggleWeekday = (key: 'candidateWeekdays' | 'weekdays', weekday: Weekday): void => {
    const current = form[key];
    const next = current.includes(weekday)
      ? current.filter((item) => item !== weekday)
      : [...current, weekday];
    patch({ [key]: next } as Partial<FormState>);
  };

  const weakHint =
    form.kind === 'weekly_n' && form.candidateWeekdays.length < form.timesPerWeek
      ? `提示：候选星期只有 ${form.candidateWeekdays.length} 天，少于目标 ${form.timesPerWeek} 次/周。timesPerWeek 仅作校验提示，不参与排期推导。`
      : null;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
        <DialogTitle>计划管理 · 频率配置</DialogTitle>
        <DialogContent dividers>
          <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 已有计划 */}
            <Box className="flex flex-col gap-2">
              <Box className="flex items-center justify-between">
                <Typography variant="subtitle2">已有计划（{plans.length}）</Typography>
                <Button size="small" onClick={startCreate}>新建计划</Button>
              </Box>
              {plans.length === 0 && (
                <Typography variant="body2" color="text.secondary">还没有计划，右侧新建一个。</Typography>
              )}
              {plans.map((plan) => (
                <Box key={plan.id} className="rounded-xl border border-[#e3e9e5] p-3">
                  <Box className="flex items-start justify-between gap-2">
                    <Box>
                      <Typography variant="subtitle2">{plan.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {FREQUENCY_LABELS[plan.frequency.kind]} · 自 {plan.startDate}
                        {plan.endDate ? ` 至 ${plan.endDate}` : ''} ·{' '}
                        {members.find((m) => m.id === plan.memberId)?.name ?? '成员'}
                      </Typography>
                    </Box>
                    <Box className="flex shrink-0">
                      <Tooltip title="编辑">
                        <IconButton size="small" onClick={() => startEdit(plan)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" onClick={() => setDeleteTarget(plan)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={plan.hiddenInSpace}
                        onChange={(event) => setPlanHidden(plan.id, event.target.checked)}
                      />
                    }
                    label={<Typography variant="caption">不在空间显示（C-4 计划级隐藏）</Typography>}
                  />
                </Box>
              ))}
            </Box>

            {/* 编辑表单 */}
            <Box className="flex flex-col gap-3 rounded-2xl bg-[#f5f7f5] p-3">
              <Typography variant="subtitle2">{editingId ? '编辑计划' : '新建计划'}</Typography>
              <TextField
                size="small"
                label="计划名称"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
              />

              <Box className="grid grid-cols-2 gap-2">
                <FormControl size="small" fullWidth>
                  <InputLabel id="plan-member-label">归属成员</InputLabel>
                  <Select
                    labelId="plan-member-label"
                    label="归属成员"
                    value={form.memberId}
                    onChange={(event) => patch({ memberId: event.target.value })}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="plan-frequency-label">频率</InputLabel>
                  <Select
                    labelId="plan-frequency-label"
                    label="频率"
                    value={form.kind}
                    onChange={(event) => patch({ kind: event.target.value as FrequencyKind })}
                  >
                    {KINDS.map((kind) => (
                      <MenuItem key={kind} value={kind}>{FREQUENCY_LABELS[kind]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  type="date"
                  label="生效起始"
                  value={form.startDate}
                  onChange={(event) => patch({ startDate: event.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="生效结束（可空）"
                  value={form.endDate}
                  onChange={(event) => patch({ endDate: event.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              {form.kind === 'weekly_n' && (
                <Box className="flex flex-col gap-2">
                  <TextField
                    size="small"
                    type="number"
                    label="每周目标次数（仅 UI 校验提示）"
                    value={form.timesPerWeek}
                    onChange={(event) => patch({ timesPerWeek: Number(event.target.value) })}
                  />
                  <Typography variant="caption" color="text.secondary">指定候选星期（即排期日集合）</Typography>
                  <Box className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((weekday) => (
                      <Chip
                        key={weekday}
                        size="small"
                        label={WEEKDAY_LABELS[weekday]}
                        color={form.candidateWeekdays.includes(weekday) ? 'primary' : 'default'}
                        variant={form.candidateWeekdays.includes(weekday) ? 'filled' : 'outlined'}
                        onClick={() => toggleWeekday('candidateWeekdays', weekday)}
                      />
                    ))}
                  </Box>
                  {weakHint && (
                    <Typography variant="caption" color="warning.main">{weakHint}</Typography>
                  )}
                </Box>
              )}

              {form.kind === 'specific_weekdays' && (
                <Box className="flex flex-col gap-2">
                  <Typography variant="caption" color="text.secondary">选择星期</Typography>
                  <Box className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((weekday) => (
                      <Chip
                        key={weekday}
                        size="small"
                        label={WEEKDAY_LABELS[weekday]}
                        color={form.weekdays.includes(weekday) ? 'primary' : 'default'}
                        variant={form.weekdays.includes(weekday) ? 'filled' : 'outlined'}
                        onClick={() => toggleWeekday('weekdays', weekday)}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {form.kind === 'custom_dates' && (
                <TextField
                  size="small"
                  multiline
                  minRows={2}
                  label="自定义日期（yyyy-MM-dd，逗号分隔）"
                  value={form.datesText}
                  onChange={(event) => patch({ datesText: event.target.value })}
                />
              )}

              <FormControl size="small" fullWidth>
                <InputLabel id="plan-contents-label">关联内容（仅日历页单向反查）</InputLabel>
                <Select
                  labelId="plan-contents-label"
                  label="关联内容（仅日历页单向反查）"
                  multiple
                  value={form.linkedContentIds}
                  onChange={(event) => {
                    const raw = event.target.value;
                    patch({ linkedContentIds: Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(',') });
                  }}
                  renderValue={(selected) => {
                    const list: string[] = Array.isArray(selected)
                      ? selected.map(String)
                      : String(selected ?? '').split(',').filter(Boolean);
                    return list.length === 0 ? '无' : `${list.length} 条内容`;
                  }}
                >
                  {contents.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel id="plan-collections-label">关联合集</InputLabel>
                <Select
                  labelId="plan-collections-label"
                  label="关联合集"
                  multiple
                  value={form.linkedCollectionIds}
                  onChange={(event) => {
                    const raw = event.target.value;
                    patch({
                      linkedCollectionIds: Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(','),
                    });
                  }}
                  renderValue={(selected) => {
                    const list: string[] = Array.isArray(selected)
                      ? selected.map(String)
                      : String(selected ?? '').split(',').filter(Boolean);
                    return list.length === 0 ? '无' : `${list.length} 个合集`;
                  }}
                >
                  {collections.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={form.hiddenInSpace}
                    onChange={(event) => patch({ hiddenInSpace: event.target.checked })}
                  />
                }
                label={<Typography variant="caption">不在空间显示</Typography>}
              />

              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  未来 14 天应完成日（deriveDueDates 同源预览，共 {previewDates.length} 天）：
                </Typography>
                <Box className="mt-1 flex flex-wrap gap-1">
                  {previewDates.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">该配置在未来 14 天没有排期日</Typography>
                  ) : (
                    previewDates.map((date) => (
                      <Chip key={date} size="small" variant="outlined" label={date.slice(5)} />
                    ))
                  )}
                </Box>
              </Box>

              {error && <Typography variant="body2" color="error">{error}</Typography>}
              <Box className="flex gap-2">
                <Button variant="contained" onClick={handleSave}>保存计划</Button>
                <Button color="inherit" onClick={startCreate}>清空</Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除计划？"
        message="只删除计划配置，已有打卡记录会保留（变为无计划归属的记录）。"
        confirmLabel="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removePlan(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
