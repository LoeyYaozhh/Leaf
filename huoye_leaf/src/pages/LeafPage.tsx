/**
 * 模块 A：活页（个人资料库）组装（架构 §2.5 / A-1~A-10 / F-1）。
 * Toolbar + Grid + 合集入口 + 预览联动；筛选与搜索全部走 domain 纯函数。
 */
import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import ContentEditor from '@/components/content/ContentEditor';
import ContentGrid from '@/components/content/ContentGrid';
import ContentToolbar from '@/components/common/ContentToolbar';
import CollectionView from '@/components/content/CollectionView';
import { filterContents, searchContents, sortByCollectedAt } from '@/domain/filter';
import { useAppStore } from '@/store/useAppStore';
import type { FilterCriteria } from '@/types/domain';

export default function LeafPage(): JSX.Element {
  const contents = useAppStore((state) => state.contents);
  const collections = useAppStore((state) => state.collections);
  const domains = useAppStore((state) => state.domains);
  const selectedContentId = useAppStore((state) => state.selectedContentId);
  const setSelectedContentId = useAppStore((state) => state.setSelectedContentId);
  const detailView = useAppStore((state) => state.detailView);
  const setDetailView = useAppStore((state) => state.setDetailView);

  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [editorOpen, setEditorOpen] = useState(false);

  const allTags = useMemo(
    () =>
      Array.from(new Set(contents.flatMap((content) => content.tags))).sort((a, b) =>
        a.localeCompare(b, 'zh-CN'),
      ),
    [contents],
  );

  // AND 筛选 → 全字段搜索 → 收录时间倒序（唯一默认排序）
  const visible = useMemo(() => {
    const filtered = filterContents(contents, criteria);
    const searched = searchContents(filtered, criteria.keyword ?? '', collections);
    return sortByCollectedAt(searched);
  }, [contents, collections, criteria]);

  return (
    <Box className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Box>
          <Typography variant="h6">活页 · 我的资料库</Typography>
          <Typography variant="caption" color="text.secondary">
            一处收纳、站内可读；资料库默认私有，手动「发到空间」才对家人可见。
          </Typography>
        </Box>
        <Box className="flex flex-wrap gap-2">
          <Button
            variant="outlined"
            startIcon={<PlaylistAddIcon />}
            onClick={() => setDetailView('collection')}
          >
            合集清单（{collections.length}）
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditorOpen(true)}>
            新增内容
          </Button>
        </Box>
      </Box>

      <ContentToolbar
        criteria={criteria}
        onChange={setCriteria}
        domains={domains}
        allTags={allTags}
        resultCount={visible.length}
        totalCount={contents.length}
      />

      <ContentGrid
        contents={visible}
        collections={collections}
        selectedContentId={selectedContentId}
        onSelect={setSelectedContentId}
      />

      <ContentEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
      <CollectionView
        open={detailView === 'collection'}
        onClose={() => setDetailView(undefined)}
      />
    </Box>
  );
}
