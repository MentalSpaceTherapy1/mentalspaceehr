import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClientDocuments, ClientDocument } from '@/hooks/useClientDocuments';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentViewer } from './DocumentViewer';
import {
  Upload,
  MoreVertical,
  Eye,
  Download,
  Share2,
  Trash2,
  FileSignature,
  History,
  Search,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';

interface DocumentManagementPanelProps {
  clientId: string;
}

export function DocumentManagementPanel({ clientId }: DocumentManagementPanelProps) {
  const {
    documents,
    isLoading,
    uploadDocument,
    downloadDocument,
    getDocumentUrl,
    shareWithClient,
    deleteDocument,
  } = useClientDocuments(clientId);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ClientDocument | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const handleViewDocument = async (doc: ClientDocument) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
    const url = await getDocumentUrl(doc);
    setDocumentUrl(url);
  };

  const handleDownload = (doc: ClientDocument) => {
    downloadDocument(doc);
  };

  const handleShare = async (doc: ClientDocument) => {
    await shareWithClient(doc.id, true);
  };

  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocument(documentToDelete);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || doc.document_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const documentTypes = ['all', ...new Set(documents.map(d => d.document_type))];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Manage client documents, records, and files
              </CardDescription>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  {filterType === 'all' ? 'All Types' : filterType}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {documentTypes.map(type => (
                  <DropdownMenuItem key={type} onClick={() => setFilterType(type)}>
                    {type === 'all' ? 'All Types' : type}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Documents Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || filterType !== 'all' 
                ? 'No documents match your search criteria'
                : 'No documents uploaded yet'
              }
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{doc.title}</div>
                          {doc.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {doc.description}
                            </div>
                          )}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {doc.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.document_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.document_date || doc.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {doc.uploaded_method || 'User Upload'}
                          {doc.version_number > 1 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              v{doc.version_number}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {doc.requires_signature && !doc.signed_by && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">
                              <FileSignature className="w-3 h-3 mr-1" />
                              Needs Signature
                            </Badge>
                          )}
                          {doc.signed_by && (
                            <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                              Signed
                            </Badge>
                          )}
                          {doc.shared_via_portal && (
                            <Badge variant="secondary" className="text-xs">
                              In Portal
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {!doc.shared_via_portal && (
                              <DropdownMenuItem onClick={() => handleShare(doc)}>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share with Client
                              </DropdownMenuItem>
                            )}
                            {doc.version_number > 1 && (
                              <DropdownMenuItem>
                                <History className="w-4 h-4 mr-2" />
                                View History
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(doc.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={async (file, metadata) => {
          await uploadDocument(file, metadata);
        }}
      />

      <DocumentViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={selectedDocument}
        documentUrl={documentUrl}
        onDownload={() => selectedDocument && handleDownload(selectedDocument)}
        onShare={() => selectedDocument && handleShare(selectedDocument)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
