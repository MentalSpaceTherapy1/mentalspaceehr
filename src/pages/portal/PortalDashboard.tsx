import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, MessageSquare, TrendingUp, Bell, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PortalStats {
  upcomingAppointments: number;
  unreadMessages: number;
  pendingDocuments: number;
  unreadNotifications: number;
}

interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  appointment_type: string;
  clinician_name: string;
}

export default function PortalDashboard() {
  const { user } = useAuth();
  const { portalContext, loading: contextLoading } = usePortalAccount();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PortalStats>({
    upcomingAppointments: 0,
    unreadMessages: 0,
    pendingDocuments: 0,
    unreadNotifications: 0
  });
  const [nextAppointment, setNextAppointment] = useState<UpcomingAppointment | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get client record
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('portal_user_id', user?.id)
        .single();

      if (!client) {
        toast.error('Client record not found');
        return;
      }

      // Fetch upcoming appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          appointment_type,
          profiles!appointments_clinician_id_fkey(first_name, last_name)
        `)
        .eq('client_id', client.id)
        .eq('status', 'Scheduled')
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1);

      if (appointments && appointments.length > 0) {
        const appt = appointments[0];
        setNextAppointment({
          id: appt.id,
          appointment_date: appt.appointment_date,
          start_time: appt.start_time,
          appointment_type: appt.appointment_type,
          clinician_name: `${(appt.profiles as any).first_name} ${(appt.profiles as any).last_name}`
        });
      }

      // Count unread messages
      const { count: messagesCount } = await supabase
        .from('client_portal_messages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_read', false)
        .neq('sender_id', user?.id);

      // Count pending documents
      const { count: documentsCount } = await supabase
        .from('client_documents')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'pending')
        .eq('requires_signature', true);

      // Count unread notifications
      const { count: notificationsCount } = await supabase
        .from('portal_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_read', false);

      // Count all upcoming appointments
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'Scheduled')
        .gte('appointment_date', new Date().toISOString().split('T')[0]);

      setStats({
        upcomingAppointments: appointmentsCount || 0,
        unreadMessages: messagesCount || 0,
        pendingDocuments: documentsCount || 0,
        unreadNotifications: notificationsCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || contextLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome to Your Portal</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const clientName = portalContext?.client ? `${portalContext.client.firstName} ${portalContext.client.lastName}` : 'User';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {clientName}</h1>
          {portalContext?.account.isGuardianAccount && (
            <p className="text-muted-foreground mt-1">
              Managing {portalContext.minorClients?.length || 0} minor account(s)
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/portal/appointments')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">View schedule</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/portal/messages')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">New messages</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/portal/documents')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">Require signature</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
            <p className="text-xs text-muted-foreground">New notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Appointment Card */}
      {nextAppointment && (
        <Card>
          <CardHeader>
            <CardTitle>Next Appointment</CardTitle>
            <CardDescription>Your upcoming session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="text-lg font-semibold">
                  {format(new Date(nextAppointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                  {' at '}
                  {nextAppointment.start_time}
                </p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="text-lg font-semibold">{nextAppointment.appointment_type}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">With</p>
              <p className="text-lg font-semibold">{nextAppointment.clinician_name}</p>
            </div>
            <Button onClick={() => navigate('/portal/appointments')} className="w-full">
              View All Appointments
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used features</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/portal/progress')}>
            <TrendingUp className="h-6 w-6 mb-2" />
            <span className="font-semibold">Track Progress</span>
            <span className="text-xs text-muted-foreground">Log your symptoms</span>
          </Button>
          
          <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/portal/messages')}>
            <MessageSquare className="h-6 w-6 mb-2" />
            <span className="font-semibold">Send Message</span>
            <span className="text-xs text-muted-foreground">Contact your clinician</span>
          </Button>
          
          <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/portal/documents')}>
            <FileText className="h-6 w-6 mb-2" />
            <span className="font-semibold">View Documents</span>
            <span className="text-xs text-muted-foreground">Access forms & files</span>
          </Button>
          
          <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/portal/billing')}>
            <FileText className="h-6 w-6 mb-2" />
            <span className="font-semibold">Billing</span>
            <span className="text-xs text-muted-foreground">View statements</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
