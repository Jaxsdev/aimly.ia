import React from 'react';
import { Flag, Edit2, Users, MoreHorizontal, Wifi, WifiOff } from 'lucide-react';
import { Badge, Avatar } from '../ui';
import { useMeeting } from '../../contexts/MeetingContext';
import { useAuth } from '../../contexts/AuthContext';

export function MeetingHeader({ onFinish }: { onFinish: () => void }) {
  const { meeting, participants, isConnected } = useMeeting();
  const { user } = useAuth();

  // Format time remaining
  const now = new Date();
  const startedAt = meeting?.started_at ? new Date(meeting.started_at) : now;
  const elapsedMinutes = (now.getTime() - startedAt.getTime()) / 60000;
  const timeRemainingMins = Math.max(0, Math.floor((meeting?.duration_minutes || 30) - elapsedMinutes));
  const timeString = `${timeRemainingMins}:00`;

  return (
    <header className="h-[64px] border-b border-aimly-border bg-aimly-bg flex items-center justify-between px-6 shrink-0">
      
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L12 22M2 12L22 12M4.9 4.9L19.1 19.1M4.9 19.1L19.1 4.9" stroke="#E8683A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-newsreader font-bold text-xl text-aimly-text hidden sm:block">AimLy</span>
          <span className="text-aimly-border mx-2 hidden sm:block">|</span>
          <h2 className="font-bold text-aimly-text text-sm sm:text-base flex items-center gap-2">
            {meeting?.title}
            <button className="text-aimly-text/40 hover:text-aimly-orange transition-colors"><Edit2 size={14}/></button>
          </h2>
        </div>
        {isConnected ? (
          <Badge variant="success" className="bg-emerald-100 text-emerald-700 gap-1 pl-1.5 hidden md:flex">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            En vivo
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 gap-1 pl-1.5 hidden md:flex">
            <WifiOff size={12} />
            Reconectando…
          </Badge>
        )}
        <div className="hidden lg:flex items-center gap-1.5 text-sm text-aimly-text/60 font-medium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Tiempo restante {timeString}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Participant avatars from Presence */}
        <div className="hidden sm:flex items-center -space-x-2">
          {participants.slice(0, 4).map((p, i) => (
            <Avatar
              key={p.userId}
              alt={p.name}
              src={p.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`}
              size="md"
              className="border-2 border-aimly-bg relative shadow-sm"
              style={{ zIndex: 10 - i }}
              title={p.name}
            />
          ))}
          {participants.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-aimly-border border-2 border-aimly-bg flex items-center justify-center text-xs font-bold text-aimly-text/70">
              +{participants.length - 4}
            </div>
          )}
        </div>

        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('¡Enlace de la reunión copiado al portapapeles! Compártelo con tus amigos.');
          }}
          className="hidden sm:flex btn-secondary py-1.5 px-3 rounded-lg text-sm items-center gap-2 hover:border-aimly-orange hover:text-aimly-orange transition-all"
        >
          <Users size={14} /> Invitar
        </button>

        <button className="p-1.5 text-aimly-text/60 hover:text-aimly-text hover:bg-black/5 rounded-lg transition-colors">
          <MoreHorizontal size={20} />
        </button>

        <button onClick={onFinish} className="btn-primary py-1.5 px-4 rounded-lg text-sm font-bold flex items-center gap-2 bg-aimly-orange hover:bg-aimly-orangeHover">
          <Flag size={14} />
          <span className="hidden sm:block">Finalizar reunión</span>
        </button>
      </div>

    </header>
  );
}
