import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FormResponseReviewDialog } from './FormResponseReviewDialog';
import type { FormWithResponse } from '@/types/forms';

export const PendingFormResponsesTable = () => {
  const [selectedResponse, setSelectedResponse] = useState<FormWithResponse | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const { data: pendingResponses, isLoading, refetch } = useQuery({
    queryKey: ['pending-form-responses'],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('portal_form_assignments')
        .select(`
          *,
          template:template_id(*)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Get responses for completed assignments
      const assignmentIds = assignments.map(a => a.id);
      const { data: responses, error: responseError } = await supabase
        .from('portal_form_responses')
        .select('*')
        .in('assignment_id', assignmentIds);

      if (responseError) throw responseError;

      // Get client names
      const clientIds = assignments.map(a => a.client_id);
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .in('id', clientIds);

      if (clientError) throw clientError;

      // Combine data
      return assignments.map(assignment => {
        const response = responses.find(r => r.assignment_id === assignment.id);
        const client = clients.find(c => c.id === assignment.client_id);
        
        return {
          ...assignment,
          response,
          client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
        };
      });
    },
  });

  const handleViewResponse = (response: FormWithResponse) => {
    setSelectedResponse(response);
    setReviewDialogOpen(true);
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) status = 'pending';

    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Review', icon: Clock },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      needs_revision: { variant: 'outline' as const, label: 'Needs Revision', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Loading pending form responses...</div>;
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Imported to Chart</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!pendingResponses || pendingResponses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No completed form responses
                </TableCell>
              </TableRow>
            ) : (
              pendingResponses.map((response: any) => (
                <TableRow key={response.id}>
                  <TableCell className="font-medium">{response.client_name}</TableCell>
                  <TableCell>{response.template?.title || 'Unknown Form'}</TableCell>
                  <TableCell>
                    {response.completed_at
                      ? new Date(response.completed_at).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(response.response?.approval_status)}
                  </TableCell>
                  <TableCell>
                    {response.response?.data_imported_to_chart ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Imported
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Imported</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {response.response && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResponse(response)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <FormResponseReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        formResponse={selectedResponse}
        onStatusUpdate={() => {
          refetch();
          setSelectedResponse(null);
        }}
      />
    </>
  );
};
