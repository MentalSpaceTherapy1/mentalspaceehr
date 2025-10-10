import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Monitor, Maximize2, Minimize2, PictureInPicture2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  layout?: 'grid' | 'spotlight' | 'speaker' | 'gallery';
  dominantSpeaker?: any;
}

const VideoTile = ({
  participant,
  isLocal,
  isDominantSpeaker,
  onFullscreen,
  onPiP
}: {
  participant: Participant;
  isLocal: boolean;
  isDominantSpeaker?: boolean;
  onFullscreen?: () => void;
  onPiP?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const handlePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
      onPiP?.();
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-muted group w-full h-full transition-all duration-300",
        isDominantSpeaker && "ring-4 ring-primary shadow-lg shadow-primary/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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

      {/* Video Controls (show on hover) */}
      {isHovered && participant.isVideoEnabled && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onFullscreen && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={onFullscreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {participant.stream && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={handlePiP}
            >
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
          )}
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
            {isDominantSpeaker && (
              <Badge variant="default" className="text-xs animate-pulse bg-primary">
                Speaking
              </Badge>
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
          className="absolute top-2 left-2 text-xs"
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
  layout = 'grid',
  dominantSpeaker
}: VideoGridProps) => {
  const [fullscreenParticipant, setFullscreenParticipant] = useState<Participant | null>(null);
  const { toast } = useToast();
  const totalParticipants = 1 + remoteParticipants.length;

  // Helper function to check if a participant is the dominant speaker
  const isDominant = (participant: Participant) => {
    if (!dominantSpeaker) return false;
    // Check if the participant's ID matches the dominant speaker's identity or sid
    return participant.id === dominantSpeaker.sid ||
           participant.id === dominantSpeaker.identity ||
           participant.name === dominantSpeaker.identity;
  };

  const getGridColumns = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const handleFullscreen = (participant: Participant) => {
    setFullscreenParticipant(participant);
  };

  const handleExitFullscreen = () => {
    setFullscreenParticipant(null);
  };

  const handlePiP = () => {
    toast({
      title: 'Picture-in-Picture',
      description: 'Video opened in PiP mode'
    });
  };

  // Fullscreen mode
  if (fullscreenParticipant) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-4 right-4 z-10"
          onClick={handleExitFullscreen}
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          Exit Fullscreen
        </Button>
        <VideoTile
          participant={fullscreenParticipant}
          isLocal={fullscreenParticipant.id === localParticipant.id}
          isDominantSpeaker={isDominant(fullscreenParticipant)}
          onPiP={handlePiP}
        />
      </div>
    );
  }

  // Speaker View: Large active speaker + thumbnails
  if (layout === 'speaker' && remoteParticipants.length > 0) {
    const speakerParticipant = remoteParticipants[0];
    const thumbnails = [localParticipant, ...remoteParticipants.slice(1)];

    return (
      <div className="flex flex-col h-full gap-4 w-full">
        <div className="flex-1 min-h-0">
          <VideoTile
            participant={speakerParticipant}
            isLocal={false}
            isDominantSpeaker={isDominant(speakerParticipant)}
            onFullscreen={() => handleFullscreen(speakerParticipant)}
            onPiP={handlePiP}
          />
        </div>

        {thumbnails.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0">
            {thumbnails.map((participant, idx) => (
              <div key={participant.id} className="w-48 h-36 flex-shrink-0">
                <VideoTile
                  participant={participant}
                  isLocal={idx === 0}
                  isDominantSpeaker={isDominant(participant)}
                  onFullscreen={() => handleFullscreen(participant)}
                  onPiP={handlePiP}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Gallery View: All participants equal size, optimized grid
  if (layout === 'gallery') {
    const allParticipants = [localParticipant, ...remoteParticipants];

    return (
      <div className={cn(
        "grid gap-2 md:gap-4 w-full h-full auto-rows-fr",
        allParticipants.length === 1 && "grid-cols-1",
        allParticipants.length === 2 && "grid-cols-2",
        allParticipants.length >= 3 && allParticipants.length <= 4 && "grid-cols-2 grid-rows-2",
        allParticipants.length >= 5 && allParticipants.length <= 9 && "grid-cols-3",
        allParticipants.length > 9 && "grid-cols-4"
      )}>
        {allParticipants.map((participant, idx) => (
          <VideoTile
            key={participant.id}
            participant={participant}
            isLocal={idx === 0}
            isDominantSpeaker={isDominant(participant)}
            onFullscreen={() => handleFullscreen(participant)}
            onPiP={handlePiP}
          />
        ))}
      </div>
    );
  }

  // Grid layout with mobile optimization
  return (
    <div className={cn(
      "grid gap-2 md:gap-4 w-full h-full",
      getGridColumns()
    )}
    style={{
      gridAutoRows: '1fr',
      maxHeight: '100%'
    }}>
      <VideoTile
        participant={localParticipant}
        isLocal={true}
        isDominantSpeaker={isDominant(localParticipant)}
        onFullscreen={() => handleFullscreen(localParticipant)}
        onPiP={handlePiP}
      />

      {remoteParticipants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          isLocal={false}
          isDominantSpeaker={isDominant(participant)}
          onFullscreen={() => handleFullscreen(participant)}
          onPiP={handlePiP}
        />
      ))}
    </div>
  );
};
