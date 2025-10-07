import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClientDocuments } from '@/hooks/useClientDocuments';
import { 
  FileText, 
  Share2, 
  Eye, 
  Download, 
  Printer,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ClientPortalDocumentsSectionProps {
  clientId: string;
}

export const ClientPortalDocumentsSection = ({ clientId }: ClientPortalDocumentsSectionProps) => {
  const { documents, isLoading, shareWithClient, downloadDocument, getDocumentUrl } = useClientDocuments(clientId);
  const [loadingDocs, setLoadingDocs] = useState<Record<string, boolean>>({});

  const handleToggleShare = async (documentId: string, currentlyShared: boolean) => {
    if (currentlyShared) {
      toast.info('Cannot unshare documents once shared. Create a new version instead.');
      return;
    }
    
    setLoadingDocs(prev => ({ ...prev, [documentId]: true }));
    await shareWithClient(documentId, true);
    setLoadingDocs(prev => ({ ...prev, [documentId]: false }));
  };

  const handlePrint = async (document: any) => {
    try {
      const url = await getDocumentUrl(document);
      if (!url) return;

      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      toast.error('Failed to open document for printing');
    }
  };

  const getStatusBadge = (doc: any) => {
    if (!doc.shared_with_client) {
      return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Not Shared</Badge>;
    }
    if (doc.client_viewed_date) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Viewed</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Shared</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading documents...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Client Portal Documents
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage document sharing with client through their portal
        </p>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No documents available. Upload documents in the Documents section first.
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Viewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.title}</div>
                          {doc.description && (
                            <div className="text-xs text-muted-foreground">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.uploaded_date && format(new Date(doc.uploaded_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc)}</TableCell>
                    <TableCell>
                      {doc.client_viewed_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Eye className="h-3 w-3" />
                          {format(new Date(doc.client_viewed_date), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!doc.shared_with_client && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleShare(doc.id, doc.shared_with_client)}
                            disabled={loadingDocs[doc.id]}
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePrint(doc)}
                        >
                          <Printer className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
