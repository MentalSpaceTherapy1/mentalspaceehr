import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { usePortalFormTemplates } from '@/hooks/usePortalFormTemplates';
import { FormBuilderDialog } from './FormBuilderDialog';
import type { FormTemplate } from '@/types/forms';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const PortalFormsManagement = () => {
  const { templates, templatesLoading, deleteTemplate } = usePortalFormTemplates();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | undefined>();

  const handleEdit = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setBuilderOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setBuilderOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this form template?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  if (templatesLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Portal Forms</h2>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form Template
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Staff Access</TableHead>
              <TableHead>Portal Sharing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signature</TableHead>
              <TableHead>Est. Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No form templates created yet
                </TableCell>
              </TableRow>
            ) : (
              templates?.map((template: any) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{template.title}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.form_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {template.staff_access_level || 'Administrative'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {template.shareable_on_portal ? (
                        <Badge variant="default" className="w-fit">
                          {template.shareable_on_demand ? 'Shareable on Demand' : 'Auto-Shared'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit">Not Shareable</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.requires_signature ? 'Required' : 'Not required'}
                  </TableCell>
                  <TableCell>
                    {template.estimated_minutes ? `${template.estimated_minutes} min` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <FormBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        template={selectedTemplate}
      />
    </div>
  );
};
