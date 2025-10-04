import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ServiceCodeDialog } from '@/components/admin/ServiceCodeDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ServiceCode {
  id: string;
  service_type: string;
  code: string;
  description: string;
  default_modifiers?: string;
  duration_minutes?: number;
  standard_rate?: number;
  is_addon: boolean;
  include_in_claims: boolean;
  is_default_for_type: boolean;
  time_units_billing: string;
  time_units_minutes?: number;
  is_active: boolean;
}

export default function ServiceCodes() {
  const [serviceCodes, setServiceCodes] = useState<ServiceCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ServiceCode | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<ServiceCode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchServiceCodes();
  }, []);

  const fetchServiceCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_codes')
        .select('*')
        .eq('is_active', true)
        .order('service_type')
        .order('code');

      if (error) throw error;
      setServiceCodes(data || []);
    } catch (error) {
      console.error('Error fetching service codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedCode(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (code: ServiceCode) => {
    setSelectedCode(code);
    setDialogOpen(true);
  };

  const handleDelete = async (code: ServiceCode) => {
    setCodeToDelete(code);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!codeToDelete) return;

    try {
      const { error } = await supabase
        .from('service_codes')
        .update({ is_active: false })
        .eq('id', codeToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service code removed successfully',
      });
      
      fetchServiceCodes();
    } catch (error) {
      console.error('Error deleting service code:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove service code',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setCodeToDelete(null);
    }
  };

  const handleSave = async () => {
    await fetchServiceCodes();
    setDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Service Codes
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage CPT codes and service rates for appointments and billing
            </p>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Service Code
          </Button>
        </div>

        <Card className="bg-white dark:bg-card border shadow-sm">
          <CardHeader className="bg-white dark:bg-card border-b">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Service Codes
            </CardTitle>
            <CardDescription>
              Service codes are used to identify the service you are providing and billing for,
              and appear on scheduled appointments, notes, and billable items.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white dark:bg-card">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : serviceCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No service codes found. Add one to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Service Type</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Default Modifiers</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white dark:bg-card">
                    {serviceCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-medium">{code.service_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-primary font-mono">{code.code}</code>
                            {code.is_addon && (
                              <Badge variant="outline" className="text-xs">
                                Add-on
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {code.default_modifiers ? (
                            <Badge variant="secondary">{code.default_modifiers}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{code.description}</TableCell>
                        <TableCell className="text-right">
                          {code.duration_minutes ? (
                            <span>{code.duration_minutes} minutes</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {code.standard_rate ? (
                            <span className="font-medium">
                              ${code.standard_rate.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(code)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(code)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          <p>
            Default codes are for demonstration purposes only. Please make any changes necessary for
            your practice. All CPT® codes are copyright by the American Medical Association. CPT®
            is a registered trademark of the American Medical Association.
          </p>
        </div>

        <ServiceCodeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          serviceCode={selectedCode}
          onSave={handleSave}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Service Code</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this service code? This will deactivate it but
                historical records will remain intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
