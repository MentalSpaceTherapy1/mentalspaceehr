import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Database,
  Shield,
  HardDrive,
  Zap,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface HealthCheckResult {
  service_name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  error_message?: string;
  metadata?: any;
  checked_at: string;
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime: number;
  error?: string;
}

const serviceIcons: Record<string, any> = {
  supabase_database: Database,
  supabase_auth: Shield,
  supabase_storage: HardDrive,
  edge_functions: Zap,
  critical_tables: Database,
  rls_policies: Shield,
  database_performance: Activity
};

export function IntegrationHealthDashboard() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadHealthStatus();
    
    // Set up real-time subscription for health logs
    const channel = supabase
      .channel('health-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'integration_health_logs'
        },
        () => {
          loadHealthStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadHealthStatus = async () => {
    try {
      setLoading(true);

      // Get the latest health check for each service
      const { data, error } = await supabase
        .from('integration_health_logs')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by service and get most recent for each
      const latestByService = new Map<string, any>();
      
      data?.forEach(log => {
        if (!latestByService.has(log.service_name)) {
          latestByService.set(log.service_name, log);
        }
      });

      const healthData: ServiceHealth[] = Array.from(latestByService.values()).map(log => ({
        service: log.service_name,
        status: log.status,
        lastCheck: log.checked_at,
        responseTime: log.response_time_ms,
        error: log.error_message
      }));

      setServices(healthData);

      // Calculate overall status
      const hasDown = healthData.some(s => s.status === 'down');
      const hasDegraded = healthData.some(s => s.status === 'degraded');
      setOverallStatus(hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy');

      if (healthData.length > 0) {
        setLastUpdate(new Date(healthData[0].lastCheck));
      }
    } catch (error) {
      console.error('Error loading health status:', error);
      toast.error('Failed to load health status');
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      setChecking(true);
      toast.info('Running integration health checks...');

      const { data, error } = await supabase.functions.invoke('integration-health-check');

      if (error) throw error;

      const summary = data?.summary || {};
      
      if (data?.overall_status === 'healthy') {
        toast.success(`Health check complete - all ${summary.total_checks} services healthy!`);
      } else if (data?.overall_status === 'degraded') {
        toast.warning(
          `Health check complete - ${summary.degraded} service(s) degraded`,
          { duration: 5000 }
        );
      } else {
        toast.error(
          `Health check complete - ${summary.down} service(s) down!`,
          { duration: 10000 }
        );
      }

      // Reload health status
      await loadHealthStatus();
    } catch (error) {
      console.error('Error running health check:', error);
      toast.error('Failed to run health check');
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'down':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getServiceLabel = (serviceName: string) => {
    const labels: Record<string, string> = {
      supabase_database: 'Database Connection',
      supabase_auth: 'Authentication Service',
      supabase_storage: 'Storage Service',
      edge_functions: 'Edge Functions',
      critical_tables: 'Critical Tables',
      rls_policies: 'Security Policies (RLS)',
      database_performance: 'Database Performance'
    };
    return labels[serviceName] || serviceName;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading health status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card className={`border-l-4 ${
        overallStatus === 'healthy' ? 'border-l-green-500' :
        overallStatus === 'degraded' ? 'border-l-yellow-500' :
        'border-l-red-500'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              <div>
                <CardTitle>System Health Status</CardTitle>
                <CardDescription>
                  {lastUpdate ? `Last checked ${formatDistanceToNow(lastUpdate, { addSuffix: true })}` : 'No recent checks'}
                </CardDescription>
              </div>
            </div>
            <Button onClick={runHealthCheck} disabled={checking} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Run Check'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold capitalize">{overallStatus}</div>
            <Badge variant={getStatusColor(overallStatus)} className="text-sm">
              {services.length} Services Monitored
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {overallStatus === 'down' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Issue Detected!</strong> Some services are currently down. 
            Immediate attention required. Check the service details below.
          </AlertDescription>
        </Alert>
      )}

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const Icon = serviceIcons[service.service] || Activity;
          
          return (
            <Card key={service.service} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {getServiceLabel(service.service)}
                    </CardTitle>
                  </div>
                  {getStatusIcon(service.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-mono">
                    {service.responseTime}ms
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Check</span>
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(service.lastCheck), { addSuffix: true })}
                  </span>
                </div>
                
                {service.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="text-xs">
                      {service.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {services.length === 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            No health checks have been run yet. Click "Run Check" to perform the first health check.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
