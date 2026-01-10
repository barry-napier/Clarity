import { useCallback } from 'react';
import { Check, Circle } from 'lucide-react';
import { type Capture } from '@/lib/db/schema';
import { markCaptureDone, markCaptureNew } from '@/lib/captures';
import { cn } from '@/lib/utils';

interface CaptureItemProps {
  capture: Capture;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function CaptureItem({ capture }: CaptureItemProps) {
  const isDone = capture.status === 'done';

  const handleToggle = useCallback(async () => {
    if (isDone) {
      await markCaptureNew(capture.id);
    } else {
      await markCaptureDone(capture.id);
    }
  }, [capture.id, isDone]);

  return (
    <div className="flex items-start gap-3 py-3 px-4 bg-card rounded-lg border border-border">
      <button
        onClick={handleToggle}
        className={cn(
          'mt-0.5 flex-shrink-0 rounded-full p-0.5 transition-colors',
          isDone
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label={isDone ? 'Mark as new' : 'Mark as done'}
      >
        {isDone ? (
          <Check className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-relaxed break-words',
            isDone && 'text-muted-foreground line-through'
          )}
        >
          {capture.content}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(capture.createdAt)}
        </p>
      </div>
    </div>
  );
}
