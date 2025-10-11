/**
 * Patient Sync Dialog Component
 *
 * Syncs patient information to AdvancedMD billing system
 */

import { useState, useEffect } from 'react';
import { Users, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { getAdvancedMDClient } from '@/lib/advancedmd';
import { useToast } from '@/hooks/use-toast';
import type { PatientSyncRequest, PatientSyncResponse } from '@/lib/advancedmd';
const sb = supabase as any;

interface PatientSyncDialogProps {
  clientId: string;
  trigger?: React.ReactNode;
}

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
}

interface InsuranceData {
  id: string;
  insurance_type: string;
  insurance_company: string;
  payer_id: string | null;
  member_id: string;
  group_number: string | null;
  relationship_to_insured: string;
}

interface SyncStatus {
  isSynced: boolean;
  advancedmdPatientId: string | null;
  lastSyncedAt: string | null;
  syncStatus: string | null;
  syncError: string | null;
}

export function PatientSyncDialog({ clientId, trigger }: PatientSyncDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [insurances, setInsurances] = useState<InsuranceData[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSynced: false,
    advancedmdPatientId: null,
    lastSyncedAt: null,
    syncStatus: null,
    syncError: null,
  });
  const [syncResult, setSyncResult] = useState<PatientSyncResponse | null>(null);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      // Fetch client data
      const { data: client, error: clientError } = await sb
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClientData(client as any);

      // Fetch insurance data
      const { data: insuranceData, error: insuranceError } = await sb
        .from('client_insurance')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'Active');

      if (!insuranceError && insuranceData) {
        setInsurances(insuranceData as any);
      }

      // Check sync status
      const { data: mapping, error: mappingError } = await sb
        .from('advancedmd_patient_mapping')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (!mappingError && mapping) {
        setSyncStatus({
          isSynced: true,
          advancedmdPatientId: (mapping as any).advancedmd_patient_id,
          lastSyncedAt: (mapping as any).last_synced_at,
          syncStatus: (mapping as any).sync_status,
          syncError: (mapping as any).sync_error,
        });
      }
    } catch (error: any) {
      console.error('[PatientSync] Error fetching data:', error);
      toast({
        title: 'Error Loading Data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncPatient = async () => {
    if (!clientData) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      console.log('[PatientSync] Syncing patient to AdvancedMD...');

      // Build patient sync request
      const request: PatientSyncRequest = {
        firstName: clientData.first_name,
        lastName: clientData.last_name,
        dateOfBirth: clientData.date_of_birth,
        gender: clientData.gender as 'M' | 'F' | 'U',
        address1: clientData.address1 || '',
        address2: clientData.address2,
        city: clientData.city || '',
        state: clientData.state || '',
        zipCode: clientData.zip_code || '',
        phone: clientData.phone || '',
        email: clientData.email,
        internalPatientId: clientData.id,
        insurances: insurances.map((ins) => ({
          rank: ins.insurance_type === 'Primary' ? 'Primary' as const : 'Secondary' as const,
          insuranceCompany: ins.insurance_company,
          payerId: ins.payer_id || '',
          memberId: ins.member_id,
          groupNumber: ins.group_number,
          subscriberRelationship: ins.relationship_to_insured as any,
        })),
      };

      const client = getAdvancedMDClient();
      const response = await client.syncPatient(request);

      if (response.success && response.data) {
        console.log('[PatientSync] Sync successful:', response.data);
        setSyncResult(response.data);

        // Update sync status
        setSyncStatus({
          isSynced: true,
          advancedmdPatientId: (response.data as any).advancedMDPatientId,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: response.data.status,
          syncError: null,
        });

        toast({
          title: 'Patient Synced Successfully',
          description: `Patient ID in AdvancedMD: ${(response.data as any).advancedMDPatientId}`,
        });
      } else {
        throw new Error(response.error?.message || 'Sync failed');
      }
    } catch (error: any) {
      console.error('[PatientSync] Error:', error);
      setSyncStatus((prev) => ({
        ...prev,
        syncError: error.message,
      }));
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Sync to AdvancedMD
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sync Patient to AdvancedMD
          </DialogTitle>
          <DialogDescription>
            Sync patient demographics and insurance information to AdvancedMD billing system
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sync Status */}
            {syncStatus.isSynced && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Already Synced</p>
                      <p className="text-sm text-muted-foreground">
                        AdvancedMD Patient ID: {syncStatus.advancedmdPatientId}
                      </p>
                      {syncStatus.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                      {syncStatus.syncStatus}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {syncStatus.syncError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">Previous Sync Error</p>
                  <p className="text-sm">{syncStatus.syncError}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Patient Information */}
            {clientData && (
              <div className="space-y-3">
                <h4 className="font-semibold">Patient Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm bg-muted p-4 rounded-lg">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-semibold">
                      {clientData.first_name} {clientData.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-semibold">
                      {new Date(clientData.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gender</p>
                    <p className="font-semibold">{clientData.gender}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-semibold">{clientData.phone || 'N/A'}</p>
                  </div>
                  {clientData.address1 && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-semibold">
                        {clientData.address1}
                        {clientData.address2 && `, ${clientData.address2}`}
                        {clientData.city && clientData.state && (
                          <>, {clientData.city}, {clientData.state} {clientData.zip_code}</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Insurance Information */}
            <div className="space-y-3">
              <h4 className="font-semibold">Insurance Information</h4>
              {insurances.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No active insurance on file. Add insurance before syncing.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {insurances.map((insurance) => (
                    <div
                      key={insurance.id}
                      className="border rounded-lg p-3 bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{insurance.insurance_type}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Company</p>
                          <p className="font-semibold">{insurance.insurance_company}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Member ID</p>
                          <p className="font-semibold">{insurance.member_id}</p>
                        </div>
                        {insurance.group_number && (
                          <div>
                            <p className="text-muted-foreground">Group Number</p>
                            <p className="font-semibold">{insurance.group_number}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Relationship</p>
                          <p className="font-semibold">{insurance.relationship_to_insured}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sync Result */}
            {syncResult && (
              <>
                <Separator />
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Sync Successful!
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>AdvancedMD Patient ID: <span className="font-mono">{(syncResult as any).advancedMDPatientId}</span></p>
                      <p>Status: <Badge variant="outline">{syncResult.status}</Badge></p>
                      {(syncResult as any).message && <p>{(syncResult as any).message}</p>}
                    </div>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {syncStatus.isSynced && (
            <Button
              onClick={syncPatient}
              disabled={isSyncing || isLoading || insurances.length === 0}
              variant="outline"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-sync
                </>
              )}
            </Button>
          )}
          {!syncStatus.isSynced && (
            <Button
              onClick={syncPatient}
              disabled={isSyncing || isLoading || insurances.length === 0}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Sync to AdvancedMD
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
