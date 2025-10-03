import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  role: 'host' | 'client';
}

interface VideoGridProps {
  localParticipant: Participant;
  remoteParticipants: Participant[];
  layout?: 'grid' | 'spotlight';
}

const VideoTile = ({ participant, isLocal }: { participant: Participant; isLocal: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <Card className="relative overflow-hidden bg-muted aspect-video group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "w-full h-full object-cover",
          !participant.isVideoEnabled && "hidden"
        )}
      />
      
      {!participant.isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-3xl font-semibold text-primary">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">
              {participant.name} {isLocal && "(You)"}
            </span>
            {participant.role === 'host' && (
              <Badge variant="secondary" className="text-xs">Host</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {participant.isScreenSharing && (
              <Monitor className="h-4 w-4 text-white" />
            )}
            {participant.isMuted ? (
              <MicOff className="h-4 w-4 text-red-400" />
            ) : (
              <Mic className="h-4 w-4 text-white" />
            )}
            {!participant.isVideoEnabled && (
              <VideoOff className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>
      </div>

      {isLocal && (
        <Badge 
          variant="secondary" 
          className="absolute top-2 right-2 text-xs"
        >
          Your View
        </Badge>
      )}
    </Card>
  );
};

export const VideoGrid = ({ 
  localParticipant, 
  remoteParticipants, 
  layout = 'grid' 
}: VideoGridProps) => {
  const totalParticipants = 1 + remoteParticipants.length;

  const getGridColumns = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  if (layout === 'spotlight' && remoteParticipants.length > 0) {
    // Spotlight: Large main video + small thumbnails
    const spotlightParticipant = remoteParticipants[0];
    const thumbnails = [localParticipant, ...remoteParticipants.slice(1)];

    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex-1">
          <VideoTile participant={spotlightParticipant} isLocal={false} />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {thumbnails.map((participant, idx) => (
            <div key={participant.id} className="w-48 flex-shrink-0">
              <VideoTile 
                participant={participant} 
                isLocal={idx === 0} 
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div className={cn(
      "grid gap-4 h-full auto-rows-fr",
      getGridColumns()
    )}>
      <VideoTile participant={localParticipant} isLocal={true} />
      
      {remoteParticipants.map((participant) => (
        <VideoTile 
          key={participant.id} 
          participant={participant} 
          isLocal={false} 
        />
      ))}
    </div>
  );
};
