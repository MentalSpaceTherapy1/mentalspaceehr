import { useState, useEffect } from 'react';
import { Calendar, Download, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AgingClaim {
  id: string;
  claim_id: string;
  patient_name: string;
  service_date: string;
  submission_date: string;
  billed_amount: number;
  paid_amount: number;
  balance: number;
  claim_status: string;
  payer_name: string;
  days_outstanding: number;
  aging_bucket: string;
}

interface AgingSummary {
  aging_bucket: string;
  claim_count: number;
  total_amount: number;
  percentage: number;
}

export function ClaimsAgingReport() {
  const [claims, setClaims] = useState<AgingClaim[]>([]);
  const [summary, setSummary] = useState<AgingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBucket, setFilterBucket] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    loadReport();
  }, [filterBucket, dateRange]);

  const loadReport = async () => {
    try {
      setLoading(true);
      // TODO: These tables/views will be created in Phase 5 database migration
      // Temporarily showing empty state
      setClaims([]);
      setSummary([]);
    } catch (error) {
      console.error('Error loading aging report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Claim ID',
      'Patient',
      'Service Date',
      'Submission Date',
      'Payer',
      'Billed',
      'Paid',
      'Balance',
      'Days Outstanding',
      'Status',
      'Aging Bucket',
    ];

    const rows = claims.map((claim) => [
      claim.claim_id,
      claim.patient_name,
      claim.service_date,
      claim.submission_date,
      claim.payer_name,
      claim.billed_amount,
      claim.paid_amount,
      claim.balance,
      claim.days_outstanding,
      claim.claim_status,
      claim.aging_bucket,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claims-aging-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (bucket: string) => {
    const colorMap: Record<string, string> = {
      '0-30': 'bg-green-100 text-green-800',
      '31-60': 'bg-yellow-100 text-yellow-800',
      '61-90': 'bg-orange-100 text-orange-800',
      '91-120': 'bg-red-100 text-red-800',
      '120+': 'bg-red-200 text-red-900',
    };
    return colorMap[bucket] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalAR = claims.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {summary.map((item) => (
          <Card key={item.aging_bucket}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{item.aging_bucket}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(item.total_amount)}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>{item.claim_count} claims</span>
                <span>{item.percentage}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Claims Aging Report</CardTitle>
              <CardDescription>
                Outstanding claims by aging bucket - Total AR: {formatCurrency(totalAR)}
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Aging Bucket</Label>
              <select
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                value={filterBucket}
                onChange={(e) => setFilterBucket(e.target.value)}
              >
                <option value="all">All Buckets</option>
                <option value="0-30">0-30 days</option>
                <option value="31-60">31-60 days</option>
                <option value="61-90">61-90 days</option>
                <option value="91-120">91-120 days</option>
                <option value="120+">120+ days</option>
              </select>
            </div>
            <div className="flex-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setDateRange({ start: '', end: '' });
                setFilterBucket('all');
              }}
            >
              Clear Filters
            </Button>
          </div>

          {/* Claims Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service Date</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No claims found matching filters
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.claim_id}</TableCell>
                      <TableCell>{claim.patient_name}</TableCell>
                      <TableCell>{formatDate(claim.service_date)}</TableCell>
                      <TableCell>{claim.payer_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(claim.billed_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(claim.paid_amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(claim.balance)}
                      </TableCell>
                      <TableCell className="text-right">{claim.days_outstanding}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(claim.aging_bucket)}>
                          {claim.aging_bucket}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{claim.claim_status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Stats */}
          {claims.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {claims.length} claim{claims.length !== 1 ? 's' : ''}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">Total Outstanding</div>
                <div className="text-2xl font-bold">{formatCurrency(totalAR)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
