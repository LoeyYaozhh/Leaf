/**
 * 模块 C：家庭空间组装（架构 §2.6 / C-1~C-6 / 铁律 3）。
 * ★ 唯一数据来源是 useSpaceView()（内部只调 computeSpaceView）；
 *   本页及子组件绝不自行 filter 可见性，身份切换只改 currentViewerId。
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import GroupsIcon from '@mui/icons-material/Groups';
import Feed from '@/components/space/Feed';
import MemberManager from '@/components/space/MemberManager';
import SharedContent from '@/components/space/SharedContent';
import SpaceHeader from '@/components/space/SpaceHeader';
import { useSpaceView } from '@/hooks/useSpaceView';
import { useAppStore } from '@/store/useAppStore';

export default function SpacePage(): JSX.Element {
  const view = useSpaceView();
  const detailView = useAppStore((state) => state.detailView);
  const setDetailView = useAppStore((state) => state.setDetailView);

  return (
    <Box className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Box>
          <Typography variant="h6">家庭空间</Typography>
          <Typography variant="caption" color="text.secondary">
            打卡默认公开形成动态流；内容 / 合集需手动发布；单条「仅自己」与计划级隐藏都真实生效。
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<GroupsIcon />}
          onClick={() => setDetailView('members')}
        >
          成员管理
        </Button>
      </Box>

      <SpaceHeader view={view} />

      <Box className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Box className="flex flex-col gap-2">
          <Typography variant="subtitle1">打卡动态流（{view.feed.length}）</Typography>
          <Feed view={view} />
        </Box>
        <Box className="flex flex-col gap-2">
          <Typography variant="subtitle1">
            发到空间的内容 / 合集（{view.sharedContents.length + view.sharedCollections.length}）
          </Typography>
          <SharedContent view={view} />
        </Box>
      </Box>

      <MemberManager
        open={detailView === 'members'}
        onClose={() => setDetailView(undefined)}
      />
    </Box>
  );
}
