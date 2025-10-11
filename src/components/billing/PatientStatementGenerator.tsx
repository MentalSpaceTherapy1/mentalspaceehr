import { useState, useEffect } from 'react';
import { FileText, Send, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (date: string | Date) => format(new Date(date), 'MMM d, yyyy');
const sb = supabase as any;

interface ClientBalance {
  id: string;
  first_name: string;
  last_name: string;
  outstanding_balance: number;
  open_claims: number;
}

interface Statement {
  id: string;
  statement_number: string;
  statement_date: string;
  current_balance: number;
  statement_status: string;
  sent_at: string;
  clients: {
    first_name: string;
    last_name: string;
  };
}

export function PatientStatementGenerator() {
  const [clients, setClients] = useState<ClientBalance[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load patient balance summary
      const { data: balanceData } = await sb
        .from('patient_balance_summary')
        .select('*')
        .order('outstanding_balance', { ascending: false })
        .limit(50);

      if (balanceData) {
        setClients(balanceData);
      }

      // Load existing statements
      const { data: statementsData } = await sb
        .from('advancedmd_patient_statements')
        .select(
          `
          *,
          clients (
            first_name,
            last_name
          )
        `
        )
        .order('statement_date', { ascending: false })
        .limit(50);

      if (statementsData) {
        setStatements(statementsData as any);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStatement = async (client: ClientBalance) => {
    try {
      setGenerating(true);

      // Get all unpaid claims for this client
      const { data: claims } = await supabase
        .from('advancedmd_claims')
        .select('*')
        .eq('client_id', client.id)
        .in('claim_status', ['Submitted', 'In Process', 'Paid'])
        .order('statement_from_date', { ascending: false });

      if (!claims || claims.length === 0) {
        toast({
          title: 'No Claims Found',
          description: 'This client has no claims to include in statement',
          variant: 'destructive',
        });
        return;
      }

      // Get payments for this client
      const { data: payments } = await supabase
        .from('advancedmd_payment_postings')
        .select('*, advancedmd_claims!inner(client_id)')
        .eq('advancedmd_claims.client_id', client.id);

      const statementNumber = `STMT-${Date.now()}-${client.id.substring(0, 8)}`;
      const statementDate = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 90); // Last 90 days

      const totalCharges = claims.reduce((sum, c) => sum + (c.billed_amount || 0), 0);
      const totalPayments = payments?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;

      // Calculate aging buckets
      const today = new Date();
      let amount_0_30 = 0;
      let amount_31_60 = 0;
      let amount_61_90 = 0;
      let amount_over_90 = 0;

      claims.forEach((claim) => {
        const claimDate = new Date(claim.statement_from_date);
        const daysSince = Math.floor((today.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24));
        const balance = (claim.billed_amount || 0) - (claim.paid_amount || 0);

        if (daysSince <= 30) amount_0_30 += balance;
        else if (daysSince <= 60) amount_31_60 += balance;
        else if (daysSince <= 90) amount_61_90 += balance;
        else amount_over_90 += balance;
      });

      const statementLines = claims.map((claim) => ({
        date: claim.statement_from_date,
        description: `Medical Services - ${claim.claim_id}`,
        charges: claim.billed_amount,
        payments: claim.paid_amount || 0,
        balance: (claim.billed_amount || 0) - (claim.paid_amount || 0),
      }));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create statement
      const { error } = await supabase.from('advancedmd_patient_statements').insert({
        client_id: client.id,
        statement_number: statementNumber,
        statement_date: statementDate.toISOString().split('T')[0],
        statement_period_start: periodStart.toISOString().split('T')[0],
        statement_period_end: statementDate.toISOString().split('T')[0],
        previous_balance: 0,
        charges: totalCharges,
        payments: totalPayments,
        adjustments: 0,
        current_balance: client.outstanding_balance,
        amount_0_30_days: amount_0_30,
        amount_31_60_days: amount_31_60,
        amount_61_90_days: amount_61_90,
        amount_over_90_days: amount_over_90,
        statement_lines: statementLines,
        statement_status: 'Generated',
        generated_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Statement Generated',
        description: `Statement ${statementNumber} has been created`,
      });

      loadData();
    } catch (error) {
      console.error('Error generating statement:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const sendStatement = async (statement: Statement) => {
    try {
      const { error } = await supabase
        .from('advancedmd_patient_statements')
        .update({
          statement_status: 'Sent',
          sent_at: new Date().toISOString(),
          delivery_method: 'Email',
        })
        .eq('id', statement.id);

      if (error) throw error;

      toast({
        title: 'Statement Sent',
        description: 'Patient statement has been sent',
      });

      loadData();
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: 'Failed to send statement',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generate Statements */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Patient Statements</CardTitle>
          <CardDescription>Create billing statements for patients with outstanding balances</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No patients with outstanding balances
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead className="text-right">Outstanding Balance</TableHead>
                  <TableHead className="text-right">Open Claims</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.first_name} {client.last_name}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(client.outstanding_balance)}
                    </TableCell>
                    <TableCell className="text-right">{client.open_claims}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => generateStatement(client)}
                        disabled={generating}
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Statement History */}
      <Card>
        <CardHeader>
          <CardTitle>Statement History</CardTitle>
          <CardDescription>Previously generated patient statements</CardDescription>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No statements generated yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statement #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell className="font-medium">{statement.statement_number}</TableCell>
                    <TableCell>
                      {statement.clients.first_name} {statement.clients.last_name}
                    </TableCell>
                    <TableCell>{formatDate(statement.statement_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(statement.current_balance)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statement.statement_status === 'Sent' ? 'default' : 'secondary'
                        }
                      >
                        {statement.statement_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {statement.statement_status !== 'Sent' && (
                          <Button size="sm" onClick={() => sendStatement(statement)}>
                            <Send className="h-4 w-4 mr-2" />
                            Send
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
