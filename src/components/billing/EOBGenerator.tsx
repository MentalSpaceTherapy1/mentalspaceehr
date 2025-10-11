import { useState, useEffect } from 'react';
import { FileText, Download, Send, Loader2, Eye } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (date: string | Date) => format(new Date(date), 'MMM d, yyyy');
const sb = supabase as any;

interface Claim {
  id: string;
  claim_id: string;
  billed_amount: number;
  paid_amount: number;
  claim_status: string;
  statement_from_date: string;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface EOBRecord {
  id: string;
  eob_number: string;
  eob_date: string;
  patient_name: string;
  payer_name: string;
  total_billed: number;
  total_allowed: number;
  total_paid: number;
  total_patient_responsibility: number;
  sent_to_patient: boolean;
  sent_at: string;
  service_lines: any;
}

export function EOBGenerator() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [eobs, setEOBs] = useState<EOBRecord[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedEOB, setSelectedEOB] = useState<EOBRecord | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load existing EOBs first
      const { data: eobsData } = await sb
        .from('advancedmd_eobs')
        .select('*')
        .order('eob_date', { ascending: false })
        .limit(50);

      if (eobsData) {
        setEOBs(eobsData as any);
      }

      // Load paid claims (filter out those already in EOBs client-side)
      const { data: claimsData } = await sb
        .from('insurance_claims')
        .select(
          `
          id,
          claim_id,
          total_charge_amount,
          paid_amount,
          claim_status,
          claim_created_date,
          clients (
            id,
            first_name,
            last_name
          )
        `
        )
        .eq('claim_status', 'Paid')
        .order('claim_created_date', { ascending: false })
        .limit(50);

      if (claimsData) {
        const eobClaimIds = new Set((eobsData || []).map((e: any) => e.claim_id));
        const filtered = (claimsData as any[]).filter((c: any) => !eobClaimIds.has(c.id));
        setClaims(filtered as any);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEOB = async (claim: Claim) => {
    try {
      setGenerating(true);

      // Get payment details
      const { data: payments } = await sb
        .from('advancedmd_payment_postings')
        .select('*, advancedmd_payment_adjustments(*)')
        .eq('claim_id', claim.id);

      if (!payments || payments.length === 0) {
        toast({
          title: 'No Payments Found',
          description: 'This claim has no payment postings',
          variant: 'destructive',
        });
        return;
      }

      // Get service lines from claim
      const { data: claimDetails } = await sb
        .from('insurance_claims')
        .select('*')
        .eq('id', claim.id)
        .single();

      const eobNumber = `EOB-${Date.now()}-${claim.claim_id}`;

      const totalPaid = payments.reduce((sum, p) => sum + (p.payment_amount || 0), 0);
      const totalAdjustments = payments.reduce(
        (sum, p) => sum + (p.contractual_adjustment || 0) + (p.deductible || 0) + (p.copay || 0),
        0
      );
      const totalPatientResp = payments.reduce((sum, p) => sum + (p.patient_responsibility || 0), 0);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create EOB record
      const { data: eob, error } = await sb
        .from('advancedmd_eobs')
        .insert({
          claim_id: claim.id,
          eob_number: eobNumber,
          eob_date: new Date().toISOString().split('T')[0],
          patient_name: `${claim.clients.first_name} ${claim.clients.last_name}`,
          patient_id: claim.clients.id,
          provider_name: 'Mental Space Therapy',
          payer_name: 'Insurance Company',
          total_billed: claim.billed_amount,
          total_allowed: claim.billed_amount - totalAdjustments,
          total_paid: totalPaid,
          total_patient_responsibility: totalPatientResp,
          service_lines: claimDetails?.service_lines || [],
          adjustments_summary: payments.map((p) => ({
            payment_date: p.payment_date,
            payment_amount: p.payment_amount,
            adjustments: p.advancedmd_payment_adjustments || [],
          })),
          generated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'EOB Generated',
        description: `EOB ${eobNumber} has been created successfully`,
      });

      loadData();
    } catch (error) {
      console.error('Error generating EOB:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const sendEOBToPatient = async (eob: EOBRecord) => {
    try {
      const { error } = await sb
        .from('advancedmd_eobs')
        .update({
          sent_to_patient: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', eob.id);

      if (error) throw error;

      toast({
        title: 'EOB Sent',
        description: 'EOB has been marked as sent to patient',
      });

      loadData();
    } catch (error) {
      console.error('Error sending EOB:', error);
      toast({
        title: 'Send Failed',
        description: 'Failed to mark EOB as sent',
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
      {/* Generate EOBs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate EOBs</CardTitle>
          <CardDescription>
            Create Explanation of Benefits for paid claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No paid claims pending EOB generation
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service Date</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.claim_id}</TableCell>
                    <TableCell>
                      {claim.clients.first_name} {claim.clients.last_name}
                    </TableCell>
                    <TableCell>{formatDate(claim.statement_from_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(claim.billed_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(claim.paid_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge>{claim.claim_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => generateEOB(claim)}
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
                            Generate EOB
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

      {/* EOB History */}
      <Card>
        <CardHeader>
          <CardTitle>EOB History</CardTitle>
          <CardDescription>Previously generated Explanation of Benefits</CardDescription>
        </CardHeader>
        <CardContent>
          {eobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No EOBs generated yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EOB Number</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Patient Resp</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eobs.map((eob) => (
                  <TableRow key={eob.id}>
                    <TableCell className="font-medium">{eob.eob_number}</TableCell>
                    <TableCell>{eob.patient_name}</TableCell>
                    <TableCell>{formatDate(eob.eob_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(eob.total_billed)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(eob.total_paid)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(eob.total_patient_responsibility)}
                    </TableCell>
                    <TableCell>
                      {eob.sent_to_patient ? (
                        <Badge variant="default">Sent {formatDate(eob.sent_at)}</Badge>
                      ) : (
                        <Badge variant="secondary">Not Sent</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEOB(eob);
                            setShowPreview(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!eob.sent_to_patient && (
                          <Button size="sm" onClick={() => sendEOBToPatient(eob)}>
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

      {/* EOB Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Explanation of Benefits</DialogTitle>
            <DialogDescription>EOB Document Preview</DialogDescription>
          </DialogHeader>

          {selectedEOB && (
            <div className="space-y-4">
              <div className="border rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">Explanation of Benefits</h3>
                    <p className="text-sm text-muted-foreground">EOB #: {selectedEOB.eob_number}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Date: {formatDate(selectedEOB.eob_date)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium">Patient</p>
                    <p className="text-sm text-muted-foreground">{selectedEOB.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Insurance Company</p>
                    <p className="text-sm text-muted-foreground">{selectedEOB.payer_name}</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-medium">Summary of Benefits</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Billed:</span>
                      <span className="font-medium">{formatCurrency(selectedEOB.total_billed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Allowed:</span>
                      <span className="font-medium">{formatCurrency(selectedEOB.total_allowed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance Paid:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(selectedEOB.total_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">You Owe:</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(selectedEOB.total_patient_responsibility)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedEOB.service_lines && selectedEOB.service_lines.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Service Details</h4>
                    <div className="text-sm space-y-1">
                      {selectedEOB.service_lines.map((line: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>
                            {line.procedure_code} - {line.description || 'Service'}
                          </span>
                          <span>{formatCurrency(line.billed_amount || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
