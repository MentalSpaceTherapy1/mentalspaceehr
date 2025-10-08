import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortalFormTemplates } from '@/hooks/usePortalFormTemplates';
import { usePortalForms } from '@/hooks/usePortalForms';
import { FormAssignmentDialog } from './FormAssignmentDialog';
import { FormResponseReviewDialog } from '@/components/admin/portal/FormResponseReviewDialog';
import { ClipboardList, Clock, CheckCircle, XCircle, Eye, Send, Printer, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { FormTemplate, FormWithResponse } from '@/types/forms';

interface ClientPortalFormsSectionProps {
  clientId: string;
}

export const ClientPortalFormsSection = ({ clientId }: ClientPortalFormsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FormWithResponse | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);

  const { activeTemplates, templatesLoading } = usePortalFormTemplates();
  const { forms, isLoading, cancelAssignment, resendNotification } = usePortalForms(clientId);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      assigned: { label: 'Assigned', variant: 'secondary' as const, icon: ClipboardList },
      started: { label: 'In Progress', variant: 'default' as const, icon: Clock },
      completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
      expired: { label: 'Expired', variant: 'destructive' as const, icon: XCircle },
      cancelled: { label: 'Cancelled', variant: 'outline' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.assigned;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'destructive' as const,
      high: 'default' as const,
      normal: 'secondary' as const,
      low: 'outline' as const,
    };
    return <Badge variant={variants[priority as keyof typeof variants]}>{priority}</Badge>;
  };

  const handleAssignForm = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setAssignDialogOpen(true);
  };

  const handleToggleFormSelection = (formId: string) => {
    setSelectedForms(prev =>
      prev.includes(formId) ? prev.filter(id => id !== formId) : [...prev, formId]
    );
  };

  const handleBulkAssign = () => {
    if (selectedForms.length === 0) {
      toast({
        title: 'No forms selected',
        description: 'Please select at least one form to assign',
        variant: 'destructive',
      });
      return;
    }
    // Open dialog for bulk assignment - we'll use the first selected form's template
    const firstForm = filteredTemplates?.find(t => selectedForms.includes(t.id));
    if (firstForm) {
      setSelectedTemplate(firstForm);
      setAssignDialogOpen(true);
    }
  };

  const handleReviewResponse = (form: FormWithResponse) => {
    setSelectedResponse(form);
    setReviewDialogOpen(true);
  };

  const handleCancelAssignment = async (assignmentId: string) => {
    if (confirm('Are you sure you want to cancel this form assignment?')) {
      await cancelAssignment(assignmentId);
    }
  };

  const handleResendNotification = async (assignmentId: string) => {
    await resendNotification(assignmentId);
  };

  const handlePrintResponse = (form: FormWithResponse) => {
    window.print();
    toast({
      title: 'Print dialog opened',
      description: 'Prepare to print the form response',
    });
  };

  const filteredTemplates = activeTemplates?.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.form_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredForms = forms?.filter(form => {
    if (statusFilter === 'all') return true;
    return form.status === statusFilter;
  });

  const activeForms = forms?.filter(f => ['assigned', 'started'].includes(f.status));
  const completedForms = forms?.filter(f => f.status === 'completed' && !f.saved_to_chart);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="assign" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assign">
            <ClipboardList className="h-4 w-4 mr-2" />
            Assign Forms
          </TabsTrigger>
          <TabsTrigger value="active">
            <Clock className="h-4 w-4 mr-2" />
            Active Assignments ({activeForms?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed ({completedForms?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Assign Forms */}
        <TabsContent value="assign">
          <Card>
            <CardHeader>
              <CardTitle>Available Forms</CardTitle>
              <CardDescription>
                Select a form to assign to this client for completion via their portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <Input
                  placeholder="Search forms by title or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                {selectedForms.length > 0 && (
                  <Button onClick={handleBulkAssign}>
                    Assign {selectedForms.length} Form{selectedForms.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              {templatesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading forms...</div>
              ) : !filteredTemplates?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No forms available to assign
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input
                          type="checkbox"
                          checked={selectedForms.length === filteredTemplates.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForms(filteredTemplates.map(t => t.id));
                            } else {
                              setSelectedForms([]);
                            }
                          }}
                          className="h-4 w-4"
                        />
                      </TableHead>
                      <TableHead>Form Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Signature Required</TableHead>
                      <TableHead>Est. Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedForms.includes(template.id)}
                            onChange={() => handleToggleFormSelection(template.id)}
                            className="h-4 w-4"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{template.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.form_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {template.requires_signature ? (
                            <Badge variant="default">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.estimated_minutes ? `~${template.estimated_minutes} min` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleAssignForm(template)}
                          >
                            Assign Form
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Active Assignments */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Assigned & In Progress Forms</CardTitle>
              <CardDescription>
                Track forms assigned to this client and their completion status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="started">In Progress</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
              ) : !filteredForms?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active form assignments
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredForms.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">
                          {form.template?.title || 'Unknown Form'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{form.template?.form_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(form.assigned_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {form.due_date ? (
                            <span className={new Date(form.due_date) < new Date() ? 'text-destructive' : ''}>
                              {format(new Date(form.due_date), 'MMM d, yyyy')}
                            </span>
                          ) : 'No due date'}
                        </TableCell>
                        <TableCell>{getPriorityBadge(form.priority)}</TableCell>
                        <TableCell>{getStatusBadge(form.status)}</TableCell>
                        <TableCell>
                          {form.response ? `${form.response.progress_percentage || 0}%` : '0%'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResendNotification(form.id)}
                              title="Send reminder"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelAssignment(form.id)}
                              title="Cancel assignment"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Completed Forms */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Forms Pending Review</CardTitle>
              <CardDescription>
                Review, approve, and add completed forms to the client's chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading completed forms...</div>
              ) : !completedForms?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No completed forms pending review
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Completed Date</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Signature</TableHead>
                      <TableHead>Review Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedForms.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">
                          {form.template?.title || 'Unknown Form'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{form.template?.form_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {form.completed_at
                            ? format(new Date(form.completed_at), 'MMM d, yyyy h:mm a')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {form.time_spent_seconds
                            ? `${Math.floor(form.time_spent_seconds / 60)} min`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {form.response?.client_signature ? (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Signed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not Required</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {form.response?.approval_status === 'approved' ? (
                            <Badge variant="default">Approved</Badge>
                          ) : form.response?.approval_status === 'rejected' ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : form.response?.approval_status === 'needs_revision' ? (
                            <Badge variant="outline">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Revision
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReviewResponse(form)}
                              title="Review response"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrintResponse(form)}
                              title="Print"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedTemplate && (
        <FormAssignmentDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          template={selectedTemplate}
          clientId={clientId!}
          onSuccess={() => {
            setAssignDialogOpen(false);
            setSelectedTemplate(null);
          }}
        />
      )}

      {selectedResponse && selectedResponse.response && (
        <FormResponseReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          formResponse={selectedResponse}
          onStatusUpdate={() => {
            setReviewDialogOpen(false);
            setSelectedResponse(null);
          }}
        />
      )}
    </div>
  );
};
