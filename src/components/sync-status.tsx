import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useSync, type SyncStatus } from '@/lib/sync/use-sync';
import { cn } from '@/lib/utils';

const statusConfig: Record<
  SyncStatus,
  { icon: typeof Cloud; label: string; className: string }
> = {
  idle: { icon: Cloud, label: 'Drive connected', className: 'text-muted-foreground' },
  syncing: { icon: RefreshCw, label: 'Syncing...', className: 'text-primary animate-spin' },
  synced: { icon: Check, label: 'Synced', className: 'text-green-500' },
  error: { icon: AlertCircle, label: 'Sync error', className: 'text-destructive' },
  offline: { icon: CloudOff, label: 'Offline', className: 'text-muted-foreground' },
};

export function SyncStatus() {
  const { status, sync } = useSync();
  const { icon: Icon, label, className } = statusConfig[status];
  const isClickable = status !== 'syncing';

  return (
    <button
      onClick={() => isClickable && sync()}
      disabled={!isClickable}
      className={cn(
        'flex items-center gap-1.5 text-xs rounded-md px-2 py-1 -mx-2 -my-1',
        'transition-colors',
        isClickable && 'hover:bg-muted cursor-pointer',
        !isClickable && 'cursor-default'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', className)} />
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}
