import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useBilling } from '@/hooks/useBilling';

interface ChargeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  clientId?: string;
}

export function ChargeEntryDialog({ open, onOpenChange, appointmentId, clientId }: ChargeEntryDialogProps) {
  const { createCharge } = useBilling();
  const [loading, setLoading] = useState(false);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .eq('status', 'Active')
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch service codes
  const { data: serviceCodes = [] } = useQuery({
    queryKey: ['service-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_codes')
        .select('*')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch ICD-10 codes
  const { data: icdCodes = [] } = useQuery({
    queryKey: ['icd-10-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icd_10_codes')
        .select('*')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data || [];
    },
  });

  const [formData, setFormData] = useState({
    clientId: clientId || '',
    appointmentId: appointmentId || '',
    serviceDate: format(new Date(), 'yyyy-MM-dd'),
    cptCode: '',
    cptDescription: '',
    units: 1,
    chargeAmount: 0,
    placeOfService: '11',
    diagnosisCodes: [] as Array<{ icdCode: string; diagnosisDescription: string; pointerOrder: number }>,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await createCharge({
        ...formData,
        providerId: user?.id,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create charge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceCodeChange = (code: string) => {
    const selectedCode = serviceCodes.find(sc => sc.code === code);
    if (selectedCode) {
      setFormData({
        ...formData,
        cptCode: selectedCode.code,
        cptDescription: selectedCode.description,
        chargeAmount: selectedCode.standard_rate || 0,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Charge Entry</DialogTitle>
          <DialogDescription>
            Create a new billable charge entry for services provided
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.last_name}, {client.first_name} ({client.medical_record_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceDate">Service Date *</Label>
              <Input
                id="serviceDate"
                type="date"
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cptCode">CPT Code *</Label>
              <Select
                value={formData.cptCode}
                onValueChange={handleServiceCodeChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CPT code" />
                </SelectTrigger>
                <SelectContent>
                  {serviceCodes.map((code) => (
                    <SelectItem key={code.id} value={code.code}>
                      {code.code} - {code.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="units">Units *</Label>
              <Input
                id="units"
                type="number"
                min="1"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chargeAmount">Charge Amount *</Label>
              <Input
                id="chargeAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.chargeAmount}
                onChange={(e) => setFormData({ ...formData, chargeAmount: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeOfService">Place of Service *</Label>
              <Select
                value={formData.placeOfService}
                onValueChange={(value) => setFormData({ ...formData, placeOfService: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="11">Office</SelectItem>
                  <SelectItem value="02">Telehealth</SelectItem>
                  <SelectItem value="12">Home</SelectItem>
                  <SelectItem value="22">Hospital Outpatient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Charge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
