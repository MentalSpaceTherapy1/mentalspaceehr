import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

interface ConnectionQuality {
  packetLoss: number;
  latency: number;
  jitter: number;
  bandwidth: number;
}

export const useWebRTC = (sessionId: string, userId: string, role: 'host' | 'client') => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    packetLoss: 0,
    latency: 0,
    jitter: 0,
    bandwidth: 0
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const signalingChannel = useRef<any>(null);

  // WebRTC configuration with STUN/TURN servers
  const rtcConfig: WebRTCConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Create peer connection for a remote peer
  const createPeerConnection = useCallback((remotePeerId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection(rtcConfig);

    // Add local tracks to connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev).set(remotePeerId, remoteStream));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            targetPeerId: remotePeerId,
            fromPeerId: userId
          }
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      console.log('Connection state:', pc.connectionState);
    };

    // Create data channel for chat/metadata
    const dc = pc.createDataChannel('session-data');
    dataChannels.current.set(remotePeerId, dc);

    peerConnections.current.set(remotePeerId, pc);
    return pc;
  }, [userId, rtcConfig]);

  // Monitor connection quality
  useEffect(() => {
    if (peerConnections.current.size === 0) return;

    const interval = setInterval(async () => {
      const pc = Array.from(peerConnections.current.values())[0];
      if (!pc) return;

      const stats = await pc.getStats();
      let packetLoss = 0;
      let latency = 0;
      let jitter = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetLoss = (report.packetsLost / report.packetsReceived) * 100 || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = report.currentRoundTripTime * 1000 || 0;
        }
        if (report.type === 'inbound-rtp' && report.jitter) {
          jitter = report.jitter * 1000 || 0;
        }
      });

      setConnectionQuality({
        packetLoss: Math.min(packetLoss, 100),
        latency: Math.min(latency, 1000),
        jitter: Math.min(jitter, 100),
        bandwidth: 0 // Would need additional calculation
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [peerConnections.current.size]);

  // Toggle audio mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localStream, isVideoEnabled]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } }
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      
      // Replace video track in all peer connections
      peerConnections.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => sender.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      // Update local stream
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        localStream.removeTrack(videoTrack);
        localStream.addTrack(screenTrack);
        videoTrack.stop();
      }

      setIsScreenSharing(true);

      // Handle screen share stop
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  }, [localStream]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
      });

      const videoTrack = videoStream.getVideoTracks()[0];

      // Replace screen track with camera in all peer connections
      peerConnections.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => sender.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      if (localStream) {
        const screenTrack = localStream.getVideoTracks()[0];
        localStream.removeTrack(screenTrack);
        localStream.addTrack(videoTrack);
        screenTrack.stop();
      }

      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }, [localStream]);

  // Setup signaling via Supabase Realtime
  useEffect(() => {
    const channel = supabase.channel(`webrtc-${sessionId}`)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.targetPeerId !== userId || !localStream) return;
        
        const pc = createPeerConnection(payload.fromPeerId, localStream);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            answer,
            targetPeerId: payload.fromPeerId,
            fromPeerId: userId
          }
        });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.targetPeerId !== userId) return;
        
        const pc = peerConnections.current.get(payload.fromPeerId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.targetPeerId !== userId) return;
        
        const pc = peerConnections.current.get(payload.fromPeerId);
        if (pc && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .subscribe();

    signalingChannel.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId, localStream, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      dataChannels.current.clear();
    };
  }, [localStream]);

  return {
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
    stopScreenShare,
    createPeerConnection
  };
};
