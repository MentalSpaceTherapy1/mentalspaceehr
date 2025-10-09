import { useState } from 'react';

import { usePortalAccount } from '@/hooks/usePortalAccount';
import { usePortalResources } from '@/hooks/usePortalResources';
import { ResourceCard } from '@/components/portal/ResourceCard';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, Star } from 'lucide-react';
import { Resource } from '@/hooks/usePortalResources';
import { useToast } from '@/hooks/use-toast';

export default function PortalResources() {
  const { portalContext } = usePortalAccount();
  const { resources, recommendedResources, loading, markAsViewed, markAsCompleted } = usePortalResources(portalContext?.client?.id);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filterResources = (resourceList: Resource[]) => {
    return resourceList.filter((resource) => {
      const matchesSearch = searchTerm === '' || 
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  const handleViewResource = async (resource: Resource) => {
    try {
      // Mark as viewed if it's an assigned resource
      if (resource.assignmentId && !resource.viewedAt) {
        await markAsViewed(resource.id, resource.assignmentId);
      }

      // Open resource
      if (resource.url) {
        window.open(resource.url, '_blank');
      } else if (resource.filePath) {
        // Handle file download/view from storage
        const { data } = await supabase.storage.from('educational-resources').createSignedUrl(resource.filePath, 3600);
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error viewing resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to open resource',
        variant: 'destructive',
      });
    }
  };

  const handleMarkComplete = async (resource: Resource) => {
    try {
      await markAsCompleted(resource.id, resource.assignmentId);
      toast({
        title: 'Success',
        description: 'Resource marked as completed',
      });
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark resource as completed',
        variant: 'destructive',
      });
    }
  };

  const filteredRecommended = filterResources(recommendedResources);
  const filteredAll = filterResources(resources);

  if (loading) {
    return (
      <>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Educational Resources</h1>
          <p className="text-muted-foreground">Access helpful materials and resources</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Article">Article</SelectItem>
              <SelectItem value="Video">Video</SelectItem>
              <SelectItem value="PDF">PDF</SelectItem>
              <SelectItem value="Worksheet">Worksheet</SelectItem>
              <SelectItem value="Audio">Audio</SelectItem>
              <SelectItem value="Link">Link</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recommended Resources Section */}
        {filteredRecommended.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <h2 className="text-2xl font-semibold">Recommended for You</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRecommended.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onView={handleViewResource}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Resources Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-2xl font-semibold">Browse All Resources</h2>
          </div>
          
          {filteredAll.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAll.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onView={handleViewResource}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || categoryFilter !== 'all'
                  ? 'No resources found matching your filters'
                  : 'No resources available at this time'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
