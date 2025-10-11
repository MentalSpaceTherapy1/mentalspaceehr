/**
 * Claims Dashboard Component
 *
 * Comprehensive dashboard for viewing and managing insurance claims
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface Claim {
  id: string;
  claim_id: string;
  claim_control_number: string | null;
  payer_claim_control_number: string | null;
  claim_type: string;
  claim_status: string;
  client_id: string;
  billed_amount: number;
  allowed_amount: number | null;
  paid_amount: number | null;
  patient_responsibility: number | null;
  statement_from_date: string;
  statement_to_date: string;
  submission_date: string | null;
  accepted_date: string | null;
  paid_date: string | null;
  denial_code: string | null;
  denial_reason: string | null;
  created_at: string;
}

interface ClaimStats {
  total: number;
  draft: number;
  submitted: number;
  accepted: number;
  rejected: number;
  paid: number;
  denied: number;
  totalBilled: number;
  totalPaid: number;
  avgDaysToPay: number;
}

export function ClaimsDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<ClaimStats>({
    total: 0,
    draft: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
    paid: 0,
    denied: 0,
    totalBilled: 0,
    totalPaid: 0,
    avgDaysToPay: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [claims, searchQuery, statusFilter]);

  const fetchClaims = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('advancedmd_claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setClaims(data || []);
      calculateStats(data || []);
    } catch (err: any) {
      console.error('[ClaimsDashboard] Error:', err);
      setError(err.message || 'Failed to load claims');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (claimsData: Claim[]) => {
    const stats: ClaimStats = {
      total: claimsData.length,
      draft: claimsData.filter((c) => c.claim_status === 'Draft').length,
      submitted: claimsData.filter((c) => c.claim_status === 'Submitted').length,
      accepted: claimsData.filter((c) => c.claim_status === 'Accepted').length,
      rejected: claimsData.filter((c) => c.claim_status === 'Rejected').length,
      paid: claimsData.filter((c) => c.claim_status === 'Paid').length,
      denied: claimsData.filter((c) => c.claim_status === 'Denied').length,
      totalBilled: claimsData.reduce((sum, c) => sum + c.billed_amount, 0),
      totalPaid: claimsData.reduce((sum, c) => sum + (c.paid_amount || 0), 0),
      avgDaysToPay: 0,
    };

    // Calculate average days to pay
    const paidClaims = claimsData.filter((c) => c.paid_date && c.submission_date);
    if (paidClaims.length > 0) {
      const totalDays = paidClaims.reduce((sum, c) => {
        const submitted = new Date(c.submission_date!);
        const paid = new Date(c.paid_date!);
        const days = Math.floor((paid.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      stats.avgDaysToPay = Math.round(totalDays / paidClaims.length);
    }

    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...claims];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.claim_status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.claim_id.toLowerCase().includes(query) ||
          c.claim_control_number?.toLowerCase().includes(query) ||
          c.payer_claim_control_number?.toLowerCase().includes(query)
      );
    }

    setFilteredClaims(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Accepted':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'Rejected':
      case 'Denied':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Submitted':
      case 'In Process':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'Draft':
      case 'Ready':
        return <FileText className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Accepted':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Rejected':
      case 'Denied':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'Submitted':
      case 'In Process':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'Draft':
      case 'Ready':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button onClick={fetchClaims} variant="outline" size="sm" className="ml-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.draft} draft, {stats.submitted} submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</div>
            <p className="text-xs text-muted-foreground">Across all claims</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.paid} claims paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days to Pay</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDaysToPay}</div>
            <p className="text-xs text-muted-foreground">
              {stats.denied} denied, {stats.rejected} rejected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Claims Management</CardTitle>
              <CardDescription>View and manage all insurance claims</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchClaims}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by claim ID or control number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Ready">Ready</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="In Process">In Process</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Claims Table */}
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No claims found matching your filters</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Control Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Service Period</TableHead>
                    <TableHead>Billed</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium font-mono text-sm">
                        {claim.claim_id}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {claim.claim_control_number || (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(claim.claim_status)}
                          <Badge variant="outline" className={getStatusColor(claim.claim_status)}>
                            {claim.claim_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(claim.statement_from_date), 'MMM d')} -{' '}
                        {format(new Date(claim.statement_to_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(claim.billed_amount)}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(claim.paid_amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {claim.submission_date
                          ? format(new Date(claim.submission_date), 'MMM d, yyyy')
                          : 'Not submitted'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
