import { useEffect, useCallback, useState } from 'react';
import { processSyncQueue } from './processor';
import { isAuthenticated } from '../token-service';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<{
    processed: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    // Don't sync if already syncing
    if (status === 'syncing') return;

    // Check if we're online
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    // Check if authenticated
    const authed = await isAuthenticated();
    if (!authed) {
      setStatus('idle');
      return;
    }

    setStatus('syncing');
    setError(null);

    try {
      const result = await processSyncQueue();
      setLastSyncResult(result);

      if (result.failed > 0) {
        setStatus('error');
        setError(`${result.failed} item(s) failed to sync`);
      } else {
        setStatus('synced');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  }, [status]);

  useEffect(() => {
    // Sync on mount
    sync();

    // Sync on network reconnect
    const handleOnline = () => {
      setStatus('idle');
      sync();
    };
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Periodic sync every 5 minutes
    const interval = setInterval(sync, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [sync]);

  return { status, lastSyncResult, error, sync };
}
