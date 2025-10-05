import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface PaymentAllocationTableProps {
  payerId: string;
  paymentSource: "Insurance" | "Client";
  availableAmount: number;
  allocations: Array<{
    chargeEntryId: string;
    paymentAmount: number;
    adjustmentAmount: number;
  }>;
  onAllocationsChange: (allocations: Array<{
    chargeEntryId: string;
    paymentAmount: number;
    adjustmentAmount: number;
  }>) => void;
}

export const PaymentAllocationTable = ({
  payerId,
  paymentSource,
  availableAmount,
  allocations,
  onAllocationsChange,
}: PaymentAllocationTableProps) => {
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());

  // Fetch outstanding charges for the payer
  const { data: charges, isLoading } = useQuery({
    queryKey: ['outstanding-charges', payerId, paymentSource],
    queryFn: async () => {
      let query = supabase
        .from('charge_entries')
        .select(`
          *,
          client:clients(id, first_name, last_name, medical_record_number),
          provider:profiles!charge_entries_provider_id_fkey(id, first_name, last_name)
        `)
        .in('charge_status', ['Unbilled', 'Billed', 'Partially Paid'])
        .order('service_date', { ascending: false });

      if (paymentSource === 'Insurance') {
        query = query.eq('primary_insurance_id', payerId);
      } else {
        query = query.eq('client_id', payerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(charge => ({
        ...charge,
        balance: charge.charge_amount - (charge.payment_amount || 0),
      }));
    },
    enabled: !!payerId,
  });

  const handleAllocationChange = (chargeId: string, field: 'payment' | 'adjustment', value: string) => {
    const numValue = parseFloat(value) || 0;
    const existing = allocations.find(a => a.chargeEntryId === chargeId);
    const charge = charges?.find(c => c.id === chargeId);
    
    if (!charge) return;

    let newPayment = existing?.paymentAmount || 0;
    let newAdjustment = existing?.adjustmentAmount || 0;

    if (field === 'payment') {
      newPayment = Math.min(numValue, charge.balance);
    } else {
      newAdjustment = Math.min(numValue, charge.balance - newPayment);
    }

    const newAllocations = allocations.filter(a => a.chargeEntryId !== chargeId);
    
    if (newPayment > 0 || newAdjustment > 0) {
      newAllocations.push({
        chargeEntryId: chargeId,
        paymentAmount: newPayment,
        adjustmentAmount: newAdjustment,
      });
    }

    onAllocationsChange(newAllocations);
  };

  const handleSelectCharge = (chargeId: string, checked: boolean) => {
    const newSelected = new Set(selectedCharges);
    if (checked) {
      newSelected.add(chargeId);
    } else {
      newSelected.delete(chargeId);
    }
    setSelectedCharges(newSelected);
  };

  const handleAutoAllocate = () => {
    if (!charges) return;

    let remaining = availableAmount;
    const newAllocations: typeof allocations = [];

    for (const charge of charges) {
      if (remaining <= 0) break;
      if (selectedCharges.size > 0 && !selectedCharges.has(charge.id)) continue;

      const balance = charge.balance;
      const paymentAmount = Math.min(remaining, balance);

      if (paymentAmount > 0) {
        newAllocations.push({
          chargeEntryId: charge.id,
          paymentAmount,
          adjustmentAmount: 0,
        });
        remaining -= paymentAmount;
      }
    }

    onAllocationsChange(newAllocations);
  };

  const getAllocation = (chargeId: string) => {
    return allocations.find(a => a.chargeEntryId === chargeId);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading charges...</div>;
  }

  if (!charges || charges.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No outstanding charges found for this payer.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Allocate Payment to Charges</h3>
        <Button onClick={handleAutoAllocate} variant="outline" size="sm">
          Auto-Allocate {selectedCharges.size > 0 ? 'Selected' : 'All'}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>CPT</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Allocate</TableHead>
              <TableHead className="text-right">Adjustment</TableHead>
              <TableHead className="text-right">New Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((charge) => {
              const allocation = getAllocation(charge.id);
              const newBalance = charge.balance - (allocation?.paymentAmount || 0) - (allocation?.adjustmentAmount || 0);

              return (
                <TableRow key={charge.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCharges.has(charge.id)}
                      onCheckedChange={(checked) => handleSelectCharge(charge.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{format(new Date(charge.service_date), 'MM/dd/yyyy')}</TableCell>
                  <TableCell>
                    {charge.client ? `${charge.client.last_name}, ${charge.client.first_name}` : 'Unknown'}
                  </TableCell>
                  <TableCell>{charge.cpt_code}</TableCell>
                  <TableCell className="text-right">${charge.charge_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(charge.payment_amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">${charge.balance.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={allocation?.paymentAmount || ''}
                      onChange={(e) => handleAllocationChange(charge.id, 'payment', e.target.value)}
                      className="w-24 text-right"
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={allocation?.adjustmentAmount || ''}
                      onChange={(e) => handleAllocationChange(charge.id, 'adjustment', e.target.value)}
                      className="w-24 text-right"
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${newBalance === 0 ? 'text-green-600' : ''}`}>
                    ${newBalance.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
