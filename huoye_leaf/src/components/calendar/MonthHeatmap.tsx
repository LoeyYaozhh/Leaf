/**
 * 月历热力（架构 §2.6 / B-4 / 铁律 2）。
 * ★ 逐日只调用 getHeatmapStatus(date, dueDates, statusByDate)，
 *   页面内不遍历日期算连续、也不用 getDay() 推排期。
 */
import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { HEAT_COLORS, HEAT_LABELS, HEAT_TEXT_COLORS, WEEKDAY_LABELS } from '@/constants/app';
import { getHeatmapStatus } from '@/domain/streak';
import type { HeatStatus, MonthHeatmapProps, Weekday } from '@/types/domain';

const HEAT_ORDER: ReadonlyArray<HeatStatus> = ['done', 'leave', 'pending', 'off'];

export default function MonthHeatmap({
  dueDates,
  statusByDate,
  today,
  selectedDate,
  onSelect,
}: MonthHeatmapProps): JSX.Element {
  const [anchor, setAnchor] = useState(() => startOfMonth(parseISO(today)));

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [anchor]);

  return (
    <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      <Box className="flex items-center justify-between">
        <Typography variant="subtitle1">{format(anchor, 'yyyy 年 MM 月')}</Typography>
        <Box className="flex items-center gap-1">
          <IconButton size="small" aria-label="上个月" onClick={() => setAnchor(addMonths(anchor, -1))}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="回到本月" onClick={() => setAnchor(startOfMonth(parseISO(today)))}>
            <Typography variant="caption">今</Typography>
          </IconButton>
          <IconButton size="small" aria-label="下个月" onClick={() => setAnchor(addMonths(anchor, 1))}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box className="grid grid-cols-7 gap-1 text-center">
        {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => (
          <Typography key={weekday} variant="caption" color="text.secondary">
            {WEEKDAY_LABELS[weekday].replace('周', '')}
          </Typography>
        ))}
      </Box>

      <Box className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd');
          const status = getHeatmapStatus(iso, dueDates, statusByDate);
          const inMonth = isSameMonth(day, anchor);
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          return (
            <ButtonBase
              key={iso}
              onClick={() => onSelect(iso)}
              aria-label={`${iso} ${HEAT_LABELS[status]}`}
              className="flex h-9 items-center justify-center rounded-lg text-xs"
              sx={{
                bgcolor: HEAT_COLORS[status],
                color: HEAT_TEXT_COLORS[status],
                opacity: inMonth ? 1 : 0.35,
                outline: isSelected ? '2px solid #2f6f5e' : isToday ? '1px solid #9fb7ad' : 'none',
                outlineOffset: '-2px',
                fontWeight: isSelected ? 700 : 400,
              }}
            >
              {format(day, 'd')}
            </ButtonBase>
          );
        })}
      </Box>

      <Box className="flex flex-wrap items-center gap-3">
        {HEAT_ORDER.map((status) => (
          <Box key={status} className="flex items-center gap-1">
            <Box
              className="h-3 w-3 rounded"
              sx={{ bgcolor: HEAT_COLORS[status] }}
            />
            <Typography variant="caption" color="text.secondary">
              {HEAT_LABELS[status]}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        点某一天查看当天全部待办与状态；非排期日（休息日）不参与连续天数计算。
      </Typography>
    </Box>
  );
}
