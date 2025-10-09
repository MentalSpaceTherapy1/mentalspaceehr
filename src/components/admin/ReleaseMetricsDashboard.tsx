import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ReleaseMetrics {
  id: string;
  release_id: string;
  release_date: string;
  collected_at: string;
  deployment_metrics: any;
  stability_metrics: any;
  user_impact: any;
  data_quality: any;
  security: any;
}

const MetricCard = ({ 
  title, 
  value, 
  target, 
  unit = '', 
  trend 
}: { 
  title: string; 
  value: number; 
  target?: number; 
  unit?: string; 
  trend?: 'up' | 'down' | 'neutral';
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getStatusColor = () => {
    if (!target) return 'text-foreground';
    return value >= target ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          {title}
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getStatusColor()}`}>
          {value.toFixed(value < 10 ? 1 : 0)}{unit}
        </div>
        {target && (
          <p className="text-xs text-muted-foreground mt-1">
            Target: {target}{unit}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const ReleaseMetricsDashboard = () => {
  const [metrics, setMetrics] = useState<ReleaseMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [newReleaseId, setNewReleaseId] = useState('');
  const [newReleaseDate, setNewReleaseDate] = useState('');
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('release_metrics')
        .select('*')
        .order('release_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMetrics(data || []);
    } catch (error: any) {
      console.error('Error fetching release metrics:', error);
      toast({
        title: 'Error loading metrics',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const collectMetrics = async () => {
    if (!newReleaseId.trim()) {
      toast({
        title: 'Release ID required',
        description: 'Please enter a release ID',
        variant: 'destructive',
      });
      return;
    }

    setIsCollecting(true);
    try {
      const { error } = await supabase.functions.invoke('collect-release-metrics', {
        body: {
          release_id: newReleaseId.trim(),
          release_date: newReleaseDate || new Date().toISOString(),
        },
      });

      if (error) throw error;

      toast({
        title: 'Metrics collected successfully',
        description: `Metrics for release ${newReleaseId} have been collected`,
      });

      setNewReleaseId('');
      setNewReleaseDate('');
      await fetchMetrics();
    } catch (error: any) {
      console.error('Error collecting metrics:', error);
      toast({
        title: 'Error collecting metrics',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCollecting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `# Post-Release Review for ${newReleaseId || '[Release ID]'}

## Release Information
- Release ID: ${newReleaseId || '[Enter ID]'}
- Release Date: ${newReleaseDate || '[Enter Date]'}
- Release Manager: [Enter Name]
- Review Date: ${new Date().toISOString().split('T')[0]}

[Complete the rest of the template from POST_RELEASE_REVIEW_TEMPLATE.md]
`;

    const blob = new Blob([template], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post-release-review-${newReleaseId || 'template'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const latestMetrics = metrics[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Collection Dialog */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Release Metrics</h2>
          <p className="text-muted-foreground">
            Automated metrics collection for post-release reviews
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Activity className="mr-2 h-4 w-4" />
              Collect Metrics
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Collect Release Metrics</DialogTitle>
              <DialogDescription>
                Automatically collect metrics for a new release
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="release_id">Release ID *</Label>
                <Input
                  id="release_id"
                  placeholder="e.g., v1.2.3 or RELEASE-2025-01-09"
                  value={newReleaseId}
                  onChange={(e) => setNewReleaseId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="release_date">Release Date (Optional)</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={newReleaseDate}
                  onChange={(e) => setNewReleaseDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={collectMetrics} 
                  disabled={isCollecting}
                  className="flex-1"
                >
                  {isCollecting ? 'Collecting...' : 'Collect Metrics'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Latest Metrics Summary */}
      {latestMetrics && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Latest Release: {latestMetrics.release_id}
            </h3>
            <Badge>
              {new Date(latestMetrics.release_date).toLocaleDateString()}
            </Badge>
          </div>

          {/* Stability Metrics */}
          <div>
            <h4 className="text-sm font-medium mb-3">Stability Metrics (48 Hours)</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Uptime"
                value={latestMetrics.stability_metrics?.uptime_percentage || 0}
                target={99.9}
                unit="%"
                trend="up"
              />
              <MetricCard
                title="Error Rate"
                value={(latestMetrics.stability_metrics?.error_rate || 0) * 100}
                target={0.1}
                unit="%"
                trend="down"
              />
              <MetricCard
                title="Avg Response Time"
                value={latestMetrics.stability_metrics?.avg_response_time_ms || 0}
                target={500}
                unit="ms"
              />
              <MetricCard
                title="DB Query Time"
                value={latestMetrics.stability_metrics?.db_query_time_ms || 0}
                target={200}
                unit="ms"
              />
            </div>
          </div>

          {/* User Impact */}
          <div>
            <h4 className="text-sm font-medium mb-3">User Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Active Users"
                value={latestMetrics.user_impact?.active_users || 0}
              />
              <MetricCard
                title="Reported Issues"
                value={latestMetrics.user_impact?.user_reported_issues || 0}
              />
              <MetricCard
                title="Support Tickets"
                value={latestMetrics.user_impact?.support_tickets || 0}
              />
            </div>
          </div>

          {/* Data Quality */}
          <div>
            <h4 className="text-sm font-medium mb-3">Data Quality</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Checks Passed"
                value={latestMetrics.data_quality?.checks_passed || 0}
              />
              <MetricCard
                title="Completeness"
                value={latestMetrics.data_quality?.completeness_percentage || 0}
                target={99}
                unit="%"
              />
              <MetricCard
                title="RLS Violations"
                value={latestMetrics.data_quality?.rls_violations || 0}
                target={0}
              />
            </div>
          </div>

          {/* Security */}
          <div>
            <h4 className="text-sm font-medium mb-3">Security</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Linter Warnings"
                value={latestMetrics.security?.linter_warnings || 0}
                target={0}
              />
              <MetricCard
                title="Failed Auth"
                value={latestMetrics.security?.failed_auth_attempts || 0}
              />
              <MetricCard
                title="Suspicious Access"
                value={latestMetrics.security?.suspicious_access_patterns || 0}
                target={0}
              />
            </div>
          </div>
        </>
      )}

      {/* Historical Releases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Release History</CardTitle>
          <CardDescription>
            Historical metrics for previous releases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Uptime</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
                <TableHead className="text-right">Active Users</TableHead>
                <TableHead className="text-right">Data Quality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No release metrics collected yet. Click "Collect Metrics" to start.
                  </TableCell>
                </TableRow>
              ) : (
                metrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell className="font-medium">{metric.release_id}</TableCell>
                    <TableCell>
                      {new Date(metric.release_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(metric.stability_metrics?.uptime_percentage || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {((metric.stability_metrics?.error_rate || 0) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.user_impact?.active_users || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {(metric.data_quality?.completeness_percentage || 0).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
