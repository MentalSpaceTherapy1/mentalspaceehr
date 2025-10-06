import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, metadata: any) => Promise<void>;
}

const DOCUMENT_TYPES = [
  'Consent Form',
  'Lab Result',
  'Imaging',
  'Outside Records',
  'Assessment',
  'Correspondence',
  'Insurance Card',
  'Treatment Plan',
  'Progress Note',
  'Other'
];

const DOCUMENT_SOURCES = ['Internal', 'External'];

export function DocumentUploadDialog({ open, onOpenChange, onUpload }: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentCategory, setDocumentCategory] = useState('');
  const [documentSource, setDocumentSource] = useState('Internal');
  const [externalProvider, setExternalProvider] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [sharedWithClient, setSharedWithClient] = useState(false);
  const [sharedViaPortal, setSharedViaPortal] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size (20MB limit)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }

      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name);
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!documentType) {
      toast.error('Please select a document type');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file, {
        title,
        description,
        document_type: documentType,
        document_category: documentCategory,
        document_source: documentSource,
        external_provider: documentSource === 'External' ? externalProvider : undefined,
        document_date: documentDate,
        requires_signature: requiresSignature,
        shared_with_client: sharedWithClient,
        shared_via_portal: sharedViaPortal,
        tags,
      });

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setDocumentType('');
      setDocumentCategory('');
      setDocumentSource('Internal');
      setExternalProvider('');
      setDocumentDate(new Date().toISOString().split('T')[0]);
      setRequiresSignature(false);
      setSharedWithClient(false);
      setSharedViaPortal(false);
      setTags([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a new document to the client's chart
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>File *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Document Type */}
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                value={documentCategory}
                onChange={(e) => setDocumentCategory(e.target.value)}
                placeholder="e.g., Lab Work, MRI, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Document Source */}
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={documentSource} onValueChange={setDocumentSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_SOURCES.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* External Provider */}
            {documentSource === 'External' && (
              <div className="space-y-2">
                <Label htmlFor="provider">External Provider</Label>
                <Input
                  id="provider"
                  value={externalProvider}
                  onChange={(e) => setExternalProvider(e.target.value)}
                  placeholder="Provider name"
                />
              </div>
            )}

            {/* Document Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Document Date</Label>
              <Input
                id="date"
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag and press Enter"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="signature">Requires Signature</Label>
              <Switch
                id="signature"
                checked={requiresSignature}
                onCheckedChange={setRequiresSignature}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="shared">Share with Client</Label>
              <Switch
                id="shared"
                checked={sharedWithClient}
                onCheckedChange={setSharedWithClient}
              />
            </div>

            {sharedWithClient && (
              <div className="flex items-center justify-between ml-6">
                <Label htmlFor="portal">Make Available in Portal</Label>
                <Switch
                  id="portal"
                  checked={sharedViaPortal}
                  onCheckedChange={setSharedViaPortal}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
