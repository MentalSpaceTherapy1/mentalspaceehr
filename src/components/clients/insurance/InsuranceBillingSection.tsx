import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ClientInsuranceCard } from "./ClientInsuranceCard";
import { ClientInsuranceDialog } from "./ClientInsuranceDialog";
import { useCurrentUserRoles } from "@/hooks/useUserRoles";

interface InsuranceBillingSectionProps {
  clientId: string;
}

export function InsuranceBillingSection({ clientId }: InsuranceBillingSectionProps) {
  const [insurances, setInsurances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<any>(null);
  const { roles } = useCurrentUserRoles();
  
  const canEdit = roles.includes('administrator') || roles.includes('front_desk') || roles.includes('billing_staff');

  useEffect(() => {
    fetchInsurances();
  }, [clientId]);

  const fetchInsurances = async () => {
    try {
      const { data, error } = await supabase
        .from('client_insurance')
        .select('*')
        .eq('client_id', clientId)
        .order('rank');
      
      if (error) throw error;
      setInsurances(data || []);
    } catch (error: any) {
      console.error('Error fetching insurances:', error);
      toast({
        title: "Error loading insurance information",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddInsurance = () => {
    setEditingInsurance(null);
    setDialogOpen(true);
  };

  const handleEditInsurance = (insurance: any) => {
    setEditingInsurance(insurance);
    setDialogOpen(true);
  };

  const primaryInsurance = insurances.find(i => i.rank === 'Primary');
  const secondaryInsurance = insurances.find(i => i.rank === 'Secondary');
  const tertiaryInsurance = insurances.find(i => i.rank === 'Tertiary');

  if (loading) {
    return <div>Loading insurance information...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Insurance & Billing</h2>
          <p className="text-muted-foreground">Manage client insurance information</p>
        </div>
        {canEdit && (
          <Button onClick={handleAddInsurance}>
            <Plus className="mr-2 h-4 w-4" />
            Add Insurance
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {primaryInsurance ? (
          <ClientInsuranceCard 
            insurance={primaryInsurance} 
            onEdit={() => handleEditInsurance(primaryInsurance)}
            canEdit={canEdit}
          />
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-4">No primary insurance on file</p>
            {canEdit && (
              <Button variant="outline" onClick={handleAddInsurance}>
                <Plus className="mr-2 h-4 w-4" />
                Add Primary Insurance
              </Button>
            )}
          </div>
        )}

        {secondaryInsurance && (
          <ClientInsuranceCard 
            insurance={secondaryInsurance} 
            onEdit={() => handleEditInsurance(secondaryInsurance)}
            canEdit={canEdit}
          />
        )}

        {tertiaryInsurance && (
          <ClientInsuranceCard 
            insurance={tertiaryInsurance} 
            onEdit={() => handleEditInsurance(tertiaryInsurance)}
            canEdit={canEdit}
          />
        )}
      </div>

      <ClientInsuranceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        insurance={editingInsurance}
        onSuccess={fetchInsurances}
      />
    </div>
  );
}
