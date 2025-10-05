import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserCheck, UserX, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface WaitingParticipant {
  id: string;
  user_name: string;
  user_email?: string;
  status: string;
  joined_at: string;
  user_id: string;
}

interface WaitingRoomProps {
  sessionId: string;
  isHost: boolean;
}

export const WaitingRoom = ({ sessionId, isHost }: WaitingRoomProps) => {
  const [waiting, setWaiting] = useState<WaitingParticipant[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(16);
  const { toast } = useToast();

  useEffect(() => {
    fetchWaiting();
    fetchSessionInfo();

    const channel = supabase
      .channel(`waiting-room-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiting_room_queue',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchWaiting();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchWaiting = async () => {
    const { data } = await supabase
      .from('waiting_room_queue')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true });

    if (data) {
      setWaiting(data as WaitingParticipant[]);
    }
  };

  const fetchSessionInfo = async () => {
    // Get current participant count
    const { count } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('connection_state', 'connected');
    
    if (count !== null) {
      setParticipantCount(count);
    }

    // Get max participants from session
    const { data: session } = await supabase
      .from('telehealth_sessions')
      .select('max_participants')
      .eq('id', sessionId)
      .maybeSingle();
    
    if (session?.max_participants) {
      setMaxParticipants(session.max_participants);
    }
  };

  const admitParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from('waiting_room_queue')
      .update({
        status: 'admitted',
        admitted_at: new Date().toISOString(),
        admitted_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', participantId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to admit participant",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Participant Admitted",
        description: "They can now join the session"
      });
    }
  };

  const denyParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from('waiting_room_queue')
      .update({
        status: 'denied',
        denied_at: new Date().toISOString(),
        denied_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', participantId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to deny participant",
        variant: "destructive"
      });
    }
  };

  if (!isHost || waiting.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 mb-4 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Waiting Room</h3>
          <Badge variant="secondary">{waiting.length}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Capacity: {participantCount}/{maxParticipants}
        </div>
      </div>

      <div className="space-y-2">
        {waiting.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {participant.user_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <p className="font-medium">{participant.user_name}</p>
                <p className="text-xs text-muted-foreground">
                  Waiting {formatDistanceToNow(new Date(participant.joined_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => admitParticipant(participant.id)}
                className="gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Admit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => denyParticipant(participant.id)}
              >
                <UserX className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
