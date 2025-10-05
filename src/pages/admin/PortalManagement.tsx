import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Mail, Settings } from 'lucide-react';
import { PortalClientsTable } from '@/components/admin/portal/PortalClientsTable';
import { PortalEmailTemplates } from '@/components/admin/portal/PortalEmailTemplates';
import { PortalSettings } from '@/components/admin/portal/PortalSettings';

export default function PortalManagement() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Client Portal Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage client portal access, email templates, and settings
            </p>
          </div>

          <Tabs defaultValue="clients" className="space-y-6">
            <TabsList>
              <TabsTrigger value="clients">
                <Users className="h-4 w-4 mr-2" />
                Client Access
              </TabsTrigger>
              <TabsTrigger value="templates">
                <Mail className="h-4 w-4 mr-2" />
                Email Templates
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Portal Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clients">
              <PortalClientsTable />
            </TabsContent>

            <TabsContent value="templates">
              <PortalEmailTemplates />
            </TabsContent>

            <TabsContent value="settings">
              <PortalSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
