import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CriticalAlert {
  id: string;
  critical_item_id: string;
  item_text: string;
  response_value: any;
  severity: string;
  alert_status: string;
  action_required?: string;
  triggered_at: string;
  client_id: string;
  assessment_id: string;
}

interface CriticalAlertsPanelProps {
  clientId?: string;
}

export const CriticalAlertsPanel = ({ clientId }: CriticalAlertsPanelProps) => {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<CriticalAlert | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, [clientId]);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from('assessment_critical_alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading alerts',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assessment_critical_alerts')
        .update({
          alert_status: 'Acknowledged',
          acknowledged_by: user.user.id,
          acknowledged_at: new Date().toISOString(),
          actions_taken: actionNotes,
        })
        .eq('id', alertId);

      if (error) throw error;

      await fetchAlerts();
      setSelectedAlert(null);
      setActionNotes('');
      toast({
        title: 'Alert acknowledged',
      });
    } catch (error: any) {
      toast({
        title: 'Error acknowledging alert',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assessment_critical_alerts')
        .update({
          alert_status: 'Resolved',
          resolved_by: user.user.id,
          resolved_at: new Date().toISOString(),
          follow_up_notes: actionNotes,
        })
        .eq('id', alertId);

      if (error) throw error;

      await fetchAlerts();
      setSelectedAlert(null);
      setActionNotes('');
      toast({
        title: 'Alert resolved',
      });
    } catch (error: any) {
      toast({
        title: 'Error resolving alert',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'High':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'Medium':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'default';
      case 'Medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'destructive';
      case 'Acknowledged':
        return 'default';
      case 'Resolved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const activeAlerts = alerts.filter((a) => a.alert_status === 'Active');

  if (isLoading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Critical Assessment Alerts
            {activeAlerts.length > 0 && (
              <Badge variant="destructive">{activeAlerts.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Alerts triggered by critical assessment items requiring immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No critical alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(alert.severity as any)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant={getStatusColor(alert.alert_status) as any}>
                              {alert.alert_status}
                            </Badge>
                          </div>
                          <p className="font-medium">{alert.item_text}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Response: {JSON.stringify(alert.response_value)}
                          </p>
                          {alert.action_required && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Action: {alert.action_required}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(alert.triggered_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Critical Alert</DialogTitle>
            <DialogDescription>
              Take action on this critical assessment alert
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedAlert.item_text}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Response: {JSON.stringify(selectedAlert.response_value)}
                </p>
              </div>

              {selectedAlert.action_required && (
                <div>
                  <p className="text-sm font-medium">Required Action:</p>
                  <p className="text-sm text-muted-foreground">{selectedAlert.action_required}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Notes / Actions Taken</label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Document actions taken..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>
              Cancel
            </Button>
            {selectedAlert?.alert_status === 'Active' && (
              <Button onClick={() => acknowledgeAlert(selectedAlert.id)}>
                Acknowledge
              </Button>
            )}
            {selectedAlert?.alert_status === 'Acknowledged' && (
              <Button onClick={() => resolveAlert(selectedAlert.id)}>
                Resolve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
