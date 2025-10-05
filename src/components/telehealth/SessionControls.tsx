import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Phone, MessageSquare, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SessionControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  isRecording?: boolean;
  recordingDuration?: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleRecording?: () => void;
  onEndSession: () => void;
}

export const SessionControls = ({
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isChatOpen,
  isRecording = false,
  recordingDuration = 0,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleRecording,
  onEndSession,
}: SessionControlsProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <Card className="p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          onClick={onToggleMute}
          className={cn(
            "rounded-full h-12 w-12 md:h-14 md:w-14 touch-manipulation",
            !isMuted && "hover:bg-secondary/80"
          )}
        >
          {isMuted ? <MicOff className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
        </Button>

        <Button
          variant={!isVideoEnabled ? "destructive" : "secondary"}
          size="lg"
          onClick={onToggleVideo}
          className={cn(
            "rounded-full h-12 w-12 md:h-14 md:w-14 touch-manipulation",
            isVideoEnabled && "hover:bg-secondary/80"
          )}
        >
          {isVideoEnabled ? <Video className="h-4 w-4 md:h-5 md:w-5" /> : <VideoOff className="h-4 w-4 md:h-5 md:w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="lg"
          onClick={onToggleScreenShare}
          className="rounded-full h-12 w-12 md:h-14 md:w-14 touch-manipulation hidden md:flex"
        >
          {isScreenSharing ? <MonitorOff className="h-4 w-4 md:h-5 md:w-5" /> : <Monitor className="h-4 w-4 md:h-5 md:w-5" />}
        </Button>

        <Button
          variant={isChatOpen ? "default" : "secondary"}
          size="lg"
          onClick={onToggleChat}
          className="rounded-full h-12 w-12 md:h-14 md:w-14 touch-manipulation"
        >
          <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        {onToggleRecording && (
          <Button
            onClick={onToggleRecording}
            variant={isRecording ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full h-12 md:h-14 px-3 md:px-4 gap-1 md:gap-2 relative touch-manipulation"
          >
            {isRecording && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <Circle className={cn(
              "h-4 w-4 md:h-5 md:w-5",
              isRecording && "fill-current"
            )} />
            {isRecording && <span className="text-xs md:text-sm">{formatDuration(recordingDuration)}</span>}
          </Button>
        )}

        <div className="ml-2 md:ml-4 border-l pl-2 md:pl-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={onEndSession}
            className="rounded-full h-12 md:h-14 px-4 md:px-8 gap-1 md:gap-2 touch-manipulation"
          >
            <Phone className="h-4 w-4 md:h-5 md:w-5 rotate-135" />
            <span className="hidden md:inline">End Session</span>
            <span className="md:hidden text-xs">End</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
