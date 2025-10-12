import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GradientCard, GradientCardContent, GradientCardDescription, GradientCardHeader, GradientCardTitle } from '@/components/ui/gradient-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  Users,
  ClipboardList
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ComplianceAlerts } from './ComplianceAlerts';
import { apiClient } from '@/lib/aws-api-client';
import { useAuth } from '@/hooks/useAuth';

interface TodaysAppointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type: string;
  clients: {
    first_name: string;
    last_name: string;
  };
}

export const TherapistDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaysSessions: 0,
    pendingNotes: 0,
    activeClients: 0,
    complianceRate: 100,
    treatmentPlansDue: 0,
    sessionsCompletedThisWeek: 0
  });
  const [todaysAppointments, setTodaysAppointments] = useState<TodaysAppointment[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format

        // ✅ FIX #1: Fetch today's appointments with ALL active statuses and client details
        // Include: Scheduled, Checked In, In Session (not just Scheduled)
        // Only show remaining sessions (end_time >= current time)
        const { data: appointments, error: apptError } = await apiClient
          .from('appointments')
          .select(`
            id,
            start_time,
            end_time,
            status,
            appointment_type,
            clients!inner (
              first_name,
              last_name
            )
          `)
          .eq('clinician_id', user.id)
          .eq('appointment_date', today)
          .in('status', ['Scheduled', 'Checked In', 'In Session'])
          .gte('end_time', currentTime)
          .order('start_time')
          .execute();

        if (apptError) throw apptError;

        setTodaysAppointments(appointments || []);

        // Fetch active clients
        const { data: clients, error: clientError } = await apiClient
          .from('clients')
          .select('id')
          .eq('primary_therapist_id', user.id)
          .eq('status', 'Active')
          .execute();

        if (clientError) throw clientError;

        // ✅ FIX #2: Fetch UNSIGNED/DRAFT notes from clinical_notes table
        // These are notes that have been saved but not yet signed (locked = false)
        const { data: unsignedNotes, error: unsignedError } = await apiClient
          .from('clinical_notes')
          .select('id')
          .eq('clinician_id', user.id)
          .or('locked.is.null,locked.eq.false')
          .execute();

        if (unsignedError) console.error('[TherapistDashboard] Error fetching unsigned notes:', unsignedError);

        // ✅ FIX #3: Fetch ALL notes for accurate compliance calculation
        const { data: allComplianceData, error: allComplianceError } = await apiClient
          .from('note_compliance_status')
          .select('id, status')
          .eq('clinician_id', user.id)
          .execute();

        if (allComplianceError) throw allComplianceError;

        // ✅ FIX #3: Calculate compliance rate correctly
        // Compliance = (On Time notes) / (Total notes) * 100
        const totalNotes = allComplianceData?.length || 0;
        const onTimeNotes = allComplianceData?.filter(n => n.status === 'On Time')?.length || 0;
        const complianceRate = totalNotes === 0 ? 100 : Math.round((onTimeNotes / totalNotes) * 100);

        // ✅ FIX #6: Fetch completed sessions this week for productivity metrics
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

        const { data: completedSessions, error: completedError } = await apiClient
          .from('appointments')
          .select('id')
          .eq('clinician_id', user.id)
          .eq('status', 'Completed')
          .gte('appointment_date', startOfWeekStr)
          .execute();

        if (completedError) console.error('[TherapistDashboard] Error fetching completed sessions:', completedError);

        // Fetch treatment plans due for review (if table exists)
        let treatmentPlansDue = 0;
        try {
          const { data: treatmentPlans } = await (supabase as any)
            .from('treatment_plans')
            .select('id')
            .eq('therapist_id', user.id)
            .lt('next_review_date', today)
            .eq('status', 'Active');
          
          treatmentPlansDue = treatmentPlans?.length || 0;
        } catch (err) {
          // Treatment plans table may not exist
          console.log('[TherapistDashboard] Treatment plans table not available');
        }

        // ✅ FIX #2: Use unsigned/draft notes count for "Pending Notes"
        setStats({
          todaysSessions: appointments?.length || 0,
          pendingNotes: unsignedNotes?.length || 0, // ✅ FIXED: Use unsigned notes from clinical_notes table
          activeClients: clients?.length || 0,
          complianceRate, // ✅ FIXED: Now calculated correctly
          treatmentPlansDue, // ✅ NEW: Actual treatment plans due
          sessionsCompletedThisWeek: completedSessions?.length || 0 // ✅ NEW: Actual completed sessions
        });
      } catch (error) {
        console.error('[TherapistDashboard] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientCard gradient="primary" className="hover:shadow-colored border-l-4 border-l-primary">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Today's Sessions</GradientCardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </GradientCardHeader>
          <GradientCardContent>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stats.todaysSessions}</div>
            )}
            <p className="text-xs text-muted-foreground">Scheduled appointments</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="warning" className="hover:shadow-colored border-l-4 border-l-warning">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Pending Notes</GradientCardTitle>
            <FileText className="h-5 w-5 text-warning" />
          </GradientCardHeader>
          <GradientCardContent>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-bold text-warning">{stats.pendingNotes}</div>
            )}
            <p className="text-xs text-muted-foreground">Unsigned notes</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="accent" className="hover:shadow-colored border-l-4 border-l-accent">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Active Clients</GradientCardTitle>
            <Users className="h-5 w-5 text-accent" />
          </GradientCardHeader>
          <GradientCardContent>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-bold text-accent">{stats.activeClients}</div>
            )}
            <p className="text-xs text-muted-foreground">On your caseload</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="success" className="hover:shadow-colored border-l-4 border-l-success">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Compliance</GradientCardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </GradientCardHeader>
          <GradientCardContent>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-bold text-success">{stats.complianceRate}%</div>
            )}
            <p className="text-xs text-muted-foreground">Documentation on time</p>
          </GradientCardContent>
        </GradientCard>
      </div>

      {/* Compliance Alerts Section */}
      <ComplianceAlerts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <GradientCard gradient="primary" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Schedule
            </GradientCardTitle>
            <GradientCardDescription>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : todaysAppointments.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-center">
                <div>
                  <Calendar className="h-12 w-12 text-primary/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No appointments scheduled</p>
                  <Button
                    variant="default"
                    className="mt-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    onClick={() => navigate('/schedule')}
                  >
                    Schedule an appointment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {todaysAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clients/${apt.clients?.first_name}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {apt.clients?.last_name}, {apt.clients?.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apt.appointment_type}
                      </p>
                    </div>
                    <Badge variant={
                      apt.status === 'Scheduled' ? 'outline' :
                      apt.status === 'Checked In' ? 'secondary' :
                      'default'
                    }>
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </GradientCardContent>
        </GradientCard>

        {/* Pending Tasks */}
        <GradientCard gradient="secondary" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-secondary" />
              Pending Tasks
            </GradientCardTitle>
            <GradientCardDescription>Items requiring your attention</GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
            <div className="space-y-3">
              <div
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => navigate('/notes?filter=unsigned')}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Unsigned Notes</p>
                    <p className="text-xs text-muted-foreground">Complete documentation</p>
                  </div>
                </div>
                <Badge variant={stats.pendingNotes > 0 ? "destructive" : "secondary"}>
                  {stats.pendingNotes}
                </Badge>
              </div>

              <div
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => navigate('/treatment-plans?filter=due')}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Treatment Plans Due</p>
                    <p className="text-xs text-muted-foreground">Review and update</p>
                  </div>
                </div>
                <Badge variant={stats.treatmentPlansDue > 0 ? "destructive" : "secondary"}>
                  {stats.treatmentPlansDue}
                </Badge>
              </div>
            </div>
          </GradientCardContent>
        </GradientCard>
      </div>

      {/* Quick Actions & Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GradientCard gradient="accent" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle>Quick Actions</GradientCardTitle>
            <GradientCardDescription>Common clinical tasks</GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto flex flex-col gap-2 p-4"
                onClick={() => navigate('/notes')}
              >
                <FileText className="h-5 w-5" />
                <span className="text-sm">New Note</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex flex-col gap-2 p-4"
                onClick={() => navigate('/schedule')}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Schedule</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex flex-col gap-2 p-4"
                onClick={() => navigate('/clients')}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Clients</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex flex-col gap-2 p-4"
                onClick={() => navigate('/tasks')}
              >
                <ClipboardList className="h-5 w-5" />
                <span className="text-sm">To-Do</span>
              </Button>
            </div>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="primary" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Productivity Metrics
            </GradientCardTitle>
            <GradientCardDescription>Your performance this week</GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sessions Completed</span>
                  <span className="font-medium">{stats.sessionsCompletedThisWeek}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.sessionsCompletedThisWeek / 25) * 100, 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">This week (Target: 25)</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documentation Rate</span>
                  <span className="font-medium">{stats.complianceRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.complianceRate >= 90 ? 'bg-success' :
                      stats.complianceRate >= 70 ? 'bg-warning' :
                      'bg-destructive'
                    }`}
                    style={{ width: `${stats.complianceRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.complianceRate >= 90 ? 'Excellent!' :
                   stats.complianceRate >= 70 ? 'Good - room for improvement' :
                   'Needs attention'}
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Caseload</span>
                <span className="font-medium">{stats.activeClients} clients</span>
              </div>
            </div>
          </GradientCardContent>
        </GradientCard>
      </div>

      {/* Recent Client Activity */}
      <GradientCard gradient="secondary" className="hover:shadow-colored">
        <GradientCardHeader>
          <GradientCardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            Recent Client Activity
          </GradientCardTitle>
          <GradientCardDescription>Latest interactions with your clients</GradientCardDescription>
        </GradientCardHeader>
        <GradientCardContent>
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        </GradientCardContent>
      </GradientCard>
    </div>
  );
};
