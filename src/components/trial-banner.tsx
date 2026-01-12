import { useState } from 'react';
import { X } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface TrialBannerProps {
  daysRemaining: number;
  isEndingSoon: boolean;
}

/**
 * Banner shown during trial period.
 * More prominent when trial is ending soon (3 days or less).
 * Can be dismissed but reappears when ending soon.
 */
export function TrialBanner({ daysRemaining, isEndingSoon }: TrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if dismissed (unless ending soon - always show then)
  if (isDismissed && !isEndingSoon) {
    return null;
  }

  const daysText = daysRemaining === 1 ? 'day' : 'days';
  const message = daysRemaining === 0
    ? 'Your trial ends today'
    : `${daysRemaining} ${daysText} left in trial`;

  return (
    <div
      className={`sticky top-0 z-50 px-4 py-2 flex items-center justify-center gap-3 text-sm ${
        isEndingSoon
          ? 'bg-amber-500/20 text-amber-200 border-b border-amber-500/30'
          : 'bg-muted/50 text-muted-foreground border-b border-border'
      }`}
    >
      <span>{message}</span>
      <Link
        to="/pricing"
        className={`font-medium underline underline-offset-2 hover:no-underline ${
          isEndingSoon ? 'text-amber-100' : 'text-foreground'
        }`}
      >
        Subscribe now
      </Link>
      {!isEndingSoon && (
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute right-3 p-1 hover:bg-background/50 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
