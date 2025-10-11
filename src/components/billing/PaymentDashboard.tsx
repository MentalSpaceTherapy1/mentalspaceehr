import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (date: string | Date) => format(new Date(date), 'MMM d, yyyy');
const sb = supabase as any;

interface PaymentStats {
  totalEraFiles: number;
  claimsPosted: number;
  totalPosted: number;
  avgPostingDelayDays: number;
  pendingPostings: number;
  insurancePayments: number;
  patientPayments: number;
}

interface RecentPayment {
  id: string;
  claim_id: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  posting_type: string;
  posting_status: string;
  patient_name?: string;
}

interface ERAFileRecord {
  id: string;
  file_name: string;
  payment_date: string;
  payment_amount: number;
  processing_status: string;
  total_claims: number;
  claims_posted: number;
  claims_failed: number;
  created_at: string;
}

export function PaymentDashboard() {
  const [stats, setStats] = useState<PaymentStats>({
    totalEraFiles: 0,
    claimsPosted: 0,
    totalPosted: 0,
    avgPostingDelayDays: 0,
    pendingPostings: 0,
    insurancePayments: 0,
    patientPayments: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [eraFiles, setERAFiles] = useState<ERAFileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load payment stats
      const { data: statsData } = await sb
        .from('payment_dashboard_stats')
        .select('*')
        .single();

      if (statsData) {
        setStats({
          totalEraFiles: statsData.total_era_files || 0,
          claimsPosted: statsData.claims_posted || 0,
          totalPosted: statsData.total_posted || 0,
          avgPostingDelayDays: Math.round(statsData.avg_posting_delay_days || 0),
          pendingPostings: statsData.pending_postings || 0,
          insurancePayments: statsData.insurance_payments || 0,
          patientPayments: statsData.patient_payments || 0,
        });
      }

      // Load recent payments
      const { data: paymentsData } = await sb
        .from('advancedmd_payment_postings')
        .select(
          `
          id,
          claim_id,
          payment_date,
          payment_amount,
          payment_method,
          posting_type,
          posting_status,
          advancedmd_claims (
            clients (
              first_name,
              last_name
            )
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsData) {
        setRecentPayments(
          paymentsData.map((p: any) => ({
            id: p.id,
            claim_id: p.claim_id,
            payment_date: p.payment_date,
            payment_amount: p.payment_amount,
            payment_method: p.payment_method,
            posting_type: p.posting_type,
            posting_status: p.posting_status,
            patient_name: p.advancedmd_claims?.clients
              ? `${p.advancedmd_claims.clients.first_name} ${p.advancedmd_claims.clients.last_name}`
              : undefined,
          }))
        );
      }

      // Load ERA files
      const { data: eraFilesData } = await sb
        .from('advancedmd_era_files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (eraFilesData) {
        setERAFiles(eraFilesData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
      Posted: 'success',
      Pending: 'secondary',
      Reversed: 'destructive',
      Error: 'destructive',
      'Partially Posted': 'secondary',
    };

    return (
      <Badge variant={statusColors[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading payment data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posted</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPosted)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.claimsPosted} claims posted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insurance Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.insurancePayments)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalEraFiles} ERA files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.patientPayments)}</div>
            <p className="text-xs text-muted-foreground">Direct patient payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Posting Delay</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPostingDelayDays} days</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPostings} pending postings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">
            <FileText className="h-4 w-4 mr-2" />
            Recent Payments
          </TabsTrigger>
          <TabsTrigger value="era">
            <TrendingUp className="h-4 w-4 mr-2" />
            ERA Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payment Postings</CardTitle>
              <CardDescription>Latest payment postings from ERA and manual entry</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No payment postings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell className="font-medium">
                          {payment.patient_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{payment.posting_type}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.payment_amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.posting_status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="era" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ERA File Processing History</CardTitle>
              <CardDescription>
                Electronic Remittance Advice files processed in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Claims</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eraFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No ERA files processed yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    eraFiles.map((era) => (
                      <TableRow key={era.id}>
                        <TableCell className="font-medium">{era.file_name}</TableCell>
                        <TableCell>
                          {era.payment_date ? formatDate(era.payment_date) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(era.payment_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">{era.claims_posted || 0}</span>
                            <span className="text-muted-foreground">/</span>
                            <span>{era.total_claims || 0}</span>
                            {era.claims_failed > 0 && (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(era.processing_status)}</TableCell>
                        <TableCell>{formatDate(era.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
