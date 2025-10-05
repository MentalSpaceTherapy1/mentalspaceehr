import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Clock, 
  Lock, 
  FileText, 
  TrendingUp,
  Settings,
  Users,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { UnlockRequestManagement } from '@/components/compliance/UnlockRequestManagement';

interface ComplianceAlert {
  id: string;
  note_id: string;
  note_type: string;
  client_id: string;
  clinician_id: string;
  session_date: string;
  due_date: string;
  status: string;
  days_until_due: number | null;
  days_overdue: number | null;
  is_locked: boolean;
  unlock_requested: boolean;
  client?: {
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
  clinician?: {
    first_name: string;
    last_name: string;
  };
}

interface ComplianceStats {
  totalAlerts: number;
  dueSoon: number;
  overdue: number;
  locked: number;
  unlockRequests: number;
  byClinicianCount: number;
  byNoteType: { [key: string]: number };
}

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [stats, setStats] = useState<ComplianceStats>({
    totalAlerts: 0,
    dueSoon: 0,
    overdue: 0,
    locked: 0,
    unlockRequests: 0,
    byClinicianCount: 0,
    byNoteType: {}
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);

      // Load all compliance alerts across all clinicians
      const { data, error } = await supabase
        .from('note_compliance_status')
        .select(`
          *,
          clients!inner (
            first_name,
            last_name,
            medical_record_number
          )
        `)
        .in('status', ['Due Soon', 'Overdue', 'Late', 'Locked'])
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Fetch clinician profiles separately
      const clinicianIds = Array.from(
        new Set((data || []).map(a => a.clinician_id).filter(Boolean))
      );

      let clinicianMap: Record<string, { first_name: string; last_name: string }> = {};

      if (clinicianIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clinicianIds);

        if (!profilesError && profiles) {
          clinicianMap = Object.fromEntries(
            profiles.map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
          );
        }
      }

      const alertsWithDetails = (data || []).map(item => ({
        ...item,
        client: Array.isArray(item.clients) ? item.clients[0] : item.clients,
        clinician: clinicianMap[item.clinician_id] || null
      }));

      setAlerts(alertsWithDetails);

      // Calculate statistics
      const dueSoon = alertsWithDetails.filter(a => a.status === 'Due Soon').length;
      const overdue = alertsWithDetails.filter(a => a.status === 'Overdue' || a.status === 'Late').length;
      const locked = alertsWithDetails.filter(a => a.is_locked).length;
      const unlockRequests = alertsWithDetails.filter(a => a.unlock_requested).length;
      const uniqueClinicians = new Set(alertsWithDetails.map(a => a.clinician_id));
      
      const byNoteType: { [key: string]: number } = {};
      alertsWithDetails.forEach(alert => {
        byNoteType[alert.note_type] = (byNoteType[alert.note_type] || 0) + 1;
      });

      setStats({
        totalAlerts: alertsWithDetails.length,
        dueSoon,
        overdue,
        locked,
        unlockRequests,
        byClinicianCount: uniqueClinicians.size,
        byNoteType
      });
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Due Soon':
        return 'outline';
      case 'Overdue':
      case 'Late':
        return 'destructive';
      case 'Locked':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getNoteTypeLabel = (noteType: string) => {
    const labels: Record<string, string> = {
      'clinical_note': 'Clinical Note',
      'progress_note': 'Progress Note',
      'intake_assessment': 'Intake Assessment',
      'contact_note': 'Contact Note',
      'consultation_note': 'Consultation Note',
      'cancellation_note': 'Cancellation Note',
      'miscellaneous_note': 'Miscellaneous Note'
    };
    return labels[noteType] || noteType;
  };

  const filteredAlerts = filterStatus === 'all' 
    ? alerts 
    : filterStatus === 'locked'
    ? alerts.filter(a => a.is_locked)
    : alerts.filter(a => a.status.toLowerCase().replace(' ', '_') === filterStatus);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
            <p className="text-muted-foreground">System-wide documentation compliance monitoring</p>
          </div>
          <Button onClick={() => navigate('/admin/compliance-rules')}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Rules
          </Button>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
              <p className="text-xs text-muted-foreground">
                Across {stats.byClinicianCount} clinician{stats.byClinicianCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.dueSoon}</div>
              <p className="text-xs text-muted-foreground">Within deadline</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">Past deadline</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locked</CardTitle>
              <Lock className="h-4 w-4 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.locked}</div>
              <p className="text-xs text-muted-foreground">Requires unlock</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unlock Requests</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unlockRequests}</div>
              <p className="text-xs text-muted-foreground">Pending review</p>
            </CardContent>
          </Card>
        </div>

        {/* Note Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts by Note Type</CardTitle>
            <CardDescription>Distribution of compliance issues across documentation types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byNoteType).map(([type, count]) => (
                <div key={type} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium">{getNoteTypeLabel(type)}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Unlock Request Management */}
        <UnlockRequestManagement />

        {/* All Compliance Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Compliance Alerts
                </CardTitle>
                <CardDescription>Documentation requiring attention across all clinicians</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  All ({stats.totalAlerts})
                </Button>
                <Button
                  variant={filterStatus === 'due_soon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('due_soon')}
                >
                  Due Soon ({stats.dueSoon})
                </Button>
                <Button
                  variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('overdue')}
                >
                  Overdue ({stats.overdue})
                </Button>
                <Button
                  variant={filterStatus === 'locked' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('locked')}
                >
                  Locked ({stats.locked})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading alerts...</p>
            ) : filteredAlerts.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {filterStatus === 'all' 
                    ? 'No compliance alerts at this time. All documentation is up to date!'
                    : `No ${filterStatus.replace('_', ' ')} alerts.`}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {alert.is_locked && <Lock className="h-4 w-4 text-secondary-foreground" />}
                          <span className="font-medium">
                            {alert.client?.last_name}, {alert.client?.first_name}
                          </span>
                          <Badge variant={getStatusColor(alert.status)}>
                            {alert.status}
                          </Badge>
                          <Badge variant="outline">
                            {getNoteTypeLabel(alert.note_type)}
                          </Badge>
                          {alert.unlock_requested && (
                            <Badge variant="secondary">Unlock Requested</Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <strong>Clinician:</strong> {alert.clinician 
                              ? `${alert.clinician.last_name}, ${alert.clinician.first_name}`
                              : 'Unknown'}
                          </p>
                          <p>
                            <strong>Session Date:</strong> {format(new Date(alert.session_date), 'MMM d, yyyy')}
                          </p>
                          <p>
                            <strong>Due Date:</strong> {format(new Date(alert.due_date), 'MMM d, yyyy')}
                          </p>
                          {alert.is_locked ? (
                            <p className="text-destructive font-medium">
                              🔒 Locked - {alert.days_overdue} days overdue
                            </p>
                          ) : alert.status === 'Due Soon' ? (
                            <p className="text-warning">
                              Due in {alert.days_until_due} day{alert.days_until_due !== 1 ? 's' : ''}
                            </p>
                          ) : (
                            <p className="text-destructive">
                              {alert.days_overdue} day{alert.days_overdue !== 1 ? 's' : ''} overdue
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
