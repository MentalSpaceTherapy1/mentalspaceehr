import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, DollarSign, Receipt, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useBilling } from '@/hooks/useBilling';
import { ChargeEntryDialog } from '@/components/billing/ChargeEntryDialog';
import { PaymentPostingDialog } from '@/components/billing/PaymentPostingDialog';
import { PaymentDetailDialog } from '@/components/billing/PaymentDetailDialog';

export default function BillingManagement() {
  const { charges, claims, payments, isLoading } = useBilling();
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Accepted':
        return 'default';
      case 'Unbilled':
      case 'Draft':
        return 'secondary';
      case 'Billed':
      case 'Submitted':
        return 'outline';
      case 'Denied':
      case 'Rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Billing Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage charges, claims, and payments
            </p>
          </div>
          <Button onClick={() => setChargeDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Charge
          </Button>
        </div>

        <Tabs defaultValue="charges" className="space-y-4">
          <TabsList>
            <TabsTrigger value="charges">Charges</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="charges" className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Charge Entries
                </CardTitle>
                <CardDescription>
                  View and manage billable charges for services provided
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading charges...</div>
                ) : charges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No charges found. Create a new charge to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Service Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>CPT Code</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {charges.map((charge) => (
                        <TableRow key={charge.id}>
                          <TableCell>
                            {format(new Date(charge.service_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {charge.client?.first_name} {charge.client?.last_name}
                          </TableCell>
                          <TableCell>
                            <code className="text-sm text-green-700 dark:text-green-400">
                              {charge.cpt_code}
                            </code>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(charge.charge_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(charge.charge_status)}>
                              {charge.charge_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              charge.charge_amount - charge.payment_amount - charge.adjustment_amount
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Insurance Claims
                </CardTitle>
                <CardDescription>
                  View and manage insurance claims submissions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading claims...</div>
                ) : claims.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No claims found. Create a new claim to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Claim #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {claims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-mono text-sm">
                            {claim.claim_id}
                          </TableCell>
                          <TableCell>
                            N/A
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(claim.claim_created_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(claim.total_charge_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(claim.claim_status)}>
                              {claim.claim_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {claim.claim_submitted_date
                              ? format(new Date(claim.claim_submitted_date), 'MMM d, yyyy')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader className="border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                  <CardDescription>
                    View and post insurance and client payments
                  </CardDescription>
                </div>
                <Button onClick={() => setPaymentDialogOpen(true)} className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Post Payment
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
                ) : payments && payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payer</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Check #</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Posted By</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">
                            {payment.receipt_number || 'N/A'}
                          </TableCell>
                          <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>Payment</TableCell>
                          <TableCell>
                            <Badge variant="outline">Check</Badge>
                          </TableCell>
                          <TableCell>{payment.check_number || '—'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.check_amount)}
                          </TableCell>
                          <TableCell>
                            Staff
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No payments recorded yet</p>
                    <Button onClick={() => setPaymentDialogOpen(true)} className="gap-2">
                      <DollarSign className="h-4 w-4" />
                      Post First Payment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ChargeEntryDialog
          open={chargeDialogOpen}
          onOpenChange={setChargeDialogOpen}
        />

        <PaymentPostingDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
        />

        <PaymentDetailDialog
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
          payment={selectedPayment}
        />
      </div>
    </DashboardLayout>
  );
}
