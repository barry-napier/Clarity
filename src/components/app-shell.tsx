import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Main content area with safe area padding */}
      <main
        className={cn(
          'pt-[env(safe-area-inset-top)]',
          // Bottom padding for nav bar + safe area
          'pb-[calc(4rem+env(safe-area-inset-bottom))]',
          'px-[env(safe-area-inset-left)]',
          'pr-[env(safe-area-inset-right)]'
        )}
      >
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
