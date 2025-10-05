import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface WaitingRoomClientProps {
  waitingRoomId: string;
  clinicianName: string;
  appointmentTime: string;
  onAdmitted: () => void;
  onTimeout: () => void;
}

export const WaitingRoomClient = ({
  waitingRoomId,
  clinicianName,
  appointmentTime,
  onAdmitted,
  onTimeout
}: WaitingRoomClientProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to waiting room status changes
    const channel = supabase
      .channel('waiting-room-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'telehealth_waiting_rooms',
          filter: `id=eq.${waitingRoomId}`
        },
        (payload: any) => {
          if (payload.new.status === 'Admitted') {
            toast({
              title: 'Session Starting',
              description: 'Your clinician is ready. Joining session...'
            });
            onAdmitted();
          } else if (payload.new.status === 'Timed Out') {
            onTimeout();
          }
        }
      )
      .subscribe();

    // Subscribe to messages
    const messagesChannel = supabase
      .channel('waiting-room-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'waiting_room_messages',
          filter: `waiting_room_id=eq.${waitingRoomId}`
        },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    // Load existing messages
    loadMessages();

    // Update wait time every second
    const interval = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messagesChannel);
      clearInterval(interval);
    };
  }, [waitingRoomId]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('waiting_room_messages')
      .select('*')
      .eq('waiting_room_id', waitingRoomId)
      .order('message_time', { ascending: true });
    
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      await supabase
        .from('waiting_room_messages')
        .insert({
          waiting_room_id: waitingRoomId,
          from_clinician: false,
          message_text: newMessage.trim()
        });
      
      setNewMessage('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <Clock className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          <CardTitle className="text-2xl">Please Wait</CardTitle>
          <CardDescription className="text-lg">
            Your clinician will join shortly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Clinician:</span>
              <span className="font-medium">{clinicianName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Appointment Time:</span>
              <span className="font-medium">{appointmentTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wait Time:</span>
              <span className="font-medium">{formatWaitTime(waitTime)}</span>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Messages
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.from_clinician
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {msg.from_clinician ? clinicianName : 'You'}
                    </div>
                    <div className="text-sm">{msg.message_text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Send a message (optional)</label>
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                size="sm"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            You will be automatically connected when your clinician joins
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
