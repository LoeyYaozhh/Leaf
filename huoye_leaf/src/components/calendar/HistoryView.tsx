/**
 * 历史记录 +「那天学了什么」（架构 §2.6 / B-5 / Q8）。
 * ★ 单向反查：只在这里由日历页查内容 ↔ 计划，内容侧不反向展示打卡；
 *   应完成日仍复用 deriveDueDates，热力状态复用 getHeatmapStatus。
 */
import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { format, parseISO } from 'date-fns';
import { EmptyState } from '@/components/common/Feedback';
import { CHECKIN_STATUS_LABELS, HEAT_LABELS } from '@/constants/app';
import { deriveDueDates } from '@/domain/schedule';
import { getHeatmapStatus } from '@/domain/streak';
import { useAppStore } from '@/store/useAppStore';
import type { HistoryViewProps, ISODate } from '@/types/domain';

export default function HistoryView({
  open,
  onClose,
  dueDates,
  statusByDate,
  today,
}: HistoryViewProps): JSX.Element {
  const plans = useAppStore((state) => state.plans);
  const checkIns = useAppStore((state) => state.checkIns);
  const contents = useAppStore((state) => state.contents);
  const collections = useAppStore((state) => state.collections);
  const members = useAppStore((state) => state.members);
  const navigateToContent = useAppStore((state) => state.navigateToContent);

  const historyDates = useMemo(() => {
    const set = new Set<ISODate>(dueDates.filter((date) => date <= today));
    for (const checkIn of checkIns) {
      if (checkIn.date <= today) set.add(checkIn.date);
    }
    return Array.from(set).sort().reverse();
  }, [dueDates, checkIns, today]);

  const [selected, setSelected] = useState<ISODate | undefined>(undefined);
  const activeDate = selected && historyDates.includes(selected) ? selected : historyDates[0];

  /** 那天学了什么：计划关联 + 打卡关联的内容 / 合集（仅日历页单向反查）。 */
  const learned = useMemo(() => {
    if (!activeDate) return { contentIds: [] as string[], collectionIds: [] as string[], planNames: [] as string[] };
    const contentIds = new Set<string>();
    const collectionIds = new Set<string>();
    const planNames: string[] = [];

    for (const plan of plans) {
      if (deriveDueDates(plan, { start: activeDate, end: activeDate }).length > 0) {
        planNames.push(plan.name);
        plan.linkedContentIds.forEach((id) => contentIds.add(id));
        plan.linkedCollectionIds.forEach((id) => collectionIds.add(id));
      }
    }
    for (const checkIn of checkIns) {
      if (checkIn.date !== activeDate) continue;
      checkIn.linkedContentIds.forEach((id) => contentIds.add(id));
      checkIn.linkedCollectionIds.forEach((id) => collectionIds.add(id));
    }
    return {
      contentIds: Array.from(contentIds),
      collectionIds: Array.from(collectionIds),
      planNames,
    };
  }, [activeDate, plans, checkIns]);

  const dayCheckIns = useMemo(
    () => (activeDate ? checkIns.filter((item) => item.date === activeDate) : []),
    [activeDate, checkIns],
  );

  const learnedContents = contents.filter((item) => learned.contentIds.includes(item.id));
  const learnedCollections = collections.filter((item) => learned.collectionIds.includes(item.id));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>历史记录 · 那天学了什么</DialogTitle>
      <DialogContent dividers>
        {historyDates.length === 0 ? (
          <EmptyState title="还没有历史记录" description="先新建计划并打卡，历史会自动出现在这里。" />
        ) : (
          <Box className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <List className="max-h-[420px] overflow-y-auto rounded-xl border border-[#e3e9e5] p-0">
              {historyDates.map((date) => {
                const status = getHeatmapStatus(date, dueDates, statusByDate);
                return (
                  <ListItemButton
                    key={date}
                    selected={date === activeDate}
                    onClick={() => setSelected(date)}
                    className="border-b border-[#f0f3f1]"
                  >
                    <ListItemText
                      primary={date}
                      secondary={HEAT_LABELS[status]}
                      primaryTypographyProps={{ fontSize: 13 }}
                      secondaryTypographyProps={{ fontSize: 11 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>

            <Box className="flex flex-col gap-3">
              <Box>
                <Typography variant="subtitle1">
                  {activeDate ? format(parseISO(activeDate), 'yyyy 年 MM 月 dd 日') : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  当天排期计划：{learned.planNames.length > 0 ? learned.planNames.join('、') : '无（或为临时记录）'}
                </Typography>
              </Box>

              <Box className="rounded-xl bg-[#f5f7f5] p-3">
                <Typography variant="subtitle2">那天学了什么</Typography>
                {learnedContents.length === 0 && learnedCollections.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" className="mt-1">
                    这天没有关联的内容 / 合集。可在计划管理里配置关联内容。
                  </Typography>
                ) : (
                  <Box className="mt-2 flex flex-wrap gap-1">
                    {learnedContents.map((item) => (
                      <Chip
                        key={item.id}
                        size="small"
                        label={item.title}
                        onClick={() => {
                          navigateToContent(item.id);
                          onClose();
                        }}
                      />
                    ))}
                    {learnedCollections.map((item) => (
                      <Chip key={item.id} size="small" variant="outlined" label={`合集：${item.name}`} />
                    ))}
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2">当天打卡</Typography>
                {dayCheckIns.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" className="mt-1">
                    当天没有打卡记录。
                  </Typography>
                ) : (
                  <Box className="mt-2 flex flex-col gap-1">
                    {dayCheckIns.map((item) => (
                      <Box key={item.id} className="rounded-lg border border-[#e3e9e5] px-3 py-2">
                        <Typography variant="body2">
                          {members.find((m) => m.id === item.memberId)?.name ?? '成员'} ·{' '}
                          {CHECKIN_STATUS_LABELS[item.status]}
                          {item.durationMin !== undefined ? ` · ${item.durationMin} 分钟` : ''}
                          {item.backfilled ? ' · 补卡' : ''}
                        </Typography>
                        {item.note && (
                          <Typography variant="caption" color="text.secondary">{item.note}</Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
