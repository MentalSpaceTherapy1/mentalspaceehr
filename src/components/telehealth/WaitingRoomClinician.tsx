import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCheck, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WaitingClient {
  id: string;
  appointment_id: string;
  client_id: string;
  session_id: string;
  client_arrived_time: string;
  status: string;
  clients: {
    first_name: string;
    last_name: string;
  };
  appointments: {
    appointment_date: string;
    start_time: string;
    appointment_type: string;
  };
}

interface WaitingRoomClinicianProps {
  clinicianId: string;
  onAdmitClient?: (sessionId: string) => void;
}

export const WaitingRoomClinician = ({ clinicianId, onAdmitClient }: WaitingRoomClinicianProps) => {
  const [waitingClients, setWaitingClients] = useState<WaitingClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<WaitingClient | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadWaitingClients();

    // Subscribe to waiting room changes
    const channel = supabase
      .channel('clinician-waiting-rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telehealth_waiting_rooms'
        },
        () => {
          loadWaitingClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicianId]);

  const loadWaitingClients = async () => {
    const { data } = await supabase
      .from('telehealth_waiting_rooms')
      .select(`
        *,
        clients:client_id (first_name, last_name),
        appointments:appointment_id (appointment_date, start_time, appointment_type)
      `)
      .in('status', ['Waiting', 'Left'])
      .order('client_arrived_time', { ascending: true });

    if (data) {
      // Filter for appointments with this clinician
      const { data: myAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('clinician_id', clinicianId);

      const myAppointmentIds = new Set(myAppointments?.map(a => a.id) || []);
      const filtered = data.filter(wr => myAppointmentIds.has(wr.appointment_id));
      
      setWaitingClients(filtered as any);
    }
  };

  const loadMessages = async (waitingRoomId: string) => {
    const { data } = await supabase
      .from('waiting_room_messages')
      .select('*')
      .eq('waiting_room_id', waitingRoomId)
      .order('message_time', { ascending: true });
    
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!selectedClient || !newMessage.trim()) return;

    setSending(true);
    try {
      await supabase
        .from('waiting_room_messages')
        .insert({
          waiting_room_id: selectedClient.id,
          from_clinician: true,
          message_text: newMessage.trim()
        });

      setNewMessage('');
      toast({
        title: 'Message sent',
        description: 'Your message has been sent to the client'
      });
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

  const admitClient = async (client: WaitingClient) => {
    try {
      await supabase
        .from('telehealth_waiting_rooms')
        .update({
          status: 'Admitted',
          client_admitted_time: new Date().toISOString(),
          admitted_by_clinician: clinicianId
        })
        .eq('id', client.id);

      toast({
        title: 'Client Admitted',
        description: `${client.clients.first_name} ${client.clients.last_name} is joining the session`
      });

      onAdmitClient?.(client.session_id);
      setSelectedClient(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to admit client',
        variant: 'destructive'
      });
    }
  };

  const getWaitTime = (arrivedTime: string) => {
    const diff = Date.now() - new Date(arrivedTime).getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes;
  };

  if (waitingClients.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="fixed top-4 right-4 w-80 z-50 shadow-xl border-2 border-primary/20 animate-in slide-in-from-right duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="relative">
              <Clock className="h-5 w-5 text-primary animate-pulse" />
            </div>
            Waiting Room
            <Badge variant="default" className="animate-pulse">{waitingClients.length}</Badge>
          </CardTitle>
          <CardDescription>Clients waiting to join</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {waitingClients.map((client) => (
            <div
              key={client.id}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">
                    {client.clients.first_name} {client.clients.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {client.appointments.appointment_type}
                  </p>
                </div>
                <div className="flex gap-1">
                  {client.status === 'Left' ? (
                    <Badge variant="secondary" className="text-xs">
                      Left
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {getWaitTime(client.client_arrived_time)}m
                    </Badge>
                  )}
                </div>
              </div>
              {client.status === 'Waiting' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => admitClient(client)}
                    className="flex-1"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Admit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedClient(client);
                      loadMessages(client.id);
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Message {selectedClient?.clients.first_name} {selectedClient?.clients.last_name}
            </DialogTitle>
            <DialogDescription>
              Send a message to the client while they wait
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {messages.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.from_clinician
                        ? 'bg-primary text-primary-foreground ml-8'
                        : 'bg-muted mr-8'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {msg.from_clinician ? 'You' : selectedClient?.clients.first_name}
                    </div>
                    <div className="text-sm">{msg.message_text}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
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
        </DialogContent>
      </Dialog>
    </>
  );
};
