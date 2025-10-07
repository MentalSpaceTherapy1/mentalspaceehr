import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Upload, Link as LinkIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export const PortalResourcesManagement = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    resource_type: 'Article',
    category: '',
    external_url: '',
    is_public: false,
    is_featured: false,
  });

  // Fetch resources
  const { data: resources, isLoading } = useQuery({
    queryKey: ['admin-portal-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: userData } = await supabase.auth.getUser();

      if (selectedResource) {
        const { error } = await supabase
          .from('portal_resources')
          .update(data)
          .eq('id', selectedResource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('portal_resources')
          .insert({ ...data, created_by: userData.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-portal-resources'] });
      toast.success(selectedResource ? 'Resource updated' : 'Resource created');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to save resource: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portal_resources')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-portal-resources'] });
      toast.success('Resource deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete resource: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      resource_type: 'Article',
      category: '',
      external_url: '',
      is_public: false,
      is_featured: false,
    });
    setSelectedResource(null);
  };

  const handleEdit = (resource: any) => {
    setSelectedResource(resource);
    setFormData(resource);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.category) {
      toast.error('Please fill in required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div>Loading resources...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Portal Resources</h2>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Resource
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No resources created yet
                </TableCell>
              </TableRow>
            ) : (
              resources?.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{resource.title}</div>
                      {resource.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {resource.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{resource.resource_type}</Badge>
                  </TableCell>
                  <TableCell>{resource.category}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {resource.is_public && <Badge variant="secondary">Public</Badge>}
                      {resource.is_featured && <Badge>Featured</Badge>}
                      {!resource.is_public && !resource.is_featured && (
                        <Badge variant="outline">Private</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      {resource.view_count || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(resource)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this resource?')) {
                            deleteMutation.mutate(resource.id);
                          }
                        }}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedResource ? 'Edit' : 'Create'} Resource</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resource Type *</Label>
                <Select
                  value={formData.resource_type}
                  onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Worksheet">Worksheet</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Link">Link</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="Document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Anxiety, Depression"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>URL/Link</Label>
              <Input
                value={formData.external_url || ''}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
                <Label>Public (visible to all clients)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
                <Label>Featured</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
