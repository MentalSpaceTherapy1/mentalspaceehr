/**
 * Denial Management Component
 *
 * Manages denied/rejected claims with correction and appeal workflows
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  FileText,
  RefreshCw,
  Edit,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
const sb = supabase as any;
import { useToast } from '@/hooks/use-toast';

interface DeniedClaim {
  id: string;
  claim_id: string;
  claim_control_number: string | null;
  claim_status: string;
  billed_amount: number;
  denial_code: string | null;
  denial_reason: string | null;
  submission_date: string | null;
  statement_from_date: string;
  statement_to_date: string;
}

interface DenialCode {
  code: string;
  description: string;
  actionRequired: string;
  category: 'correctable' | 'appealable' | 'final';
}

// Common denial codes
const DENIAL_CODES: Record<string, DenialCode> = {
  'CO-16': {
    code: 'CO-16',
    description: 'Claim/service lacks information',
    actionRequired: 'Add missing information and resubmit',
    category: 'correctable',
  },
  'CO-18': {
    code: 'CO-18',
    description: 'Exact duplicate claim/service',
    actionRequired: 'Verify not duplicate, or void claim',
    category: 'correctable',
  },
  'CO-22': {
    code: 'CO-22',
    description: 'Resubmission not allowed',
    actionRequired: 'File appeal with additional documentation',
    category: 'appealable',
  },
  'CO-29': {
    code: 'CO-29',
    description: 'Time limit for filing has expired',
    actionRequired: 'File appeal if timely filing exception applies',
    category: 'appealable',
  },
  'CO-45': {
    code: 'CO-45',
    description: 'Charge exceeds fee schedule',
    actionRequired: 'Accept adjustment or file appeal',
    category: 'appealable',
  },
  'CO-50': {
    code: 'CO-50',
    description: 'Non-covered service',
    actionRequired: 'Review policy or bill patient',
    category: 'final',
  },
  'CO-96': {
    code: 'CO-96',
    description: 'Non-covered charge(s)',
    actionRequired: 'Review policy or bill patient',
    category: 'final',
  },
  'CO-97': {
    code: 'CO-97',
    description: 'Benefit for this service is included in another service',
    actionRequired: 'Review bundling rules',
    category: 'correctable',
  },
  'CO-109': {
    code: 'CO-109',
    description: 'Claim not covered by this payer',
    actionRequired: 'Verify insurance or bill correct payer',
    category: 'correctable',
  },
  'CO-151': {
    code: 'CO-151',
    description: 'Payment adjusted because the payer deems the information incomplete',
    actionRequired: 'Add documentation and resubmit',
    category: 'correctable',
  },
  'PR-1': {
    code: 'PR-1',
    description: 'Deductible amount',
    actionRequired: 'Bill patient for deductible',
    category: 'final',
  },
  'PR-2': {
    code: 'PR-2',
    description: 'Coinsurance amount',
    actionRequired: 'Bill patient for coinsurance',
    category: 'final',
  },
  'PR-3': {
    code: 'PR-3',
    description: 'Copayment amount',
    actionRequired: 'Bill patient for copay',
    category: 'final',
  },
};

export function DenialManagement() {
  const { toast } = useToast();
  const [deniedClaims, setDeniedClaims] = useState<DeniedClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<DeniedClaim | null>(null);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [appealNotes, setAppealNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchDeniedClaims();
  }, []);

  const fetchDeniedClaims = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await sb
        .from('insurance_claims')
        .select('*')
        .in('claim_status', ['Denied', 'Rejected'])
        .order('claim_submitted_date', { ascending: false });

      if (error) throw error;

      setDeniedClaims(data || []);
    } catch (error: any) {
      console.error('[DenialManagement] Error:', error);
      toast({
        title: 'Error Loading Denials',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDenialInfo = (denialCode: string | null): DenialCode | null => {
    if (!denialCode) return null;
    return DENIAL_CODES[denialCode] || null;
  };

  const handleCorrectClaim = (claim: DeniedClaim) => {
    setSelectedClaim(claim);
    setCorrectionNotes('');
    setShowCorrectionDialog(true);
  };

  const handleAppealClaim = (claim: DeniedClaim) => {
    setSelectedClaim(claim);
    setAppealNotes('');
    setShowAppealDialog(true);
  };

  const submitCorrection = async () => {
    if (!selectedClaim) return;

    setIsProcessing(true);

    try {
      // Update claim status to Draft for correction
      const { error } = await sb
        .from('insurance_claims')
        .update({
          claim_status: 'Draft',
          claim_type: 'Replacement',
          billing_notes: correctionNotes,
          last_modified: new Date().toISOString(),
        })
        .eq('id', selectedClaim.id);

      if (error) throw error;

      toast({
        title: 'Claim Ready for Correction',
        description: `Claim ${selectedClaim.claim_id} moved to Draft status for corrections`,
      });

      setShowCorrectionDialog(false);
      fetchDeniedClaims();
    } catch (error: any) {
      console.error('[DenialManagement] Correction error:', error);
      toast({
        title: 'Correction Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const submitAppeal = async () => {
    if (!selectedClaim) return;

    setIsProcessing(true);

    try {
      // Update claim status to Appealed
      const { error } = await sb
        .from('insurance_claims')
        .update({
          claim_status: 'Pending',
          appeal_filed: true,
          appeal_date: new Date().toISOString(),
          billing_notes: appealNotes,
          last_modified: new Date().toISOString(),
        })
        .eq('id', selectedClaim.id);

      if (error) throw error;

      toast({
        title: 'Appeal Submitted',
        description: `Appeal filed for claim ${selectedClaim.claim_id}`,
      });

      setShowAppealDialog(false);
      fetchDeniedClaims();
    } catch (error: any) {
      console.error('[DenialManagement] Appeal error:', error);
      toast({
        title: 'Appeal Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Denial Management
              </CardTitle>
              <CardDescription>
                Review and manage denied/rejected claims - {deniedClaims.length} claims requiring attention
              </CardDescription>
            </div>
            <Button onClick={fetchDeniedClaims} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Denials Table */}
      {deniedClaims.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-semibold">No Denied Claims</p>
              <p className="text-sm">All claims are processing successfully</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Service Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Denial Code</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deniedClaims.map((claim) => {
                  const denialInfo = getDenialInfo(claim.denial_code);

                  return (
                    <TableRow key={claim.id}>
                      <TableCell className="font-mono text-sm">
                        {claim.claim_id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-500/20"
                        >
                          {claim.claim_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(claim.statement_from_date), 'MMM d')} -{' '}
                        {format(new Date(claim.statement_to_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(claim.billed_amount)}
                      </TableCell>
                      <TableCell>
                        {denialInfo ? (
                          <Badge variant="outline">{denialInfo.code}</Badge>
                        ) : (
                          claim.denial_code || (
                            <span className="text-muted-foreground">N/A</span>
                          )
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate">
                          {denialInfo?.description || claim.denial_reason || 'No reason provided'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {denialInfo && (
                          <Badge
                            variant="outline"
                            className={
                              denialInfo.category === 'correctable'
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : denialInfo.category === 'appealable'
                                ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }
                          >
                            {denialInfo.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {denialInfo?.category === 'correctable' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCorrectClaim(claim)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Correct
                            </Button>
                          )}
                          {denialInfo?.category === 'appealable' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAppealClaim(claim)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Appeal
                            </Button>
                          )}
                          {!denialInfo && (
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Correction Dialog */}
      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct Claim</DialogTitle>
            <DialogDescription>
              Move claim to Draft status for corrections and resubmission
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1">
                    {getDenialInfo(selectedClaim.denial_code)?.description}
                  </p>
                  <p className="text-sm">
                    {getDenialInfo(selectedClaim.denial_code)?.actionRequired}
                  </p>
                </AlertDescription>
              </Alert>

              <div>
                <Label>Correction Notes</Label>
                <Textarea
                  placeholder="Describe the corrections being made..."
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCorrectionDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={submitCorrection} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Move to Draft'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appeal Dialog */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Appeal</DialogTitle>
            <DialogDescription>
              Submit an appeal for this denied claim with supporting documentation
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1">
                    {getDenialInfo(selectedClaim.denial_code)?.description}
                  </p>
                  <p className="text-sm">
                    Amount: {formatCurrency(selectedClaim.billed_amount)}
                  </p>
                </AlertDescription>
              </Alert>

              <div>
                <Label>Appeal Justification</Label>
                <Textarea
                  placeholder="Explain why this claim should be reconsidered..."
                  value={appealNotes}
                  onChange={(e) => setAppealNotes(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAppealDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={submitAppeal} disabled={isProcessing || !appealNotes}>
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Appeal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
