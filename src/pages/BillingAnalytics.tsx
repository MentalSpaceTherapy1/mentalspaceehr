import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ClaimsAgingReport,
  PayerPerformanceReport,
  RevenueCycleDashboard,
} from '@/components/billing';

export default function BillingAnalytics() {
  const [activeTab, setActiveTab] = useState('revenue');

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive reporting and analytics for revenue cycle management
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue Cycle
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Claims Aging
          </TabsTrigger>
          <TabsTrigger value="payer" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Payer Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueCycleDashboard />
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <ClaimsAgingReport />
        </TabsContent>

        <TabsContent value="payer" className="space-y-4">
          <PayerPerformanceReport />
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
