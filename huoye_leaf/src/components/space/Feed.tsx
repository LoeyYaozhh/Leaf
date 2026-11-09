/**
 * 打卡动态流（架构 §2.6 / C-3 / C-6 / Q7）。
 * ★ 只渲染 useSpaceView() 产出的 view.feed，绝不在此自行 filter 可见性。
 */
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Tooltip from '@mui/material/Tooltip';
import { EmptyState } from '@/components/common/Feedback';
import { useAppStore } from '@/store/useAppStore';
import type { CheckIn, SpaceView } from '@/types/domain';

function FeedCard({ checkIn, view }: { checkIn: CheckIn; view: SpaceView }): JSX.Element {
  const members = useAppStore((state) => state.members);
  const plans = useAppStore((state) => state.plans);
  const contents = useAppStore((state) => state.contents);
  const currentViewerId = useAppStore((state) => state.currentViewerId);
  const toggleCheer = useAppStore((state) => state.toggleCheer);
  const setCheckInVisibility = useAppStore((state) => state.setCheckInVisibility);
  const navigateToContent = useAppStore((state) => state.navigateToContent);

  const author = members.find((item) => item.id === checkIn.memberId);
  const plan = plans.find((item) => item.id === checkIn.planId);
  const linkedContents = contents.filter((item) => checkIn.linkedContentIds.includes(item.id));
  const count = view.cheerCountByCheckIn[checkIn.id] ?? 0;
  const cheered = view.cheeredByViewer.has(checkIn.id);
  const isMine = checkIn.memberId === currentViewerId;

  return (
    <Box className="flex flex-col gap-2 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      <Box className="flex items-start gap-3">
        <Avatar sx={{ width: 36, height: 36, bgcolor: author?.avatarColor ?? '#2f6f5e', fontSize: 14 }}>
          {author?.name.slice(0, 1) ?? '?'}
        </Avatar>
        <Box className="min-w-0 flex-1">
          <Box className="flex flex-wrap items-center gap-1">
            <Typography variant="subtitle2">{author?.name ?? '成员'}</Typography>
            {checkIn.visibility === 'self_only' && (
              <Chip size="small" color="secondary" icon={<LockIcon />} label="仅自己" />
            )}
            {checkIn.backfilled && <Chip size="small" variant="outlined" label="补卡" />}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {checkIn.date} · {plan?.name ?? '临时记录'}
            {checkIn.durationMin !== undefined ? ` · ${checkIn.durationMin} 分钟` : ''}
          </Typography>
        </Box>
      </Box>

      {checkIn.note && (
        <Typography variant="body2" color="text.secondary" className="leading-relaxed">
          {checkIn.note}
        </Typography>
      )}

      {linkedContents.length > 0 && (
        <Box className="flex flex-wrap gap-1">
          {linkedContents.map((item) => (
            <Chip
              key={item.id}
              size="small"
              variant="outlined"
              label={item.title}
              onClick={() => navigateToContent(item.id)}
            />
          ))}
        </Box>
      )}

      <Box className="flex flex-wrap items-center gap-2">
        <Button
          size="small"
          color={cheered ? 'secondary' : 'primary'}
          variant={cheered ? 'contained' : 'outlined'}
          startIcon={cheered ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          onClick={() => toggleCheer(checkIn.id)}
        >
          加油 {count}
        </Button>
        {isMine && (
          <Tooltip
            title={checkIn.visibility === 'self_only' ? '改为空间公开' : '设为仅自己（切到其他成员即消失）'}
          >
            <IconButton
              size="small"
              onClick={() =>
                setCheckInVisibility(
                  checkIn.id,
                  checkIn.visibility === 'self_only' ? 'public' : 'self_only',
                )
              }
            >
              {checkIn.visibility === 'self_only' ? (
                <LockOpenIcon fontSize="small" />
              ) : (
                <LockIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

export default function Feed({ view }: { view: SpaceView }): JSX.Element {
  if (view.feed.length === 0) {
    return (
      <EmptyState
        title="当前身份看不到动态"
        description="切换到别的成员身份试试，或到日历页完成一次打卡；仅自己 / 隐藏计划的记录不会出现在动态流。"
      />
    );
  }
  return (
    <Box className="flex flex-col gap-3">
      {view.feed.map((checkIn) => (
        <FeedCard key={checkIn.id} checkIn={checkIn} view={view} />
      ))}
    </Box>
  );
}
