import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Resource {
  id: string;
  title: string;
  description?: string;
  category: 'Article' | 'Video' | 'PDF' | 'Worksheet' | 'Audio' | 'Link' | 'Other';
  format: string;
  url?: string;
  filePath?: string;
  tags?: string[];
  isPublic: boolean;
  createdAt: string;
  assignedBy?: string;
  assignedByName?: string;
  assignedDate?: string;
  viewedAt?: string;
  completedAt?: string;
  assignmentId?: string;
}

export const usePortalResources = (clientId?: string) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [recommendedResources, setRecommendedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchResources();
  }, [user, clientId]);

  const fetchResources = async () => {
    try {
      setLoading(true);

      // Fetch public resources
      const { data: publicResources, error: publicError } = await supabase
        .from('educational_resources')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (publicError) throw publicError;

      // Fetch assigned resources if clientId is available
      let assignedResources: any[] = [];
      if (clientId) {
        const { data: assignments, error: assignError } = await supabase
          .from('client_resource_assignments')
          .select(`
            id,
            assigned_date,
            viewed_at,
            completed_at,
            notes,
            assigned_by,
            profiles!client_resource_assignments_assigned_by_fkey(first_name, last_name),
            educational_resources(*)
          `)
          .eq('client_id', clientId)
          .order('assigned_date', { ascending: false });

        if (assignError) throw assignError;
        assignedResources = assignments || [];
      }

      // Map assigned resources
      const mappedAssignedResources: Resource[] = assignedResources.map((assignment: any) => ({
        id: assignment.educational_resources.id,
        title: assignment.educational_resources.title,
        description: assignment.educational_resources.description,
        category: assignment.educational_resources.category,
        format: assignment.educational_resources.format,
        url: assignment.educational_resources.url,
        filePath: assignment.educational_resources.file_path,
        tags: assignment.educational_resources.tags,
        isPublic: assignment.educational_resources.is_public,
        createdAt: assignment.educational_resources.created_at,
        assignedBy: assignment.assigned_by,
        assignedByName: assignment.profiles
          ? `${assignment.profiles.first_name} ${assignment.profiles.last_name}`
          : undefined,
        assignedDate: assignment.assigned_date,
        viewedAt: assignment.viewed_at,
        completedAt: assignment.completed_at,
        assignmentId: assignment.id,
      }));

      // Map public resources (excluding already assigned ones)
      const assignedIds = new Set(mappedAssignedResources.map(r => r.id));
      const mappedPublicResources: Resource[] = (publicResources || [])
        .filter(r => !assignedIds.has(r.id))
        .map((resource: any) => ({
          id: resource.id,
          title: resource.title,
          description: resource.description,
          category: resource.category,
          format: resource.format,
          url: resource.url,
          filePath: resource.file_path,
          tags: resource.tags,
          isPublic: resource.is_public,
          createdAt: resource.created_at,
        }));

      setRecommendedResources(mappedAssignedResources);
      setResources(mappedPublicResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (resourceId: string, assignmentId?: string) => {
    if (!assignmentId) return;

    try {
      const { error } = await supabase
        .from('client_resource_assignments')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;

      await fetchResources();
    } catch (error) {
      console.error('Error marking resource as viewed:', error);
      throw error;
    }
  };

  const markAsCompleted = async (resourceId: string, assignmentId?: string) => {
    if (!assignmentId) return;

    try {
      const { error } = await supabase
        .from('client_resource_assignments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;

      await fetchResources();
    } catch (error) {
      console.error('Error marking resource as completed:', error);
      throw error;
    }
  };

  return {
    resources,
    recommendedResources,
    loading,
    markAsViewed,
    markAsCompleted,
    refreshResources: fetchResources,
  };
};
