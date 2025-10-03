import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Users, X, Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GroupSessionParticipantsProps {
  participants: string[];
  onParticipantsChange: (participants: string[]) => void;
  isGroupSession: boolean;
  onIsGroupSessionChange: (isGroup: boolean) => void;
  maxParticipants?: number;
  onMaxParticipantsChange?: (max: number) => void;
}

export function GroupSessionParticipants({
  participants,
  onParticipantsChange,
  isGroupSession,
  onIsGroupSessionChange,
  maxParticipants = 10,
  onMaxParticipantsChange,
}: GroupSessionParticipantsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['clients-search', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .eq('status', 'Active')
        .order('last_name');

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,medical_record_number.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: isGroupSession,
  });

  const addParticipant = (clientId: string) => {
    if (!participants.includes(clientId) && participants.length < maxParticipants) {
      onParticipantsChange([...participants, clientId]);
    }
  };

  const removeParticipant = (clientId: string) => {
    onParticipantsChange(participants.filter((id) => id !== clientId));
  };

  const getClientName = (clientId: string) => {
    const client = clients?.find((c) => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="group-session"
            checked={isGroupSession}
            onCheckedChange={onIsGroupSessionChange}
          />
          <Label htmlFor="group-session" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group Session
          </Label>
        </div>
        {isGroupSession && (
          <Badge variant="outline">
            {participants.length} / {maxParticipants} participants
          </Badge>
        )}
      </div>

      {isGroupSession && (
        <>
          <div className="space-y-2">
            <Label htmlFor="max-participants">Maximum Participants</Label>
            <Input
              id="max-participants"
              type="number"
              min={1}
              max={50}
              value={maxParticipants}
              onChange={(e) => onMaxParticipantsChange?.(parseInt(e.target.value) || 10)}
            />
          </div>

          <div className="space-y-2">
            <Label>Selected Participants</Label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
              {participants.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  No participants added yet
                </span>
              ) : (
                participants.map((clientId) => (
                  <Badge key={clientId} variant="secondary" className="gap-1">
                    {getClientName(clientId)}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeParticipant(clientId)}
                    />
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Add Participants</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {clients?.map((client) => {
                  const isAdded = participants.includes(client.id);
                  const isFull = participants.length >= maxParticipants;
                  
                  return (
                    <Button
                      key={client.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      disabled={isAdded || isFull}
                      onClick={() => addParticipant(client.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {client.first_name} {client.last_name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {client.medical_record_number}
                      </span>
                    </Button>
                  );
                })}
                {clients?.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No clients found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
