import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Video, Users, Plus, Filter } from 'lucide-react';
import { format, isToday, differenceInMinutes, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Appointment = Database['public']['Tables']['appointments']['Row'];

interface ClientAppointmentsProps {
  clientId: string;
}

const statusColors = {
  Scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
  'Checked In': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  Completed: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  Cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  'No Show': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Rescheduled: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export function ClientAppointments({ clientId }: ClientAppointmentsProps) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicians, setClinicians] = useState<Record<string, any>>({});
  const [showCancelled, setShowCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>(['Scheduled', 'Confirmed', 'Checked In', 'Completed']);

  useEffect(() => {
    fetchAppointments();
  }, [clientId]);

  // Realtime subscription for appointment updates
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('client-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      // Fetch appointments
      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', clientId)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (apptError) throw apptError;

      // Fetch clinician details
      if (apptData && apptData.length > 0) {
        const clinicianIds = [...new Set(apptData.map(a => a.clinician_id))];
        const { data: clinicianData, error: clinicianError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, title')
          .in('id', clinicianIds);

        if (clinicianError) throw clinicianError;

        const clinicianMap: Record<string, any> = {};
        clinicianData?.forEach(c => {
          clinicianMap[c.id] = c;
        });
        setClinicians(clinicianMap);
      }

      setAppointments(apptData || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load appointments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (!showCancelled && (apt.status === 'Cancelled' || apt.status === 'No Show')) {
      return false;
    }
    return statusFilter.includes(apt.status);
  });

  const canJoinSession = (apt: Appointment) => {
    return (
      apt.service_location === 'Telehealth' &&
      apt.telehealth_platform === 'Internal' &&
      apt.telehealth_link &&
      isToday(parseISO(apt.appointment_date)) &&
      (apt.status === 'Scheduled' || apt.status === 'Confirmed' || apt.status === 'Checked In')
    );
  };

  const isSessionStartingSoon = (apt: Appointment) => {
    if (!isToday(parseISO(apt.appointment_date))) return false;
    const appointmentTime = parseISO(`${apt.appointment_date}T${apt.start_time}`);
    const minutesUntil = differenceInMinutes(appointmentTime, new Date());
    return minutesUntil > 0 && minutesUntil <= 15;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading appointments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <Button onClick={() => navigate(`/schedule?clientId=${clientId}`)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Appointment
        </Button>
      </div>

      {/* Status Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['Scheduled', 'Confirmed', 'Checked In', 'Completed'].map(status => (
                <Badge
                  key={status}
                  variant={statusFilter.includes(status) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setStatusFilter(prev =>
                      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                    );
                  }}
                >
                  {status}
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelled(!showCancelled)}
            >
              {showCancelled ? 'Hide' : 'Show'} Cancelled/No-Show
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {appointments.length === 0 
                ? 'No appointments scheduled'
                : 'No appointments match your filters'
              }
            </p>
            <Button onClick={() => navigate(`/schedule?clientId=${clientId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              {appointments.length === 0 ? 'Schedule First Appointment' : 'Schedule Appointment'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const clinician = clinicians[appointment.clinician_id];
            return (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        {isSessionStartingSoon(appointment) && (
                          <Badge variant="default" className="animate-pulse">
                            Starting Soon
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={statusColors[appointment.status as keyof typeof statusColors]}
                        >
                          {appointment.status}
                        </Badge>
                        {appointment.is_group_session && (
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            Group Session
                          </Badge>
                        )}
                        {appointment.is_recurring && (
                          <Badge variant="outline">Recurring</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{appointment.start_time} - {appointment.end_time} ({appointment.duration} min)</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            {appointment.service_location === 'Telehealth' ? (
                              <>
                                <Video className="h-4 w-4 text-muted-foreground" />
                                <span>Telehealth</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{appointment.service_location}</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Type: </span>
                            <span>{appointment.appointment_type}</span>
                          </div>
                        </div>
                      </div>

                      {clinician && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Clinician: </span>
                          <span>
                            {clinician.title ? `${clinician.title} ` : ''}
                            {clinician.first_name} {clinician.last_name}
                          </span>
                        </div>
                      )}

                      {appointment.appointment_notes && (
                        <div className="text-sm pt-2 border-t">
                          <span className="text-muted-foreground">Notes: </span>
                          <span>{appointment.appointment_notes}</span>
                        </div>
                      )}

                      {/* Telehealth Join Button */}
                      {canJoinSession(appointment) && (
                        <div className="pt-3 border-t space-y-2">
                          <Button
                            onClick={async () => {
                              try {
                                let link = appointment.telehealth_link || '';

                                // If placeholder or missing, ensure a real session exists
                                if (!link || link.includes(':sessionId')) {
                                  const { data: existing } = await supabase
                                    .from('telehealth_sessions')
                                    .select('session_id')
                                    .eq('appointment_id', appointment.id)
                                    .maybeSingle();

                                  let sid = existing?.session_id as string | undefined;
                                  if (!sid) {
                                    sid = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                                    await supabase.from('telehealth_sessions').insert({
                                      appointment_id: appointment.id,
                                      host_id: appointment.clinician_id,
                                      session_id: sid,
                                      status: 'waiting'
                                    });
                                  }

                                  link = `/telehealth/session/${sid}`;
                                  await supabase
                                    .from('appointments')
                                    .update({ telehealth_link: link, last_modified: new Date().toISOString() })
                                    .eq('id', appointment.id);
                                }

                                // Normalize legacy links
                                const fixed = link.includes('/telehealth/session/')
                                  ? link
                                  : link.includes('/telehealth/session_')
                                    ? link.replace('/telehealth/session_', '/telehealth/session/')
                                    : link.includes('/telehealth/')
                                      ? link.replace('/telehealth/', '/telehealth/session/')
                                      : `/telehealth/session/${link}`;

                                navigate(fixed);
                              } catch (e) {
                                console.error('Failed to prepare telehealth session', e);
                                toast({
                                  title: 'Error',
                                  description: 'Unable to join telehealth session.',
                                  variant: 'destructive'
                                });
                              }
                            }}
                            className="w-full bg-primary hover:bg-primary/90"
                            size="sm"
                          >
                            <Video className="mr-2 h-4 w-4" />
                            Join Telehealth Session
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            Meeting Link: {appointment.telehealth_link}
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/schedule')}
                    >
                      View in Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
