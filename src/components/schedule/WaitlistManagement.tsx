import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Phone, Bell, XCircle, Plus, AlertCircle, Edit, Calendar, Mail } from 'lucide-react';
import { useWaitlist } from '@/hooks/useWaitlist';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { WaitlistAddDialog } from './WaitlistAddDialog';
import { WaitlistEditDialog } from './WaitlistEditDialog';
import { WaitlistConvertDialog } from './WaitlistConvertDialog';

const APPOINTMENT_TYPES = [
  'Initial Evaluation',
  'Individual Therapy',
  'Couples Therapy',
  'Family Therapy',
  'Group Therapy',
  'Medication Management',
  'Testing',
  'Consultation',
  'Crisis',
  'Other'
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES_OF_DAY = ['Morning (8am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)'];

export function WaitlistManagement() {
  const { user } = useAuth();
  const { waitlist, loading, markContacted, removeFromWaitlist, refreshWaitlist } = useWaitlist();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [clients, setClients] = useState<Record<string, any>>({});
  const [clinicians, setClinicians] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchClientsAndClinicians();
  }, [waitlist]);

  const fetchClientsAndClinicians = async () => {
    const clientIds = [...new Set(waitlist.map((e: any) => e.client_id))];
    const clinicianIds = [...new Set(waitlist.map((e: any) => e.clinician_id))];

    if (clientIds.length > 0) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .in('id', clientIds);
      
      if (clientData) {
        const clientMap = Object.fromEntries(clientData.map(c => [c.id, c]));
        setClients(clientMap);
      }
    }

    if (clinicianIds.length > 0) {
      const { data: clinicianData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', clinicianIds);
      
      if (clinicianData) {
        const clinicianMap = Object.fromEntries(clinicianData.map(c => [c.id, c]));
        setClinicians(clinicianMap);
      }
    }
  };

  const handleContact = async (entry: any) => {
    if (!user) return;
    await markContacted(entry.id, user.id);
  };

  const handleRemove = async () => {
    if (!selectedEntry || !removeReason) return;
    await removeFromWaitlist(selectedEntry.id, removeReason);
    setRemoveDialogOpen(false);
    setSelectedEntry(null);
    setRemoveReason('');
  };

  const handleNotify = async (entry: any) => {
    try {
      const client = clients[entry.client_id];
      if (!client?.email) {
        toast.error('Client does not have an email address');
        return;
      }

      // Call the notification edge function
      const { error } = await supabase.functions.invoke('notify-waitlist-slots', {
        body: { waitlist_id: entry.id }
      });

      if (error) throw error;

      toast.success('Notification sent to client');
      
      // Mark as notified
      await supabase
        .from('appointment_waitlist')
        .update({
          notified: true,
          notified_date: new Date().toISOString()
        })
        .eq('id', entry.id);
      
      refreshWaitlist();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'destructive';
      case 'High':
        return 'destructive';
      case 'Normal':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'Urgent') {
      return <AlertCircle className="h-3 w-3 mr-1" />;
    }
    return null;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Appointment Waitlist</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {waitlist.length} {waitlist.length === 1 ? 'client' : 'clients'} waiting for appointments
              </p>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add to Waitlist
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-8">Loading waitlist...</div>
          ) : waitlist.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No clients currently on the waitlist
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Clinician</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map((entry: any) => {
                  const client = clients[entry.client_id];
                  const clinician = clinicians[entry.clinician_id];
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant={getPriorityColor(entry.priority)} className="flex items-center w-fit">
                          {getPriorityIcon(entry.priority)}
                          {entry.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client ? (
                          <div>
                            <div className="font-medium">{client.last_name}, {client.first_name}</div>
                            <div className="text-xs text-muted-foreground">{client.medical_record_number}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Loading...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {clinician ? (
                          <div className="text-sm">
                            {clinician.last_name}, {clinician.first_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Loading...</span>
                        )}
                      </TableCell>
                      <TableCell>{entry.appointment_type}</TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          {entry.preferred_days && entry.preferred_days.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">Days:</span>{' '}
                              {entry.preferred_days.map((d: string) => dayNames[parseInt(d)]).join(', ')}
                            </div>
                          )}
                          {entry.preferred_times && entry.preferred_times.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">Times:</span>{' '}
                              {entry.preferred_times.join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(entry.added_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entry.notified && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="h-3 w-3 mr-1" />
                              Notified
                            </Badge>
                          )}
                          {entry.contacted_date && (
                            <Badge variant="secondary" className="text-xs">
                              Contacted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setEditDialogOpen(true);
                            }}
                            title="Edit entry"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContact(entry)}
                            title="Mark as contacted"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNotify(entry)}
                            title="Send notification"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setConvertDialogOpen(true);
                            }}
                            title="Convert to appointment"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setRemoveDialogOpen(true);
                            }}
                            title="Remove from waitlist"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WaitlistAddDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={refreshWaitlist}
      />

      <WaitlistEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        entry={selectedEntry}
        onSuccess={refreshWaitlist}
      />

      <WaitlistConvertDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        entry={selectedEntry}
        clientInfo={selectedEntry ? clients[selectedEntry.client_id] : null}
        clinicianInfo={selectedEntry ? clinicians[selectedEntry.clinician_id] : null}
        onSuccess={refreshWaitlist}
      />

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Waitlist</DialogTitle>
            <DialogDescription>
              Please provide a reason for removing this client from the waitlist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={removeReason} onValueChange={setRemoveReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Appointment Scheduled">Appointment Scheduled</SelectItem>
                  <SelectItem value="Client Request">Client Request</SelectItem>
                  <SelectItem value="No Longer Interested">No Longer Interested</SelectItem>
                  <SelectItem value="Found Another Provider">Found Another Provider</SelectItem>
                  <SelectItem value="Unable to Contact">Unable to Contact</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRemove} disabled={!removeReason}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
