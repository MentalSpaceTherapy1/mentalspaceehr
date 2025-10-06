import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClientStatement } from '@/hooks/useClientStatements';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClientStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: ClientStatement | null;
}

export function ClientStatementDialog({
  open,
  onOpenChange,
  statement,
}: ClientStatementDialogProps) {
  if (!statement) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Statement {statement.statement_id}</DialogTitle>
            <Badge>{statement.statement_status}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <p className="text-sm">
                {statement.client?.first_name} {statement.client?.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                MRN: {statement.client?.medical_record_number}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm">
                <span className="font-medium">Statement Date:</span>{' '}
                {format(new Date(statement.statement_date), 'MMM dd, yyyy')}
              </p>
              <p className="text-sm">
                <span className="font-medium">Period:</span>{' '}
                {format(new Date(statement.statement_period_start), 'MMM dd')} -{' '}
                {format(new Date(statement.statement_period_end), 'MMM dd, yyyy')}
              </p>
              {statement.due_date && (
                <p className="text-sm">
                  <span className="font-medium">Due Date:</span>{' '}
                  {format(new Date(statement.due_date), 'MMM dd, yyyy')}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Balance Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Balance Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Previous Balance:</span>
                <span>{formatCurrency(statement.previous_balance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Charges:</span>
                <span>{formatCurrency(statement.current_charges)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payments:</span>
                <span className="text-green-600">-{formatCurrency(statement.payments)}</span>
              </div>
              <div className="flex justify-between">
                <span>Adjustments:</span>
                <span>{formatCurrency(statement.adjustments)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t col-span-2">
                <span>Current Balance:</span>
                <span>{formatCurrency(statement.current_balance)}</span>
              </div>
            </div>
          </div>

          {/* Aging */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Account Aging</h3>
            <div className="grid grid-cols-5 gap-2 text-sm text-center">
              <div>
                <div className="font-medium mb-1">Current</div>
                <div>{formatCurrency(statement.current_aging)}</div>
              </div>
              <div>
                <div className="font-medium mb-1">31-60</div>
                <div>{formatCurrency(statement.aging_30)}</div>
              </div>
              <div>
                <div className="font-medium mb-1">61-90</div>
                <div>{formatCurrency(statement.aging_60)}</div>
              </div>
              <div>
                <div className="font-medium mb-1">91-120</div>
                <div>{formatCurrency(statement.aging_90)}</div>
              </div>
              <div>
                <div className="font-medium mb-1">120+</div>
                <div className="text-red-600">{formatCurrency(statement.aging_120)}</div>
              </div>
            </div>
          </div>

          {/* Charges Detail */}
          {statement.charges.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Charge Detail</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Charge</TableHead>
                    <TableHead className="text-right">Insurance</TableHead>
                    <TableHead className="text-right">Your Payment</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.charges.map((charge, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(new Date(charge.serviceDate), 'MM/dd/yyyy')}</TableCell>
                      <TableCell>{charge.provider}</TableCell>
                      <TableCell>{charge.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(charge.chargeAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(charge.insurancePaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(charge.clientPaid)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(charge.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Payments Received */}
          {statement.payments_received.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Payments Received</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Applied To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.payments_received.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(new Date(payment.paymentDate), 'MM/dd/yyyy')}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.appliedTo}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.paymentAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Statement Message */}
          {statement.statement_message && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm">{statement.statement_message}</p>
            </div>
          )}

          {/* Collections Warning */}
          {statement.in_collections && (
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                This account has been sent to collections.
              </p>
              {statement.collection_agency && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Collection Agency: {statement.collection_agency}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
