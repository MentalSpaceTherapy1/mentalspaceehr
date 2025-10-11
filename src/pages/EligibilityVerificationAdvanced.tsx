/**
 * Eligibility Verification Page - AdvancedMD Phase 6
 *
 * Central hub for insurance eligibility verification with real-time and batch processing
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealTimeEligibilityCheck } from '@/components/billing/RealTimeEligibilityCheck';
import { BatchEligibilityVerification } from '@/components/billing/BatchEligibilityVerification';
import { EligibilityHistoryTracker } from '@/components/billing/EligibilityHistoryTracker';
import { CoverageDetailsViewer } from '@/components/billing/CoverageDetailsViewer';

export default function EligibilityVerificationAdvanced() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insurance Eligibility Verification</h1>
        <p className="text-muted-foreground mt-2">
          Verify insurance eligibility, check benefits, and manage coverage information
        </p>
      </div>

      <Tabs defaultValue="realtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="realtime">Real-Time Check</TabsTrigger>
          <TabsTrigger value="batch">Batch Verification</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime">
          <RealTimeEligibilityCheck />
        </TabsContent>

        <TabsContent value="batch">
          <BatchEligibilityVerification />
        </TabsContent>

        <TabsContent value="coverage">
          <CoverageDetailsViewer />
        </TabsContent>

        <TabsContent value="history">
          <EligibilityHistoryTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}
