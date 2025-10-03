import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Mail, Calendar, Clock, XCircle, Plus } from 'lucide-react';
import { useWaitlist } from '@/hooks/useWaitlist';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

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
  const { waitlist, loading, markContacted, removeFromWaitlist, addToWaitlist } = useWaitlist();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [removeReason, setRemoveReason] = useState('');

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Appointment Waitlist</CardTitle>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant={getPriorityColor(entry.priority)}>
                        {entry.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.client_id}</TableCell>
                    <TableCell>{entry.appointment_type}</TableCell>
                    <TableCell className="text-sm">
                      {entry.preferred_days?.join(', ')}<br />
                      {entry.preferred_times?.join(', ')}
                    </TableCell>
                    <TableCell>{format(new Date(entry.added_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {entry.contacted_date 
                        ? format(new Date(entry.contacted_date), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleContact(entry)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setRemoveDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
