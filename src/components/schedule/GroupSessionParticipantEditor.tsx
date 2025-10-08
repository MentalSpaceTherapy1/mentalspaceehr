import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, UserMinus, Save } from 'lucide-react';
import { useGroupSessions } from '@/hooks/useGroupSessions';
import { toast } from 'sonner';

interface GroupSessionParticipantEditorProps {
  appointmentId: string;
  onUpdate?: () => void;
}

export function GroupSessionParticipantEditor({ 
  appointmentId,
  onUpdate 
}: GroupSessionParticipantEditorProps) {
  const { getAppointmentParticipants, updateParticipantStatus, removeParticipant, loading } = useGroupSessions();
  const [participants, setParticipants] = useState<any[]>([]);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadParticipants();
  }, [appointmentId]);

  const loadParticipants = async () => {
    const data = await getAppointmentParticipants(appointmentId);
    setParticipants(data);
  };

  const handleStartEdit = (participant: any) => {
    setEditingParticipant(participant.id);
    setEditStatus(participant.status);
    setEditNotes(participant.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingParticipant) return;

    const success = await updateParticipantStatus(editingParticipant, editStatus);
    if (success) {
      toast.success('Participant updated successfully');
      setEditingParticipant(null);
      loadParticipants();
      onUpdate?.();
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant?')) return;

    const success = await removeParticipant(participantId);
    if (success) {
      toast.success('Participant removed');
      loadParticipants();
      onUpdate?.();
    }
  };

  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No participants in this group session</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Group Session Participants ({participants.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => {
                const isEditing = editingParticipant === participant.id;
                
                return (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">
                      {participant.client 
                        ? `${participant.client.first_name} ${participant.client.last_name}`
                        : 'Unknown'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {participant.client?.medical_record_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                            <SelectItem value="Attended">Attended</SelectItem>
                            <SelectItem value="No Show">No Show</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={
                          participant.status === 'Attended' ? 'default' :
                          participant.status === 'Confirmed' ? 'secondary' :
                          participant.status === 'No Show' ? 'destructive' :
                          'outline'
                        }>
                          {participant.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {participant.added_by 
                        ? `${participant.added_by.first_name} ${participant.added_by.last_name}`
                        : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(participant.added_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingParticipant(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={loading}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(participant)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveParticipant(participant.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {editingParticipant && (
          <div className="mt-4 p-4 border rounded-lg space-y-2">
            <Label>Participant Notes</Label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add notes about this participant..."
              rows={3}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}