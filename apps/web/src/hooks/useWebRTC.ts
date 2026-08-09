import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface PeerState {
  userId: string;
  name: string;
  avatar_url?: string;
  stream?: MediaStream;
  audioOn: boolean;
  videoOn: boolean;
  isScreenSharing?: boolean;
  isSpeaking?: boolean;
}

export function useWebRTC(meetingId: string) {
  const { user } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peers, setPeers] = useState<Record<string, PeerState>>({});

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const pendingIceCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      ...(turnUrl && turnUsername && turnCredential
        ? [{ urls: turnUrl, username: turnUsername, credential: turnCredential }]
        : [])
    ]
  };

  // Helper to create RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback((remoteUserId: string, remoteName: string) => {
    if (peerConnections.current[remoteUserId]) {
      return peerConnections.current[remoteUserId];
    }

    const pc = new RTCPeerConnection(iceServers);
    peerConnections.current[remoteUserId] = pc;

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`[Llamada] Conexión con ${remoteName} en estado ${pc.connectionState}.`);
      }
    };

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      setPeers(prev => ({
        ...prev,
        [remoteUserId]: {
          ...(prev[remoteUserId] || {
            userId: remoteUserId,
            name: remoteName,
            audioOn: true,
            videoOn: true
          }),
          stream: remoteStream
        }
      }));
    };

    // Send ICE candidates to remote peer via signaling channel
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-ice-candidate',
          payload: {
            targetId: remoteUserId,
            senderId: user?.id,
            candidate: event.candidate
          }
        }).catch((error: unknown) => console.warn('[Llamada] No se pudo enviar candidato ICE.', error));
      }
    };

    return pc;
  }, [user?.id]);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!meetingId || !user?.id || !isInCall) return;

    const channel = supabase.channel(`webrtc:${meetingId}`, {
      config: { presence: { key: user.id } }
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'webrtc-join' }, async ({ payload }) => {
        const { senderId, senderName } = payload;
        if (senderId === user.id) return;

        // Create peer connection & send offer
        const pc = createPeerConnection(senderId, senderName);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channel.send({
          type: 'broadcast',
          event: 'webrtc-offer',
          payload: {
            targetId: senderId,
            senderId: user.id,
            senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Participante',
            offer
          }
        });
      })
      .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
        const { targetId, senderId, senderName, offer } = payload;
        if (targetId !== user.id) return;

        const pc = createPeerConnection(senderId, senderName);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const queuedCandidates = pendingIceCandidates.current[senderId] || [];
        for (const candidate of queuedCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
        }
        delete pendingIceCandidates.current[senderId];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: 'broadcast',
          event: 'webrtc-answer',
          payload: {
            targetId: senderId,
            senderId: user.id,
            answer
          }
        }).catch((error: unknown) => console.warn('[Llamada] No se pudo enviar respuesta.', error));
      })
      .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
        const { targetId, senderId, answer } = payload;
        if (targetId !== user.id) return;

        const pc = peerConnections.current[senderId];
        if (pc && pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      })
      .on('broadcast', { event: 'webrtc-ice-candidate' }, async ({ payload }) => {
        const { targetId, senderId, candidate } = payload;
        if (targetId !== user.id) return;

        const pc = peerConnections.current[senderId];
        if (pc) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
          } else {
            (pendingIceCandidates.current[senderId] ||= []).push(candidate);
          }
        }
      })
      .on('broadcast', { event: 'webrtc-media-toggle' }, ({ payload }) => {
        const { senderId, audioOn, videoOn } = payload;
        setPeers(prev => {
          if (!prev[senderId]) return prev;
          return {
            ...prev,
            [senderId]: {
              ...prev[senderId],
              audioOn,
              videoOn
            }
          };
        });
      })
      .on('broadcast', { event: 'webrtc-leave' }, ({ payload }) => {
        const { senderId } = payload;
        if (peerConnections.current[senderId]) {
          peerConnections.current[senderId].close();
          delete peerConnections.current[senderId];
        }
        setPeers(prev => {
          const next = { ...prev };
          delete next[senderId];
          return next;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Broadcast join event to all room participants
          channel.send({
            type: 'broadcast',
            event: 'webrtc-join',
            payload: {
              senderId: user.id,
              senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Participante'
            }
          }).catch((error: unknown) => console.warn('[Llamada] No se pudo enviar oferta.', error));
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-leave',
          payload: { senderId: user.id }
        }).catch(() => undefined);
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [meetingId, user?.id, isInCall, createPeerConnection]);

  // Join Call
  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsInCall(true);
    } catch (err) {
      console.warn('[useWebRTC] Camera/Mic access fallback to audio only:', err);
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(audioOnlyStream);
        localStreamRef.current = audioOnlyStream;
        setVideoOn(false);
        setIsInCall(true);
      } catch (audioErr) {
        console.error('[useWebRTC] Media access denied:', audioErr);
        // Enter call in listen-only mode
        setIsInCall(true);
      }
    }
  };

  // Leave Call
  const leaveCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }

    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setPeers({});
    setIsInCall(false);
  };

  // Toggle Audio Track
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(t => (t.enabled = !audioOn));
      const nextAudio = !audioOn;
      setAudioOn(nextAudio);

      if (channelRef.current && user?.id) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-media-toggle',
          payload: { senderId: user.id, audioOn: nextAudio, videoOn }
        });
      }
    }
  };

  // Toggle Video Track
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(t => (t.enabled = !videoOn));
      const nextVideo = !videoOn;
      setVideoOn(nextVideo);

      if (channelRef.current && user?.id) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-media-toggle',
          payload: { senderId: user.id, audioOn, videoOn: nextVideo }
        });
      }
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  return {
    isInCall,
    localStream,
    screenStream,
    audioOn,
    videoOn,
    isScreenSharing,
    peers,
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  };
}
