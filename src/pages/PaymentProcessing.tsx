import { useState } from 'react';
import {
  DollarSign,
  Upload,
  TrendingUp,
  ReceiptText,
  FileCheck,
  FileText,
  Users
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ERAUploadProcessor,
  PaymentDashboard,
  ManualPaymentForm,
  PaymentReconciliation,
  EOBGenerator,
  PatientStatementGenerator
} from '@/components/billing';

export default function PaymentProcessing() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Processing</h1>
          <p className="text-muted-foreground">
            ERA file processing, payment posting, and patient billing management
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            ERA Upload
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="eob" className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            EOBs
          </TabsTrigger>
          <TabsTrigger value="statements" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Statements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <PaymentDashboard />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <ERAUploadProcessor />
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <ManualPaymentForm />
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <PaymentReconciliation />
        </TabsContent>

        <TabsContent value="eob" className="space-y-4">
          <EOBGenerator />
        </TabsContent>

        <TabsContent value="statements" className="space-y-4">
          <PatientStatementGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
