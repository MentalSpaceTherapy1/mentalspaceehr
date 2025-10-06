import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface ClientDocument {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  document_type: string;
  document_category?: string;
  file_path: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_date?: string;
  uploaded_method?: string;
  document_source?: string;
  external_provider?: string;
  document_date?: string;
  requires_signature: boolean;
  signed_by?: string;
  signed_at?: string;
  signature_data?: string;
  signatures?: any[];
  shared_with_client: boolean;
  shared_via_portal: boolean;
  shared_date?: string;
  client_viewed_date?: string;
  is_embedded_form: boolean;
  form_responses?: any;
  version_number: number;
  previous_version_id?: string;
  latest_version: boolean;
  ocr_processed: boolean;
  extracted_text?: string;
  tags?: string[];
  viewed_by?: any[];
  status: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

export function useClientDocuments(clientId?: string) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchDocuments = async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .eq('latest_version', true)
        .order('uploaded_date', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as ClientDocument[]);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const uploadDocument = async (file: File, metadata: Partial<ClientDocument>) => {
    if (!clientId || !user) return null;

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          title: metadata.title || file.name,
          description: metadata.description,
          document_type: metadata.document_type || 'Other',
          document_category: metadata.document_category,
          file_path: filePath,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          uploaded_date: new Date().toISOString(),
          uploaded_method: 'User Upload',
          document_source: metadata.document_source || 'Internal',
          document_date: metadata.document_date || new Date().toISOString().split('T')[0],
          requires_signature: metadata.requires_signature || false,
          shared_with_client: metadata.shared_with_client || false,
          shared_via_portal: metadata.shared_via_portal || false,
          is_embedded_form: metadata.is_embedded_form || false,
          tags: metadata.tags || [],
          status: 'Active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Document uploaded successfully');
      fetchDocuments();
      return data;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document: ' + error.message);
      return null;
    }
  };

  const downloadDocument = async (document: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(document.file_path);

      if (error) throw error;

      // Track view
      if (user) {
        await supabase.rpc('track_document_view', {
          document_id: document.id,
          viewer_id: user.id
        });
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name || document.title;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const getDocumentUrl = async (document: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(document.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      // Track view
      if (user) {
        await supabase.rpc('track_document_view', {
          document_id: document.id,
          viewer_id: user.id
        });
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error('Error getting document URL:', error);
      toast.error('Failed to load document');
      return null;
    }
  };

  const shareWithClient = async (documentId: string, shareViaPortal: boolean = true) => {
    try {
      const { error } = await supabase
        .from('client_documents')
        .update({
          shared_with_client: true,
          shared_via_portal: shareViaPortal,
          shared_date: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document shared with client');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error sharing document:', error);
      toast.error('Failed to share document');
    }
  };

  const addSignature = async (
    documentId: string,
    signatureData: string,
    signerType: 'Client' | 'Clinician' | 'Guarantor'
  ) => {
    if (!user) return;

    try {
      const document = documents.find(d => d.id === documentId);
      if (!document) throw new Error('Document not found');

      const signatures = document.signatures || [];
      const newSignature = {
        signerId: user.id,
        signerType,
        signatureImage: signatureData,
        signatureDate: new Date().toISOString(),
        signatureIPAddress: 'Unknown', // Would need backend to get actual IP
      };

      const { error } = await supabase
        .from('client_documents')
        .update({
          signatures: [...signatures, newSignature],
          signed_by: user.id,
          signed_at: new Date().toISOString(),
          signature_data: signatureData,
        })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Signature added successfully');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error adding signature:', error);
      toast.error('Failed to add signature');
    }
  };

  const createNewVersion = async (originalDocumentId: string, newFile: File) => {
    if (!user) return null;

    try {
      // Upload new file
      const fileExt = newFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, newFile);

      if (uploadError) throw uploadError;

      // Create new version using database function
      const { data, error } = await supabase.rpc('create_document_version', {
        original_document_id: originalDocumentId,
        new_file_path: filePath,
        new_file_name: newFile.name,
        new_file_size: newFile.size,
        uploaded_by_id: user.id
      });

      if (error) throw error;

      toast.success('New document version created');
      fetchDocuments();
      return data;
    } catch (error: any) {
      console.error('Error creating new version:', error);
      toast.error('Failed to create new version');
      return null;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('client_documents')
        .update({ status: 'Deleted' })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const updateTags = async (documentId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('client_documents')
        .update({ tags })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Tags updated');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    }
  };

  return {
    documents,
    isLoading,
    uploadDocument,
    downloadDocument,
    getDocumentUrl,
    shareWithClient,
    addSignature,
    createNewVersion,
    deleteDocument,
    updateTags,
    refetch: fetchDocuments,
  };
}
