import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
  message_type: string;
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load message history when chat opens
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('session_messages' as any)
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          toast({
            title: 'Error',
            description: 'Failed to load chat history',
            variant: 'destructive'
          });
        } else {
          setMessages(data as any || []);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`session-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          // Only add if not already in the list (avoid duplicates)
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    try {
      setSending(true);

      const { error } = await supabase
        .from('session_messages' as any)
        .insert({
          session_id: sessionId,
          user_id: currentUserId,
          user_name: currentUserName,
          message: input.trim(),
          message_type: 'text'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive'
        });
      } else {
        setInput('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="flex flex-col h-full border-l">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Session Chat</h3>
        <p className="text-xs text-muted-foreground">
          Messages are saved and persistent
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    msg.user_id === currentUserId && "items-end"
                  )}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{msg.user_name}</span>
                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
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
              ))
            )}
            <div ref={scrollRef} />
          </div>
        )}
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
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};
