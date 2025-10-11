import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (date: string | Date) => format(new Date(date), 'MMM d, yyyy');

interface ERAFileForReconciliation {
  id: string;
  file_name: string;
  payment_amount: number;
  payment_date: string;
  total_claims: number;
  claims_posted: number;
  processing_status: string;
}

interface ReconciliationRecord {
  id: string;
  era_file_id: string;
  reconciliation_date: string;
  expected_payment_amount: number;
  actual_payment_amount: number;
  variance_amount: number;
  reconciliation_status: string;
  discrepancies: any;
  resolution_notes: string;
  era_file: {
    file_name: string;
    payment_date: string;
  };
}

export function PaymentReconciliation() {
  const [unreconciled, setUnreconciled] = useState<ERAFileForReconciliation[]>([]);
  const [reconciled, setReconciled] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [selectedERA, setSelectedERA] = useState<ERAFileForReconciliation | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<ReconciliationRecord | null>(
    null
  );
  const [resolutionNotes, setResolutionNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load unreconciled ERA files
      const { data: unreconciledData } = await supabase
        .from('advancedmd_era_files')
        .select('*')
        .eq('processing_status', 'Posted')
        .not('id', 'in', supabase.from('advancedmd_payment_reconciliation').select('era_file_id'))
        .order('payment_date', { ascending: false });

      if (unreconciledData) {
        setUnreconciled(unreconciledData);
      }

      // Load reconciliation records
      const { data: reconciledData } = await supabase
        .from('advancedmd_payment_reconciliation')
        .select(
          `
          *,
          era_file:advancedmd_era_files (
            file_name,
            payment_date
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(20);

      if (reconciledData) {
        setReconciled(reconciledData as any);
      }
    } catch (error) {
      console.error('Error loading reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const reconcileERAFile = async (era: ERAFileForReconciliation) => {
    try {
      setReconciling(true);
      setSelectedERA(era);

      // Get all payment postings for this ERA
      const { data: postings } = await supabase
        .from('advancedmd_payment_postings')
        .select('payment_amount')
        .eq('era_file_id', era.id);

      const actualPaymentAmount = postings?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;
      const expectedPaymentAmount = era.payment_amount;
      const varianceAmount = actualPaymentAmount - expectedPaymentAmount;

      const discrepancies: any = {};

      // Check for discrepancies
      if (Math.abs(varianceAmount) > 0.01) {
        discrepancies.amount_mismatch = {
          expected: expectedPaymentAmount,
          actual: actualPaymentAmount,
          variance: varianceAmount,
        };
      }

      if (era.claims_posted < era.total_claims) {
        discrepancies.unposted_claims = {
          total: era.total_claims,
          posted: era.claims_posted,
          missing: era.total_claims - era.claims_posted,
        };
      }

      const reconciliationStatus =
        Math.abs(varianceAmount) < 0.01 && era.claims_posted === era.total_claims
          ? 'Balanced'
          : 'Unbalanced';

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create reconciliation record
      const { error: reconciliationError } = await supabase
        .from('advancedmd_payment_reconciliation')
        .insert({
          era_file_id: era.id,
          reconciliation_date: new Date().toISOString().split('T')[0],
          expected_payment_amount: expectedPaymentAmount,
          actual_payment_amount: actualPaymentAmount,
          variance_amount: varianceAmount,
          reconciliation_status: reconciliationStatus,
          discrepancies: Object.keys(discrepancies).length > 0 ? discrepancies : null,
          reconciled_by: user?.id,
        });

      if (reconciliationError) {
        throw reconciliationError;
      }

      toast({
        title: 'Reconciliation Complete',
        description:
          reconciliationStatus === 'Balanced'
            ? 'Payment reconciled successfully with no discrepancies'
            : 'Payment reconciled with discrepancies that need review',
        variant: reconciliationStatus === 'Balanced' ? 'default' : 'destructive',
      });

      loadData();
    } catch (error) {
      console.error('Reconciliation error:', error);
      toast({
        title: 'Reconciliation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setReconciling(false);
      setSelectedERA(null);
    }
  };

  const resolveDiscrepancy = async () => {
    if (!selectedReconciliation) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('advancedmd_payment_reconciliation')
        .update({
          reconciliation_status: 'Resolved',
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', selectedReconciliation.id);

      if (error) throw error;

      toast({
        title: 'Discrepancy Resolved',
        description: 'Reconciliation has been marked as resolved',
      });

      setShowResolveDialog(false);
      setSelectedReconciliation(null);
      setResolutionNotes('');
      loadData();
    } catch (error) {
      console.error('Error resolving discrepancy:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve discrepancy',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; icon: any }> = {
      Balanced: { variant: 'default', icon: CheckCircle2 },
      Unbalanced: { variant: 'destructive', icon: XCircle },
      'Under Review': { variant: 'secondary', icon: AlertTriangle },
      Resolved: { variant: 'default', icon: CheckCircle2 },
    };

    const config = statusMap[status] || { variant: 'default', icon: AlertTriangle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unreconciled ERA Files */}
      <Card>
        <CardHeader>
          <CardTitle>Unreconciled ERA Files</CardTitle>
          <CardDescription>
            ERA files that have been posted but need reconciliation review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unreconciled.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p>All ERA files have been reconciled</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">Expected Amount</TableHead>
                  <TableHead>Claims Posted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unreconciled.map((era) => (
                  <TableRow key={era.id}>
                    <TableCell className="font-medium">{era.file_name}</TableCell>
                    <TableCell>{formatDate(era.payment_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(era.payment_amount)}
                    </TableCell>
                    <TableCell>
                      {era.claims_posted} / {era.total_claims}
                    </TableCell>
                    <TableCell>{getStatusBadge(era.processing_status)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => reconcileERAFile(era)}
                        disabled={reconciling && selectedERA?.id === era.id}
                      >
                        {reconciling && selectedERA?.id === era.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Reconciling...
                          </>
                        ) : (
                          'Reconcile'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation History */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation History</CardTitle>
          <CardDescription>Recent payment reconciliation records</CardDescription>
        </CardHeader>
        <CardContent>
          {reconciled.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reconciliation records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Reconciliation Date</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciled.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.era_file?.file_name || 'Unknown'}
                    </TableCell>
                    <TableCell>{formatDate(record.reconciliation_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.expected_payment_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.actual_payment_amount)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        Math.abs(record.variance_amount) > 0.01
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {record.variance_amount > 0 ? '+' : ''}
                      {formatCurrency(record.variance_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.reconciliation_status)}</TableCell>
                    <TableCell>
                      {record.reconciliation_status === 'Unbalanced' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReconciliation(record);
                            setShowResolveDialog(true);
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Discrepancy Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Reconciliation Discrepancy</DialogTitle>
            <DialogDescription>
              Document the resolution for this reconciliation variance
            </DialogDescription>
          </DialogHeader>

          {selectedReconciliation && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Expected:</span>{' '}
                    {formatCurrency(selectedReconciliation.expected_payment_amount)}
                  </div>
                  <div>
                    <span className="font-medium">Actual:</span>{' '}
                    {formatCurrency(selectedReconciliation.actual_payment_amount)}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Variance:</span>{' '}
                    <span
                      className={
                        Math.abs(selectedReconciliation.variance_amount) > 0.01
                          ? 'text-red-600'
                          : 'text-green-600'
                      }
                    >
                      {selectedReconciliation.variance_amount > 0 ? '+' : ''}
                      {formatCurrency(selectedReconciliation.variance_amount)}
                    </span>
                  </div>
                </div>

                {selectedReconciliation.discrepancies && (
                  <div className="mt-4">
                    <div className="font-medium text-sm mb-2">Discrepancies:</div>
                    <pre className="text-xs bg-background p-2 rounded overflow-auto">
                      {JSON.stringify(selectedReconciliation.discrepancies, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  placeholder="Explain how this discrepancy was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={resolveDiscrepancy} disabled={!resolutionNotes.trim()}>
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
