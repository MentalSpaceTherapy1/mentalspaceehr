import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Users, AlertCircle, RefreshCw, Download } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface KPIData {
  snapshot_date: string;
  total_active_patients: number;
  new_patients_count: number;
  total_appointments: number;
  completed_appointments: number;
  utilization_rate: number;
  total_revenue: number;
  outstanding_balance: number;
  collection_rate: number;
  active_providers: number;
  avg_caseload: number;
}

export function BusinessIntelligenceDashboard() {
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadKPIData();
  }, []);

  const loadKPIData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setKpiData((data || []).reverse());
    } catch (error: any) {
      toast({
        title: "Error loading KPI data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csv = [
      ['Date', 'Active Patients', 'New Patients', 'Utilization %', 'Revenue', 'Collection %', 'Avg Caseload'].join(','),
      ...kpiData.map(row => [
        row.snapshot_date,
        row.total_active_patients,
        row.new_patients_count,
        row.utilization_rate,
        row.total_revenue,
        row.collection_rate,
        row.avg_caseload
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const latestKPI = kpiData[kpiData.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Business Intelligence</h2>
          <p className="text-muted-foreground">Executive-level performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" disabled={kpiData.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadKPIData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {latestKPI && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Active Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestKPI.total_active_patients}</div>
              <p className="text-xs text-muted-foreground">
                +{latestKPI.new_patients_count} new this period
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
              <div className="text-2xl font-bold">{latestKPI.utilization_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {latestKPI.completed_appointments}/{latestKPI.total_appointments} appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${latestKPI.total_revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Collection rate: {latestKPI.collection_rate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Outstanding Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${latestKPI.outstanding_balance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {latestKPI.active_providers} active providers
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Growth Trend</CardTitle>
            <CardDescription>Active patients over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="snapshot_date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total_active_patients" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Active Patients"
                />
                <Line 
                  type="monotone" 
                  dataKey="new_patients_count" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="New Patients"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilization Rate</CardTitle>
            <CardDescription>Appointment utilization percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="snapshot_date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Bar 
                  dataKey="utilization_rate" 
                  fill="hsl(var(--primary))" 
                  name="Utilization %"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Total revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="snapshot_date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Metrics</CardTitle>
            <CardDescription>Average caseload per provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="snapshot_date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Bar 
                  dataKey="avg_caseload" 
                  fill="hsl(var(--secondary))" 
                  name="Avg Caseload"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
