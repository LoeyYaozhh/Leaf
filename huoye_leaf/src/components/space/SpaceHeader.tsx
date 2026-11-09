/**
 * 空间头（架构 §2.6 / C-1 / C-2）。
 * ★「以某位成员身份预览」开关必显：切换只调 setCurrentViewerId()，
 *   不写库、不缓存；动态流与内容区由 useSpaceView 全量重算。
 */
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { SPACE_NAME } from '@/constants/app';
import { useAppStore } from '@/store/useAppStore';
import type { SpaceView } from '@/types/domain';

export default function SpaceHeader({ view }: { view: SpaceView }): JSX.Element {
  const members = useAppStore((state) => state.members);
  const currentViewerId = useAppStore((state) => state.currentViewerId);
  const setCurrentViewerId = useAppStore((state) => state.setCurrentViewerId);
  const viewer = members.find((item) => item.id === currentViewerId);

  return (
    <Box className="flex flex-col gap-3 rounded-2xl border border-[#e3e9e5] bg-white p-4">
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box className="flex items-center gap-3">
          <Box className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf2ee] text-[#2f6f5e]">
            <VisibilityIcon />
          </Box>
          <Box>
            <Typography variant="h6">{SPACE_NAME}</Typography>
            <Typography variant="caption" color="text.secondary">
              只有一个家庭空间 · {members.length} 位成员 · 打卡默认公开
            </Typography>
          </Box>
        </Box>
        <AvatarGroup max={6} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: 13 } }}>
          {members.map((member) => (
            <Avatar key={member.id} sx={{ bgcolor: member.avatarColor }}>
              {member.name.slice(0, 1)}
            </Avatar>
          ))}
        </AvatarGroup>
      </Box>

      {/* 身份预览开关（C-2 验收关键，必显） */}
      <Box className="flex flex-wrap items-center gap-3 rounded-xl bg-[#eef4f0] p-3">
        <FormControl size="small" className="min-w-[200px]">
          <InputLabel id="viewer-select-label">以…身份预览</InputLabel>
          <Select
            labelId="viewer-select-label"
            label="以…身份预览"
            value={currentViewerId}
            onChange={(event) => setCurrentViewerId(event.target.value)}
          >
            {members.map((member) => (
              <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box className="flex flex-wrap items-center gap-1">
          <Chip size="small" color="primary" label={`当前身份：${viewer?.name ?? '未选择'}`} />
          <Chip size="small" variant="outlined" label={`可见动态 ${view.feed.length} 条`} />
          <Chip size="small" variant="outlined" label={`空间内容 ${view.sharedContents.length} 条`} />
          <Chip size="small" variant="outlined" label={`空间合集 ${view.sharedCollections.length} 个`} />
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" className="leading-relaxed">
        切换身份后，动态流与空间内容按该成员实时重算：「仅自己」的打卡只有作者本人能看到（带私密标记），
        设为「不在空间显示」的计划对所有人隐藏，未手动发布的内容对任何人都不可见。
      </Typography>
    </Box>
  );
}
