import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Mail, UserCog, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PortalAccessDialog } from '@/components/admin/PortalAccessDialog';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  medical_record_number: string;
  portal_enabled: boolean;
  portal_user_id: string | null;
  portal_last_login: string | null;
  status: string;
}

export function PortalClientsTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(client => 
      client.first_name.toLowerCase().includes(query) ||
      client.last_name.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.medical_record_number.toLowerCase().includes(query)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, medical_record_number, portal_enabled, portal_user_id, portal_last_login, status')
        .order('last_name');

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickToggle = async (client: Client) => {
    if (!client.portal_enabled && !client.email) {
      toast.error('Client must have an email address to enable portal access');
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ portal_enabled: !client.portal_enabled })
        .eq('id', client.id);

      if (error) throw error;

      toast.success(
        client.portal_enabled 
          ? 'Portal access disabled' 
          : 'Portal access enabled'
      );
      fetchClients();
    } catch (error) {
      console.error('Error toggling portal access:', error);
      toast.error('Failed to update portal access');
    }
  };

  const handleManageClient = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleSendInvitation = async (client: Client) => {
    if (!client.email) {
      toast.error('Client must have an email address');
      return;
    }

    if (!client.portal_enabled) {
      toast.error('Portal access must be enabled first');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-portal-invitation', {
        body: { 
          clientId: client.id,
          email: client.email 
        }
      });

      if (error) throw error;

      toast.success('Portal invitation sent successfully');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  const exportClientList = () => {
    const csv = [
      ['MRN', 'Name', 'Email', 'Portal Enabled', 'Portal User ID', 'Last Login', 'Status'].join(','),
      ...filteredClients.map(c => [
        c.medical_record_number,
        `${c.first_name} ${c.last_name}`,
        c.email || '',
        c.portal_enabled ? 'Yes' : 'No',
        c.portal_user_id || '',
        c.portal_last_login || '',
        c.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portal-clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Client list exported');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Loading clients...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Portal Access</CardTitle>
              <CardDescription>
                Manage portal access for all clients in one place
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportClientList}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{clients.length}</div>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {clients.filter(c => c.portal_enabled).length}
                </div>
                <p className="text-xs text-muted-foreground">Portal Enabled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {clients.filter(c => c.portal_user_id).length}
                </div>
                <p className="text-xs text-muted-foreground">Active Accounts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-amber-600">
                  {clients.filter(c => c.portal_enabled && !c.portal_user_id).length}
                </div>
                <p className="text-xs text-muted-foreground">Pending Setup</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Portal Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-mono text-sm">
                        {client.medical_record_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {client.first_name} {client.last_name}
                      </TableCell>
                      <TableCell>{client.email || <span className="text-muted-foreground">No email</span>}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={client.portal_enabled}
                            onCheckedChange={() => handleQuickToggle(client)}
                            disabled={!client.email}
                          />
                          {client.portal_user_id ? (
                            <Badge variant="default">Active</Badge>
                          ) : client.portal_enabled ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client.portal_last_login 
                          ? new Date(client.portal_last_login).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {client.portal_enabled && !client.portal_user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendInvitation(client)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Invitation
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManageClient(client)}
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedClient && (
        <PortalAccessDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clientId={selectedClient.id}
          clientName={`${selectedClient.first_name} ${selectedClient.last_name}`}
          currentEmail={selectedClient.email || ''}
          portalEnabled={selectedClient.portal_enabled}
          portalUserId={selectedClient.portal_user_id || undefined}
          onUpdate={fetchClients}
        />
      )}
    </>
  );
}
