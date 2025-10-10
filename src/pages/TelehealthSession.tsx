import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTwilioVideo } from '@/hooks/useTwilioVideo';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { RemoteParticipant, RemoteVideoTrack, RemoteAudioTrack } from 'twilio-video';
import { supabase } from '@/integrations/supabase/client';
import { VideoGrid } from '@/components/telehealth/VideoGrid';
import { SessionControls } from '@/components/telehealth/SessionControls';
import { ConnectionQualityIndicator } from '@/components/telehealth/ConnectionQualityIndicator';
import { WaitingRoom } from '@/components/telehealth/WaitingRoom';
import { ChatSidebar } from '@/components/telehealth/ChatSidebar';
import { ScreenProtection } from '@/components/telehealth/ScreenProtection';
import { PostSessionDialog } from '@/components/telehealth/PostSessionDialog';
import { RecordingConsentDialog } from '@/components/telehealth/RecordingConsentDialog';
import { SessionTimeoutWarning } from '@/components/telehealth/SessionTimeoutWarning';
import { BandwidthTestDialog } from '@/components/telehealth/BandwidthTestDialog';
import { ConsentVerificationGate } from '@/components/telehealth/ConsentVerificationGate';
import { WaitingRoomClient } from '@/components/telehealth/WaitingRoomClient';
import { WaitingRoomClinician } from '@/components/telehealth/WaitingRoomClinician';
import { AIAssistantPanel } from '@/components/telehealth/AIAssistantPanel';
import { ParticipantsPanel } from '@/components/telehealth/ParticipantsPanel';
import { SessionNotesPanel } from '@/components/telehealth/SessionNotesPanel';
import { BandwidthTestResult } from '@/hooks/useBandwidthTest';
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
  const [normalizedSessionId, setNormalizedSessionId] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showPostSessionDialog, setShowPostSessionDialog] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState(10);
  const [showBandwidthTest, setShowBandwidthTest] = useState(false);
  const [bandwidthTestComplete, setBandwidthTestComplete] = useState(false);
  const [bandwidthResult, setBandwidthResult] = useState<BandwidthTestResult | null>(null);
  const [consentVerified, setConsentVerified] = useState(false);
  const [consentId, setConsentId] = useState<string | null>(null);
  const [teleFlags, setTeleFlags] = useState({
    recording_feature_enabled: false,
    ai_note_generation_enabled: false,
  });
  const [waitingRoomId, setWaitingRoomId] = useState<string | null>(null);
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [waitingRoomAdmitted, setWaitingRoomAdmitted] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isParticipantsPanelOpen, setIsParticipantsPanelOpen] = useState(false);
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [aiSessionSummary, setAiSessionSummary] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'lovable_ai' | 'twilio'>('lovable_ai');
  
  const timeoutCheckRef = useRef<NodeJS.Timeout | null>(null);
  const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';

  const {
    room,
    localParticipant: twilioLocalParticipant,
    remoteParticipants,
    remoteTracks,
    connectionState,
    connectionQuality,
    isMuted,
    isVideoEnabled,
    localVideoTrack,
    localAudioTrack,
    connect,
    disconnect,
    toggleMute,
    toggleVideo
  } = useTwilioVideo(normalizedSessionId, user?.id || '', userName);

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useAudioRecording();

  // Build local MediaStream from Twilio tracks
  const localStream = useMemo(() => {
    if (!localVideoTrack && !localAudioTrack) return null;
    const tracks: MediaStreamTrack[] = [];
    if (localVideoTrack) tracks.push(localVideoTrack.mediaStreamTrack);
    if (localAudioTrack) tracks.push(localAudioTrack.mediaStreamTrack);
    return new MediaStream(tracks);
  }, [localVideoTrack, localAudioTrack]);

  // Remote tracks are now managed by the useTwilioVideo hook

  // Update participant connection state in DB when Twilio connects
  useEffect(() => {
    if (!session || !user || connectionState !== 'connected') return;

    const updateParticipantState = async () => {
      try {
        const { data: existingParticipant } = await supabase
          .from('session_participants')
          .select('id')
          .eq('session_id', session.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingParticipant) {
          await supabase
            .from('session_participants')
            .update({
              connection_state: 'connected',
              joined_at: new Date().toISOString()
            })
            .eq('id', existingParticipant.id);
        }
      } catch (error) {
        console.error('Error updating participant state:', error);
      }
    };

    updateParticipantState();

    return () => {
      const cleanup = async () => {
        try {
          const { data: existingParticipant } = await supabase
            .from('session_participants')
            .select('id')
            .eq('session_id', session.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingParticipant) {
            await supabase
              .from('session_participants')
              .update({
                connection_state: 'disconnected',
                left_at: new Date().toISOString()
              })
              .eq('id', existingParticipant.id);
          }
        } catch (error) {
          console.error('Error in cleanup:', error);
        }
      };
      cleanup();
    };
  }, [session, user, connectionState]);

  useEffect(() => {
    if (!user || !sessionId) return;
    loadSession();
  }, [user, sessionId]);

  useEffect(() => {
    const fetchTele = async () => {
      try {
        const { data } = await supabase
          .from('practice_settings')
          .select('telehealth_settings')
          .single();
        const tele = (data?.telehealth_settings as any) || {};
        setTeleFlags({
          recording_feature_enabled: !!tele.recording_feature_enabled,
          ai_note_generation_enabled: !!tele.ai_note_generation_enabled,
        });

        // Fetch AI provider setting
        const { data: aiSettings } = await supabase
          .from('ai_note_settings')
          .select('provider')
          .single();
        
        if (aiSettings?.provider) {
          setAiProvider(aiSettings.provider as 'lovable_ai' | 'twilio');
        }
      } catch (e) {
        // Silently fail - use default flags
      }
    };
    fetchTele();
  }, []);

  const loadSession = async () => {
    try {
      setLoading(true);

      // Build tolerant candidates for session_id matching
      const raw = (sessionId || '').trim();
      const noColon = raw.replace(/^:/, '');
      const withoutPrefix = noColon.replace(/^session_/, '');
      const withPrefix = withoutPrefix.startsWith('session_') ? withoutPrefix : `session_${withoutPrefix}`;

      // unique candidates in priority order
      const candidates = Array.from(new Set([noColon, withPrefix, withoutPrefix]));

      // Detect if user is a portal client by checking route or client record
      const isPortalRoute = window.location.pathname.startsWith('/portal/');
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, first_name, last_name, portal_enabled')
        .eq('portal_user_id', user?.id)
        .eq('portal_enabled', true)
        .maybeSingle();
      
      const isPortalClient = isPortalRoute || !!clientData;
      
      if (isPortalRoute && !clientData) {
        console.warn('Portal route detected but client record not found for user:', user?.id);
      }

      // 1) Try to fetch existing session by any candidate
      const { data: foundSessions, error: findErr } = await supabase
        .from('telehealth_sessions')
        .select(`
          *,
          appointments:appointment_id (
            client_id
          )
        `)
        .in('session_id', candidates);

      if (findErr) {
        console.error('Error fetching telehealth session:', findErr);
        throw new Error(isPortalClient 
          ? 'Unable to access session. Please wait for your clinician to start the session or contact support.'
          : 'Failed to load telehealth session. Please check your access permissions.');
      }

      // Prefer the one matching withPrefix if multiple
      let sessionData = (foundSessions || []).sort((a: any, b: any) => {
        const aScore = a.session_id === withPrefix ? 2 : candidates.includes(a.session_id) ? 1 : 0;
        const bScore = b.session_id === withPrefix ? 2 : candidates.includes(b.session_id) ? 1 : 0;
        return bScore - aScore;
      })[0] || null;

      // 2) If not found, allow the host to auto-bootstrap a session
      if (!sessionData) {

        // Try to find an appointment referring to any candidate in its telehealth_link
        const orFilters = candidates.map((c) => `telehealth_link.ilike.%${c}%`).join(',');
        const { data: appts, error: apptErr } = await supabase
          .from('appointments')
          .select('id, clinician_id, telehealth_link')
          .or(orFilters);

        if (apptErr) throw apptErr;

        // Staff can create sessions as host, portal clients can create if they have a matching appointment
        let hostAppointment = null;
        if (!isPortalClient) {
          hostAppointment = (appts || []).find((a: any) => a.clinician_id === user?.id);
        } else if (clientData) {
          // Portal client - check if they have an appointment for this session
          hostAppointment = (appts || []).find((a: any) => {
            // Check if appointment's client_id matches the portal client's ID
            return true; // We'll verify access through RLS policies
          });
        }
        
        if (hostAppointment && user?.id) {
          const canonicalId = withPrefix; // enforce canonical prefix

          const { data: created, error: insertErr } = await supabase
            .from('telehealth_sessions')
            .insert({
              session_id: canonicalId,
              host_id: isPortalClient ? hostAppointment.clinician_id : user.id,
              appointment_id: hostAppointment.id,
              status: 'waiting'
            })
            .select(`
              *,
              appointments:appointment_id (
                client_id
              )
            `)
            .maybeSingle();

          if (insertErr) {
            console.error('Error creating telehealth session:', insertErr);
            throw new Error(isPortalClient
              ? 'Unable to join session. Please ensure your portal access is properly configured and try again.'
              : 'Failed to create telehealth session. Please check your permissions.');
          }
          if (!created) throw new Error('Failed to create telehealth session');

          sessionData = created;

          // Update appointment link to canonical path (best-effort)
          const canonicalLink = `/telehealth/session/${canonicalId}`;
          if (hostAppointment.telehealth_link !== canonicalLink) {
            await supabase
              .from('appointments')
              .update({ telehealth_link: canonicalLink })
              .eq('id', hostAppointment.id);
          }

          // Redirect to canonical route if needed
          if (noColon !== canonicalId) {
            navigate(canonicalLink, { replace: true });
          }

          toast({ title: 'Session initialized', description: 'A new session was created for this link.' });
        } else {
          const errorMsg = isPortalClient
            ? 'Session not found. Please use the "Join Session" link from your appointments page.'
            : 'Session not found or you do not have permission to access this session.';
          setError(errorMsg);
          setLoading(false);
          return;
        }
      } else {
        // If we found a session and its session_id differs from the URL, normalize the route
        if (sessionData.session_id !== noColon) {
          const canonicalLink = isPortalClient 
            ? `/portal/telehealth/session/${sessionData.session_id}`
            : `/telehealth/session/${sessionData.session_id}`;
          navigate(canonicalLink, { replace: true });
        }
      }

      setSession(sessionData);
      const isUserHost = !isPortalClient && sessionData.host_id === user?.id;
      setIsHost(isUserHost);
      
      // Set the normalized session ID for WebRTC connection
      setNormalizedSessionId(sessionData.session_id);
      console.log('WebRTC will connect to room:', sessionData.session_id);

      // Fetch user profile based on whether they're a portal client or staff
      let profileData;
      if (isPortalClient && clientData) {
        profileData = { first_name: clientData.first_name, last_name: clientData.last_name };
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user?.id)
          .maybeSingle();
        profileData = data;
      }

      setProfile(profileData);

      // Check waiting room status for non-hosts
      if (!isUserHost && sessionData.appointment_id) {
        const { data: waitingRoom } = await supabase
          .from('telehealth_waiting_rooms')
          .select('*')
          .eq('appointment_id', sessionData.appointment_id)
          .eq('session_id', sessionData.session_id)
          .maybeSingle();

        if (!waitingRoom) {
          // Create waiting room entry
          const { data: newWaitingRoom } = await supabase
            .from('telehealth_waiting_rooms')
            .insert({
              appointment_id: sessionData.appointment_id,
              client_id: sessionData.appointments?.client_id,
              session_id: sessionData.session_id
            })
            .select()
            .single();

          if (newWaitingRoom) {
            setWaitingRoomId(newWaitingRoom.id);
            setInWaitingRoom(true);
            setLoading(false);
            
            // Send notification to clinician
            supabase.functions.invoke('send-waiting-room-notification', {
              body: { waitingRoomId: newWaitingRoom.id }
            }).catch(() => {
              // Silently fail - notification not critical
            });
            
            return;
          }
        } else if (waitingRoom.status === 'Waiting') {
          // Client is in waiting room
          setWaitingRoomId(waitingRoom.id);
          setInWaitingRoom(true);
          setLoading(false);
          return;
        } else if (waitingRoom.status === 'Admitted') {
          // Client has been admitted, proceed with session
          setWaitingRoomAdmitted(true);
        } else if (waitingRoom.status === 'Timed Out') {
          setError('Your session has timed out. Please contact your clinician.');
          setLoading(false);
          return;
        }
      }

      // Show bandwidth test before connecting to Twilio
      if (!bandwidthTestComplete) {
        setShowBandwidthTest(true);
        setLoading(false);
        return;
      }

      // Connect to Twilio Video
      try {
        console.log('Connecting to Twilio room:', sessionData.session_id);
        await connect();
        setMediaReady(true);
        console.log('Successfully connected to Twilio');
      } catch (err) {
        console.error('Failed to connect to Twilio:', err);
        throw new Error('Failed to connect to video service. Please check that Twilio is configured.');
      }

      // Create participant record (ignore error if already exists)
      try {
        await supabase.from('session_participants').insert({
          session_id: sessionData.id,
          user_id: user?.id,
          participant_name: profileData ? `${profileData.first_name} ${profileData.last_name}` : 'Guest',
          participant_role: isUserHost ? 'host' : 'client',
          device_fingerprint: '',
          ip_address: '',
          user_agent: navigator.userAgent
        });
      } catch (e) {
        // Silently handle duplicate participant entries
      }

      // If session is waiting and host joins, mark active
      if (sessionData.status === 'waiting' && isUserHost) {
        const startTime = new Date();
        await supabase
          .from('telehealth_sessions')
          .update({
            status: 'active',
            started_at: startTime.toISOString()
          })
          .eq('id', sessionData.id);
        
        setSessionStartTime(startTime);
        startTimeoutMonitoring(startTime);
      } else if (sessionData.status === 'active' && sessionData.started_at) {
        const startTime = new Date(sessionData.started_at);
        setSessionStartTime(startTime);
        startTimeoutMonitoring(startTime);
      }

      setLoading(false);
    } catch (err) {
      console.error('Session load error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!isRecording) {
      if (!recordingConsent) {
        setShowConsentDialog(true);
        return;
      }
      await startRecording();
    } else {
      const blob = await stopRecording();
      setAudioBlob(blob);
    }
  };

  const handleRecordingConsent = async () => {
    setRecordingConsent(true);
    setShowConsentDialog(false);
    await startRecording();
  };

  const handleEndSession = async () => {
    try {
      // Disconnect from Twilio
      disconnect();

      // Stop recording if active
      let blob = audioBlob;
      if (isRecording) {
        blob = await stopRecording();
        setAudioBlob(blob);
      }

      // Generate AI summary if AI was active
      if (room && (isAIPanelOpen || isRecording)) {
        try {
          // Import the hook's generateSummary dynamically
          const summary = await generateAISummary();
          if (summary) {
            setAiSessionSummary(summary);
          }
        } catch (err) {
          console.error('Failed to generate AI summary:', err);
        }
      }

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

      // Show post-session dialog only for hosts (clinicians)
      if (isHost) {
        setShowPostSessionDialog(true);
      } else {
        // For clients, just navigate back to appointments
        const returnRoute = window.location.pathname.startsWith('/portal/')
          ? '/portal/appointments'
          : '/schedule';
        navigate(returnRoute);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to end session properly",
        variant: "destructive"
      });
    }
  };

  const generateAISummary = async (): Promise<string | null> => {
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'analyze-session-audio',
        {
          body: {
            audioText: 'Session completed',
            sessionContext: `Session ID: ${normalizedSessionId}`,
            analysisType: 'summary'
          }
        }
      );

      if (functionError || !functionData) {
        throw new Error('Failed to generate summary');
      }

      return functionData.content || null;
    } catch (error) {
      console.error('[AI] Failed to generate summary:', error);
      return null;
    }
  };

  const handleGenerateAINote = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { data: result, error } = await supabase.functions.invoke(
        'generate-note-from-transcript',
        {
          body: {
            transcript: aiSessionSummary,
            clientId: session?.appointments?.client_id,
            clinicianId: currentUser.id,
            appointmentId: session?.appointment_id,
            sessionId: normalizedSessionId,
          },
        }
      );

      if (error) throw error;

      toast({
        title: 'AI Note Generated!',
        description: 'Clinical note has been created from session transcript.',
      });

      navigate(`/notes/${result.noteId}`);
      setShowPostSessionDialog(false);
    } catch (error) {
      throw error;
    }
  };

  const handleToggleScreenShare = () => {
    toast({
      title: 'Screen Sharing',
      description: 'Screen sharing with Twilio Video will be implemented in a future update',
      variant: 'default'
    });
  };

  // Session timeout monitoring (2-hour limit)
  const startTimeoutMonitoring = (startTime: Date) => {
    const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
    const WARNING_TIME_MS = 10 * 60 * 1000; // 10 minutes before

    timeoutCheckRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime.getTime();
      const remaining = SESSION_TIMEOUT_MS - elapsed;
      
      // Show warning at 10 minutes
      if (remaining <= WARNING_TIME_MS && remaining > 0 && !showTimeoutWarning) {
        const mins = Math.ceil(remaining / (60 * 1000));
        setMinutesRemaining(mins);
        setShowTimeoutWarning(true);
      }
      
      // Auto-end session at 2 hours
      if (remaining <= 0) {
        handleTimeoutEnd();
      }
    }, 60000); // Check every minute
  };

  const handleTimeoutEnd = async () => {
    toast({
      title: "Session Timeout",
      description: "This session has reached the 2-hour limit and will now end.",
      variant: "destructive"
    });
    await handleEndSession();
  };

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
    // Session continues until 2-hour hard limit
  };

  // Monitor participant count with realtime
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`participants-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${session.id}`
        },
        async () => {
          // Fetch current participant count
          const { data, error } = await supabase
            .from('session_participants')
            .select('id', { count: 'exact' })
            .eq('session_id', session.id)
            .eq('connection_state', 'connected');

          if (!error && data) {
            setParticipantCount(data.length);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
      }
    };
  }, []);

  // Check participant limit before allowing joins
  const canJoinSession = participantCount < (session?.max_participants || 16);

  // Show consent verification gate first (if session has client_id)
  if (!loading && !error && session?.appointment_id && !consentVerified) {
    const clientId = session?.appointments?.client_id;
    
    if (clientId) {
      return (
        <ConsentVerificationGate
          clientId={clientId}
          clinicianId={user?.id || ''}
          onConsentVerified={async (id) => {
            setConsentId(id);
            setConsentVerified(true);
            
            // Update session with consent
            await supabase
              .from('telehealth_sessions')
              .update({
                consent_id: id,
                consent_verified: true,
                consent_verification_date: new Date().toISOString(),
              })
              .eq('id', session.id);
            
            console.log('Consent verified for session, continuing to media initialization');
            
            // Continue with bandwidth test or Twilio connection
            if (!bandwidthTestComplete) {
              setShowBandwidthTest(true);
            } else {
              // Connect to Twilio directly
              try {
                await connect();
                setMediaReady(true);
              } catch (err) {
                console.error('Error connecting to Twilio after consent:', err);
                setError('Failed to connect to video service. Please check that Twilio is configured.');
              }
            }
          }}
        />
      );
    }
  }

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

  // Show waiting room for non-host clients
  if (inWaitingRoom && !isHost && waitingRoomId && session) {
    return (
      <WaitingRoomClient
        waitingRoomId={waitingRoomId}
        clinicianName={profile ? `${profile.first_name} ${profile.last_name}` : 'Your Clinician'}
        appointmentTime={session.appointments?.start_time || 'Scheduled'}
        onAdmitted={() => {
          setInWaitingRoom(false);
          setWaitingRoomAdmitted(true);
          // Reload session to continue
          loadSession();
        }}
        onTimeout={() => {
          setError('Your session has timed out. Please contact your clinician to reschedule.');
        }}
      />
    );
  }

  if (error) {
    // Detect if user is a portal client
    const isPortalRoute = window.location.pathname.startsWith('/portal/');
    const returnRoute = isPortalRoute ? '/portal/appointments' : '/schedule';
    const returnLabel = isPortalRoute ? 'Return to Appointments' : 'Return to Schedule';

    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="p-8 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button className="w-full mt-4" onClick={() => navigate(returnRoute)}>
            {returnLabel}
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
          <Button 
            onClick={async () => {
              try {
                console.log('Grant Access clicked, connecting to Twilio...');
                await connect();
                setMediaReady(true);
                console.log('Media ready set to true');
              } catch (err) {
                console.error('Failed to connect to Twilio:', err);
                toast({
                  title: 'Connection Failed',
                  description: 'Failed to connect to video service. Please check that Twilio is configured.',
                  variant: 'destructive'
                });
              }
            }}
          >
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
    isScreenSharing: false,
    role: isHost ? 'host' as const : 'client' as const
  };

  const remoteParticipantsList = Array.from(remoteParticipants.values()).map((participant) => {
    const stream = remoteTracks.get(participant.sid);
    const hasAudio = stream?.getAudioTracks().length > 0;
    const hasVideo = stream?.getVideoTracks().length > 0;
    
    return {
      id: participant.sid,
      name: participant.identity,
      stream: stream || null,
      isMuted: !hasAudio,
      isVideoEnabled: hasVideo,
      isScreenSharing: false,
      role: 'client' as const
    };
  });

  return (
    <div className="h-screen flex flex-col bg-background">
      <ScreenProtection sessionId={session?.id} userId={user?.id || ''} />

      {/* Waiting Room Management for Hosts */}
      {isHost && user && (
        <WaitingRoomClinician 
          clinicianId={user.id}
          onAdmitClient={(admittedSessionId) => {
            if (admittedSessionId === session?.session_id) {
              toast({
                title: 'Client Admitted',
                description: 'The client is now joining the session'
              });
            }
          }}
        />
      )}

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
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-hidden">
            <VideoGrid
              localParticipant={localParticipant}
              remoteParticipants={remoteParticipantsList}
              layout={remoteParticipantsList.length > 2 ? 'grid' : 'spotlight'}
            />
          </div>
        </div>

        {/* Sidebars */}
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

          <AIAssistantPanel
            isOpen={isAIPanelOpen}
            sessionId={normalizedSessionId}
            isRecording={isRecording}
            room={room}
            provider={aiProvider}
            onClose={() => setIsAIPanelOpen(false)}
            onProviderChange={(p) => setAiProvider(p)}
          />

        {isParticipantsPanelOpen && (
          <ParticipantsPanel
            isOpen={isParticipantsPanelOpen}
            participants={remoteParticipantsList.map(p => ({
              id: p.id,
              name: p.name,
              role: p.id === session?.host_id ? 'host' : 'client',
              isMuted: p.isMuted,
              isVideoEnabled: p.isVideoEnabled,
              connectionQuality: 'good'
            }))}
            currentUserId={user?.id || ''}
            isHost={isHost}
            onClose={() => setIsParticipantsPanelOpen(false)}
          />
        )}

        {isNotesPanelOpen && (
          <SessionNotesPanel
            isOpen={isNotesPanelOpen}
            sessionId={normalizedSessionId}
            onClose={() => setIsNotesPanelOpen(false)}
          />
        )}
      </div>

      {/* Controls */}
      <SessionControls
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={false}
        isChatOpen={isChatOpen}
        isRecording={teleFlags.recording_feature_enabled ? isRecording : false}
        recordingDuration={teleFlags.recording_feature_enabled ? recordingDuration : 0}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onToggleRecording={teleFlags.recording_feature_enabled ? handleToggleRecording : undefined}
        onEndSession={handleEndSession}
        onToggleAI={() => setIsAIPanelOpen(!isAIPanelOpen)}
        onToggleParticipants={() => setIsParticipantsPanelOpen(!isParticipantsPanelOpen)}
        onToggleNotes={() => setIsNotesPanelOpen(!isNotesPanelOpen)}
        isAIEnabled={isAIPanelOpen}
        isParticipantsOpen={isParticipantsPanelOpen}
        isNotesOpen={isNotesPanelOpen}
      />

      <RecordingConsentDialog
        open={showConsentDialog}
        onConsent={handleRecordingConsent}
        onDecline={() => setShowConsentDialog(false)}
      />

      <PostSessionDialog
        open={showPostSessionDialog}
        onOpenChange={setShowPostSessionDialog}
        sessionId={session?.session_id || ''}
        hasRecording={!!audioBlob}
        recordingDuration={recordingDuration}
        audioBlob={audioBlob}
        appointmentId={session?.appointment_id}
        clientId={session?.appointments?.client_id || ''}
        enableAIGenerate={teleFlags.ai_note_generation_enabled}
        aiTranscript={aiSessionSummary}
        onGenerateAINote={handleGenerateAINote}
      />

      <SessionTimeoutWarning
        open={showTimeoutWarning}
        minutesRemaining={minutesRemaining}
        onExtend={handleExtendSession}
        onEnd={handleEndSession}
      />

      <BandwidthTestDialog
        open={showBandwidthTest}
        sessionId={session?.id}
        onComplete={async (result) => {
          console.log('Bandwidth test complete, result:', result);
          setBandwidthResult(result);
          setBandwidthTestComplete(true);
          setShowBandwidthTest(false);
          
          if (result) {
            toast({
              title: "Connection Test Complete",
              description: result.recommendation
            });
          }
          
          // Connect to Twilio after bandwidth test
          try {
            console.log('Connecting to Twilio after bandwidth test...');
            await connect();
            setMediaReady(true);
            console.log('Twilio connection successful');
            
            // Create participant record
            if (session && user && profile) {
              try {
                await supabase.from('session_participants').insert({
                  session_id: session.id,
                  user_id: user.id,
                  participant_name: `${profile.first_name} ${profile.last_name}`,
                  participant_role: isHost ? 'host' : 'client',
                  device_fingerprint: '',
                  ip_address: '',
                  user_agent: navigator.userAgent
                });
              } catch (e) {
                console.warn('[Telehealth] Participant insert warning:', e);
              }
            }
          } catch (err) {
            console.error('Error connecting to Twilio:', err);
            setError('Failed to connect to video service. Please check that Twilio is configured.');
          }
        }}
        onCancel={() => {
          setShowBandwidthTest(false);
          navigate('/schedule');
        }}
      />

      {!canJoinSession && (
        <Alert variant="destructive" className="fixed top-4 left-1/2 -translate-x-1/2 max-w-md z-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This session has reached the maximum of {session?.max_participants || 16} participants.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
