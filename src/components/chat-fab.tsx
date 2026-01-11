import { Link, useLocation } from '@tanstack/react-router';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

export function ChatFab() {
  const location = useLocation();

  // Don't show FAB on chat page
  if (location.pathname === '/chat') {
    return null;
  }

  return (
    <Link
      to="/chat"
      onClick={() => haptic('light')}
      className={cn(
        'fixed z-50',
        // Position above bottom nav, accounting for safe area
        'bottom-[calc(5rem+env(safe-area-inset-bottom))]',
        'right-4',
        // Styling
        'flex items-center justify-center',
        'w-14 h-14 rounded-full',
        'bg-accent text-accent-foreground',
        'shadow-lg shadow-accent/25',
        // Interaction
        'touch-manipulation',
        'active:scale-95 transition-transform',
        // Focus
        'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background'
      )}
    >
      <MessageCircle className="w-6 h-6" />
      <span className="sr-only">Open chat</span>
    </Link>
  );
}
