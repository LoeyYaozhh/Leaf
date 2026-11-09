/**
 * 模块 B：日历页（打卡记录）组装（架构 §2.6 / B-1~B-5 / 铁律 2）。
 * ★ 所有视图共用同一份 dueDates（deriveAllDueDates → deriveDueDates）与 statusByDate；
 *   页面内不自行遍历日期算连续、不用 getDay() 推排期。
 */
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SettingsIcon from '@mui/icons-material/Settings';
import { addDays, format, parseISO, subDays } from 'date-fns';
import DayDetail from '@/components/calendar/DayDetail';
import HistoryView from '@/components/calendar/HistoryView';
import MonthHeatmap from '@/components/calendar/MonthHeatmap';
import PlanManager from '@/components/calendar/PlanManager';
import StreakCards from '@/components/calendar/StreakCards';
import { getTodayISO } from '@/constants/app';
import { deriveAllDueDates } from '@/domain/schedule';
import { buildStatusByDate } from '@/domain/streak';
import { useAppStore } from '@/store/useAppStore';

export default function CalendarPage(): JSX.Element {
  const plans = useAppStore((state) => state.plans);
  const checkIns = useAppStore((state) => state.checkIns);
  const members = useAppStore((state) => state.members);
  const currentViewerId = useAppStore((state) => state.currentViewerId);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const detailView = useAppStore((state) => state.detailView);
  const setDetailView = useAppStore((state) => state.setDetailView);

  const today = getTodayISO();
  const range = useMemo(
    () => ({
      start: format(subDays(parseISO(today), 370), 'yyyy-MM-dd'),
      end: format(addDays(parseISO(today), 370), 'yyyy-MM-dd'),
    }),
    [today],
  );

  // ★ 唯一应完成日集合口径（顶部数字卡 / 热力 / 明细 / 历史全部复用）
  const dueDates = useMemo(
    () => deriveAllDueDates(plans, currentViewerId, range),
    [plans, currentViewerId, range],
  );
  const statusByDate = useMemo(
    () => buildStatusByDate(checkIns, currentViewerId),
    [checkIns, currentViewerId],
  );

  const activeDate = selectedDate ?? today;
  const viewerName = members.find((item) => item.id === currentViewerId)?.name ?? '当前身份';

  return (
    <Box className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Box>
          <Typography variant="h6">日历页 · 打卡记录</Typography>
          <Typography variant="caption" color="text.secondary">
            按应完成日计算连续；休息日不误伤，漏一个排期日归零；7 天内可补卡。
          </Typography>
        </Box>
        <Box className="flex flex-wrap gap-2">
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setDetailView('plan')}
          >
            计划管理（{plans.length}）
          </Button>
          <Button
            variant="outlined"
            startIcon={<EventNoteIcon />}
            onClick={() => setDetailView('history')}
          >
            历史记录
          </Button>
        </Box>
      </Box>

      <StreakCards
        dueDates={dueDates}
        statusByDate={statusByDate}
        today={today}
        viewerName={viewerName}
      />

      <Box className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MonthHeatmap
          dueDates={dueDates}
          statusByDate={statusByDate}
          today={today}
          selectedDate={activeDate}
          onSelect={setSelectedDate}
        />
        <DayDetail date={activeDate} dueDates={dueDates} today={today} />
      </Box>

      <PlanManager
        open={detailView === 'plan'}
        onClose={() => setDetailView(undefined)}
      />
      <HistoryView
        open={detailView === 'history'}
        onClose={() => setDetailView(undefined)}
        dueDates={dueDates}
        statusByDate={statusByDate}
        today={today}
      />
    </Box>
  );
}
