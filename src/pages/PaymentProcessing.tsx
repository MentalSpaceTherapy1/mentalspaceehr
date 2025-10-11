import { useState } from 'react';
import { DollarSign, Upload, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ERAUploadProcessor, PaymentDashboard } from '@/components/billing';

export default function PaymentProcessing() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Processing</h1>
          <p className="text-muted-foreground">
            ERA file processing and payment posting management
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Payment Dashboard
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            ERA Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <PaymentDashboard />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <ERAUploadProcessor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
