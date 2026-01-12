import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { useNorthstar } from '@/lib/db/hooks';
import { NorthstarChat } from '@/components/plan/northstar-chat';
import { NorthstarView } from '@/components/plan/northstar-view';
import { Button } from '@/components/ui/button';

interface NorthstarSearchParams {
  mode?: 'view' | 'refine';
}

export const Route = createFileRoute('/_app/plan/northstar')({
  component: NorthstarPage,
  validateSearch: (search: Record<string, unknown>): NorthstarSearchParams => ({
    mode: search.mode as 'view' | 'refine' | undefined,
  }),
});

function NorthstarPage() {
  const { mode } = Route.useSearch();
  const northstar = useNorthstar();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(mode === 'refine');

  const hasNorthstar = Boolean(northstar?.content);

  const handleComplete = () => {
    setIsEditing(false);
    navigate({ to: '/plan' });
  };

  // If no North Star, always show chat
  // If has North Star, show view by default unless editing
  const showChat = !hasNorthstar || isEditing;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link to="/plan">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-medium text-foreground">North Star</h1>
          <p className="text-xs text-muted-foreground">
            {showChat
              ? hasNorthstar
                ? 'Refining your manifesto'
                : 'Guided reflection'
              : 'Your personal manifesto'}
          </p>
        </div>
        {hasNorthstar && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground"
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Refine
          </Button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {showChat ? (
          <NorthstarChat
            existingContent={northstar?.content}
            onComplete={handleComplete}
          />
        ) : (
          <div className="p-4 overflow-y-auto h-full">
            <NorthstarView />
          </div>
        )}
      </div>
    </div>
  );
}
