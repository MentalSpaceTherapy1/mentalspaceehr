import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const supabase = createClient();

interface RevenueCycleMetric {
  month: string;
  claims_count: number;
  charges: number;
  collections: number;
  denials: number;
  contractual_adjustments: number;
  net_collection_rate: number;
  denial_rate: number;
  avg_days_to_payment: number;
  avg_days_to_submission: number;
  outstanding_ar: number;
}

interface ARAgingSummary {
  total_claims: number;
  total_ar: number;
  ar_0_30: number;
  ar_31_60: number;
  ar_61_90: number;
  ar_91_120: number;
  ar_over_120: number;
  avg_days_in_ar: number;
}

export function RevenueCycleDashboard() {
  const [metrics, setMetrics] = useState<RevenueCycleMetric[]>([]);
  const [arSummary, setARSummary] = useState<ARAgingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Load revenue cycle metrics
      const { data: metricsData } = await supabase
        .from('revenue_cycle_metrics')
        .select('*')
        .order('month', { ascending: true })
        .limit(12);

      if (metricsData) {
        setMetrics(metricsData.map((m: any) => ({
          ...m,
          month: new Date(m.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        })));
      }

      // Load AR aging summary
      const { data: arData } = await supabase
        .from('ar_aging_summary')
        .select('*')
        .single();

      if (arData) {
        setARSummary(arData);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const latestMetric = metrics[metrics.length - 1];
  const arAgingData = arSummary ? [
    { name: '0-30', value: arSummary.ar_0_30, color: '#22c55e' },
    { name: '31-60', value: arSummary.ar_31_60, color: '#eab308' },
    { name: '61-90', value: arSummary.ar_61_90, color: '#f97316' },
    { name: '91-120', value: arSummary.ar_91_120, color: '#ef4444' },
    { name: '120+', value: arSummary.ar_over_120, color: '#991b1b' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestMetric?.net_collection_rate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 95%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total AR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(arSummary?.total_ar || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {arSummary?.total_claims || 0} open claims
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Days in AR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(arSummary?.avg_days_in_ar || 0)} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt;45 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Denial Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestMetric?.denial_rate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt;5%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Charges vs Collections</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="charges" stroke="#8b5cf6" name="Charges" />
                <Line type="monotone" dataKey="collections" stroke="#22c55e" name="Collections" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AR Aging Distribution</CardTitle>
            <CardDescription>Accounts receivable by age</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={arAgingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance Metrics</CardTitle>
          <CardDescription>Key revenue cycle indicators by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Claims</th>
                  <th className="text-right p-2">Charges</th>
                  <th className="text-right p-2">Collections</th>
                  <th className="text-right p-2">Collection %</th>
                  <th className="text-right p-2">Denial %</th>
                  <th className="text-right p-2">Days to Pay</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(-6).reverse().map((metric, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{metric.month}</td>
                    <td className="text-right p-2">{metric.claims_count}</td>
                    <td className="text-right p-2">{formatCurrency(metric.charges)}</td>
                    <td className="text-right p-2">{formatCurrency(metric.collections)}</td>
                    <td className="text-right p-2">{metric.net_collection_rate}%</td>
                    <td className="text-right p-2">{metric.denial_rate}%</td>
                    <td className="text-right p-2">{Math.round(metric.avg_days_to_payment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
