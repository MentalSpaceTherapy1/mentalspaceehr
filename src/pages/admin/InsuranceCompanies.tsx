import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InsuranceCompany {
  id: string;
  company_name: string;
  payer_id?: string;
  phone?: string;
  electronic_claims_supported: boolean;
  era_supported: boolean;
  is_active: boolean;
}

export default function InsuranceCompanies() {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('company_name');

      if (error) throw error;
      setCompanies(data as any || []);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load insurance companies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Insurance Companies
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage insurance companies and payer information
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Insurance Company
          </Button>
        </div>

        <Card className="bg-card border shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Insurance Companies
            </CardTitle>
            <CardDescription>
              Manage payer information for claims submission and eligibility verification
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No insurance companies found. Add one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Company Name</TableHead>
                    <TableHead>Payer ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-center">Electronic Claims</TableHead>
                    <TableHead className="text-center">ERA</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.company_name}</TableCell>
                      <TableCell>
                        <code className="text-sm text-green-700 dark:text-green-400">
                          {company.payer_id || '—'}
                        </code>
                      </TableCell>
                      <TableCell>{company.phone || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={company.electronic_claims_supported ? 'default' : 'secondary'}>
                          {company.electronic_claims_supported ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={company.era_supported ? 'default' : 'secondary'}>
                          {company.era_supported ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={company.is_active ? 'default' : 'secondary'}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
