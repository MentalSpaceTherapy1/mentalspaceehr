import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle, 
  FileText, Users, Download, Calendar 
} from "lucide-react";
import { format, differenceInDays, subDays } from "date-fns";
import { toast } from "sonner";

interface MetricsData {
  totalCosignatures: number;
  pendingCount: number;
  cosignedCount: number;
  overdueCount: number;
  averageTimeToSign: number;
  complianceRate: number;
  revisionRate: number;
  timeRangeData: any[];
  statusDistribution: any[];
  supervisorPerformance: any[];
  clinicianPerformance: any[];
}

export function CosignMetricsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('all');
  const [supervisors, setSupervisors] = useState<any[]>([]);

  const COLORS = {
    cosigned: '#10b981',
    pending: '#f59e0b',
    overdue: '#ef4444',
    revisions: '#8b5cf6',
  };

  useEffect(() => {
    fetchMetrics();
    fetchSupervisors();
  }, [timeRange, selectedSupervisor]);

  const fetchSupervisors = async () => {
    try {
      const { data: relationships } = await supabase
        .from('supervision_relationships')
        .select('supervisor_id, supervisor:profiles!supervision_relationships_supervisor_id_fkey(id, first_name, last_name)')
        .eq('status', 'Active');

      if (relationships) {
        const uniqueSupervisors = Array.from(
          new Map(
            relationships.map(r => [
              r.supervisor_id,
              r.supervisor
            ])
          ).values()
        );
        setSupervisors(uniqueSupervisors as any[]);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const startDate = subDays(new Date(), parseInt(timeRange));

      let query = supabase
        .from('note_cosignatures')
        .select('*')
        .gte('created_date', startDate.toISOString());

      if (selectedSupervisor !== 'all') {
        query = query.eq('supervisor_id', selectedSupervisor);
      }

      const { data: cosignatures, error } = await query;

      if (error) throw error;

      if (!cosignatures || cosignatures.length === 0) {
        setMetrics({
          totalCosignatures: 0,
          pendingCount: 0,
          cosignedCount: 0,
          overdueCount: 0,
          averageTimeToSign: 0,
          complianceRate: 0,
          revisionRate: 0,
          timeRangeData: [],
          statusDistribution: [],
          supervisorPerformance: [],
          clinicianPerformance: [],
        });
        setLoading(false);
        return;
      }

      // Calculate metrics
      const totalCosignatures = cosignatures.length;
      const cosignedCount = cosignatures.filter(c => c.status === 'Cosigned').length;
      const pendingCount = cosignatures.filter(c => 
        ['Pending', 'Pending Review', 'Under Review'].includes(c.status)
      ).length;
      const overdueCount = cosignatures.filter(c => c.status === 'Overdue').length;
      const revisionCount = cosignatures.filter(c => c.revisions_requested).length;

      // Average time to sign (in days)
      const signedNotes = cosignatures.filter(c => 
        c.status === 'Cosigned' && c.submitted_for_cosign_date && c.supervisor_cosigned_date
      );
      const averageTimeToSign = signedNotes.length > 0
        ? signedNotes.reduce((sum, c) => {
            const submitted = new Date(c.submitted_for_cosign_date);
            const signed = new Date(c.supervisor_cosigned_date);
            return sum + differenceInDays(signed, submitted);
          }, 0) / signedNotes.length
        : 0;

      // Compliance rate (cosigned within due date)
      const complianceRate = totalCosignatures > 0
        ? ((cosignedCount / totalCosignatures) * 100)
        : 0;

      // Revision rate
      const revisionRate = totalCosignatures > 0
        ? ((revisionCount / totalCosignatures) * 100)
        : 0;

      // Status distribution
      const statusDistribution = [
        { name: 'Cosigned', value: cosignedCount, color: COLORS.cosigned },
        { name: 'Pending', value: pendingCount, color: COLORS.pending },
        { name: 'Overdue', value: overdueCount, color: COLORS.overdue },
        { name: 'Revisions', value: revisionCount, color: COLORS.revisions },
      ];

      // Time range data (daily counts)
      const timeRangeData = generateTimeRangeData(cosignatures, parseInt(timeRange));

      // Supervisor performance
      const supervisorPerformance = calculateSupervisorPerformance(cosignatures);

      // Clinician performance
      const clinicianPerformance = calculateClinicianPerformance(cosignatures);

      setMetrics({
        totalCosignatures,
        pendingCount,
        cosignedCount,
        overdueCount,
        averageTimeToSign,
        complianceRate,
        revisionRate,
        timeRangeData,
        statusDistribution,
        supervisorPerformance,
        clinicianPerformance,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeRangeData = (cosignatures: any[], days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      
      const dayData = cosignatures.filter(c => {
        const createdDate = new Date(c.created_date);
        return format(createdDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      data.push({
        date: dateStr,
        submitted: dayData.length,
        cosigned: dayData.filter(c => c.status === 'Cosigned').length,
        overdue: dayData.filter(c => c.status === 'Overdue').length,
      });
    }
    return data;
  };

  const calculateSupervisorPerformance = (cosignatures: any[]) => {
    const supervisorMap = new Map();
    
    cosignatures.forEach(c => {
      if (!supervisorMap.has(c.supervisor_id)) {
        supervisorMap.set(c.supervisor_id, {
          supervisorId: c.supervisor_id,
          total: 0,
          cosigned: 0,
          avgTime: [],
        });
      }

      const data = supervisorMap.get(c.supervisor_id);
      data.total++;
      
      if (c.status === 'Cosigned') {
        data.cosigned++;
        if (c.submitted_for_cosign_date && c.supervisor_cosigned_date) {
          const days = differenceInDays(
            new Date(c.supervisor_cosigned_date),
            new Date(c.submitted_for_cosign_date)
          );
          data.avgTime.push(days);
        }
      }
    });

    return Array.from(supervisorMap.values()).map(d => ({
      supervisorId: d.supervisorId,
      total: d.total,
      cosigned: d.cosigned,
      rate: ((d.cosigned / d.total) * 100).toFixed(1),
      avgDays: d.avgTime.length > 0
        ? (d.avgTime.reduce((a: number, b: number) => a + b, 0) / d.avgTime.length).toFixed(1)
        : '0',
    }));
  };

  const calculateClinicianPerformance = (cosignatures: any[]) => {
    const clinicianMap = new Map();
    
    cosignatures.forEach(c => {
      if (!clinicianMap.has(c.clinician_id)) {
        clinicianMap.set(c.clinician_id, {
          clinicianId: c.clinician_id,
          total: 0,
          cosigned: 0,
          revisions: 0,
        });
      }

      const data = clinicianMap.get(c.clinician_id);
      data.total++;
      
      if (c.status === 'Cosigned') {
        data.cosigned++;
      }
      if (c.revisions_requested) {
        data.revisions++;
      }
    });

    return Array.from(clinicianMap.values()).map(d => ({
      clinicianId: d.clinicianId,
      total: d.total,
      cosigned: d.cosigned,
      revisions: d.revisions,
      rate: ((d.cosigned / d.total) * 100).toFixed(1),
      revisionRate: ((d.revisions / d.total) * 100).toFixed(1),
    }));
  };

  const handleExport = () => {
    if (!metrics) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Cosignatures', metrics.totalCosignatures],
      ['Cosigned', metrics.cosignedCount],
      ['Pending', metrics.pendingCount],
      ['Overdue', metrics.overdueCount],
      ['Average Time to Sign (days)', metrics.averageTimeToSign.toFixed(1)],
      ['Compliance Rate (%)', metrics.complianceRate.toFixed(1)],
      ['Revision Rate (%)', metrics.revisionRate.toFixed(1)],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cosignature-metrics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast.success('Metrics exported successfully');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Co-Signature Metrics</h2>
          <p className="text-muted-foreground">Performance and compliance analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Supervisors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Supervisors</SelectItem>
              {supervisors.map((sup: any) => (
                <SelectItem key={sup.id} value={sup.id}>
                  {sup.first_name} {sup.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cosignatures</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCosignatures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Sign</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageTimeToSign.toFixed(1)} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.averageTimeToSign < 3 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" /> Excellent
                </span>
              ) : (
                <span className="text-amber-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> Monitor
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.complianceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.cosignedCount} of {metrics.totalCosignatures} cosigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Notes</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and detailed metrics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cosignature Trends</CardTitle>
              <CardDescription>Daily submission and completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.timeRangeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="submitted" stroke="#8b5cf6" name="Submitted" />
                  <Line type="monotone" dataKey="cosigned" stroke="#10b981" name="Cosigned" />
                  <Line type="monotone" dataKey="overdue" stroke="#ef4444" name="Overdue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Current cosignature status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {metrics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revision Analysis</CardTitle>
                <CardDescription>Revision request metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Revision Rate</p>
                  <p className="text-3xl font-bold">{metrics.revisionRate.toFixed(1)}%</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Revisions</span>
                    <Badge variant="secondary">
                      {metrics.statusDistribution.find(s => s.name === 'Revisions')?.value || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <Badge variant="outline">{metrics.pendingCount}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Overdue</span>
                    <Badge variant="destructive">{metrics.overdueCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supervisor Performance</CardTitle>
              <CardDescription>Cosignature completion metrics by supervisor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.supervisorPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="supervisorId" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#8b5cf6" name="Total" />
                  <Bar dataKey="cosigned" fill="#10b981" name="Cosigned" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
