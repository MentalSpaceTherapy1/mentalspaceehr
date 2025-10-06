import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, FileText, Loader2 } from 'lucide-react';
import { ClientDocument } from '@/hooks/useClientDocuments';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ClientDocument | null;
  documentUrl: string | null;
  onDownload: () => void;
  onShare?: () => void;
}

export function DocumentViewer({ 
  open, 
  onOpenChange, 
  document, 
  documentUrl,
  onDownload,
  onShare 
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (documentUrl) {
      setIsLoading(false);
    }
  }, [documentUrl]);

  if (!document) return null;

  const isPDF = document.mime_type === 'application/pdf';
  const isImage = document.mime_type?.startsWith('image/');
  const isViewable = isPDF || isImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{document.title}</DialogTitle>
              {document.description && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {document.description}
                </p>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              {onShare && (
                <Button variant="outline" size="sm" onClick={onShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border rounded-md bg-muted/10">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && documentUrl && isViewable && (
            <>
              {isPDF && (
                <iframe
                  src={documentUrl}
                  className="w-full h-full min-h-[600px]"
                  title={document.title}
                />
              )}
              {isImage && (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={documentUrl}
                    alt={document.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </>
          )}

          {!isLoading && !isViewable && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Preview Not Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This file type cannot be previewed in the browser.
              </p>
              <Button onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download to View
              </Button>
            </div>
          )}
        </div>

        {document.version_number > 1 && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Version {document.version_number}
            {document.previous_version_id && ' (Updated)'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
