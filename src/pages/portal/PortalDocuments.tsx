import { useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { usePortalForms } from '@/hooks/usePortalForms';
import { useClientDocuments } from '@/hooks/useClientDocuments';
import { FormRenderer } from '@/components/portal/forms/FormRenderer';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, CheckCircle2, Clock, AlertCircle, Calendar, Download, Eye, FolderOpen } from 'lucide-react';
import { FormWithResponse } from '@/types/forms';
import { format } from 'date-fns';

export default function PortalDocuments() {
  const { portalContext } = usePortalAccount();
  const [selectedForm, setSelectedForm] = useState<FormWithResponse | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const {
    forms,
    isLoading,
    startForm,
    saveProgress,
    submitForm,
    isStarting,
    isSaving,
    isSubmitting,
  } = usePortalForms(portalContext?.account.clientId);

  const {
    documents,
    isLoading: docsLoading,
    downloadDocument,
    getDocumentUrl,
  } = useClientDocuments(portalContext?.account.clientId);

  const handleStartForm = async (form: FormWithResponse) => {
    try {
      console.log('Starting form:', form.id);
      
      if (!form.response) {
        // Start the form and wait for completion
        await startForm(form.id);
        
        // Small delay to ensure cache is updated
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setSelectedForm(form);
    } catch (error) {
      console.error('Error starting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to start form. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProgress = (responses: Record<string, any>, progressPercentage: number) => {
    if (selectedForm?.response) {
      saveProgress({
        responseId: selectedForm.response.id,
        responses,
        progressPercentage,
      });
    }
  };

  const handleSubmit = (responses: Record<string, any>, signature?: string, timeSpentSeconds?: number) => {
    if (selectedForm?.response) {
      submitForm({
        responseId: selectedForm.response.id,
        assignmentId: selectedForm.id,
        responses,
        signature,
        timeSpentSeconds: timeSpentSeconds || 0,
      });
      setSelectedForm(null);
    }
  };

  const handleViewDocument = async (doc: any) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
    const url = await getDocumentUrl(doc);
    setDocumentUrl(url);
  };

  const handleDownloadDocument = (doc: any) => {
    downloadDocument(doc);
  };

  // Filter for shared documents only
  const sharedDocuments = documents.filter(doc => 
    doc.shared_with_client || doc.shared_via_portal
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedForm && selectedForm.template) {
    return (
      <FormRenderer
        template={selectedForm.template}
        response={selectedForm.response}
        onSaveProgress={handleSaveProgress}
        onSubmit={handleSubmit}
        onCancel={() => setSelectedForm(null)}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
      />
    );
  }

  const pendingForms = forms?.filter(f => ['assigned', 'started'].includes(f.status)) || [];
  const completedForms = forms?.filter(f => f.status === 'completed') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'started':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      urgent: 'destructive',
      high: 'default',
      normal: 'secondary',
      low: 'outline',
    };
    return <Badge variant={variants[priority] || 'secondary'}>{priority}</Badge>;
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Forms & Documents</h1>
          <p className="text-muted-foreground">Complete required forms and view your documents</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Forms ({pendingForms.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed Forms ({completedForms.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              My Documents ({sharedDocuments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingForms.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No pending forms</p>
                  <p className="text-sm text-muted-foreground">
                    You're all caught up! Check back later for new forms.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingForms.map(form => (
                <Card key={form.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {form.template?.title}
                        </CardTitle>
                        <CardDescription>{form.template?.description}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(form.status)}
                        {getPriorityBadge(form.priority)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {form.instructions && (
                      <div className="text-sm text-muted-foreground border-l-2 border-primary pl-4">
                        {form.instructions}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {form.due_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {format(new Date(form.due_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {form.template?.estimated_minutes && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{form.template.estimated_minutes} minutes</span>
                        </div>
                      )}
                      {form.response && form.response.progress_percentage > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {form.response.progress_percentage}% complete
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleStartForm(form)}
                      disabled={isStarting}
                      className="w-full sm:w-auto"
                    >
                      {form.status === 'started' ? 'Continue Form' : 'Start Form'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedForms.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No completed forms</p>
                  <p className="text-sm text-muted-foreground">
                    Completed forms will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedForms.map(form => (
                <Card key={form.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {form.template?.title}
                        </CardTitle>
                        <CardDescription>{form.template?.description}</CardDescription>
                      </div>
                      {getStatusBadge(form.status)}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Completed: {format(new Date(form.completed_at!), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {form.response?.reviewed_at && (
                        <Badge variant="outline">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Reviewed by clinician
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {docsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
              </Card>
            ) : sharedDocuments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No documents available</p>
                  <p className="text-sm text-muted-foreground">
                    Your therapist hasn't shared any documents with you yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sharedDocuments.map(doc => (
                  <Card key={doc.id} className="hover:border-primary transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {doc.title}
                          </CardTitle>
                          {doc.description && (
                            <CardDescription>{doc.description}</CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary">{doc.document_type}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Shared: {format(new Date(doc.shared_date || doc.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        {doc.file_size_bytes && (
                          <span>{(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                      </div>

                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {doc.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleViewDocument(doc)}
                          variant="default"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          onClick={() => handleDownloadDocument(doc)}
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DocumentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          document={selectedDocument}
          documentUrl={documentUrl}
          onDownload={() => selectedDocument && handleDownloadDocument(selectedDocument)}
        />
      </div>
    );
  }
