import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface PayerPerformance {
  payer_name: string;
  payer_id: string;
  total_claims: number;
  paid_claims: number;
  denied_claims: number;
  rejected_claims: number;
  total_billed: number;
  total_paid: number;
  collection_rate: number;
  denial_rate: number;
  avg_days_to_payment: number;
}

export function PayerPerformanceReport() {
  const [payers, setPayers] = useState<PayerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'collection_rate' | 'denial_rate' | 'total_billed'>('total_billed');

  useEffect(() => {
    loadReport();
  }, [sortBy]);

  const loadReport = async () => {
    try {
      setLoading(true);
      // TODO: This view will be created in Phase 5 database migration
      // Temporarily showing empty state
      setPayers([]);
    } catch (error) {
      console.error('Error loading payer performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Payer', 'Total Claims', 'Paid', 'Denied', 'Collection Rate', 'Denial Rate', 'Avg Days to Payment', 'Total Billed', 'Total Paid'];
    const rows = payers.map(p => [p.payer_name, p.total_claims, p.paid_claims, p.denied_claims, `${p.collection_rate}%`, `${p.denial_rate}%`, p.avg_days_to_payment, p.total_billed, p.total_paid]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payer-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payer Performance Analysis</CardTitle>
            <CardDescription>Comparative metrics across insurance payers</CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              className="h-10 px-3 rounded-md border border-input bg-background"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="total_billed">Sort by Volume</option>
              <option value="collection_rate">Sort by Collection Rate</option>
              <option value="denial_rate">Sort by Denial Rate</option>
            </select>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payer Name</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead className="text-right">Total Billed</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead>Collection Rate</TableHead>
              <TableHead>Denial Rate</TableHead>
              <TableHead className="text-right">Avg Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payers.map((payer) => (
              <TableRow key={payer.payer_id}>
                <TableCell className="font-medium">{payer.payer_name}</TableCell>
                <TableCell className="text-right">
                  <div>{payer.total_claims}</div>
                  <div className="text-xs text-muted-foreground">
                    {payer.paid_claims} paid, {payer.denied_claims} denied
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(payer.total_billed)}</TableCell>
                <TableCell className="text-right">{formatCurrency(payer.total_paid)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={payer.collection_rate} className="w-16" />
                    <span className="text-sm font-medium">{payer.collection_rate}%</span>
                    {payer.collection_rate >= 90 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={payer.denial_rate} className="w-16" />
                    <span className="text-sm font-medium">{payer.denial_rate}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{Math.round(payer.avg_days_to_payment)} days</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
