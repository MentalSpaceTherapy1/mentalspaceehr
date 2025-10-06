import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Library, ClipboardList, BarChart3, Settings } from 'lucide-react';
import { useDocumentLibrary } from '@/hooks/useDocumentLibrary';
import { useClinicalAssessments } from '@/hooks/useClinicalAssessments';

export default function DocumentManagement() {
  const { documents } = useDocumentLibrary();
  const { assessments } = useClinicalAssessments();

  const stats = {
    totalLibraryDocs: documents.length,
    totalAssessments: assessments.length,
    storageUsed: documents.reduce((sum, doc) => sum + (doc.file_size_bytes || 0), 0),
    mostUsed: documents.sort((a, b) => b.usage_count - a.usage_count)[0],
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Document Management Console</h1>
            <p className="text-muted-foreground mt-1">
              Unified interface for managing documents, templates, and assessments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Library Documents</CardTitle>
                  <Library className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLibraryDocs}</div>
                <p className="text-xs text-muted-foreground mt-1">Templates available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAssessments}</div>
                <p className="text-xs text-muted-foreground mt-1">Clinical tools</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(stats.storageUsed)}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all documents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Most Used</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.mostUsed?.usage_count || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {stats.mostUsed?.title || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="library">
                <Library className="h-4 w-4 mr-2" />
                Library
              </TabsTrigger>
              <TabsTrigger value="assessments">
                <ClipboardList className="h-4 w-4 mr-2" />
                Assessments
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest document and assessment activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {documents.slice(0, 5).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{doc.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {doc.usage_count} uses
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Popular Assessments</CardTitle>
                    <CardDescription>Most frequently administered</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assessments.slice(0, 5).map((assessment) => (
                        <div key={assessment.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{assessment.acronym}</div>
                              <div className="text-xs text-muted-foreground">
                                {assessment.category}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assessment.total_items} items
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="library">
              <Card>
                <CardHeader>
                  <CardTitle>Document Library Management</CardTitle>
                  <CardDescription>
                    Manage practice-wide templates and resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    View and manage library documents in the{' '}
                    <a href="/admin/document-library" className="text-primary underline">
                      Document Library
                    </a>{' '}
                    page.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assessments">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Management</CardTitle>
                  <CardDescription>
                    Manage clinical assessments and scoring tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    View and manage assessments in the{' '}
                    <a href="/admin/assessments" className="text-primary underline">
                      Assessments
                    </a>{' '}
                    page.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Analytics</CardTitle>
                  <CardDescription>Document and assessment usage statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Document Categories</h4>
                      <div className="space-y-2">
                        {/* Placeholder for category breakdown */}
                        <div className="text-sm text-muted-foreground">
                          Analytics coming soon...
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Document Management Settings</CardTitle>
                  <CardDescription>Configure document and assessment settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Settings configuration coming soon...
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
