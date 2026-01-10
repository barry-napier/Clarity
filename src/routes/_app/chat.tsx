import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ChatView } from '@/components/chat/chat-view';
import { Button } from '@/components/ui/button';
import { getOrCreateCurrentChat } from '@/lib/chats';
import { useMemory } from '@/lib/db/hooks';
import type { Chat } from '@/lib/db/schema';

export const Route = createFileRoute('/_app/chat')({
  component: ChatPage,
});

function ChatPage() {
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const memory = useMemory();

  // Get or create the current chat session
  useEffect(() => {
    async function loadChat() {
      try {
        const currentChat = await getOrCreateCurrentChat(memory?.content);
        setChat(currentChat);
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setLoading(false);
      }
    }

    loadChat();
  }, [memory?.content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load chat</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link to="/today">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-medium text-foreground">Chat</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </header>

      {/* Chat View */}
      <div className="flex-1 min-h-0">
        <ChatView chat={chat} />
      </div>
    </div>
  );
}
