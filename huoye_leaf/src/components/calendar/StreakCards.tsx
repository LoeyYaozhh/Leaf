/**
 * 当前连续 / 最长连续数字卡（架构 §2.6 / B-3 / B-4 / 铁律 2）。
 * ★ 只调用 computeStreak(dueDates, statusByDate, today)，不自行遍历日期推排期。
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { STREAK_RULE_VERSION } from '@/constants/app';
import { computeStreak } from '@/domain/streak';
import type { StreakCardsProps } from '@/types/domain';
import type { ReactNode } from 'react';

function NumberCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  hint: string;
}): JSX.Element {
  return (
    <Box className="flex flex-1 items-center gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      <Box className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ee] text-[#2f6f5e]">
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" className="leading-tight">{value} 天</Typography>
        <Typography variant="caption" color="text.secondary" className="leading-tight">
          {hint}
        </Typography>
      </Box>
    </Box>
  );
}

export default function StreakCards({
  dueDates,
  statusByDate,
  today,
  viewerName,
}: StreakCardsProps): JSX.Element {
  const result = computeStreak(dueDates, statusByDate, today);
  return (
    <Box className="flex flex-col gap-2">
      <Box className="flex flex-wrap gap-3">
        <NumberCard
          label="当前连续"
          value={result.current}
          icon={<LocalFireDepartmentIcon />}
          hint="从最近应完成日往前算"
        />
        <NumberCard
          label="最长连续"
          value={result.longest}
          icon={<EmojiEventsIcon />}
          hint="历史最长一段"
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {viewerName} 的口径：只数「应完成日」（{dueDates.length} 天），休息日不中断、请假不中断也不计入、
        漏一个应完成日当前连续清零。规则版本 {STREAK_RULE_VERSION}。
      </Typography>
    </Box>
  );
}
