import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Clock, Lock, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ComplianceAlert {
  id: string;
  note_id: string;
  note_type: string;
  client_id: string;
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
}

export const ComplianceAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    dueSoon: 0,
    overdue: 0,
    locked: 0,
    total: 0
  });

  useEffect(() => {
    loadComplianceAlerts();
  }, [user?.id]);

  const loadComplianceAlerts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
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
        .eq('clinician_id', user.id)
        .in('status', ['Due Soon', 'Overdue', 'Late', 'Locked'])
        .order('due_date', { ascending: true });

      if (error) throw error;

      const alertsWithClient = (data || []).map(item => ({
        ...item,
        client: Array.isArray(item.clients) ? item.clients[0] : item.clients
      }));

      setAlerts(alertsWithClient);

      // Calculate counts
      const dueSoon = alertsWithClient.filter(a => a.status === 'Due Soon').length;
      const overdue = alertsWithClient.filter(a => a.status === 'Overdue' || a.status === 'Late').length;
      const locked = alertsWithClient.filter(a => a.is_locked).length;

      setCounts({
        dueSoon,
        overdue,
        locked,
        total: alertsWithClient.length
      });
    } catch (error) {
      console.error('Error loading compliance alerts:', error);
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

  const getStatusIcon = (alert: ComplianceAlert) => {
    if (alert.is_locked) return <Lock className="h-4 w-4" />;
    if (alert.status === 'Overdue' || alert.status === 'Late') return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
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

  const handleViewNote = (alert: ComplianceAlert) => {
    // Navigate to the appropriate note page based on note type
    const routes: Record<string, string> = {
      'progress_note': '/progress-note',
      'intake_assessment': '/intake-assessment',
      'contact_note': '/contact-note',
      'consultation_note': '/consultation-note',
      'cancellation_note': '/cancellation-note',
      'miscellaneous_note': '/miscellaneous-note'
    };

    const route = routes[alert.note_type];
    if (route) {
      navigate(`${route}?noteId=${alert.note_id}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Compliance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading compliance alerts...</p>
        </CardContent>
      </Card>
    );
  }

  if (counts.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-success" />
            Compliance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              <strong>All caught up!</strong> You have no overdue or locked notes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Compliance Alerts
          </span>
          <Badge variant="destructive">{counts.total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{counts.dueSoon}</p>
                <p className="text-xs text-muted-foreground">Due Soon</p>
              </div>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{counts.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>

          <div className="bg-secondary/30 border border-secondary rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-secondary-foreground" />
              <div>
                <p className="text-2xl font-bold text-secondary-foreground">{counts.locked}</p>
                <p className="text-xs text-muted-foreground">Locked</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(alert)}
                    <span className="font-medium text-sm">
                      {alert.client?.last_name}, {alert.client?.first_name}
                    </span>
                    <Badge variant={getStatusColor(alert.status)} className="text-xs">
                      {alert.status}
                    </Badge>
                    {alert.unlock_requested && !alert.is_locked && (
                      <Badge variant="outline" className="text-xs">
                        Unlock Requested
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {getNoteTypeLabel(alert.note_type)} • Session: {format(new Date(alert.session_date), 'MMM d, yyyy')}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {alert.is_locked ? (
                      <span className="text-destructive font-medium">
                        🔒 Locked - {alert.days_overdue} days overdue
                      </span>
                    ) : alert.status === 'Due Soon' ? (
                      <span className="text-warning">
                        Due in {alert.days_until_due} day{alert.days_until_due !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-destructive">
                        {alert.days_overdue} day{alert.days_overdue !== 1 ? 's' : ''} overdue
                      </span>
                    )}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewNote(alert)}
                  className="shrink-0"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
