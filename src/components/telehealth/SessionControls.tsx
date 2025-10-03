import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SessionControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onEndSession: () => void;
}

export const SessionControls = ({
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isChatOpen,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onEndSession
}: SessionControlsProps) => {
  return (
    <Card className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          onClick={onToggleMute}
          className={cn(
            "rounded-full h-14 w-14",
            !isMuted && "hover:bg-secondary/80"
          )}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant={!isVideoEnabled ? "destructive" : "secondary"}
          size="lg"
          onClick={onToggleVideo}
          className={cn(
            "rounded-full h-14 w-14",
            isVideoEnabled && "hover:bg-secondary/80"
          )}
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="lg"
          onClick={onToggleScreenShare}
          className="rounded-full h-14 w-14"
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        <Button
          variant={isChatOpen ? "default" : "secondary"}
          size="lg"
          onClick={onToggleChat}
          className="rounded-full h-14 w-14"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>

        <div className="ml-4 border-l pl-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={onEndSession}
            className="rounded-full h-14 px-8 gap-2"
          >
            <Phone className="h-5 w-5 rotate-135" />
            End Session
          </Button>
        </div>
      </div>
    </Card>
  );
};
