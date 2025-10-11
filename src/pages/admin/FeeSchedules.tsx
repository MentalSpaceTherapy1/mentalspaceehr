import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFeeSchedules } from '@/hooks/useFeeSchedules';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function FeeSchedules() {
  const { schedules, isLoading, deleteSchedule } = useFeeSchedules();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDelete = (id: string) => {
    setScheduleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scheduleToDelete) {
      deleteSchedule(scheduleToDelete);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Fee Schedules</h1>
            <p className="text-muted-foreground">
              Manage service fee schedules by type and insurance
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Fee Schedule
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Fee Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading fee schedules...
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No fee schedules found. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Applicable To</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Fees Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.schedule_name}
                        {schedule.is_default_schedule && (
                          <Badge variant="secondary" className="ml-2">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{schedule.schedule_type}</TableCell>
                      <TableCell>{schedule.applicable_to}</TableCell>
                      <TableCell>
                        {format(new Date(schedule.effective_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {schedule.end_date
                          ? format(new Date(schedule.end_date), 'MMM d, yyyy')
                          : 'No end date'}
                      </TableCell>
                      <TableCell>{schedule.fees?.length || 0}</TableCell>
                      <TableCell>
                        {!schedule.end_date ||
                        new Date(schedule.end_date) > new Date() ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Expired</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(schedule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fee schedule? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Fee Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Fee schedule creation form coming soon. This will allow you to define service fees by CPT code, insurance type, and modifiers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
