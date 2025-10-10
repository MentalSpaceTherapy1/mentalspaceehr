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
      });

      roomRef.current = connectedRoom;
      setRoom(connectedRoom);
      setLocalParticipant(connectedRoom.localParticipant);
      setConnectionState('connected');

      connectedRoom.on('participantConnected', (p: RemoteParticipant) => {
        console.log('Participant connected:', p.identity);
        setRemoteParticipants((prev) => new Map(prev).set(p.sid, p));
      });

      connectedRoom.on('participantDisconnected', (p: RemoteParticipant) => {
        console.log('Participant disconnected:', p.identity);
        setRemoteParticipants((prev) => { const u = new Map(prev); u.delete(p.sid); return u; });
      });

      connectedRoom.participants.forEach((p) => {
        console.log('Existing participant:', p.identity);
        setRemoteParticipants((prev) => new Map(prev).set(p.sid, p));
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
    room, localParticipant, remoteParticipants, connectionState, connectionQuality,
    isMuted, isVideoEnabled, isScreenSharing, localVideoTrack, localAudioTrack,
    connect, disconnect, toggleMute, toggleVideo
  };
};
