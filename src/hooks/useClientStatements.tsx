import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StatementCharge {
  serviceDate: string;
  provider: string;
  description: string;
  chargeAmount: number;
  insurancePaid: number;
  clientPaid: number;
  balance: number;
}

export interface StatementPayment {
  paymentDate: string;
  paymentMethod: string;
  paymentAmount: number;
  appliedTo: string;
}

export interface ClientStatement {
  id: string;
  statement_id: string;
  client_id: string;
  statement_date: string;
  statement_period_start: string;
  statement_period_end: string;
  previous_balance: number;
  current_charges: number;
  payments: number;
  adjustments: number;
  current_balance: number;
  current_aging: number;
  aging_30: number;
  aging_60: number;
  aging_90: number;
  aging_120: number;
  charges: StatementCharge[];
  payments_received: StatementPayment[];
  statement_message?: string;
  due_date?: string;
  statement_status: 'Generated' | 'Sent' | 'Viewed' | 'Paid';
  sent_date?: string;
  sent_method: 'Mail' | 'Email' | 'Portal' | 'Not Sent';
  viewed_in_portal: boolean;
  viewed_date?: string;
  in_collections: boolean;
  collection_date?: string;
  collection_agency?: string;
  created_date: string;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    medical_record_number: string;
    email?: string;
  };
}

export function useClientStatements(clientId?: string) {
  const queryClient = useQueryClient();

  // Fetch statements
  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['client-statements', clientId],
    queryFn: async () => {
      let query = supabase
        .from('client_statements')
        .select(`
          *,
          client:clients(id, first_name, last_name, medical_record_number, email)
        `)
        .order('statement_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any;
    },
  });

  // Generate statement ID
  const generateStatementId = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_statement_id' as any);
    if (error) throw error;
    return data as string;
  };

  // Create statement
  const createStatement = useMutation({
    mutationFn: async (statement: Partial<ClientStatement>) => {
      const statementId = await generateStatementId();
      
      const { data, error } = await supabase
        .from('client_statements')
        .insert({
          ...statement,
          statement_id: statementId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-statements'] });
      toast.success('Statement generated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to generate statement: ' + error.message);
    },
  });

  // Update statement
  const updateStatement = useMutation({
    mutationFn: async ({ id, ...statement }: Partial<ClientStatement> & { id: string }) => {
      const { data, error } = await supabase
        .from('client_statements')
        .update(statement as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-statements'] });
      toast.success('Statement updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update statement: ' + error.message);
    },
  });

  // Mark statement as sent
  const markStatementSent = useMutation({
    mutationFn: async ({ 
      statementId, 
      sentMethod,
      sentDate 
    }: { 
      statementId: string; 
      sentMethod: 'Mail' | 'Email' | 'Portal';
      sentDate: string;
    }) => {
      const { data, error } = await supabase
        .from('client_statements')
        .update({
          statement_status: 'Sent',
          sent_method: sentMethod,
          sent_date: sentDate,
        })
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-statements'] });
      toast.success('Statement marked as sent');
    },
    onError: (error: Error) => {
      toast.error('Failed to mark statement as sent: ' + error.message);
    },
  });

  // Mark statement as viewed (for portal)
  const markStatementViewed = useMutation({
    mutationFn: async (statementId: string) => {
      const { data, error } = await supabase
        .from('client_statements')
        .update({
          statement_status: 'Viewed',
          viewed_in_portal: true,
          viewed_date: new Date().toISOString(),
        })
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-statements'] });
    },
    onError: (error: Error) => {
      console.error('Failed to mark statement as viewed:', error);
    },
  });

  // Send to collections
  const sendToCollections = useMutation({
    mutationFn: async ({ 
      statementId, 
      collectionAgency,
      collectionDate 
    }: { 
      statementId: string; 
      collectionAgency: string;
      collectionDate: string;
    }) => {
      const { data, error } = await supabase
        .from('client_statements')
        .update({
          in_collections: true,
          collection_agency: collectionAgency,
          collection_date: collectionDate,
        })
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-statements'] });
      toast.success('Statement sent to collections');
    },
    onError: (error: Error) => {
      toast.error('Failed to send to collections: ' + error.message);
    },
  });

  return {
    statements,
    isLoading,
    createStatement,
    updateStatement,
    markStatementSent,
    markStatementViewed,
    sendToCollections,
  };
}
