/**
 * 本地资源 hook（架构 §1.5 / A-7 / Q3）。
 * assetId → getAsset() → URL.createObjectURL()，组件卸载时 revokeObjectURL()。
 */
import { useEffect, useState } from 'react';
import { getAsset } from '@/storage/repository';
import type { AssetTextState, AssetUrlState, ID } from '@/types/domain';

const IDLE: AssetUrlState = { url: undefined, loading: false, failed: false };

export function useAssetUrl(assetId: ID | undefined): AssetUrlState {
  const [state, setState] = useState<AssetUrlState>(IDLE);

  useEffect(() => {
    if (!assetId) {
      setState(IDLE);
      return undefined;
    }

    let cancelled = false;
    let objectUrl: string | undefined;
    setState({ url: undefined, loading: true, failed: false });

    void getAsset(assetId)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setState({ url: undefined, loading: false, failed: true });
          return;
        }
        objectUrl = URL.createObjectURL(record.blob);
        setState({ url: objectUrl, loading: false, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url: undefined, loading: false, failed: true });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return state;
}

/** 本地笔记正文：Blob.text()（不抓取任何外站内容）。 */
export function useAssetText(assetId: ID | undefined): AssetTextState {
  const [state, setState] = useState<AssetTextState>({
    text: '',
    loading: false,
    failed: false,
  });

  useEffect(() => {
    if (!assetId) {
      setState({ text: '', loading: false, failed: false });
      return undefined;
    }

    let cancelled = false;
    setState({ text: '', loading: true, failed: false });
    void getAsset(assetId)
      .then(async (record) => {
        if (cancelled) return;
        if (!record) {
          setState({ text: '', loading: false, failed: true });
          return;
        }
        const text = await record.blob.text();
        if (!cancelled) setState({ text, loading: false, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ text: '', loading: false, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return state;
}
