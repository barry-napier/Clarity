import { cn } from '@/lib/utils';

interface StreamingIndicatorProps {
  className?: string;
}

export function StreamingIndicator({ className }: StreamingIndicatorProps) {
  return (
    <div className={cn('flex justify-start', className)}>
      <div className="bg-card rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
        </div>
      </div>
    </div>
  );
}
