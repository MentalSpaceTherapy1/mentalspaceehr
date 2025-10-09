import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, CheckCircle, AlertTriangle, XCircle, RefreshCw, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TableStatus {
  table: string;
  record_count: number;
  last_modified: string | null;
  status: 'healthy' | 'warning' | 'critical';
  message?: string;
}

interface BackupHealth {
  timestamp: string;
  overall_health: {
    backup_age: string;
    backup_status: 'healthy' | 'warning' | 'critical';
    tables_healthy: number;
    tables_warning: number;
    tables_critical: number;
    total_records: number;
  };
  table_statuses: TableStatus[];
}

export function BackupMonitoringDashboard() {
  const [backupHealth, setBackupHealth] = useState<BackupHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-health-check');

      if (error) throw error;

      setBackupHealth(data);
      
      const criticalCount = data.overall_health.tables_critical || 0;
      toast({
        title: criticalCount > 0 ? "Backup issues detected" : "Backup health check complete",
        description: `${data.overall_health.tables_healthy} healthy, ${criticalCount} critical`,
        variant: criticalCount > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({
        title: "Error checking backup health",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'healthy': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Backup Monitoring</h2>
          <p className="text-muted-foreground">Database backup health and verification</p>
        </div>
        <Button onClick={runHealthCheck} disabled={checking}>
          {checking ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Database className="w-4 h-4 mr-2" />
          )}
          Check Backup Health
        </Button>
      </div>

      {backupHealth && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Last Backup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{backupHealth.overall_health.backup_age}</div>
                <Badge variant={getStatusColor(backupHealth.overall_health.backup_status)}>
                  {backupHealth.overall_health.backup_status}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Healthy Tables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{backupHealth.overall_health.tables_healthy}</div>
                <p className="text-xs text-muted-foreground">No issues detected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
                  Warning Tables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{backupHealth.overall_health.tables_warning}</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <XCircle className="w-4 h-4 mr-2 text-destructive" />
                  Critical Tables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{backupHealth.overall_health.tables_critical}</div>
                <p className="text-xs text-muted-foreground">Immediate action needed</p>
              </CardContent>
            </Card>
          </div>

          {backupHealth.overall_health.backup_status === 'critical' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Backup Issues</AlertTitle>
              <AlertDescription>
                Backup system requires immediate attention. Review table statuses below.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Table Status</CardTitle>
              <CardDescription>
                Last check: {new Date(backupHealth.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backupHealth.table_statuses.map((table, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(table.status)}
                      <div>
                        <p className="font-medium">{table.table}</p>
                        {table.message && (
                          <p className="text-sm text-muted-foreground">{table.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {table.record_count.toLocaleString()} records
                      </p>
                      {table.last_modified && (
                        <p className="text-xs text-muted-foreground">
                          Updated: {new Date(table.last_modified).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Total Records Backed Up</p>
                <p className="text-2xl font-bold">
                  {backupHealth.overall_health.total_records.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!backupHealth && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Check Backup Health</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Click the "Check Backup Health" button above to verify your database
              backup status and integrity.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
