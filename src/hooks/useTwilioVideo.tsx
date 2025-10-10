import { useState, useEffect, useCallback, useRef } from 'react';
import Video, {
  Room,
  LocalParticipant,
  RemoteParticipant,
  LocalVideoTrack,
  LocalAudioTrack,
} from 'twilio-video';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface ConnectionQuality {
  packetLoss: number;
  latency: number;
  jitter: number;
  bandwidth: number;
}

export const useTwilioVideo = (sessionId: string, userId: string, userName: string) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipant>>(
    new Map()
  );
  const [remoteTracks, setRemoteTracks] = useState<Map<string, MediaStream>>(new Map());
  const [connectionState, setConnectionState] = useState<'new' | 'connected' | 'reconnecting' | 'disconnected'>('new');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    packetLoss: 0,
    latency: 0,
    jitter: 0,
    bandwidth: 0,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [screenTrack, setScreenTrack] = useState<LocalVideoTrack | null>(null);
  const [dominantSpeaker, setDominantSpeaker] = useState<RemoteParticipant | null>(null);

  const { toast } = useToast();
  const roomRef = useRef<Room | null>(null);

  const connect = useCallback(async () => {
    try {
      console.log('[Twilio Debug] Connecting to room:', sessionId, 'as:', userName);
      const { data, error } = await supabase.functions.invoke('get-twilio-token', {
        body: { identity: userName, room_name: sessionId },
      });

      if (error) throw error;
      if (!data?.token) throw new Error('No token received');

      const videoTrack = await Video.createLocalVideoTrack({ width: 1280, height: 720, frameRate: 24 });
      const audioTrack = await Video.createLocalAudioTrack({
        echoCancellation: true, noiseSuppression: true, autoGainControl: true
      });

      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);

      const connectedRoom = await Video.connect(data.token, {
        name: sessionId,
        tracks: [videoTrack, audioTrack],
        networkQuality: { local: 3, remote: 1 },
        dominantSpeaker: true,
        bandwidthProfile: {
          video: {
            mode: 'collaboration',
            maxTracks: 10,
            dominantSpeakerPriority: 'high',
            renderDimensions: {
              high: { width: 1280, height: 720 },
              standard: { width: 640, height: 480 },
              low: { width: 320, height: 240 }
            }
          }
        },
        preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }],
        maxAudioBitrate: 16000,
      });

      roomRef.current = connectedRoom;
      setRoom(connectedRoom);
      setLocalParticipant(connectedRoom.localParticipant);
      setConnectionState('connected');

      const handleTrackSubscribed = (track: any, participant: RemoteParticipant) => {
        console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);
        setRemoteTracks((prev) => {
          const stream = prev.get(participant.sid) || new MediaStream();
          stream.addTrack(track.mediaStreamTrack);
          return new Map(prev).set(participant.sid, stream);
        });
      };

      const handleTrackUnsubscribed = (track: any, participant: RemoteParticipant) => {
        console.log(`Track unsubscribed: ${track.kind} from ${participant.identity}`);
        setRemoteTracks((prev) => {
          const stream = prev.get(participant.sid);
          if (stream) {
            stream.removeTrack(track.mediaStreamTrack);
            if (stream.getTracks().length === 0) {
              const newMap = new Map(prev);
              newMap.delete(participant.sid);
              return newMap;
            }
          }
          return prev;
        });
      };

      const setupParticipant = (p: RemoteParticipant) => {
        console.log('Setting up participant:', p.identity);
        setRemoteParticipants((prev) => new Map(prev).set(p.sid, p));
        
        p.tracks.forEach((publication) => {
          if (publication.track && publication.track.kind !== 'data') {
            handleTrackSubscribed(publication.track, p);
          }
        });

        p.on('trackSubscribed', (track) => {
          if (track.kind !== 'data') handleTrackSubscribed(track, p);
        });
        
        p.on('trackUnsubscribed', (track) => {
          if (track.kind !== 'data') handleTrackUnsubscribed(track, p);
        });
      };

      connectedRoom.on('participantConnected', setupParticipant);

      connectedRoom.on('participantDisconnected', (p: RemoteParticipant) => {
        console.log('Participant disconnected:', p.identity);
        setRemoteParticipants((prev) => { 
          const u = new Map(prev); 
          u.delete(p.sid); 
          return u; 
        });
        setRemoteTracks((prev) => {
          const u = new Map(prev);
          u.delete(p.sid);
          return u;
        });
      });

      connectedRoom.participants.forEach(setupParticipant);

      // Listen for dominant speaker changes
      connectedRoom.on('dominantSpeakerChanged', (participant: RemoteParticipant | null) => {
        console.log('[Twilio] Dominant speaker changed:', participant?.identity || 'None');
        setDominantSpeaker(participant);
      });

      return connectedRoom;
    } catch (error) {
      toast({ title: 'Connection Error', variant: 'destructive' });
      throw error;
    }
  }, [sessionId, userName, toast]);

  const disconnect = useCallback(() => {
    localVideoTrack?.stop();
    localAudioTrack?.stop();
    screenTrack?.stop();
    roomRef.current?.disconnect();
    roomRef.current = null;
    setRoom(null);
  }, [localVideoTrack, localAudioTrack, screenTrack]);

  const toggleMute = useCallback(() => {
    if (localAudioTrack) {
      isMuted ? localAudioTrack.enable() : localAudioTrack.disable();
      setIsMuted(!isMuted);
    }
  }, [localAudioTrack, isMuted]);

  const toggleVideo = useCallback(() => {
    if (localVideoTrack) {
      isVideoEnabled ? localVideoTrack.disable() : localVideoTrack.enable();
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localVideoTrack, isVideoEnabled]);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    room, localParticipant, remoteParticipants, remoteTracks, connectionState, connectionQuality,
    isMuted, isVideoEnabled, isScreenSharing, localVideoTrack, localAudioTrack,
    dominantSpeaker,
    connect, disconnect, toggleMute, toggleVideo
  };
};
