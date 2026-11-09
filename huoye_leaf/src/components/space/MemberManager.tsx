/**
 * 成员管理二级页（架构 §2.6 / C-1 / C-7 / Q5）。
 * 模拟身份加入 / 移出；替家人补打卡同受 7 天窗口且计入该成员连续天数。
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { ConfirmDialog } from '@/components/common/Feedback';
import {
  BACKFILL_HINT,
  DEFAULT_SPACE_ID,
  MEMBER_PALETTE,
  getTodayISO,
  newId,
} from '@/constants/app';
import { canBackfill } from '@/domain/streak';
import { useAppStore } from '@/store/useAppStore';
import type { ID, ISODate, Member, MemberManagerProps } from '@/types/domain';

export default function MemberManager({ open, onClose }: MemberManagerProps): JSX.Element {
  const members = useAppStore((state) => state.members);
  const plans = useAppStore((state) => state.plans);
  const currentViewerId = useAppStore((state) => state.currentViewerId);
  const addMember = useAppStore((state) => state.addMember);
  const removeMember = useAppStore((state) => state.removeMember);
  const backfillFor = useAppStore((state) => state.backfillFor);

  const today = getTodayISO();
  const [name, setName] = useState('');
  const [color, setColor] = useState(MEMBER_PALETTE[members.length % MEMBER_PALETTE.length]);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [targetId, setTargetId] = useState<ID>(currentViewerId);
  const [date, setDate] = useState<ISODate>(today);
  const [planId, setPlanId] = useState<ID>('');
  const [feedback, setFeedback] = useState('');

  const handleAdd = (): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addMember({
      id: newId(),
      spaceId: DEFAULT_SPACE_ID,
      name: trimmed,
      avatarColor: color,
      joinedAt: new Date().toISOString(),
    });
    setName('');
  };

  const allowed = canBackfill(date, today);
  const targetPlans = plans.filter((plan) => plan.memberId === targetId);

  const handleBackfill = (): void => {
    if (!targetId || !allowed) return;
    backfillFor(targetId, date, planId || undefined);
    const targetName = members.find((item) => item.id === targetId)?.name ?? '该成员';
    setFeedback(`已为 ${targetName} 补上 ${date} 的打卡，计入 ${targetName} 的连续天数。`);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>成员管理 · 替家人补打卡</DialogTitle>
        <DialogContent dividers>
          <Box className="flex flex-col gap-4 py-1">
            <Box>
              <Typography variant="subtitle2">空间成员（{members.length}）</Typography>
              <Box className="mt-2 flex flex-col gap-2">
                {members.map((member) => (
                  <Box
                    key={member.id}
                    className="flex items-center gap-2 rounded-xl border border-[#e3e9e5] px-3 py-2"
                  >
                    <Avatar sx={{ width: 30, height: 30, bgcolor: member.avatarColor, fontSize: 13 }}>
                      {member.name.slice(0, 1)}
                    </Avatar>
                    <Box className="min-w-0 flex-1">
                      <Typography variant="body2">{member.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        加入于 {member.joinedAt.slice(0, 10)}
                        {member.id === currentViewerId ? ' · 当前身份' : ''}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      aria-label="移出成员"
                      disabled={members.length <= 1}
                      onClick={() => setRemoveTarget(member)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box className="flex flex-wrap items-end gap-2">
              <TextField
                size="small"
                label="新增成员名"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Box className="flex items-center gap-1">
                {MEMBER_PALETTE.map((item) => (
                  <Box
                    key={item}
                    role="button"
                    aria-label={`选择颜色 ${item}`}
                    tabIndex={0}
                    onClick={() => setColor(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setColor(item);
                    }}
                    className="h-6 w-6 cursor-pointer rounded-full"
                    sx={{
                      bgcolor: item,
                      outline: color === item ? '2px solid #22302b' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </Box>
              <Button variant="contained" size="small" onClick={handleAdd}>加入</Button>
            </Box>

            <Divider />

            <Box className="flex flex-col gap-2">
              <Typography variant="subtitle2">替家人补打卡</Typography>
              <Typography variant="caption" color="text.secondary">
                与本人补卡同规则（7 天窗口），记录归属目标成员并计入该成员连续天数。{BACKFILL_HINT}
              </Typography>

              <Box className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FormControl size="small" fullWidth>
                  <InputLabel id="backfill-member-label">补卡给</InputLabel>
                  <Select
                    labelId="backfill-member-label"
                    label="补卡给"
                    value={targetId}
                    onChange={(event) => {
                      setTargetId(event.target.value);
                      setPlanId('');
                    }}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  type="date"
                  label="日期"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                <FormControl size="small" fullWidth className="sm:col-span-2">
                  <InputLabel id="backfill-plan-label">所属计划（可选，空 = 临时记录）</InputLabel>
                  <Select
                    labelId="backfill-plan-label"
                    label="所属计划（可选，空 = 临时记录）"
                    value={planId}
                    onChange={(event) => setPlanId(event.target.value)}
                  >
                    <MenuItem value="">不关联计划（临时记录）</MenuItem>
                    {targetPlans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {!allowed && (
                <Typography variant="caption" color="error">
                  该日期不在补卡窗口内（未来排期日与超过 7 天的日期都不可补）。
                </Typography>
              )}

              <Box className="flex flex-wrap items-center gap-2">
                <Button variant="contained" disabled={!allowed} onClick={handleBackfill}>
                  确认补卡
                </Button>
                {feedback && (
                  <Typography variant="caption" color="success.main">{feedback}</Typography>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="移出这位成员？"
        message="只做模拟身份的加入 / 移出；该成员已有的打卡记录会保留，但不再出现在可选身份里。"
        confirmLabel="移出"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeMember(removeTarget.id);
          setRemoveTarget(null);
        }}
      />
    </>
  );
}
