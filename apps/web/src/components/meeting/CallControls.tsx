import React from 'react';
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';

interface CallControlsProps {
  isInCall: boolean;
  audioOn: boolean;
  videoOn: boolean;
  isScreenSharing: boolean;
  onJoinCall: () => void;
  onLeaveCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

export function CallControls({
  isInCall, audioOn, videoOn, isScreenSharing,
  onJoinCall, onLeaveCall, onToggleAudio, onToggleVideo, onToggleScreenShare
}: CallControlsProps) {
  if (!isInCall) {
    return (
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-aimly-border bg-aimly-surface/95 px-4 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-aimly-text">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
          Llamada disponible
        </div>
        <button onClick={onJoinCall} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all hover:bg-emerald-500">
          <Phone size={16} /> Unirme a la llamada
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <span className="hidden text-xs font-semibold text-gray-300 sm:inline">En llamada</span>
      <button onClick={onToggleAudio} title={audioOn ? 'Silenciar micrófono' : 'Activar micrófono'} className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${audioOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'border border-red-500/50 bg-red-500/20 text-red-400'}`}>
        {audioOn ? <Mic size={18} /> : <MicOff size={18} />}
      </button>
      <button onClick={onToggleVideo} title={videoOn ? 'Apagar cámara' : 'Encender cámara'} className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${videoOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'border border-red-500/50 bg-red-500/20 text-red-400'}`}>
        {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
      </button>
      <button onClick={onToggleScreenShare} title={isScreenSharing ? 'Detener pantalla' : 'Compartir pantalla'} className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${isScreenSharing ? 'bg-aimly-orange text-white shadow-lg shadow-aimly-orange/30' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
        <MonitorUp size={18} />
      </button>
      <span className="h-7 w-px bg-gray-700" />
      <button onClick={onLeaveCall} title="Salir de la llamada" className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg transition-all hover:bg-red-500">
        <PhoneOff size={18} />
      </button>
    </div>
  );
}
