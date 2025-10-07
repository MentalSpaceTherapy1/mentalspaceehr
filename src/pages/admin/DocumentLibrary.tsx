import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDocumentLibrary } from '@/hooks/useDocumentLibrary';
import { useDocumentTemplates } from '@/hooks/useDocumentTemplates';
import { Upload, Search, Filter, FileText, Download, UserPlus, Edit, Trash2, Plus, Copy, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateBuilderDialog } from '@/components/admin/templates/TemplateBuilderDialog';
import { TemplateGeneratorDialog } from '@/components/admin/templates/TemplateGeneratorDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export default function DocumentLibrary() {
  const { documents, categories, isLoading, uploadDocument, getDocumentUrl, updateDocument, deleteDocument } = useDocumentLibrary();
  const { 
    templates, 
    isLoading: templatesLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    generateDocument 
  } = useDocumentTemplates();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    description: '',
    category_id: '',
    tags: [] as string[],
    requires_signature: false,
    auto_assign_on_intake: false,
  });

  // Template states
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [templateGeneratorOpen, setTemplateGeneratorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredTemplates = templates.filter((template) =>
    template.template_name.toLowerCase().includes(templateSearchQuery.toLowerCase())
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadMetadata.title) {
        setUploadMetadata({ ...uploadMetadata, title: file.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadDocument(selectedFile, uploadMetadata);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadMetadata({
        title: '',
        description: '',
        category_id: '',
        tags: [],
        requires_signature: false,
        auto_assign_on_intake: false,
      });
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDownload = async (doc: any) => {
    const url = await getDocumentUrl(doc);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Document Library</h1>
              <p className="text-muted-foreground mt-1">
                Manage practice-wide document templates and resources
              </p>
            </div>
          </div>

          <Tabs defaultValue="documents" className="w-full">
            <TabsList>
              <TabsTrigger value="documents">Document Library</TabsTrigger>
              <TabsTrigger value="templates">Document Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-6">
              <div className="flex justify-end">
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload Document to Library</DialogTitle>
                      <DialogDescription>
                        Add a new template or resource to the practice library
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>File</Label>
                        <Input
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.txt"
                        />
                      </div>
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={uploadMetadata.title}
                          onChange={(e) => setUploadMetadata({ ...uploadMetadata, title: e.target.value })}
                          placeholder="Document title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={uploadMetadata.description}
                          onChange={(e) => setUploadMetadata({ ...uploadMetadata, description: e.target.value })}
                          placeholder="Brief description of the document"
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={uploadMetadata.category_id}
                          onValueChange={(value) => setUploadMetadata({ ...uploadMetadata, category_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requires_signature"
                          checked={uploadMetadata.requires_signature}
                          onCheckedChange={(checked) =>
                            setUploadMetadata({ ...uploadMetadata, requires_signature: checked as boolean })
                          }
                        />
                        <Label htmlFor="requires_signature">Requires client signature</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="auto_assign"
                          checked={uploadMetadata.auto_assign_on_intake}
                          onCheckedChange={(checked) =>
                            setUploadMetadata({ ...uploadMetadata, auto_assign_on_intake: checked as boolean })
                          }
                        />
                        <Label htmlFor="auto_assign">Auto-assign on new client intake</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpload} disabled={!selectedFile}>
                          Upload
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No documents found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{doc.title}</div>
                                  {doc.description && (
                                    <div className="text-sm text-muted-foreground">{doc.description}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {doc.category && (
                                <Badge variant="outline" style={{ borderColor: doc.category.color }}>
                                  {doc.category.name}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.slice(0, 2).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.tags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{doc.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{doc.usage_count} times</TableCell>
                            <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Assign to Client
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteDocument(doc.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <div className="flex justify-end">
                <Button onClick={() => {
                  setSelectedTemplate(null);
                  setTemplateBuilderOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search templates..."
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {templatesLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading templates...</p>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No templates found</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setTemplateBuilderOpen(true)}
                      >
                        Create Your First Template
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Variables</TableHead>
                          <TableHead>Signatures</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.template_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{template.template_type}</Badge>
                            </TableCell>
                            <TableCell>{template.template_category || '-'}</TableCell>
                            <TableCell>{template.variables?.length || 0}</TableCell>
                            <TableCell>{template.signature_fields?.length || 0}</TableCell>
                            <TableCell>{format(new Date(template.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedTemplate(template);
                                    setTemplateGeneratorOpen(true);
                                  }}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Generate Document
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedTemplate(template);
                                    setTemplateBuilderOpen(true);
                                  }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Template
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedTemplate({ ...template, id: undefined });
                                    setTemplateBuilderOpen(true);
                                  }}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Clone Template
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteTemplate(template.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

          <TemplateBuilderDialog
            open={templateBuilderOpen}
            onOpenChange={setTemplateBuilderOpen}
            onSave={async (data) => {
              if (selectedTemplate?.id) {
                await updateTemplate(selectedTemplate.id, data);
              } else {
                await createTemplate(data);
              }
            }}
            initialTemplate={selectedTemplate}
          />

          {selectedTemplate && (
            <TemplateGeneratorDialog
              open={templateGeneratorOpen}
              onOpenChange={setTemplateGeneratorOpen}
              template={selectedTemplate}
              onGenerate={generateDocument}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
