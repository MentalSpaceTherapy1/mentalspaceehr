/**
 * Eligibility Verification Page
 *
 * Central hub for insurance eligibility verification
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CreditCard, FileText, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EligibilityCheckForm } from '@/components/billing/EligibilityCheckForm';
import { BenefitVisualization } from '@/components/billing/BenefitVisualization';
import { EligibilityHistory } from '@/components/billing/EligibilityHistory';
import { InsuranceCardUpload } from '@/components/billing/InsuranceCardUpload';
import { PatientSyncDialog } from '@/components/billing/PatientSyncDialog';
import type { EligibilityResponse } from '@/lib/advancedmd';

export default function EligibilityVerification() {
  const { clientId } = useParams<{ clientId: string }>();
  const [currentEligibility, setCurrentEligibility] = useState<EligibilityResponse | null>(null);
  const [activeTab, setActiveTab] = useState('check');

  const handleEligibilitySuccess = (response: EligibilityResponse) => {
    setCurrentEligibility(response);
    setActiveTab('results');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance Eligibility</h1>
          <p className="text-muted-foreground">
            Verify insurance coverage and benefits in real-time
          </p>
        </div>
        {clientId && <PatientSyncDialog clientId={clientId} />}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="check" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Check Eligibility
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2" disabled={!currentEligibility}>
            <FileText className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Check Eligibility Tab */}
        <TabsContent value="check" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EligibilityCheckForm
              clientId={clientId}
              onSuccess={handleEligibilitySuccess}
            />
            {clientId && <InsuranceCardUpload clientId={clientId} />}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          {currentEligibility ? (
            <BenefitVisualization eligibility={currentEligibility} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Results</CardTitle>
                <CardDescription>
                  Perform an eligibility check to see results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Use the "Check Eligibility" tab to verify insurance coverage
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {clientId ? (
            <EligibilityHistory clientId={clientId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
                <CardDescription>
                  Select a client to view eligibility history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Client ID is required to view eligibility history
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
