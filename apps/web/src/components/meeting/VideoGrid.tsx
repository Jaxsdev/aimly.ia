import React, { useEffect, useRef } from 'react';
import { PeerState } from '../../hooks/useWebRTC';
import { useAuth } from '../../contexts/AuthContext';

interface VideoTileProps {
  name: string;
  avatarUrl?: string;
  stream?: MediaStream | null;
  audioOn: boolean;
  videoOn: boolean;
  isSelf?: boolean;
  isScreenShare?: boolean;
}

function VideoTile({ name, avatarUrl, stream, audioOn, videoOn, isSelf = false, isScreenShare = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center group aspect-video transition-all">
      {/* Video Element */}
      {videoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={`w-full h-full object-cover ${isSelf && !isScreenShare ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar Fallback */
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 rounded-full bg-aimly-orange/20 border-2 border-aimly-orange/40 text-aimly-orange flex items-center justify-center font-bold text-xl mb-2 shadow-inner">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="text-xs font-semibold text-gray-300">{name}</span>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-medium text-white shadow-md">
        <span>{isSelf ? `${name} (Tú)` : name}</span>
        {!audioOn && <span className="text-red-400 text-xs">🎙️❌</span>}
      </div>
    </div>
  );
}

function RemoteAudio({ stream }: { stream?: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current || !stream) return;
    audioRef.current.srcObject = stream;
    audioRef.current.play().catch((error) => {
      console.warn('[Llamada] El navegador bloqueó la reproducción automática de audio.', error);
    });
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

/** Keeps remote audio playing even while the participant is looking at the board. */
export function CallAudio({ peers }: { peers: Record<string, PeerState> }) {
  return <>{Object.values(peers).map((peer) => <RemoteAudio key={peer.userId} stream={peer.stream} />)}</>;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioOn: boolean;
  videoOn: boolean;
  peers: Record<string, PeerState>;
  onCloseGrid?: () => void;
}

export function VideoGrid({ localStream, screenStream, audioOn, videoOn, peers, onCloseGrid }: VideoGridProps) {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tú';
  const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;

  const peerList = Object.values(peers);
  const totalCount = 1 + (screenStream ? 1 : 0) + peerList.length;

  const getGridColsClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-2xl mx-auto';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto';
    if (totalCount <= 4) return 'grid-cols-2 max-w-4xl mx-auto';
    return 'grid-cols-2 md:grid-cols-3 max-w-6xl mx-auto';
  };

  return (
    <div className="w-full h-full bg-gray-950 p-6 flex flex-col justify-between overflow-y-auto font-sans relative">
      {/* Grid Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Videollamada en directo ({totalCount} participante{totalCount > 1 ? 's' : ''})</span>
        </div>

        {onCloseGrid && (
          <button
            onClick={onCloseGrid}
            className="text-gray-400 hover:text-white bg-gray-900 border border-gray-800 p-2 rounded-xl text-xs font-bold transition-all"
          >
            📉 Minimizar a la Pizarra
          </button>
        )}
      </div>

      {/* Main Video Tiles Grid */}
      <div className={`w-full grid gap-4 items-center ${getGridColsClass()}`}>
        {/* Screen Sharing Tile if active */}
        {screenStream && (
          <VideoTile
            name={`${userName} (Pantalla)`}
            stream={screenStream}
            audioOn={false}
            videoOn={true}
            isSelf={true}
            isScreenShare={true}
          />
        )}

        {/* Local Participant Tile */}
        <VideoTile
          name={userName}
          avatarUrl={avatarUrl}
          stream={localStream}
          audioOn={audioOn}
          videoOn={videoOn}
          isSelf={true}
        />

        {/* Remote Peers Tiles */}
        {peerList.map((peer) => (
          <VideoTile
            key={peer.userId}
            name={peer.name}
            avatarUrl={peer.avatar_url}
            stream={peer.stream}
            audioOn={peer.audioOn}
            videoOn={peer.videoOn}
          />
        ))}
      </div>

      <div className="h-16"></div>
    </div>
  );
}
