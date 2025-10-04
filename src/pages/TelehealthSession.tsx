import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebRTC } from '@/hooks/useWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { VideoGrid } from '@/components/telehealth/VideoGrid';
import { SessionControls } from '@/components/telehealth/SessionControls';
import { ConnectionQualityIndicator } from '@/components/telehealth/ConnectionQualityIndicator';
import { WaitingRoom } from '@/components/telehealth/WaitingRoom';
import { ChatSidebar } from '@/components/telehealth/ChatSidebar';
import { ScreenProtection } from '@/components/telehealth/ScreenProtection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, Video as VideoIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function TelehealthSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  const {
    localStream,
    remoteStreams,
    connectionState,
    connectionQuality,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    initializeMedia,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare
  } = useWebRTC(sessionId || '', user?.id || '', isHost ? 'host' : 'client');

  useEffect(() => {
    if (!user || !sessionId) return;
    loadSession();
  }, [user, sessionId]);

  const loadSession = async () => {
    try {
      console.log('Loading session:', sessionId);
      console.log('Current user:', user?.id);
      
      // Fetch session
      const rawId = sessionId || '';
      const normalizedId = rawId.replace(/^:/, '');
      console.log('Normalized session id:', normalizedId);

      const { data: sessionData, error: sessionError } = await supabase
        .from('telehealth_sessions')
        .select('*')
        .eq('session_id', normalizedId)
        .maybeSingle();

      console.log('Session data:', sessionData);
      console.log('Session error:', sessionError);

      if (sessionError) throw sessionError;
      if (!sessionData) {
        console.error('No session data found for:', sessionId);
        setError('Session not found or access denied');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setIsHost(sessionData.host_id === user?.id);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .maybeSingle();

      setProfile(profileData);

      // Initialize media
      await initializeMedia();
      setMediaReady(true);

      // Create participant record
      await supabase.from('session_participants').insert({
        session_id: sessionData.id,
        user_id: user?.id,
        participant_name: `${profileData?.first_name} ${profileData?.last_name}`,
        participant_role: sessionData.host_id === user?.id ? 'host' : 'client',
        device_fingerprint: '', // Would implement
        ip_address: '', // Would need service
        user_agent: navigator.userAgent
      });

      // Update session status
      if (sessionData.status === 'waiting') {
        await supabase
          .from('telehealth_sessions')
          .update({
            status: 'active',
            started_at: new Date().toISOString()
          })
          .eq('id', sessionData.id);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    try {
      // Update session
      await supabase
        .from('telehealth_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: session?.started_at 
            ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
            : 0
        })
        .eq('id', session?.id);

      // Update participant
      await supabase
        .from('session_participants')
        .update({
          connection_state: 'disconnected',
          left_at: new Date().toISOString()
        })
        .eq('session_id', session?.id)
        .eq('user_id', user?.id);

      toast({
        title: "Session Ended",
        description: "Thank you for using telehealth"
      });

      navigate('/schedule');
    } catch (err) {
      console.error('Error ending session:', err);
      toast({
        title: "Error",
        description: "Failed to end session properly",
        variant: "destructive"
      });
    }
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Connecting to session...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="p-8 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button className="w-full mt-4" onClick={() => navigate('/schedule')}>
            Return to Schedule
          </Button>
        </Card>
      </div>
    );
  }

  if (!mediaReady) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="p-8 max-w-md text-center">
          <VideoIcon className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Camera & Microphone Access Required</h2>
          <p className="text-muted-foreground mb-4">
            Please allow access to continue to the session
          </p>
          <Button onClick={initializeMedia}>
            Grant Access
          </Button>
        </Card>
      </div>
    );
  }

  const localParticipant = {
    id: user?.id || '',
    name: profile ? `${profile.first_name} ${profile.last_name}` : 'You',
    stream: localStream,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    role: isHost ? 'host' as const : 'client' as const
  };

  const remoteParticipants = Array.from(remoteStreams.entries()).map(([id, stream]) => ({
    id,
    name: 'Participant', // Would fetch from database
    stream,
    isMuted: false, // Would track via realtime
    isVideoEnabled: true,
    isScreenSharing: false,
    role: 'client' as const
  }));

  return (
    <div className="h-screen flex flex-col bg-background">
      <ScreenProtection sessionId={session?.id} userId={user?.id || ''} />

      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">Telehealth Session</h1>
            <p className="text-sm text-muted-foreground">
              {session?.status === 'active' ? 'Session in progress' : 'Waiting for others...'}
            </p>
          </div>

          <ConnectionQualityIndicator
            packetLoss={connectionQuality.packetLoss}
            latency={connectionQuality.latency}
            jitter={connectionQuality.jitter}
            connectionState={connectionState}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4">
          <div className="h-full max-w-screen-2xl mx-auto flex flex-col gap-4">
            <WaitingRoom sessionId={session?.id} isHost={isHost} />
            
            <div className="flex-1">
              <VideoGrid
                localParticipant={localParticipant}
                remoteParticipants={remoteParticipants}
                layout={remoteParticipants.length > 2 ? 'grid' : 'spotlight'}
              />
            </div>
          </div>
        </div>

        {isChatOpen && (
          <div className="w-80">
            <ChatSidebar
              sessionId={session?.id}
              currentUserId={user?.id || ''}
              currentUserName={profile ? `${profile.first_name} ${profile.last_name}` : 'You'}
              isOpen={isChatOpen}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <SessionControls
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onEndSession={handleEndSession}
      />
    </div>
  );
}
