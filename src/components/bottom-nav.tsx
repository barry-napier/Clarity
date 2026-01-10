import { Link, useLocation } from '@tanstack/react-router';
import { Calendar, Target, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/today', label: 'Today', icon: Calendar },
  { path: '/plan', label: 'Plan', icon: Target },
  { path: '/reflect', label: 'Reflect', icon: BookOpen },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'bg-background/95 backdrop-blur-sm border-t border-border',
        'pb-[env(safe-area-inset-bottom)]'
      )}
    >
      <div className="flex justify-around items-center h-16">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-16 py-2 px-3',
                'touch-manipulation',
                'transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon
                className={cn('h-6 w-6', isActive && 'stroke-[2.5px]')}
              />
              <span
                className={cn(
                  'text-xs mt-1',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
