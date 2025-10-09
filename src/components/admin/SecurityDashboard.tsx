import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Activity } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  recommendation: string;
  affected_resource?: string;
}

interface AuditResult {
  timestamp: string;
  total_issues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  issues: SecurityIssue[];
}

export function SecurityDashboard() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const runSecurityAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-audit');

      if (error) throw error;

      setAuditResult(data);
      
      const criticalCount = data.critical || 0;
      toast({
        title: criticalCount > 0 ? "Security issues found" : "Security audit complete",
        description: `Found ${data.total_issues} issues (${criticalCount} critical)`,
        variant: criticalCount > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({
        title: "Error running security audit",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <Activity className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive security audit and monitoring</p>
        </div>
        <Button onClick={runSecurityAudit} disabled={running}>
          {running ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          Run Security Audit
        </Button>
      </div>

      {auditResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <XCircle className="w-4 h-4 mr-2 text-destructive" />
                  Critical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditResult.critical}</div>
                <p className="text-xs text-muted-foreground">Immediate action required</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-destructive" />
                  High
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditResult.high}</div>
                <p className="text-xs text-muted-foreground">Address soon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
                  Medium
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditResult.medium}</div>
                <p className="text-xs text-muted-foreground">Plan remediation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Low
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditResult.low}</div>
                <p className="text-xs text-muted-foreground">Monitor and track</p>
              </CardContent>
            </Card>
          </div>

          {auditResult.critical > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Security Issues Detected</AlertTitle>
              <AlertDescription>
                {auditResult.critical} critical security issue(s) require immediate attention.
                Review and remediate these issues before production deployment.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Security Issues</CardTitle>
              <CardDescription>
                Last scan: {new Date(auditResult.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditResult.issues.map((issue, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(issue.severity)}
                      <Badge variant={getSeverityColor(issue.severity)}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{issue.category}</span>
                    </div>
                    {issue.affected_resource && (
                      <Badge variant="outline">{issue.affected_resource}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{issue.issue}</p>
                  <p className="text-sm text-muted-foreground">{issue.recommendation}</p>
                </div>
              ))}

              {auditResult.issues.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p className="text-lg font-medium">No security issues found</p>
                  <p className="text-sm text-muted-foreground">
                    Your system passed all security checks
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!auditResult && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Run Security Audit</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Click the "Run Security Audit" button above to perform a comprehensive
              security assessment of your system.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
