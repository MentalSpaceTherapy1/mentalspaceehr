import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  execution_time_ms: number;
  timestamp: string;
}

interface SystemHealth {
  id: string;
  metric_timestamp: string;
  database_connections: number;
  avg_query_time_ms: number;
  slow_query_count: number;
  error_rate: number;
  active_users: number;
  health_status: 'healthy' | 'degraded' | 'critical';
  overall_health_score: number;
}

interface SlowQuery {
  id: string;
  query_text: string;
  execution_time_ms: number;
  executed_at: string;
  table_names: string[];
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadSystemHealth(),
        loadSlowQueries(),
      ]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    const hoursAgo = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) throw error;
    setMetrics((data || []) as PerformanceMetric[]);
  };

  const loadSystemHealth = async () => {
    const { data, error } = await supabase
      .from('system_health_metrics')
      .select('*')
      .order('metric_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    setSystemHealth(data as SystemHealth | null);
  };

  const loadSlowQueries = async () => {
    const { data, error } = await supabase
      .from('slow_query_log')
      .select('*')
      .order('execution_time_ms', { ascending: false })
      .limit(10);

    if (error) throw error;
    setSlowQueries((data || []) as SlowQuery[]);
  };

  // Calculate statistics
  const stats = {
    avgResponseTime: metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + Number(m.execution_time_ms), 0) / metrics.length)
      : 0,
    slowQueries: metrics.filter(m => Number(m.execution_time_ms) > 500).length,
    totalRequests: metrics.length,
    healthScore: systemHealth?.overall_health_score || 100,
  };

  // Prepare chart data
  const chartData = metrics
    .reduce((acc: any[], metric) => {
      const hour = new Date(metric.timestamp).getHours();
      const existing = acc.find(item => item.hour === hour);
      if (existing) {
        existing.count++;
        existing.total += Number(metric.execution_time_ms);
        existing.avg = existing.total / existing.count;
      } else {
        acc.push({
          hour,
          count: 1,
          total: Number(metric.execution_time_ms),
          avg: Number(metric.execution_time_ms),
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.hour - b.hour);

  const getHealthBadge = (status: string, score: number) => {
    if (status === 'healthy') {
      return <Badge className="bg-green-500">Healthy ({score})</Badge>;
    }
    if (status === 'degraded') {
      return <Badge className="bg-yellow-500">Degraded ({score})</Badge>;
    }
    return <Badge variant="destructive">Critical ({score})</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time system performance monitoring and optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeRange === '1h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('1h')}
          >
            1H
          </Button>
          <Button
            variant={timeRange === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('24h')}
          >
            24H
          </Button>
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7D
          </Button>
          <Button onClick={loadData} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Health
              </span>
              {getHealthBadge(systemHealth.health_status, systemHealth.overall_health_score)}
            </CardTitle>
            <CardDescription>
              Last updated: {format(new Date(systemHealth.metric_timestamp), 'MMM d, yyyy HH:mm:ss')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="text-2xl font-bold">{systemHealth.active_users}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Query Time</div>
                <div className="text-2xl font-bold">{Math.round(systemHealth.avg_query_time_ms)}ms</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Slow Queries</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {systemHealth.slow_query_count}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
                <div className="text-2xl font-bold">
                  {(systemHealth.error_rate * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgResponseTime < 200 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Excellent
                </span>
              ) : stats.avgResponseTime < 500 ? (
                <span className="text-yellow-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Good
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Needs attention
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In last {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.slowQueries}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.slowQueries / stats.totalRequests) * 100).toFixed(1)}% of requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.healthScore}/100</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall system health
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="slow-queries">Slow Queries</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Average Response Time by Hour</CardTitle>
              <CardDescription>Query performance trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg" stroke="#8884d8" name="Avg Response Time (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slow-queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Slowest Queries
              </CardTitle>
              <CardDescription>Queries taking longer than 500ms</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Tables</TableHead>
                    <TableHead>Execution Time</TableHead>
                    <TableHead>Executed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowQueries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No slow queries detected
                      </TableCell>
                    </TableRow>
                  ) : (
                    slowQueries.map((query) => (
                      <TableRow key={query.id}>
                        <TableCell className="font-mono text-sm max-w-md truncate">
                          {query.query_text}
                        </TableCell>
                        <TableCell>
                          {query.table_names?.join(', ') || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={query.execution_time_ms > 1000 ? 'destructive' : 'secondary'}>
                            {Math.round(query.execution_time_ms)}ms
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(query.executed_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance Metrics</CardTitle>
              <CardDescription>Last {metrics.length} requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Execution Time</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.slice(0, 50).map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell>
                        <Badge variant="outline">{metric.metric_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{metric.metric_name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            Number(metric.execution_time_ms) > 500
                              ? 'destructive'
                              : Number(metric.execution_time_ms) > 200
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {Math.round(Number(metric.execution_time_ms))}ms
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(metric.timestamp), 'MMM d, HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
