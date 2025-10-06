import { useState } from 'react';
import { useInsuranceClaims } from '@/hooks/useInsuranceClaims';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function InsuranceClaims() {
  const { claims, isLoading } = useInsuranceClaims();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredClaims = claims?.filter((claim) => {
    const matchesSearch = 
      claim.claim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.payer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.claim_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-success text-success-foreground';
      case 'Submitted':
        return 'bg-primary text-primary-foreground';
      case 'Denied':
      case 'Rejected':
        return 'bg-destructive text-destructive-foreground';
      case 'Pending':
        return 'bg-warning text-warning-foreground';
      case 'Draft':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const totalCharges = filteredClaims?.reduce((sum, claim) => sum + Number(claim.total_charge_amount), 0) || 0;
  const totalPaid = filteredClaims?.reduce((sum, claim) => sum + (Number(claim.paid_amount) || 0), 0) || 0;
  const pendingClaims = filteredClaims?.filter(c => c.claim_status === 'Pending' || c.claim_status === 'Submitted').length || 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Insurance Claims
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track insurance claim submissions and payments
          </p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-accent">
          <Plus className="h-4 w-4 mr-2" />
          New Claim
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 border-l-4 border-l-primary">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Charges</p>
              <p className="text-2xl font-bold">${totalCharges.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-success">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-warning">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-warning/10">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Claims</p>
              <p className="text-2xl font-bold">{pendingClaims}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by claim ID or payer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Ready to Bill">Ready to Bill</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Denied">Denied</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Claims Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Claim ID</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Payer</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Created Date</TableHead>
                <TableHead className="font-semibold">Submitted Date</TableHead>
                <TableHead className="font-semibold">Charge Amount</TableHead>
                <TableHead className="font-semibold">Paid Amount</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading claims...
                  </TableCell>
                </TableRow>
              ) : filteredClaims && filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <TableRow key={claim.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{claim.claim_id}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(claim.claim_status)}>
                        {claim.claim_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{claim.payer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{claim.claim_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(claim.claim_created_date), 'MM/dd/yyyy')}
                    </TableCell>
                    <TableCell>
                      {claim.claim_submitted_date 
                        ? format(new Date(claim.claim_submitted_date), 'MM/dd/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${Number(claim.total_charge_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-success">
                      ${(Number(claim.paid_amount) || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No claims found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
