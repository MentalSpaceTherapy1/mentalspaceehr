import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, AlertTriangle, CheckCircle2, Clock, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { downloadConsentPdf } from '@/lib/consentPdfGenerator';

export default function TelehealthConsentManagement() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchConsents();
  }, [statusFilter]);

  const fetchConsents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('telehealth_consents')
        .select(`
          *,
          clients:client_id (
            id,
            first_name,
            last_name,
            medical_record_number
          ),
          profiles:clinician_id (
            id,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter === 'active') {
        query = query
          .eq('consent_given', true)
          .eq('consent_revoked', false)
          .gte('expiration_date', new Date().toISOString().split('T')[0]);
      } else if (statusFilter === 'expired') {
        query = query
          .eq('consent_given', true)
          .eq('consent_revoked', false)
          .lt('expiration_date', new Date().toISOString().split('T')[0]);
      } else if (statusFilter === 'revoked') {
        query = query.eq('consent_revoked', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConsents(data || []);
    } catch (error: any) {
      toast({
        title: 'Error Loading Consents',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatus = (consent: any) => {
    if (consent.consent_revoked) {
      return { label: 'Revoked', variant: 'destructive' as const, icon: AlertTriangle };
    }
    if (!consent.consent_given) {
      return { label: 'Incomplete', variant: 'secondary' as const, icon: Clock };
    }

    const expirationDate = new Date(consent.expiration_date);
    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      return { label: 'Expired', variant: 'destructive' as const, icon: AlertTriangle };
    } else if (daysUntilExpiration <= 30) {
      return { label: `Expires in ${daysUntilExpiration}d`, variant: 'outline' as const, icon: Clock };
    }

    return { label: 'Active', variant: 'default' as const, icon: CheckCircle2 };
  };

  const filteredConsents = consents.filter((consent) => {
    const searchLower = searchTerm.toLowerCase();
    const clientName = `${consent.clients?.first_name} ${consent.clients?.last_name}`.toLowerCase();
    const mrn = consent.clients?.medical_record_number?.toLowerCase() || '';
    
    return clientName.includes(searchLower) || mrn.includes(searchLower);
  });

  // Calculate metrics
  const metrics = {
    total: consents.length,
    active: consents.filter(c => {
      const exp = new Date(c.expiration_date);
      return c.consent_given && !c.consent_revoked && exp >= new Date();
    }).length,
    expiringSoon: consents.filter(c => {
      const exp = new Date(c.expiration_date);
      const days = Math.floor((exp.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return c.consent_given && !c.consent_revoked && days > 0 && days <= 30;
    }).length,
    expired: consents.filter(c => {
      const exp = new Date(c.expiration_date);
      return c.consent_given && !c.consent_revoked && exp < new Date();
    }).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Telehealth Consent Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage client telehealth consents
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Consents</CardDescription>
              <CardTitle className="text-3xl">{metrics.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-3xl text-green-600">{metrics.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Expiring Soon</CardDescription>
              <CardTitle className="text-3xl text-amber-600">{metrics.expiringSoon}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Expired</CardDescription>
              <CardTitle className="text-3xl text-red-600">{metrics.expired}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Consent Records</CardTitle>
            <div className="flex gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Consents</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>MRN</TableHead>
                      <TableHead>Clinician</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Consent Date</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConsents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No consents found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConsents.map((consent) => {
                        const status = getConsentStatus(consent);
                        const StatusIcon = status.icon;
                        
                        return (
                          <TableRow key={consent.id}>
                            <TableCell className="font-medium">
                              {consent.clients?.first_name} {consent.clients?.last_name}
                            </TableCell>
                            <TableCell>{consent.clients?.medical_record_number}</TableCell>
                            <TableCell>
                              {consent.profiles?.first_name} {consent.profiles?.last_name}
                            </TableCell>
                            <TableCell>{consent.client_state_of_residence}</TableCell>
                            <TableCell>
                              {consent.consent_date 
                                ? format(new Date(consent.consent_date), 'MMM d, yyyy')
                                : 'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              {consent.expiration_date
                                ? format(new Date(consent.expiration_date), 'MMM d, yyyy')
                                : 'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4" />
                                </Button>
                                {consent.pdf_document_url && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        await downloadConsentPdf(consent.pdf_document_url);
                                        toast({
                                          title: 'PDF Downloaded',
                                          description: 'Consent PDF has been downloaded.',
                                        });
                                      } catch (error) {
                                        toast({
                                          title: 'Download Failed',
                                          description: 'Could not download the PDF.',
                                          variant: 'destructive',
                                        });
                                      }
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
