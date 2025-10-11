import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Eye, AlertTriangle, Search } from 'lucide-react';
import { useClientStatements } from '@/hooks/useClientStatements';
import { ClientStatementDialog } from '@/components/billing/ClientStatementDialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

export default function ClientStatements() {
  const { statements, isLoading } = useClientStatements();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const filteredStatements = statements.filter((statement) =>
    statement.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    statement.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    statement.statement_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Sent':
        return 'outline';
      case 'Viewed':
        return 'secondary';
      case 'Generated':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const handleViewStatement = (statement: any) => {
    setSelectedStatement(statement);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Client Statements</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track client billing statements
            </p>
          </div>
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Statement
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Statements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statements.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  statements
                    .filter(s => s.statement_status !== 'Paid')
                    .reduce((sum, s) => sum + s.current_balance, 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Unsent Statements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statements.filter(s => s.statement_status === 'Generated').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">In Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statements.filter(s => s.in_collections).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statements Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statements</CardTitle>
                <CardDescription>View and manage all client statements</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search statements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-[300px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading statements...</div>
            ) : filteredStatements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No statements found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statement ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Statement Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Via</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatements.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell className="font-medium">{statement.statement_id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {statement.client?.first_name} {statement.client?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {statement.client?.medical_record_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(statement.statement_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(statement.statement_period_start), 'MMM dd')} -{' '}
                        {format(new Date(statement.statement_period_end), 'MMM dd')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(statement.current_balance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(statement.statement_status)}>
                            {statement.statement_status}
                          </Badge>
                          {statement.in_collections && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{statement.sent_method}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewStatement(statement)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {statement.statement_status === 'Generated' && (
                            <Button size="sm" variant="outline">
                              <Send className="mr-2 h-4 w-4" />
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

      <ClientStatementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        statement={selectedStatement}
      />

      <AlertDialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Client Statement</AlertDialogTitle>
            <AlertDialogDescription>
              Statement generation form coming soon. This will allow you to create billing statements for clients with outstanding balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
