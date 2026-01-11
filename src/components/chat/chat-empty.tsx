import { MessageCircle } from 'lucide-react';

interface ChatEmptyProps {
  onSuggestionTap: (content: string) => void;
}

const SUGGESTIONS = [
  "What's on my mind today?",
  "Help me think through a decision",
  "I need to process something",
];

export function ChatEmpty({ onSuggestionTap }: ChatEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-6">
        <MessageCircle className="w-8 h-8 text-muted-foreground" />
      </div>

      <h2 className="text-lg font-medium text-foreground mb-2">
        Start a conversation
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
        I'm here to help you think through what matters. What's on your mind?
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionTap(suggestion)}
            className="w-full text-left px-4 py-3 rounded-xl bg-card hover:bg-card/80
                       text-sm text-foreground transition-colors border border-border"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
