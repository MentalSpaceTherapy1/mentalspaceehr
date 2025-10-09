import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, Calendar, FileText, RefreshCw, Activity, AlertTriangle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

interface AnalyticsData {
  totalPatients: number;
  activePatients: number;
  totalSessions: number;
  avgSessionsPerPatient: number;
  utilizationRate: number;
  noShowRate: number;
  totalAppointments: number;
  completedAppointments: number;
  noShowCount: number;
  avgPHQ9: number | null;
  avgGAD7: number | null;
  crisisEvents: number;
  calculatedAt: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function ClinicalAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<string>('monthly');
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: cached } = await supabase
        .from('clinical_analytics_cache')
        .select('*')
        .eq('metric_type', 'utilization')
        .eq('aggregation_period', period)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        setAnalytics(cached.metric_data as any);
      }
    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = async () => {
    setCalculating(true);
    try {
      const { error } = await supabase.functions.invoke('calculate-clinical-analytics', {
        body: { period }
      });

      if (error) throw error;

      toast({
        title: "Analytics calculated",
        description: "Clinical analytics have been recalculated successfully",
      });

      await loadAnalytics();
    } catch (error: any) {
      toast({
        title: "Error calculating analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Clinical Analytics</h2>
          <p className="text-muted-foreground">Comprehensive clinical performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={calculateAnalytics} disabled={calculating} variant="secondary">
            <Activity className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
            Calculate
          </Button>
          <Button onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalPatients}</div>
              <p className="text-xs text-muted-foreground">{analytics.activePatients} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {analytics.avgSessionsPerPatient.toFixed(1)} per patient
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Utilization Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.utilizationRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Appointment slots filled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                No-Show Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.noShowRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Missed appointments</p>
            </CardContent>
          </Card>
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Distribution</CardTitle>
              <CardDescription>Breakdown of appointment outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: analytics.completedAppointments },
                      { name: 'No Show', value: analytics.noShowCount },
                      { name: 'Other', value: analytics.totalAppointments - analytics.completedAppointments - analytics.noShowCount }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinical Outcomes</CardTitle>
              <CardDescription>Average assessment scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">PHQ-9 (Depression)</span>
                  <span className="text-sm text-muted-foreground">
                    {analytics.avgPHQ9 !== null ? analytics.avgPHQ9.toFixed(1) : 'N/A'}
                  </span>
                </div>
                {analytics.avgPHQ9 !== null && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(Number(analytics.avgPHQ9) / 27) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">GAD-7 (Anxiety)</span>
                  <span className="text-sm text-muted-foreground">
                    {analytics.avgGAD7 !== null ? analytics.avgGAD7.toFixed(1) : 'N/A'}
                  </span>
                </div>
                {analytics.avgGAD7 !== null && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-secondary h-2 rounded-full" 
                      style={{ width: `${(Number(analytics.avgGAD7) / 21) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              {analytics.crisisEvents > 0 && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Crisis Events</p>
                    <p className="text-xs text-muted-foreground">{analytics.crisisEvents} alerts triggered</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
