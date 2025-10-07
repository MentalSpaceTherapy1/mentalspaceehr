import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Mail, Settings, FileText, BookOpen } from 'lucide-react';
import { PortalClientsTable } from '@/components/admin/portal/PortalClientsTable';
import { PortalEmailTemplates } from '@/components/admin/portal/PortalEmailTemplates';
import { PortalSettings } from '@/components/admin/portal/PortalSettings';
import { PortalFormsManagement } from '@/components/admin/portal/PortalFormsManagement';
import { PortalResourcesManagement } from '@/components/admin/portal/PortalResourcesManagement';

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
              <TabsTrigger value="forms">
                <FileText className="h-4 w-4 mr-2" />
                Forms
              </TabsTrigger>
              <TabsTrigger value="resources">
                <BookOpen className="h-4 w-4 mr-2" />
                Resources
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

            <TabsContent value="forms">
              <PortalFormsManagement />
            </TabsContent>

            <TabsContent value="resources">
              <PortalResourcesManagement />
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
