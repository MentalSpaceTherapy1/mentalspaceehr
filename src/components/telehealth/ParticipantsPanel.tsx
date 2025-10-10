import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MoreVertical,
  UserX,
  Crown,
  Signal
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  role: 'host' | 'client';
  isMuted: boolean;
  isVideoEnabled: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ParticipantsPanelProps {
  isOpen: boolean;
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
}

export const ParticipantsPanel = ({
  isOpen,
  participants,
  currentUserId,
  isHost,
  onClose,
  onMuteParticipant,
  onRemoveParticipant
}: ParticipantsPanelProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getConnectionColor = (quality: Participant['connectionQuality']) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'fair':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-500';
    }
  };

  const getConnectionBars = (quality: Participant['connectionQuality']) => {
    switch (quality) {
      case 'excellent':
        return 4;
      case 'good':
        return 3;
      case 'fair':
        return 2;
      case 'poor':
        return 1;
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="w-80 h-full border-l flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Participants</CardTitle>
              <CardDescription className="text-xs">
                {participants.length} in session
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-2">
            {participants.map((participant) => {
              const isCurrentUser = participant.id === currentUserId;
              const connectionBars = getConnectionBars(participant.connectionQuality);

              return (
                <Card
                  key={participant.id}
                  className={cn(
                    "p-3 transition-colors",
                    isCurrentUser && "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {participant.name}
                          {isCurrentUser && " (You)"}
                        </p>
                        {participant.role === 'host' && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1">
                        {/* Audio Status */}
                        <div className="flex items-center gap-1">
                          {participant.isMuted ? (
                            <MicOff className="h-3 w-3 text-red-500" />
                          ) : (
                            <Mic className="h-3 w-3 text-green-500" />
                          )}
                        </div>

                        {/* Video Status */}
                        <div className="flex items-center gap-1">
                          {participant.isVideoEnabled ? (
                            <Video className="h-3 w-3 text-green-500" />
                          ) : (
                            <VideoOff className="h-3 w-3 text-red-500" />
                          )}
                        </div>

                        {/* Connection Quality */}
                        <div className="flex items-center gap-1">
                          <div className="flex items-end gap-0.5 h-3">
                            {[1, 2, 3, 4].map((bar) => (
                              <div
                                key={bar}
                                className={cn(
                                  "w-0.5 rounded-full transition-colors",
                                  bar <= connectionBars
                                    ? getConnectionColor(participant.connectionQuality)
                                    : "bg-muted"
                                )}
                                style={{
                                  height: `${bar * 25}%`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions (Host Only) */}
                    {isHost && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onMuteParticipant?.(participant.id)}
                            disabled={participant.isMuted}
                          >
                            <MicOff className="mr-2 h-4 w-4" />
                            Mute Participant
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onRemoveParticipant?.(participant.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Remove from Session
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Connection Statistics */}
        <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
          <p className="text-xs font-medium">Session Statistics</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block">Active Participants</span>
              <span className="text-foreground font-medium">
                {participants.length}
              </span>
            </div>
            <div>
              <span className="block">With Video</span>
              <span className="text-foreground font-medium">
                {participants.filter(p => p.isVideoEnabled).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
