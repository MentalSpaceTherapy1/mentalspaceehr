import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Video, Users, Plus } from 'lucide-react';
import { format } from 'date-fns';
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

  useEffect(() => {
    fetchAppointments();
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

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No appointments scheduled</p>
            <Button onClick={() => navigate(`/schedule?clientId=${clientId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule First Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const clinician = clinicians[appointment.clinician_id];
            return (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
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
                            <span>{format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
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
