import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MeetingHeader } from '../components/meeting/MeetingHeader';
import { LeftPanel } from '../components/meeting/LeftPanel';
import { Whiteboard } from '../components/meeting/Whiteboard';
import { AimLyPanel } from '../components/aimly/AimLyPanel';
import { MeetingProvider, useMeeting } from '../contexts/MeetingContext';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoGrid } from '../components/meeting/VideoGrid';
import { CallControls } from '../components/meeting/CallControls';

function MeetingRoomContent({ onFinish }: { onFinish: () => void }) {
  const { user, loading: authLoading, signInWithPassword, signUp } = useAuth();
  const { loading, meeting } = useMeeting();
  const [forceReady, setForceReady] = React.useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      setSubmitting(true);
      if (authMode === 'register') {
        if (!name.trim()) throw new Error('Ingresa tu nombre');
        await signUp(name.trim(), email.trim(), password);
      } else {
        await signInWithPassword(email.trim(), password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMessage(err.message || 'Error al autenticar. Verifica tus datos.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user && !authLoading) {
    return (
      <div className="h-screen w-full bg-aimly-bg flex items-center justify-center p-4 font-sans">
        <div className="bg-aimly-surface border border-aimly-border p-8 rounded-[28px] shadow-2xl max-w-md w-full text-center relative overflow-hidden">
          <div className="w-14 h-14 bg-aimly-orange/10 text-aimly-orange rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-2xl">
            🔒
          </div>
          <h2 className="font-newsreader font-bold text-3xl text-aimly-text mb-1">Acceso a la reunión</h2>
          <p className="text-xs text-aimly-text/70 mb-6 leading-relaxed">
            Inicia sesión o crea una cuenta en AimLy para ingresar a la sala.
          </p>

          {/* Mode Switcher */}
          <div className="flex bg-aimly-bg p-1 rounded-xl mb-6 border border-aimly-border">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-white text-aimly-text shadow-sm'
                  : 'text-aimly-text/60 hover:text-aimly-text'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-white text-aimly-text shadow-sm'
                  : 'text-aimly-text/60 hover:text-aimly-text'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs text-left font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-aimly-text/80 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full px-4 py-2.5 bg-white border border-aimly-border rounded-xl text-sm text-aimly-text focus:outline-none focus:border-aimly-orange focus:ring-1 focus:ring-aimly-orange"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-aimly-text/80 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 bg-white border border-aimly-border rounded-xl text-sm text-aimly-text focus:outline-none focus:border-aimly-orange focus:ring-1 focus:ring-aimly-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-aimly-text/80 mb-1">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-aimly-border rounded-xl text-sm text-aimly-text focus:outline-none focus:border-aimly-orange focus:ring-1 focus:ring-aimly-orange"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {submitting
                ? 'Procesando...'
                : authMode === 'login'
                ? '🚀 Iniciar Sesión y Entrar'
                : '✨ Registrarme y Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { meetingId } = useParams();
  const {
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
  } = useWebRTC(meetingId || '');

  const [viewMode, setViewMode] = useState<'board' | 'grid'>('board');

  if (loading && !forceReady) {
    return (
      <div className="h-screen w-full bg-aimly-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aimly-orange"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-aimly-bg flex flex-col overflow-hidden font-sans relative">
      <MeetingHeader onFinish={onFinish} />

      {/* Main Content Area: Either Board View or Full Video Grid View */}
      {isInCall && viewMode === 'grid' ? (
        <div className="flex-1 flex overflow-hidden relative">
          <VideoGrid
            localStream={localStream}
            screenStream={screenStream}
            audioOn={audioOn}
            videoOn={videoOn}
            peers={peers}
            onCloseGrid={() => setViewMode('board')}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          <LeftPanel />
          <Whiteboard />
          <AimLyPanel />

          {/* Quick Floating Grid Toggle when Call is active */}
          {isInCall && (
            <button
              onClick={() => setViewMode('grid')}
              className="absolute top-4 right-4 z-30 bg-gray-900/90 text-white border border-gray-800 px-3 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 hover:bg-gray-800 transition-all"
            >
              <span>📺</span>
              <span>Ver Cuadrícula de Video ({1 + Object.keys(peers).length})</span>
            </button>
          )}
        </div>
      )}

      {/* Call Controls Floating Bar */}
      <CallControls
        isInCall={isInCall}
        audioOn={audioOn}
        videoOn={videoOn}
        isScreenSharing={isScreenSharing}
        onJoinCall={joinCall}
        onLeaveCall={leaveCall}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
      />
    </div>
  );
}

export default function MeetingRoomPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinishMeeting = async () => {
    try {
      setIsFinishing(true);
      await api.meetings.finish(meetingId!);
      navigate(`/meeting/${meetingId}/result`);
    } catch (error) {
      console.error('Error finishing meeting:', error);
      alert('Error al finalizar la reunión');
      setIsFinishing(false);
    }
  };

  return (
    <MeetingProvider meetingId={meetingId!}>
      <MeetingRoomContent onFinish={() => setShowModal(true)} />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-aimly-surface border border-aimly-border p-8 rounded-[24px] shadow-2xl max-w-md w-full text-center">
            <h3 className="font-newsreader font-bold text-2xl text-aimly-text mb-2">¿Finalizar esta reunión?</h3>
            <p className="text-sm text-aimly-text/70 mb-8 leading-relaxed">
              AimLy generará un resumen final de las decisiones y próximos pasos para todos los participantes.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-3 rounded-xl font-bold">
                Cancelar
              </button>
              <button onClick={handleFinishMeeting} disabled={isFinishing} className="flex-1 btn-primary py-3 rounded-xl font-bold">
                {isFinishing ? 'Finalizando...' : 'Finalizar reunión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MeetingProvider>
  );
}
