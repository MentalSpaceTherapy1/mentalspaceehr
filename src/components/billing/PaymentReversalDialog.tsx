import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { reversePaymentPosting } from '@/lib/advancedmd/payment-posting';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentPostingDetails {
  id: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  posting_type: string;
  posting_status: string;
  claim_id: string;
  notes?: string;
}

interface PaymentReversalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentPosting: PaymentPostingDetails | null;
  onSuccess?: () => void;
}

export function PaymentReversalDialog({
  open,
  onOpenChange,
  paymentPosting,
  onSuccess,
}: PaymentReversalDialogProps) {
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const { toast } = useToast();

  const handleReverse = async () => {
    if (!paymentPosting || !reversalReason.trim()) {
      toast({
        title: 'Reversal Reason Required',
        description: 'Please provide a reason for reversing this payment',
        variant: 'destructive',
      });
      return;
    }

    try {
      setReversing(true);

      const result = await reversePaymentPosting(
        paymentPosting.id,
        reversalReason,
        '' // userId will be fetched in the function
      );

      if (result.success) {
        toast({
          title: 'Payment Reversed',
          description: 'The payment posting has been reversed successfully',
        });

        setReversalReason('');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: 'Reversal Failed',
          description: result.error || 'Failed to reverse payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error reversing payment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setReversing(false);
    }
  };

  if (!paymentPosting) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Reverse Payment Posting
          </DialogTitle>
          <DialogDescription>
            This action will reverse the payment posting and adjust the claim balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Payment Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Payment Date:</span>
                <p className="font-medium">{formatDate(paymentPosting.payment_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-medium">{formatCurrency(paymentPosting.payment_amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Method:</span>
                <p className="font-medium">{paymentPosting.payment_method}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">{paymentPosting.posting_type}</p>
              </div>
            </div>
            {paymentPosting.notes && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground text-sm">Original Notes:</span>
                <p className="text-sm">{paymentPosting.notes}</p>
              </div>
            )}
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Reversing this payment will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Reduce the claim's paid amount by {formatCurrency(paymentPosting.payment_amount)}</li>
                <li>Change the claim status back to "Submitted" or "In Process"</li>
                <li>Mark this payment posting as "Reversed"</li>
                <li>This action cannot be undone</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Reversal Reason */}
          <div className="space-y-2">
            <Label htmlFor="reversal-reason">
              Reason for Reversal <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="reversal-reason"
              placeholder="Explain why this payment is being reversed..."
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be permanently recorded in the audit log
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setReversalReason('');
              onOpenChange(false);
            }}
            disabled={reversing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReverse}
            disabled={reversing || !reversalReason.trim()}
          >
            {reversing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reversing...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Reverse Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
