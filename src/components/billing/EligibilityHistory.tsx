/**
 * Eligibility History Component
 *
 * Displays eligibility check history for a client
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { BenefitVisualization } from './BenefitVisualization';
import type { EligibilityResponse } from '@/lib/advancedmd';

interface EligibilityHistoryProps {
  clientId: string;
  limit?: number;
}

interface EligibilityRecord {
  id: string;
  service_date: string;
  check_date: string;
  coverage_status: string;
  payer_name: string;
  plan_name: string | null;
  copay: string | null;
  deductible_remaining: string | null;
  oop_max_remaining: string | null;
  prior_auth_required: boolean;
  response_code: string | null;
  // Full data for expanded view
  fullData?: EligibilityResponse;
}

export function EligibilityHistory({ clientId, limit = 10 }: EligibilityHistoryProps) {
  const [records, setRecords] = useState<EligibilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('advancedmd_eligibility_checks')
        .select('*')
        .eq('client_id', clientId)
        .order('check_date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setRecords(data || []);
    } catch (err: any) {
      console.error('[EligibilityHistory] Error:', err);
      setError(err.message || 'Failed to load eligibility history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [clientId, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCoverageIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Inactive':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCoverageColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Inactive':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const mapToEligibilityResponse = (record: EligibilityRecord): EligibilityResponse => {
    return {
      coverageStatus: record.coverage_status as any,
      payerName: record.payer_name,
      payerId: '', // Not in history table
      memberId: '', // Not in history table
      groupNumber: null,
      planName: record.plan_name,
      copay: record.copay ? parseFloat(record.copay) : undefined,
      coinsurance: undefined,
      deductibleTotal: undefined,
      deductibleMet: undefined,
      deductibleRemaining: record.deductible_remaining ? parseFloat(record.deductible_remaining) : undefined,
      oopMaxTotal: undefined,
      oopMaxMet: undefined,
      oopMaxRemaining: record.oop_max_remaining ? parseFloat(record.oop_max_remaining) : undefined,
      priorAuthRequired: record.prior_auth_required,
      priorAuthNumber: null,
      benefits: [],
      limitations: [],
      checkDate: record.check_date,
      responseCode: record.response_code,
    };
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchHistory} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eligibility History</CardTitle>
          <CardDescription>No eligibility checks found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No insurance eligibility checks have been performed yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Eligibility History</CardTitle>
            <CardDescription>
              {records.length} eligibility check{records.length !== 1 ? 's' : ''} on file
            </CardDescription>
          </div>
          <Button onClick={fetchHistory} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {records.map((record) => (
            <Collapsible
              key={record.id}
              open={expandedId === record.id}
              onOpenChange={() => toggleExpand(record.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      {getCoverageIcon(record.coverage_status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{record.payer_name}</span>
                          <Badge className={getCoverageColor(record.coverage_status)} variant="outline">
                            {record.coverage_status}
                          </Badge>
                          {record.prior_auth_required && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                              Prior Auth Required
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Service: {format(new Date(record.service_date), 'MMM d, yyyy')}</span>
                          <span>Checked: {format(new Date(record.check_date), 'MMM d, yyyy h:mm a')}</span>
                          {record.copay && <span>Copay: {formatCurrency(record.copay)}</span>}
                        </div>
                      </div>
                    </div>
                    {expandedId === record.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t p-4 bg-muted/30">
                    <BenefitVisualization
                      eligibility={mapToEligibilityResponse(record)}
                      showHeader={false}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
