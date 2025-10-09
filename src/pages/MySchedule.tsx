import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CalendarDays, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClinicianSchedule } from '@/hooks/useClinicianSchedule';
import { ClinicianScheduleEditor } from '@/components/schedule/ClinicianScheduleEditor';
import { ClinicianScheduleCalendarPreview } from '@/components/schedule/ClinicianScheduleCalendarPreview';
import { useScheduleExceptions } from '@/hooks/useScheduleExceptions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScheduleExceptionDialog } from '@/components/schedule/ScheduleExceptionDialog';
import { useState } from 'react';
import { format, parse } from 'date-fns';

export default function MySchedule() {
  const { user } = useAuth();
  const { schedule, loading, saveSchedule, refreshSchedule } = useClinicianSchedule(user?.id);
  const { exceptions, refreshExceptions } = useScheduleExceptions(user?.id);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);

  const formatTime12Hour = (time?: string) => {
    if (!time) return '';
    try {
      const parsed = parse(time, 'HH:mm:ss', new Date());
      return format(parsed, 'h:mm a');
    } catch {
      return time;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      'Pending': { variant: 'outline', className: 'border-yellow-500 text-yellow-700' },
      'Approved': { variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
      'Denied': { variant: 'destructive' },
      'Requested': { variant: 'secondary' },
    };
    return <Badge {...(variants[status] || { variant: 'outline' })}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            My Schedule
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your availability, working hours, and time-off requests
          </p>
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Weekly Schedule
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Calendar Preview
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Time Off
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <Card className="border-2 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle>Weekly Availability</CardTitle>
                <CardDescription>
                  Set your regular working hours, shifts, and break times
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ClinicianScheduleEditor
                  clinicianId={user?.id || ''}
                  schedule={schedule}
                  loading={loading}
                  onSave={saveSchedule}
                  onRefresh={refreshSchedule}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            {schedule ? (
              <ClinicianScheduleCalendarPreview schedule={schedule.weeklySchedule} />
            ) : (
              <Card className="border-2 shadow-lg">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No schedule configured yet. Go to the Weekly Schedule tab to set up your availability.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="exceptions">
            <Card className="border-2 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Time Off & Schedule Exceptions</CardTitle>
                  <CardDescription>
                    Request time off or schedule changes for admin approval
                  </CardDescription>
                </div>
                <Button onClick={() => setExceptionDialogOpen(true)} size="sm">
                  Request Time Off
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {exceptions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No time-off requests or exceptions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {exceptions.map((exception) => (
                      <div
                        key={exception.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">{exception.reason || 'Time Off'}</p>
                            {getStatusBadge(exception.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(exception.startDate).toLocaleDateString()} 
                            {exception.endDate && ` - ${new Date(exception.endDate).toLocaleDateString()}`}
                            {!exception.allDay && ` • ${formatTime12Hour(exception.startTime)} - ${formatTime12Hour(exception.endTime)}`}
                          </p>
                          {exception.notes && (
                            <p className="text-sm text-muted-foreground italic">{exception.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ScheduleExceptionDialog
          open={exceptionDialogOpen}
          onOpenChange={setExceptionDialogOpen}
          clinicianId={user?.id || ''}
          onSuccess={async () => {
            await refreshSchedule();
            await refreshExceptions();
            setExceptionDialogOpen(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
