import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  timestamp: string;
}

interface ChatSidebarProps {
  sessionId: string;
  currentUserId: string;
  currentUserName: string;
  isOpen: boolean;
}

export const ChatSidebar = ({
  sessionId,
  currentUserId,
  currentUserName,
  isOpen
}: ChatSidebarProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase.channel(`chat-${sessionId}`)
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !channelRef.current) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: currentUserId,
      user_name: currentUserName,
      message: input.trim(),
      timestamp: new Date().toISOString()
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: message
    });

    setMessages(prev => [...prev, message]);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <Card className="flex flex-col h-full border-l">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Session Chat</h3>
        <p className="text-xs text-muted-foreground">
          Messages are not recorded
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1",
                msg.user_id === currentUserId && "items-end"
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{msg.user_name}</span>
                <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
              </div>
              
              <div
                className={cn(
                  "rounded-lg px-3 py-2 max-w-[80%]",
                  msg.user_id === currentUserId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm break-words">{msg.message}</p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
