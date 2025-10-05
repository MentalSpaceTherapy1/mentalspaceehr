import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FileText, Printer } from "lucide-react";

interface PaymentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
}

export const PaymentDetailDialog = ({ open, onOpenChange, payment }: PaymentDetailDialogProps) => {
  if (!payment) return null;

  const handlePrintReceipt = () => {
    // TODO: Implement receipt printing
    console.log("Print receipt for payment:", payment.id);
  };

  const totalPayment = payment.payment_line_items?.reduce(
    (sum: number, item: any) => sum + (item.payment_amount || 0),
    0
  ) || 0;

  const totalAdjustment = payment.payment_line_items?.reduce(
    (sum: number, item: any) => sum + (item.adjustment_amount || 0),
    0
  ) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment Details - {payment.receipt_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Payment Date</p>
              <p className="font-semibold">{format(new Date(payment.payment_date), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-semibold">{payment.payment_method}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Check/Reference Number</p>
              <p className="font-semibold">{payment.check_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Source</p>
              <p className="font-semibold">{payment.payment_source}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payer</p>
              <p className="font-semibold">{payment.payer?.company_name || 'Self-Pay'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Posted By</p>
              <p className="font-semibold">
                {payment.posted_by ? `${payment.posted_by.first_name} ${payment.posted_by.last_name}` : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Payment Notes */}
          {payment.payment_notes && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p>{payment.payment_notes}</p>
            </div>
          )}

          {/* Line Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Charge Allocations</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>CPT Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Charge</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">Adjustment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payment.payment_line_items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {format(new Date(item.charge_entry.service_date), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell>
                        {item.charge_entry.client
                          ? `${item.charge_entry.client.last_name}, ${item.charge_entry.client.first_name}`
                          : 'Unknown'}
                      </TableCell>
                      <TableCell>{item.charge_entry.cpt_code}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.charge_entry.cpt_description}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.charge_entry.charge_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${item.payment_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(item.adjustment_amount || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between p-3 bg-muted rounded">
                <span className="font-semibold">Total Payment:</span>
                <span className="font-bold text-lg">${totalPayment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded">
                <span className="font-semibold">Total Adjustments:</span>
                <span className="font-bold">${totalAdjustment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-primary text-primary-foreground rounded">
                <span className="font-semibold">Total Applied:</span>
                <span className="font-bold text-lg">${(totalPayment + totalAdjustment).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
