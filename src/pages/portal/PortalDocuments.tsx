import { useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { usePortalForms } from '@/hooks/usePortalForms';
import { useClientDocuments } from '@/hooks/useClientDocuments';
import { FormRenderer } from '@/components/portal/forms/FormRenderer';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, CheckCircle2, Clock, AlertCircle, Calendar, Download, Eye, FolderOpen } from 'lucide-react';
import { FormWithResponse } from '@/types/forms';
import { format } from 'date-fns';

export default function PortalDocuments() {
  const { portalContext } = usePortalAccount();
  const { toast } = useToast();
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
      console.log('Starting form:', form.id, 'Template:', form.template?.id, 'Sections:', form.template?.sections?.length);
      
      if (!form.response) {
        // Start the form and get the new response directly
        const newResponse = await startForm(form.id);
        
        console.log('Form started, response created:', newResponse.id);
        
        // Verify template has sections
        if (!form.template?.sections || form.template.sections.length === 0) {
          throw new Error('Form template has no sections configured');
        }
        
        // Set selected form with the new response immediately
        setSelectedForm({
          ...form,
          response: newResponse as any,
          status: 'started',
          status_updated_at: new Date().toISOString(),
        });
        
        toast({
          title: 'Form started',
          description: 'You can now begin filling out the form.',
        });
      } else {
        // Form already has a response, verify template before rendering
        if (!form.template) {
          throw new Error('Form template not found');
        }
        
        if (!form.template.sections || form.template.sections.length === 0) {
          throw new Error('Form template has no sections configured');
        }
        
        console.log('Continuing existing form with', form.template.sections.length, 'sections');
        setSelectedForm(form);
      }
    } catch (error) {
      console.error('Error starting form:', error);
      toast({
        title: 'Error starting form',
        description: error instanceof Error ? error.message : 'Failed to start form. Please try again.',
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

  if (isStarting) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Starting form...</p>
        </div>
      </div>
    );
  }

  // If a form is selected, render the form with defensive checks
  if (selectedForm) {
    // Defensive validation before rendering
    const hasValidTemplate = selectedForm.template && 
      selectedForm.template.sections && 
      Array.isArray(selectedForm.template.sections) &&
      selectedForm.template.sections.length > 0;

    if (!hasValidTemplate) {
      console.error('PortalDocuments: Invalid template structure', {
        formId: selectedForm.id,
        hasTemplate: !!selectedForm.template,
        hasSections: !!selectedForm.template?.sections,
        isArray: Array.isArray(selectedForm.template?.sections),
        sectionsCount: selectedForm.template?.sections?.length,
      });
      
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This form template is invalid or incomplete. Please contact support.
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => setSelectedForm(null)}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    console.log('Rendering form:', selectedForm.template.title, 'Sections:', selectedForm.template.sections.length);
    
    return (
      <div className="space-y-6">
        <ErrorBoundary onReset={() => setSelectedForm(null)}>
          <FormRenderer
            template={selectedForm.template}
            response={selectedForm.response}
            onSaveProgress={handleSaveProgress}
            onSubmit={handleSubmit}
            onCancel={() => setSelectedForm(null)}
            isSaving={isSaving}
            isSubmitting={isSubmitting}
          />
        </ErrorBoundary>
      </div>
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
