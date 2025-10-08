import { useState, useEffect } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useAppointments } from '@/hooks/useAppointments';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, MapPin, Phone, AlertCircle } from 'lucide-react';
import { format, isPast, isWithinInterval, addMinutes, subMinutes } from 'date-fns';
import { AppointmentDetailsDialog } from '@/components/portal/AppointmentDetailsDialog';
import { RequestAppointmentChangeDialog } from '@/components/portal/RequestAppointmentChangeDialog';
import { CancelAppointmentDialog } from '@/components/portal/CancelAppointmentDialog';
import { RequestAppointmentDialog } from '@/components/portal/RequestAppointmentDialog';
import { useNavigate } from 'react-router-dom';

export default function PortalAppointments() {
  const navigate = useNavigate();
  const { portalContext } = usePortalAccount();
  const { appointments, loading } = useAppointments();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [requestChangeOpen, setRequestChangeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [requestNewOpen, setRequestNewOpen] = useState(false);

  const clientAppointments = appointments.filter(
    apt => apt.client_id === portalContext?.client.id
  );

  const now = new Date();
  const upcomingAppointments = clientAppointments
    .filter(apt => apt.status === 'Scheduled' && !isPast(new Date(`${apt.appointment_date}T${apt.end_time}`)))
    .sort((a, b) => new Date(`${a.appointment_date}T${a.start_time}`).getTime() - new Date(`${b.appointment_date}T${b.start_time}`).getTime());

  const pastAppointments = clientAppointments
    .filter(apt => isPast(new Date(`${apt.appointment_date}T${apt.end_time}`)))
    .sort((a, b) => new Date(`${b.appointment_date}T${b.start_time}`).getTime() - new Date(`${a.appointment_date}T${a.start_time}`).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
      case 'Confirmed':
        return 'default';
      case 'Cancelled':
      case 'No Show':
        return 'destructive';
      case 'Completed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const canJoinSession = (appointment: any) => {
    if (appointment.service_location !== 'Telehealth' || !appointment.telehealth_link) {
      return false;
    }

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const startTime = subMinutes(appointmentDateTime, 15);
    const endTime = addMinutes(appointmentDateTime, 30);

    return isWithinInterval(now, { start: startTime, end: endTime });
  };

  const handleJoinSession = (appointment: any) => {
    if (appointment.telehealth_link) {
      const sessionId = appointment.telehealth_link.split('/').pop();
      navigate(`/portal/telehealth/session/${sessionId}`);
    }
  };

  const handleViewDetails = (appointment: any) => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  const handleRequestChange = (appointment: any) => {
    setSelectedAppointment(appointment);
    setRequestChangeOpen(true);
  };

  const handleCancel = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCancelOpen(true);
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Appointments</h1>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-24 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Appointments</h1>
          <Button onClick={() => setRequestNewOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Request Appointment
          </Button>
        </div>

        {/* Upcoming Appointments */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Upcoming Appointments</h2>
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No upcoming appointments</p>
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <h3 className="text-lg font-semibold">{appointment.appointment_type}</h3>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{appointment.start_time} - {appointment.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {appointment.service_location === 'Telehealth' ? (
                            <>
                              <Video className="h-4 w-4" />
                              <span>Telehealth</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4" />
                              <span>{appointment.service_location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {canJoinSession(appointment) && (
                        <Button onClick={() => handleJoinSession(appointment)} variant="default">
                          <Video className="h-4 w-4 mr-2" />
                          Join Session
                        </Button>
                      )}
                      <Button onClick={() => handleViewDetails(appointment)} variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button onClick={() => handleRequestChange(appointment)} variant="outline" size="sm">
                        Request Change
                      </Button>
                      <Button onClick={() => handleCancel(appointment)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Past Appointments</h2>
            {pastAppointments.slice(0, 5).map((appointment) => (
              <Card key={appointment.id} className="opacity-75">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <h3 className="font-semibold">{appointment.appointment_type}</h3>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(appointment.appointment_date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{appointment.start_time}</span>
                        </div>
                      </div>
                    </div>

                    <Button onClick={() => handleViewDetails(appointment)} variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AppointmentDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        appointment={selectedAppointment}
      />

      <RequestAppointmentChangeDialog
        open={requestChangeOpen}
        onOpenChange={setRequestChangeOpen}
        appointment={selectedAppointment}
      />

      <CancelAppointmentDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        appointment={selectedAppointment}
      />

      <RequestAppointmentDialog
        open={requestNewOpen}
        onOpenChange={setRequestNewOpen}
      />
    </PortalLayout>
  );
}
