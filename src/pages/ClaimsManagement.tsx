/**
 * Claims Management Page
 *
 * Central hub for all claims-related activities
 */

import { useState } from 'react';
import { FileText, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ClaimCreationForm,
  ClaimsDashboard,
  DenialManagement,
} from '@/components/billing';
import type { ClaimSubmissionResponse } from '@/lib/advancedmd';

export default function ClaimsManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleClaimSuccess = (response: ClaimSubmissionResponse) => {
    console.log('[ClaimsManagement] Claim submitted:', response);
    setShowCreateDialog(false);
    setActiveTab('dashboard');
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Claims Management</h1>
          <p className="text-muted-foreground">
            Create, submit, and manage insurance claims
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Claim</DialogTitle>
              <DialogDescription>
                Complete the form below to create and submit an insurance claim
              </DialogDescription>
            </DialogHeader>
            <ClaimCreationForm onSuccess={handleClaimSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Claims Dashboard
          </TabsTrigger>
          <TabsTrigger value="denials" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Denial Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ClaimsDashboard />
        </TabsContent>

        <TabsContent value="denials">
          <DenialManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Analytics dashboard coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}
