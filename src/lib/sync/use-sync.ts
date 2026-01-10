import { useEffect, useCallback, useState } from 'react';
import { processSyncQueue } from './processor';

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    processed: number;
    failed: number;
  } | null>(null);

  const sync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await processSyncQueue();
      setLastSyncResult(result);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    // Sync on mount
    sync();

    // Sync on network reconnect
    const handleOnline = () => sync();
    window.addEventListener('online', handleOnline);

    // Sync when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [sync]);

  return { isSyncing, lastSyncResult, sync };
}
