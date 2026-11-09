/**
 * 合集清单二级页（架构 §2.5 / A-5 / A-12 P1 / C-5）。
 * 有序清单、无嵌套、一条内容可多归属、「第 N / M 条」进度、拖动排序（原生 HTML5 DnD）、
 * 「发到空间」手动发布。拖动结果经 reorderCollection 纯函数后持久化。
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ConfirmDialog, EmptyState } from '@/components/common/Feedback';
import { DEFAULT_SPACE_ID, newId } from '@/constants/app';
import { collectionProgress, reorderCollection } from '@/domain/collection';
import { useAppStore } from '@/store/useAppStore';
import type { Collection, CollectionViewProps, ID } from '@/types/domain';

export default function CollectionView({ open, onClose }: CollectionViewProps): JSX.Element {
  const collections = useAppStore((state) => state.collections);
  const contents = useAppStore((state) => state.contents);
  const addCollection = useAppStore((state) => state.addCollection);
  const updateCollection = useAppStore((state) => state.updateCollection);
  const removeCollection = useAppStore((state) => state.removeCollection);
  const publishCollection = useAppStore((state) => state.publishCollection);
  const updateContent = useAppStore((state) => state.updateContent);
  const navigateToContent = useAppStore((state) => state.navigateToContent);

  const [newName, setNewName] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [addTarget, setAddTarget] = useState<Record<ID, ID>>({});

  const handleCreate = (): void => {
    const name = newName.trim();
    if (!name) return;
    addCollection({
      id: newId(),
      spaceId: DEFAULT_SPACE_ID,
      name,
      orderedContentIds: [],
      publishedToSpace: false,
      createdAt: new Date().toISOString(),
    });
    setNewName('');
  };

  const handleMove = (collection: Collection, from: number, to: number): void => {
    updateCollection({
      ...collection,
      orderedContentIds: reorderCollection(collection, from, to),
    });
  };

  const handleAddContent = (collection: Collection, contentId: ID): void => {
    if (!contentId || collection.orderedContentIds.includes(contentId)) return;
    updateCollection({
      ...collection,
      orderedContentIds: [...collection.orderedContentIds, contentId],
    });
    const target = contents.find((item) => item.id === contentId);
    if (target && !target.collectionIds.includes(collection.id)) {
      updateContent({ ...target, collectionIds: [...target.collectionIds, collection.id] });
    }
    setAddTarget((previous) => ({ ...previous, [collection.id]: '' }));
  };

  const handleRemoveContent = (collection: Collection, contentId: ID): void => {
    updateCollection({
      ...collection,
      orderedContentIds: collection.orderedContentIds.filter((id) => id !== contentId),
    });
    const target = contents.find((item) => item.id === contentId);
    if (target) {
      updateContent({
        ...target,
        collectionIds: target.collectionIds.filter((id) => id !== collection.id),
      });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle>合集清单</DialogTitle>
        <DialogContent dividers>
          <Box className="flex flex-col gap-4 py-1">
            <Box className="flex items-center gap-2">
              <TextField
                size="small"
                fullWidth
                label="新建合集"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                新建
              </Button>
            </Box>

            {collections.length === 0 ? (
              <EmptyState title="还没有合集" description="合集是有序清单，一条内容可以属于多个合集。" />
            ) : (
              collections.map((collection) => {
                const ids = collection.orderedContentIds.filter((id) =>
                  contents.some((item) => item.id === id),
                );
                const available = contents.filter(
                  (item) => !collection.orderedContentIds.includes(item.id),
                );
                return (
                  <Box
                    key={collection.id}
                    className="flex flex-col gap-2 rounded-2xl border border-[#e3e9e5] bg-white p-3"
                  >
                    <Box className="flex flex-wrap items-center justify-between gap-2">
                      <Box className="flex items-center gap-2">
                        <Typography variant="subtitle1">{collection.name}</Typography>
                        <Chip size="small" variant="outlined" label={`共 ${ids.length} 条`} />
                        {collection.publishedToSpace && (
                          <Chip size="small" color="primary" label="已发到空间" />
                        )}
                      </Box>
                      <Box className="flex items-center gap-2">
                        <Typography variant="caption" color="text.secondary">发到空间</Typography>
                        <Switch
                          size="small"
                          checked={collection.publishedToSpace}
                          onChange={(event) =>
                            publishCollection(collection.id, event.target.checked)
                          }
                        />
                        <Tooltip title="删除合集">
                          <IconButton size="small" onClick={() => setDeleteTarget(collection)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Divider />

                    {ids.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        还没有条目，可从下方加入内容。
                      </Typography>
                    ) : (
                      <Box className="flex flex-col gap-1">
                        {ids.map((contentId, index) => {
                          const item = contents.find((entry) => entry.id === contentId);
                          if (!item) return null;
                          const progress = collectionProgress(collection, contentId);
                          return (
                            <Box
                              key={contentId}
                              draggable
                              onDragStart={() => setDragFrom(index)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                if (dragFrom !== null) {
                                  handleMove(collection, dragFrom, index);
                                }
                                setDragFrom(null);
                              }}
                              className="flex items-center gap-2 rounded-lg bg-[#f5f7f5] px-2 py-1.5"
                            >
                              <DragIndicatorIcon sx={{ fontSize: 18, color: '#aab8b1' }} />
                              <Chip
                                size="small"
                                label={progress ? `第 ${progress.index} / ${progress.total} 条` : '—'}
                              />
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => {
                                  navigateToContent(contentId);
                                  onClose();
                                }}
                                className="min-w-0 flex-1 justify-start"
                              >
                                <Typography variant="body2" className="truncate">
                                  {item.title}
                                </Typography>
                              </Button>
                              <IconButton
                                size="small"
                                aria-label="上移"
                                disabled={index === 0}
                                onClick={() => handleMove(collection, index, index - 1)}
                              >
                                <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label="下移"
                                disabled={index === ids.length - 1}
                                onClick={() => handleMove(collection, index, index + 1)}
                              >
                                <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label="从合集移除"
                                onClick={() => handleRemoveContent(collection, contentId)}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    <Box className="flex items-center gap-2">
                      <FormControl size="small" className="min-w-0 flex-1">
                        <InputLabel id={`add-${collection.id}`}>加入内容</InputLabel>
                        <Select
                          labelId={`add-${collection.id}`}
                          label="加入内容"
                          value={addTarget[collection.id] ?? ''}
                          onChange={(event) =>
                            setAddTarget((previous) => ({
                              ...previous,
                              [collection.id]: event.target.value,
                            }))
                          }
                        >
                          {available.length === 0 ? (
                            <MenuItem value="">（已全部加入）</MenuItem>
                          ) : (
                            available.map((item) => (
                              <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          handleAddContent(collection, addTarget[collection.id] ?? '')
                        }
                      >
                        加入
                      </Button>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除合集？"
        message="只删除合集本身，其中的内容仍保留在资料库里。"
        confirmLabel="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeCollection(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
