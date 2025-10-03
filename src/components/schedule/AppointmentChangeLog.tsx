import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeLog {
  id: string;
  changed_at: string;
  action: string;
  reason?: string;
  old_values?: any;
  new_values?: any;
  changed_by?: string;
  user_name?: string;
}

interface AppointmentChangeLogProps {
  appointmentId: string;
}

export function AppointmentChangeLog({ appointmentId }: AppointmentChangeLogProps) {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLogs();
  }, [appointmentId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_change_logs')
        .select(`
          id,
          changed_at,
          action,
          reason,
          old_values,
          new_values,
          changed_by
        `)
        .eq('appointment_id', appointmentId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Fetch user names for changed_by
      const userIds = data?.map(log => log.changed_by).filter(Boolean) || [];
      const uniqueUserIds = [...new Set(userIds)];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', uniqueUserIds);

      const userMap = new Map(
        profiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`]) || []
      );

      const logsWithNames = data?.map(log => ({
        ...log,
        user_name: log.changed_by ? userMap.get(log.changed_by) : 'System'
      })) || [];

      setLogs(logsWithNames);
    } catch (error) {
      console.error('Error fetching change logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      reschedule: 'Rescheduled',
      recurrence_update: 'Recurrence Changed',
      status_change: 'Status Changed',
      cancel: 'Cancelled'
    };
    return labels[action] || action;
  };

  const getDiffSummary = (log: ChangeLog) => {
    if (log.action === 'create') return 'Appointment created';
    if (log.action === 'cancel') return `Cancelled: ${log.reason || 'No reason provided'}`;
    
    const old = log.old_values;
    const newVal = log.new_values;
    const changes: string[] = [];

    if (old && newVal) {
      if (old.appointment_date !== newVal.appointment_date) {
        changes.push(`Date: ${format(new Date(old.appointment_date), 'MMM d, yyyy')} → ${format(new Date(newVal.appointment_date), 'MMM d, yyyy')}`);
      }
      if (old.start_time !== newVal.start_time) {
        changes.push(`Time: ${old.start_time} → ${newVal.start_time}`);
      }
      if (old.status !== newVal.status) {
        changes.push(`Status: ${old.status} → ${newVal.status}`);
      }
      if (old.clinician_id !== newVal.clinician_id) {
        changes.push('Clinician changed');
      }
    }

    return changes.length > 0 ? changes.join(', ') : 'Details updated';
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading change history...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-sm text-muted-foreground">No change history available.</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Change History</h3>
      <div className="space-y-2">
        {logs.map(log => (
          <Card key={log.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium">
                    {getActionLabel(log.action)}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {format(new Date(log.changed_at), 'MMM d, yyyy h:mm a')} by {log.user_name}
                  </CardDescription>
                </div>
                {log.action !== 'create' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(log.id)}
                  >
                    {expandedLogs.has(log.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-2 pt-0">
              <p className="text-xs text-muted-foreground">{getDiffSummary(log)}</p>
              {expandedLogs.has(log.id) && log.reason && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <strong>Reason:</strong> {log.reason}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
