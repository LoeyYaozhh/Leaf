/**
 * 响应式壳（架构 §2.4 / F-1 / §八）。
 * 窄屏：顶部标题栏 + 内容区 + 底部固定 3 tab（活页 / 日历页 / 家庭空间）；
 * 宽屏 ≥1024px：左侧固定导航 + 中间内容区 + 右侧常驻预览面板。
 * 业务组件完全复用，仅预览容器不同；useResponsive() 是唯一视口真源。
 */
import { useMemo } from 'react';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarPage from '@/pages/CalendarPage';
import LeafPage from '@/pages/LeafPage';
import SpacePage from '@/pages/SpacePage';
import PreviewPanel from '@/components/layout/PreviewPanel';
import { TABS } from '@/constants/app';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppStore } from '@/store/useAppStore';
import type { ReactNode } from 'react';
import type { TabKey } from '@/types/domain';

const TAB_ICONS: Record<TabKey, ReactNode> = {
  leaf: <MenuBookIcon />,
  calendar: <CalendarMonthIcon />,
  space: <FamilyRestroomIcon />,
};

const TAB_HINTS: Record<TabKey, string> = {
  leaf: '一处收纳 · 站内可读',
  calendar: '坚持有据可查',
  space: '一个空间 · 家人共见',
};

/** 三 tab 分发：由 Zustand UI 状态驱动，不引入 react-router。 */
function TabContent({ activeTab }: { activeTab: TabKey }): JSX.Element {
  switch (activeTab) {
    case 'calendar':
      return <CalendarPage />;
    case 'space':
      return <SpacePage />;
    case 'leaf':
    default:
      return <LeafPage />;
  }
}

/** 窄屏底部 3 tab。 */
function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}): JSX.Element {
  return (
    <BottomNavigation
      value={activeTab}
      onChange={(_event, value: string) => onChange(value as TabKey)}
      showLabels
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e3e9e5] bg-white"
      sx={{ height: 68, pb: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => (
        <BottomNavigationAction
          key={tab.key}
          value={tab.key}
          label={tab.label}
          icon={TAB_ICONS[tab.key]}
        />
      ))}
    </BottomNavigation>
  );
}

/** 宽屏左侧导航。 */
function SideNav({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}): JSX.Element {
  return (
    <Box
      component="nav"
      className="hidden h-full w-60 shrink-0 flex-col border-r border-[#e3e9e5] bg-white lg:flex"
    >
      <Box className="flex items-center gap-3 px-5 py-6">
        <Box className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f6f5e] text-lg font-bold text-white">
          叶
        </Box>
        <Box>
          <Typography variant="subtitle1" className="leading-tight">活页 · Leaf</Typography>
          <Typography variant="caption" color="text.secondary">成长资料库与打卡</Typography>
        </Box>
      </Box>

      <List className="px-3">
        {TABS.map((tab) => (
          <ListItemButton
            key={tab.key}
            selected={activeTab === tab.key}
            onClick={() => onChange(tab.key)}
            className="mb-1 rounded-xl"
          >
            <ListItemIcon sx={{ minWidth: 38, color: activeTab === tab.key ? '#2f6f5e' : undefined }}>
              {TAB_ICONS[tab.key]}
            </ListItemIcon>
            <ListItemText
              primary={tab.label}
              secondary={TAB_HINTS[tab.key]}
              primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box className="mt-auto px-5 pb-6">
        <Typography variant="caption" color="text.secondary" className="leading-relaxed">
          纯前端原型 · 数据只存本机浏览器
          <br />
          刷新不丢，无需账号
        </Typography>
      </Box>
    </Box>
  );
}

/** 顶部标题栏（窄屏显示 AppBar；宽屏显示轻量条）。 */
function TopBar({ activeTab, isWide }: { activeTab: TabKey; isWide: boolean }): JSX.Element {
  const members = useAppStore((state) => state.members);
  const currentViewerId = useAppStore((state) => state.currentViewerId);
  const viewer = useMemo(
    () => members.find((member) => member.id === currentViewerId),
    [members, currentViewerId],
  );
  const label = TABS.find((tab) => tab.key === activeTab)?.label ?? '活页';

  return (
    <AppBar
      position="static"
      elevation={0}
      color="transparent"
      className="border-b border-[#e3e9e5] bg-white"
    >
      <Toolbar className="flex min-h-[56px] items-center justify-between gap-3 lg:min-h-[64px]">
        <Box className="flex items-center gap-2">
          {!isWide && (
            <Box className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f6f5e] text-sm font-bold text-white">
              叶
            </Box>
          )}
          <Box>
            <Typography variant="subtitle1" className="leading-tight">
              {isWide ? label : '活页 · Leaf'}
            </Typography>
            <Typography variant="caption" color="text.secondary" className="leading-tight">
              {TAB_HINTS[activeTab]}
            </Typography>
          </Box>
        </Box>

        <Box className="flex items-center gap-2">
          <Typography variant="caption" color="text.secondary" className="hidden sm:block">
            {viewer ? `当前身份：${viewer.name}` : '家庭空间'}
          </Typography>
          <Avatar
            sx={{ width: 30, height: 30, bgcolor: viewer?.avatarColor ?? '#2f6f5e', fontSize: 13 }}
          >
            {viewer?.name.slice(0, 1) ?? '叶'}
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

/** 应用壳。 */
export default function AppShell(): JSX.Element {
  const { isWide } = useResponsive();
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  return (
    <Box className="flex h-screen w-screen overflow-hidden bg-[#f5f7f5]">
      {isWide && <SideNav activeTab={activeTab} onChange={setActiveTab} />}

      <Box component="main" className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar activeTab={activeTab} isWide={isWide} />
        <Box className={`min-h-0 flex-1 overflow-y-auto ${isWide ? 'p-6' : 'px-3 pb-20 pt-3'}`}>
          <TabContent activeTab={activeTab} />
        </Box>
      </Box>

      {isWide && (
        <Box
          component="aside"
          className="flex h-full w-[380px] shrink-0 flex-col border-l border-[#e3e9e5] bg-white xl:w-[420px]"
        >
          <PreviewPanel mode="panel" />
        </Box>
      )}

      {!isWide && <TabBar activeTab={activeTab} onChange={setActiveTab} />}
      {!isWide && <PreviewPanel mode="overlay" />}
    </Box>
  );
}
