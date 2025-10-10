import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Phone, MessageSquare, Circle, Users, Layout, Settings, Sparkles, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

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
  onToggleParticipants?: () => void;
  onChangeLayout?: (layout: 'grid' | 'speaker' | 'gallery') => void;
  onToggleAI?: () => void;
  onToggleNotes?: () => void;
  isParticipantsOpen?: boolean;
  isAIEnabled?: boolean;
  isNotesOpen?: boolean;
  currentLayout?: 'grid' | 'speaker' | 'gallery';
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
  onToggleParticipants,
  onChangeLayout,
  onToggleAI,
  onToggleNotes,
  isParticipantsOpen = false,
  isAIEnabled = false,
  isNotesOpen = false,
  currentLayout = 'grid',
}: SessionControlsProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <div className="flex items-center justify-between gap-2 max-w-screen-2xl mx-auto">
        {/* Left Section - Primary Controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={onToggleMute}
            className={cn(
              "rounded-full h-12 w-12 md:h-14 md:w-14 touch-manipulation",
              !isMuted && "hover:bg-secondary/80"
            )}
            title={isMuted ? "Unmute" : "Mute"}
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
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? <Video className="h-4 w-4 md:h-5 md:w-5" /> : <VideoOff className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>
        </div>

        {/* Center Section - Advanced Features */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant={isScreenSharing ? "default" : "secondary"}
            size="lg"
            onClick={onToggleScreenShare}
            className="rounded-full h-10 w-10 md:h-12 md:w-12 touch-manipulation"
            title="Share Screen"
          >
            {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>

          {onToggleRecording && (
            <Button
              onClick={onToggleRecording}
              variant={isRecording ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full h-10 md:h-12 px-3 gap-2 relative touch-manipulation"
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <Circle className={cn("h-4 w-4", isRecording && "fill-current")} />
              {isRecording && <span className="text-xs hidden md:inline">{formatDuration(recordingDuration)}</span>}
            </Button>
          )}

          {onToggleAI && (
            <Button
              variant={isAIEnabled ? "default" : "secondary"}
              size="lg"
              onClick={onToggleAI}
              className={cn(
                "rounded-full h-10 w-10 md:h-12 md:w-12 touch-manipulation",
                isAIEnabled && "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              )}
              title="AI Assistant"
            >
              <Sparkles className={cn("h-4 w-4", isAIEnabled && "animate-pulse")} />
            </Button>
          )}

          <Button
            variant={isChatOpen ? "default" : "secondary"}
            size="lg"
            onClick={onToggleChat}
            className="rounded-full h-10 w-10 md:h-12 md:w-12 touch-manipulation"
            title="Chat"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          {onToggleParticipants && (
            <Button
              variant={isParticipantsOpen ? "default" : "secondary"}
              size="lg"
              onClick={onToggleParticipants}
              className="rounded-full h-10 w-10 md:h-12 md:w-12 touch-manipulation"
              title="Participants"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}

          {onToggleNotes && (
            <Button
              variant={isNotesOpen ? "default" : "secondary"}
              size="lg"
              onClick={onToggleNotes}
              className="rounded-full h-10 w-10 md:h-12 md:w-12 touch-manipulation hidden md:flex"
              title="Session Notes"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}

          {onChangeLayout && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full h-10 w-10 md:h-12 md:w-12 touch-manipulation"
                  title="Change Layout"
                >
                  <Layout className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuLabel>View Layout</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onChangeLayout('grid')} className={cn(currentLayout === 'grid' && "bg-accent")}>
                  <Layout className="mr-2 h-4 w-4" />
                  Grid View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeLayout('speaker')} className={cn(currentLayout === 'speaker' && "bg-accent")}>
                  <Activity className="mr-2 h-4 w-4" />
                  Speaker View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeLayout('gallery')} className={cn(currentLayout === 'gallery' && "bg-accent")}>
                  <Users className="mr-2 h-4 w-4" />
                  Gallery View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full h-10 w-10 md:h-12 md:w-12 touch-manipulation hidden md:flex"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel>Session Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Audio Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                Video Quality
              </DropdownMenuItem>
              <DropdownMenuItem>
                Bandwidth Test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Keyboard Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Section - End Call */}
        <div className="flex items-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={onEndSession}
            className="rounded-full h-12 md:h-14 px-4 md:px-8 gap-2 touch-manipulation"
          >
            <Phone className="h-4 w-4 md:h-5 md:w-5 rotate-135" />
            <span className="hidden md:inline">End Session</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
