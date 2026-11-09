/**
 * 当天待办明细（架构 §2.6 / B-2 / B-3 / B-6 / A-6 / 铁律 2）。
 * ★ 当天哪些计划排期，只由 deriveDueDates(plan, {start,end}) 判定（同源）；
 *   三态切换只写 checkIns[].status；关联内容 / 合集仅 navigateToContent() 跳转。
 */
import { useMemo, useState, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import { format, parseISO } from 'date-fns';
import { StatusChip } from '@/components/common/Feedback';
import {
  BACKFILL_HINT,
  CHECKIN_STATUS_LABELS,
  DEFAULT_SPACE_ID,
  VISIBILITY_LABELS,
  newId,
} from '@/constants/app';
import { deriveDueDates } from '@/domain/schedule';
import { canBackfill } from '@/domain/streak';
import { useAppStore } from '@/store/useAppStore';
import type {
  CheckIn,
  CheckInRowProps,
  CheckInStatus,
  DayDetailProps,
  ID,
  ISODate,
  Plan,
} from '@/types/domain';

/** 单条打卡：三态 / 补卡 / 仅自己 / 时长备注 / 关联内容跳转。 */
function CheckInRow({
  checkIn,
  date,
  today,
  contents,
  collections,
  planName,
}: CheckInRowProps): JSX.Element {
  const setCheckInStatus = useAppStore((state) => state.setCheckInStatus);
  const setCheckInVisibility = useAppStore((state) => state.setCheckInVisibility);
  const setCheckInMeta = useAppStore((state) => state.setCheckInMeta);
  const removeCheckIn = useAppStore((state) => state.removeCheckIn);
  const backfillFor = useAppStore((state) => state.backfillFor);
  const navigateToContent = useAppStore((state) => state.navigateToContent);

  const [duration, setDuration] = useState(
    checkIn.durationMin === undefined ? '' : String(checkIn.durationMin),
  );
  const [note, setNote] = useState(checkIn.note ?? '');

  const canWriteDone = canBackfill(date, today);
  const linkedContents = contents.filter((item) => checkIn.linkedContentIds.includes(item.id));
  const linkedCollections = collections.filter((item) =>
    checkIn.linkedCollectionIds.includes(item.id),
  );

  const handleStatus = (_event: MouseEvent<HTMLElement>, value: CheckInStatus | null): void => {
    if (!value) return;
    setCheckInStatus(checkIn.id, value);
  };

  return (
    <Box className="flex flex-col gap-2 rounded-xl border border-[#e3e9e5] bg-white p-3">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Box className="flex flex-wrap items-center gap-1">
          <Typography variant="subtitle2">{planName}</Typography>
          <StatusChip
            label={CHECKIN_STATUS_LABELS[checkIn.status]}
            tone={checkIn.status === 'done' ? 'success' : checkIn.status === 'leave' ? 'warning' : 'default'}
          />
          {checkIn.backfilled && <Chip size="small" variant="outlined" label="补卡" />}
          {checkIn.visibility === 'self_only' && (
            <Chip size="small" color="secondary" variant="outlined" label="仅自己" />
          )}
        </Box>
        <Tooltip title="删除这条打卡">
          <IconButton size="small" onClick={() => removeCheckIn(checkIn.id)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={checkIn.status}
        onChange={handleStatus}
        className="self-start"
      >
        {(['pending', 'done', 'leave'] as CheckInStatus[]).map((status) => (
          <ToggleButton
            key={status}
            value={status}
            disabled={status === 'done' && !canWriteDone && checkIn.status !== 'done'}
          >
            {CHECKIN_STATUS_LABELS[status]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography variant="caption" color="text.secondary">
        {date > today
          ? '未来排期日：不允许写「已完成」，但可以提前请假。'
          : canWriteDone
            ? BACKFILL_HINT
            : '已超过 7 天补卡窗口，不能补写「已完成」；仍可记录请假。'}
      </Typography>

      <Box className="flex flex-wrap items-center gap-2">
        {canWriteDone && checkIn.status !== 'done' && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => backfillFor(checkIn.memberId, date, checkIn.planId)}
          >
            补卡为已完成
          </Button>
        )}
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={checkIn.visibility === 'self_only'}
              onChange={(event) =>
                setCheckInVisibility(
                  checkIn.id,
                  event.target.checked ? 'self_only' : 'public',
                )
              }
            />
          }
          label={<Typography variant="caption">{VISIBILITY_LABELS.self_only}</Typography>}
        />
      </Box>

      <Box className="flex flex-wrap items-end gap-2">
        <TextField
          size="small"
          type="number"
          label="时长（分钟）"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          className="w-32"
        />
        <TextField
          size="small"
          label="备注"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-w-0 flex-1"
        />
        <Button
          size="small"
          onClick={() =>
            setCheckInMeta(checkIn.id, {
              durationMin: duration === '' ? undefined : Math.max(0, Number(duration)),
              note: note.trim() || undefined,
            })
          }
        >
          保存
        </Button>
      </Box>

      {(linkedContents.length > 0 || linkedCollections.length > 0) && (
        <Box className="flex flex-wrap items-center gap-1">
          <LinkIcon sx={{ fontSize: 15, color: '#8b958f' }} />
          {linkedContents.map((item) => (
            <Chip
              key={item.id}
              size="small"
              variant="outlined"
              label={item.title}
              onClick={() => navigateToContent(item.id)}
            />
          ))}
          {linkedCollections.map((item) => (
            <Chip key={item.id} size="small" variant="outlined" label={item.name} />
          ))}
          <Typography variant="caption" color="text.secondary">
            点击只跳转预览，不改变内容完成状态
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function DayDetail({ date, dueDates, today }: DayDetailProps): JSX.Element {
  const plans = useAppStore((state) => state.plans);
  const checkIns = useAppStore((state) => state.checkIns);
  const contents = useAppStore((state) => state.contents);
  const collections = useAppStore((state) => state.collections);
  const members = useAppStore((state) => state.members);
  const currentViewerId = useAppStore((state) => state.currentViewerId);
  const upsertCheckIn = useAppStore((state) => state.upsertCheckIn);

  // ★ 同源：当天命中哪些计划只由 deriveDueDates 判定
  const duePlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.memberId === currentViewerId &&
          deriveDueDates(plan, { start: date, end: date }).length > 0,
      ),
    [plans, currentViewerId, date],
  );

  const myCheckIns = useMemo(
    () =>
      checkIns
        .filter((item) => item.memberId === currentViewerId && item.date === date)
        .sort((a, b) => a.planId?.localeCompare(b.planId ?? '') ?? 0),
    [checkIns, currentViewerId, date],
  );
  const otherCheckIns = useMemo(
    () => checkIns.filter((item) => item.memberId !== currentViewerId && item.date === date),
    [checkIns, currentViewerId, date],
  );

  const createCheckIn = (planId: ID | undefined): void => {
    const timestamp = new Date().toISOString();
    const item: CheckIn = {
      id: newId(),
      spaceId: DEFAULT_SPACE_ID,
      memberId: currentViewerId,
      planId,
      date,
      status: 'pending',
      visibility: 'public',
      linkedContentIds: [],
      linkedCollectionIds: [],
      backfilled: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    upsertCheckIn(item);
  };

  // 显式声明行类型：临时记录 / 已不在排期的计划记录都允许 plan 为 undefined。
  const rows: Array<{
    plan: Plan | undefined;
    record: CheckIn | undefined;
    planName: string;
  }> = duePlans.map((plan) => {
    const record = myCheckIns.find((item) => item.planId === plan.id);
    return { plan, record, planName: plan.name };
  });
  const tempRecords = myCheckIns.filter((item) => !item.planId);
  tempRecords.forEach((record) => {
    rows.push({ plan: undefined, record, planName: '临时记录（无计划）' });
  });
  // 已存在但当天不再排期的计划内打卡，也要能看到
  myCheckIns.forEach((record) => {
    if (record.planId && !rows.some((row) => row.record?.id === record.id)) {
      const plan = plans.find((item) => item.id === record.planId);
      rows.push({ plan, record, planName: plan?.name ?? '计划记录' });
    }
  });

  const isDue = dueDates.includes(date);
  const viewerName = members.find((item) => item.id === currentViewerId)?.name ?? '当前身份';

  return (
    <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Box>
          <Typography variant="subtitle1">
            {format(parseISO(date), 'yyyy 年 MM 月 dd 日')} · {viewerName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isDue ? '这一天是应完成日' : '这一天不是应完成日（休息日不中断连续）'}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={() => createCheckIn(undefined)}>
          添加临时记录
        </Button>
      </Box>

      <Divider />

      {duePlans.length > 0 && (
        <Box className="flex flex-wrap gap-1">
          <Typography variant="caption" color="text.secondary" className="w-full">
            当天应完成计划（由 deriveDueDates 同源推导）：
          </Typography>
          {duePlans.map((plan) => (
            <Chip key={plan.id} size="small" variant="outlined" label={plan.name} />
          ))}
        </Box>
      )}

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          当天没有待办记录。
          {duePlans.length > 0
            ? '可以点「生成待办」为排期计划建档，或添加一条临时记录。'
            : '这是休息日，也可以添加一条临时记录。'}
        </Typography>
      ) : (
        <Box className="flex flex-col gap-2">
          {rows.map((row) =>
            row.record ? (
              <CheckInRow
                key={row.record.id}
                checkIn={row.record}
                date={date}
                today={today}
                contents={contents}
                collections={collections}
                planName={row.planName}
              />
            ) : (
              <Box
                key={row.plan?.id ?? 'temp'}
                className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#d5ded8] px-3 py-2"
              >
                <Typography variant="body2">{row.planName} · 尚未生成打卡</Typography>
                <Button size="small" onClick={() => createCheckIn(row.plan?.id)}>生成待办</Button>
              </Box>
            ),
          )}
        </Box>
      )}

      {otherCheckIns.length > 0 && (
        <>
          <Divider />
          <Typography variant="caption" color="text.secondary">家人当天记录</Typography>
          <Box className="flex flex-wrap gap-1">
            {otherCheckIns.map((item) => (
              <Chip
                key={item.id}
                size="small"
                label={`${members.find((m) => m.id === item.memberId)?.name ?? '成员'} · ${CHECKIN_STATUS_LABELS[item.status]}`}
                color={item.status === 'done' ? 'success' : 'default'}
                variant="outlined"
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
