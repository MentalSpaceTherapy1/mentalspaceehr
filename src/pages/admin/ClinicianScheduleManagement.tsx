import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicianScheduleEditor } from '@/components/schedule/ClinicianScheduleEditor';
import { ClinicianScheduleCalendarPreview } from '@/components/schedule/ClinicianScheduleCalendarPreview';
import { ScheduleExceptionDialog } from '@/components/schedule/ScheduleExceptionDialog';
import { useClinicianSchedule } from '@/hooks/useClinicianSchedule';
import { useScheduleExceptions } from '@/hooks/useScheduleExceptions';
import { useScheduleExceptionNotifications } from '@/hooks/useScheduleExceptionNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Plus, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parse } from 'date-fns';

interface Clinician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function ClinicianScheduleManagement() {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [selectedClinician, setSelectedClinician] = useState<string>('');
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const { schedule, loading: scheduleLoading, saveSchedule, refreshSchedule } = useClinicianSchedule(selectedClinician);
  const { exceptions, approveException, denyException, deleteException, refreshExceptions } = useScheduleExceptions(selectedClinician);
  const { pendingCount } = useScheduleExceptionNotifications();

  const formatTime12Hour = (time?: string) => {
    if (!time) return '';
    try {
      const parsed = parse(time, 'HH:mm:ss', new Date());
      return format(parsed, 'h:mm a');
    } catch {
      return time;
    }
  };

  useEffect(() => {
    fetchClinicians();
  }, []);

  const fetchClinicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('last_name');

      if (error) throw error;
      setClinicians(data || []);
      
      if (data && data.length > 0) {
        setSelectedClinician(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching clinicians:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'Denied':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Clinician Schedule Management</h1>
            <p className="text-muted-foreground">
              Manage work schedules, hours, and time-off requests
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Clinician</CardTitle>
            <CardDescription>Choose a clinician to manage their schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedClinician} onValueChange={setSelectedClinician}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a clinician" />
              </SelectTrigger>
              <SelectContent>
                {clinicians.map((clinician) => (
                  <SelectItem key={clinician.id} value={clinician.id}>
                    {clinician.first_name} {clinician.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedClinician && (
          <Tabs defaultValue="schedule" className="space-y-4">
            <TabsList>
              <TabsTrigger value="schedule">
                <Calendar className="h-4 w-4 mr-2" />
                Weekly Schedule
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Calendar Preview
              </TabsTrigger>
              <TabsTrigger value="exceptions" className="relative">
                <Clock className="h-4 w-4 mr-2" />
                Time Off & Exceptions
                {pendingCount > 0 && (
                  <Badge className="ml-2 bg-destructive text-destructive-foreground" variant="destructive">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              <ClinicianScheduleEditor
                clinicianId={selectedClinician}
                schedule={schedule}
                loading={scheduleLoading}
                onSave={saveSchedule}
                onRefresh={refreshSchedule}
              />
            </TabsContent>

            <TabsContent value="preview">
              {schedule ? (
                <ClinicianScheduleCalendarPreview schedule={schedule.weeklySchedule} />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No schedule configured yet
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="exceptions">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Schedule Exceptions</CardTitle>
                      <CardDescription>
                        Manage time off, holidays, and schedule modifications
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowExceptionDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Exception
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {exceptions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No schedule exceptions found
                      </div>
                    ) : (
                      exceptions.map((exception) => (
                        <div
                          key={exception.id}
                          className="flex items-start justify-between p-4 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{exception.exceptionType}</h4>
                              {getStatusBadge(exception.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{exception.reason}</p>
                            <p className="text-sm">
                              {format(new Date(exception.startDate), 'MMM d, yyyy')} -{' '}
                              {format(new Date(exception.endDate), 'MMM d, yyyy')}
                              {!exception.allDay && exception.startTime && exception.endTime && (
                                <span className="ml-2">
                                  ({formatTime12Hour(exception.startTime)} - {formatTime12Hour(exception.endTime)})
                                </span>
                              )}
                            </p>
                            {exception.notes && (
                              <p className="text-sm text-muted-foreground">Notes: {exception.notes}</p>
                            )}
                            {exception.denialReason && (
                              <p className="text-sm text-destructive">Denial reason: {exception.denialReason}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {exception.status === 'Requested' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveException(exception.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const reason = prompt('Enter denial reason:');
                                    if (reason) denyException(exception.id, reason);
                                  }}
                                >
                                  Deny
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this exception?')) {
                                  deleteException(exception.id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {showExceptionDialog && selectedClinician && (
          <ScheduleExceptionDialog
            open={showExceptionDialog}
            onOpenChange={setShowExceptionDialog}
            clinicianId={selectedClinician}
            onSuccess={refreshExceptions}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
