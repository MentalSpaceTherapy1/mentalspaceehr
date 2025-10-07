import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { PaymentAllocationTable } from "./PaymentAllocationTable";
import { usePayments } from "@/hooks/usePayments";

interface PaymentPostingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentPostingDialog = ({ open, onOpenChange }: PaymentPostingDialogProps) => {
  const { createPayment } = usePayments();
  const [paymentSource, setPaymentSource] = useState<"Insurance" | "Client">("Insurance");
  const [payerId, setPayerId] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Check");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [allocations, setAllocations] = useState<Array<{
    chargeEntryId: string;
    paymentAmount: number;
    adjustmentAmount: number;
  }>>([]);

  // Fetch insurance companies for dropdown  
  const { data: insuranceCompanies } = useQuery({
    queryKey: ['insurance-companies'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('insurance_companies')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch clients for self-pay
  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .eq('status', 'Active')
        .order('last_name');
      
      if (error) throw error;
      return data;
    },
    enabled: paymentSource === 'Client',
  });

  const handleSubmit = async () => {
    if (!payerId || !paymentAmount || allocations.length === 0) {
      return;
    }

    try {
      await createPayment.mutateAsync({
        client_id: paymentSource === 'Client' ? payerId : undefined,
        payment_source: paymentSource,
        payment_method: paymentMethod as any,
        check_number: checkNumber || undefined,
        payment_date: paymentDate,
        payment_amount: parseFloat(paymentAmount),
        notes: paymentNotes || undefined,
        applied_payments: allocations.map(a => ({
          chargeId: a.chargeEntryId,
          amountApplied: a.paymentAmount,
          serviceDate: '',
          cptCode: '',
        })),
        adjustments: allocations.map(a => ({
          adjustmentAmount: a.adjustmentAmount,
          adjustmentReason: 'Payment allocation',
        })),
        unapplied_amount: parseFloat(paymentAmount) - allocations.reduce((sum, a) => sum + a.paymentAmount, 0),
        payment_status: 'Posted',
      });

      // Reset form
      setPayerId("");
      setCheckNumber("");
      setPaymentAmount("");
      setPaymentNotes("");
      setAllocations([]);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to post payment. Please try again.');
    }
  };

  const totalAllocated = allocations.reduce((sum, item) => sum + item.paymentAmount, 0);
  const remainingAmount = parseFloat(paymentAmount || "0") - totalAllocated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Source */}
          <div className="space-y-2">
            <Label>Payment Source</Label>
            <RadioGroup value={paymentSource} onValueChange={(value) => setPaymentSource(value as "Insurance" | "Client")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Insurance" id="insurance" />
                <Label htmlFor="insurance" className="font-normal cursor-pointer">Insurance</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Client" id="client" />
                <Label htmlFor="client" className="font-normal cursor-pointer">Client (Self-Pay)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payer Selection */}
            <div className="space-y-2">
              <Label htmlFor="payer">
                {paymentSource === "Insurance" ? "Insurance Company" : "Client"} *
              </Label>
              <Select value={payerId} onValueChange={setPayerId}>
                <SelectTrigger id="payer">
                  <SelectValue placeholder={`Select ${paymentSource === "Insurance" ? "insurance company" : "client"}`} />
                </SelectTrigger>
                <SelectContent>
                  {paymentSource === "Insurance" ? (
                    insuranceCompanies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  ) : (
                    clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.last_name}, {client.first_name} ({client.medical_record_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="EFT">EFT</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check/Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="checkNumber">Check/Reference Number</Label>
              <Input
                id="checkNumber"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="Check or reference number"
              />
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Payment Notes</Label>
            <Textarea
              id="notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Additional notes about this payment..."
              rows={2}
            />
          </div>

          {/* Allocation Summary */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Payment Amount</p>
              <p className="text-2xl font-bold">${parseFloat(paymentAmount || "0").toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Allocated</p>
              <p className="text-2xl font-bold">${totalAllocated.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-2xl font-bold ${remainingAmount < 0 ? 'text-destructive' : ''}`}>
                ${remainingAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Payment Allocation Table */}
          {payerId && paymentAmount && (
            <PaymentAllocationTable
              payerId={payerId}
              paymentSource={paymentSource}
              availableAmount={remainingAmount}
              allocations={allocations}
              onAllocationsChange={setAllocations}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!payerId || !paymentAmount || allocations.length === 0 || remainingAmount !== 0}
            >
              Post Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
