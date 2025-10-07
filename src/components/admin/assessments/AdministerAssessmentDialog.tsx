import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

interface AdministerAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  assessmentName: string;
}

export const AdministerAssessmentDialog = ({ 
  open, 
  onOpenChange, 
  assessmentId,
  assessmentName 
}: AdministerAssessmentDialogProps) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients-for-assessment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .eq('status', 'Active')
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Create assessment administration
  const administerMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('assessment_administrations')
        .insert({
          assessment_id: assessmentId,
          client_id: selectedClientId,
          administered_by: userData.user?.id,
          administered_via: 'In-Session',
          responses: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assessment-administrations'] });
      toast.success('Assessment started successfully');
      onOpenChange(false);
      // Navigate to assessment administration page
      navigate(`/admin/assessments/${assessmentId}/administer/${data.id}`);
    },
    onError: (error: any) => {
      toast.error('Failed to start assessment: ' + error.message);
    },
  });

  const handleAdminister = () => {
    if (!selectedClientId) {
      toast.error('Please select a client');
      return;
    }
    administerMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Administer Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Assessment</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{assessmentName}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                ) : clients?.length === 0 ? (
                  <SelectItem value="none" disabled>No active clients found</SelectItem>
                ) : (
                  clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {client.last_name}, {client.first_name} ({client.medical_record_number})
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdminister} 
            disabled={!selectedClientId || administerMutation.isPending}
          >
            {administerMutation.isPending ? 'Starting...' : 'Begin Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
