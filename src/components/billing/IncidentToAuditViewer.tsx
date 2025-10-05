import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, CheckCircle, XCircle, AlertTriangle, FileText, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  action_type: string;
  performed_by: string;
  action_timestamp: string;
  compliance_status?: string;
  compliance_issues?: any;
  previous_values?: any;
  new_values?: any;
  change_reason?: string;
  notes?: string;
  performer?: {
    first_name: string;
    last_name: string;
  };
}

interface IncidentToAuditViewerProps {
  incidentToBillingId: string;
  noteId?: string;
}

export function IncidentToAuditViewer({ incidentToBillingId, noteId }: IncidentToAuditViewerProps) {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [incidentToBillingId, noteId]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);

      // Fetch audit logs
      let query = supabase
        .from('incident_to_audit_log')
        .select('*')
        .order('action_timestamp', { ascending: false });

      if (incidentToBillingId) {
        query = query.eq('incident_to_billing_id', incidentToBillingId);
      } else if (noteId) {
        query = query.eq('note_id', noteId);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) throw logsError;

      // Fetch performer profiles separately
      const logsWithPerformers = await Promise.all(
        (logsData || []).map(async (log) => {
          const { data: performer } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', log.performed_by)
            .maybeSingle();

          return {
            ...log,
            performer: performer || undefined
          };
        })
      );

      setAuditLogs(logsWithPerformers);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <FileText className="h-4 w-4" />;
      case 'compliance_check':
        return <Shield className="h-4 w-4" />;
      case 'requirements_verified':
        return <CheckCircle className="h-4 w-4" />;
      case 'attestation_signed':
        return <User className="h-4 w-4" />;
      case 'modified':
        return <Clock className="h-4 w-4" />;
      case 'flagged':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-blue-600';
      case 'compliance_check':
        return 'bg-purple-600';
      case 'requirements_verified':
        return 'bg-green-600';
      case 'attestation_signed':
        return 'bg-indigo-600';
      case 'modified':
        return 'bg-amber-600';
      case 'flagged':
        return 'bg-destructive';
      default:
        return 'bg-gray-600';
    }
  };

  const getComplianceStatusBadge = (status?: string) => {
    if (!status) return null;

    switch (status) {
      case 'compliant':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Compliant
          </Badge>
        );
      case 'non_compliant':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Non-Compliant
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="border-amber-600 text-amber-600">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Warning
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Audit Trail
        </CardTitle>
        <CardDescription>
          Complete audit history for incident-to billing documentation
        </CardDescription>
      </CardHeader>

      <CardContent>
        {auditLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No audit logs found
          </p>
        ) : (
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={getActionColor(log.action_type)}>
                      {getActionIcon(log.action_type)}
                      <span className="ml-2 capitalize">
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                    </Badge>
                    {log.compliance_status && getComplianceStatusBadge(log.compliance_status)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.action_timestamp), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.action_timestamp), 'h:mm a')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {log.performer?.first_name} {log.performer?.last_name}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-sm text-muted-foreground">{log.notes}</p>
                  )}

                  {log.change_reason && (
                    <p className="text-sm">
                      <span className="font-medium">Reason:</span> {log.change_reason}
                    </p>
                  )}

                  {log.compliance_issues && (
                    <div className="space-y-2">
                      {log.compliance_issues.issues && log.compliance_issues.issues.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-destructive">Issues:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {log.compliance_issues.issues.map((issue: string, idx: number) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {log.compliance_issues.warnings && log.compliance_issues.warnings.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-amber-600">Warnings:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {log.compliance_issues.warnings.map((warning: string, idx: number) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {(log.previous_values || log.new_values) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {expandedLog === log.id ? 'Hide' : 'Show'} Changes
                    </Button>
                  )}

                  {expandedLog === log.id && (
                    <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                      {log.previous_values && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Previous Values:</p>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(log.previous_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">New Values:</p>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
