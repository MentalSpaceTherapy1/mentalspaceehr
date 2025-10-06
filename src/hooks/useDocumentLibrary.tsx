import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentLibraryItem {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  subcategory?: string;
  file_path: string;
  file_name: string;
  file_size_bytes?: number;
  mime_type?: string;
  version: number;
  previous_version_id?: string;
  tags: string[];
  is_active: boolean;
  requires_signature: boolean;
  auto_assign_on_intake: boolean;
  target_client_types: string[];
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  category?: {
    name: string;
    color: string;
    icon: string;
  };
}

export interface DocumentLibraryCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  icon?: string;
  color?: string;
  display_order: number;
  is_active: boolean;
}

export const useDocumentLibrary = () => {
  const [documents, setDocuments] = useState<DocumentLibraryItem[]>([]);
  const [categories, setCategories] = useState<DocumentLibraryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document_library')
        .select(`
          *,
          category:document_library_categories(name, color, icon)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading document library',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('document_library_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading categories',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const uploadDocument = async (
    file: File,
    metadata: Partial<DocumentLibraryItem>
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('document-library')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from('document_library')
        .insert({
          title: metadata.title || file.name,
          description: metadata.description,
          category_id: metadata.category_id,
          subcategory: metadata.subcategory,
          file_path: filePath,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          tags: metadata.tags || [],
          requires_signature: metadata.requires_signature || false,
          auto_assign_on_intake: metadata.auto_assign_on_intake || false,
          target_client_types: metadata.target_client_types || [],
          created_by: user.user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      await fetchDocuments();
      toast({
        title: 'Document uploaded successfully',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error uploading document',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getDocumentUrl = async (document: DocumentLibraryItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('document-library')
        .createSignedUrl(document.file_path, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      toast({
        title: 'Error getting document URL',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const assignToClient = async (documentId: string, clientId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const document = documents.find((d) => d.id === documentId);
      if (!document) throw new Error('Document not found');

      const url = await getDocumentUrl(document);
      if (!url) throw new Error('Could not get document URL');

      // Create entry in client_documents table
      const { error } = await supabase.from('client_documents').insert({
        client_id: clientId,
        title: document.title,
        description: document.description,
        document_type: 'Library Assignment',
        file_path: document.file_path,
        file_name: document.file_name,
        file_size_bytes: document.file_size_bytes,
        mime_type: document.mime_type,
        uploaded_by: user.user.id,
        uploaded_method: 'Library Assignment',
        document_source: 'Library',
        tags: document.tags,
        requires_signature: document.requires_signature,
      });

      if (error) throw error;

      // Update usage count
      await supabase
        .from('document_library')
        .update({
          usage_count: document.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      await fetchDocuments();
      toast({
        title: 'Document assigned to client',
      });
    } catch (error: any) {
      toast({
        title: 'Error assigning document',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateDocument = async (
    documentId: string,
    updates: Partial<DocumentLibraryItem>
  ) => {
    try {
      const { error } = await supabase
        .from('document_library')
        .update(updates)
        .eq('id', documentId);

      if (error) throw error;

      await fetchDocuments();
      toast({
        title: 'Document updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating document',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('document_library')
        .update({ is_active: false })
        .eq('id', documentId);

      if (error) throw error;

      await fetchDocuments();
      toast({
        title: 'Document deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting document',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, []);

  return {
    documents,
    categories,
    isLoading,
    uploadDocument,
    getDocumentUrl,
    assignToClient,
    updateDocument,
    deleteDocument,
    refresh: fetchDocuments,
  };
};
