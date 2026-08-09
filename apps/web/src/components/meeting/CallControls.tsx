import React from 'react';

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
  isInCall,
  audioOn,
  videoOn,
  isScreenSharing,
  onJoinCall,
  onLeaveCall,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare
}: CallControlsProps) {
  if (!isInCall) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-aimly-surface/90 backdrop-blur-md border border-aimly-border px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-aimly-text">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          Llamada disponible
        </div>
        <button
          onClick={onJoinCall}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg transition-all flex items-center gap-2"
        >
          <span>📞</span>
          <span>Unirme a la Videollamada</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-md border border-gray-800 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 transition-all">
      {/* Microphone Toggle */}
      <button
        onClick={onToggleAudio}
        title={audioOn ? 'Silenciar Micrófono' : 'Activar Micrófono'}
        className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${
          audioOn
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-red-500/20 text-red-400 border border-red-500/50'
        }`}
      >
        {audioOn ? '🎙️' : '🎙️❌'}
      </button>

      {/* Camera Toggle */}
      <button
        onClick={onToggleVideo}
        title={videoOn ? 'Apagar Cámara' : 'Encender Cámara'}
        className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${
          videoOn
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-red-500/20 text-red-400 border border-red-500/50'
        }`}
      >
        {videoOn ? '📹' : '📹❌'}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Detener Pantalla' : 'Compartir Pantalla'}
        className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${
          isScreenSharing
            ? 'bg-aimly-orange text-white shadow-lg shadow-aimly-orange/30'
            : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
      >
        🖥️
      </button>

      <div className="w-px h-6 bg-gray-800 my-auto"></div>

      {/* Leave Call */}
      <button
        onClick={onLeaveCall}
        title="Salir de la llamada"
        className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-lg font-bold shadow-lg transition-all"
      >
        📞❌
      </button>
    </div>
  );
}
