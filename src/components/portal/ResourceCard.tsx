import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Video, FileDown, FileAudio, Link as LinkIcon, Check, Eye } from 'lucide-react';
import { Resource } from '@/hooks/usePortalResources';
import { format } from 'date-fns';

interface ResourceCardProps {
  resource: Resource;
  onView: (resource: Resource) => void;
  onMarkComplete?: (resource: Resource) => void;
}

export function ResourceCard({ resource, onView, onMarkComplete }: ResourceCardProps) {
  const getFormatIcon = () => {
    switch (resource.category) {
      case 'PDF':
      case 'Worksheet':
        return <FileDown className="h-5 w-5" />;
      case 'Video':
        return <Video className="h-5 w-5" />;
      case 'Audio':
        return <FileAudio className="h-5 w-5" />;
      case 'Link':
        return <LinkIcon className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getFormatBadgeVariant = () => {
    switch (resource.category) {
      case 'Video':
        return 'default';
      case 'PDF':
      case 'Worksheet':
        return 'secondary';
      case 'Audio':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{resource.title}</CardTitle>
            {resource.assignedByName && (
              <CardDescription className="text-xs mt-1">
                Assigned by {resource.assignedByName}
                {resource.assignedDate && ` • ${format(new Date(resource.assignedDate), 'MMM d, yyyy')}`}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            {getFormatIcon()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={getFormatBadgeVariant()}>{resource.category}</Badge>
            {resource.viewedAt && (
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Viewed
              </Badge>
            )}
            {resource.completedAt && (
              <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3" />
                Completed
              </Badge>
            )}
          </div>
          
          {resource.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {resource.description}
            </p>
          )}
          
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button
          variant="default"
          className="flex-1"
          onClick={() => onView(resource)}
        >
          {resource.category === 'PDF' || resource.category === 'Worksheet' ? 'Download' : 'View'}
        </Button>
        
        {resource.assignmentId && !resource.completedAt && onMarkComplete && (
          <Button
            variant="outline"
            onClick={() => onMarkComplete(resource)}
          >
            Mark Complete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
