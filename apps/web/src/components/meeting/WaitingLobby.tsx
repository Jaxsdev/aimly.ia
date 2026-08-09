import React, { useState } from 'react';
import { CheckCircle2, Clock3, Play, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMeeting } from '../../contexts/MeetingContext';
import { api } from '../../lib/api';

export function WaitingLobby() {
  const { meeting, readiness, setReady, refreshMeeting } = useMeeting();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  const mine = readiness.find((participant) => participant.user_id === user?.id);
  const allReady = readiness.length > 0 && readiness.every((participant) => participant.is_ready);
  const isHost = meeting?.host_id === user?.id;

  const start = async () => {
    if (!meeting?.id) return;
    setStarting(true);
    try {
      const result = await api.meetings.startFacilitation(meeting.id);
      await refreshMeeting();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const voice = new SpeechSynthesisUtterance(result.introduction);
        voice.lang = 'es-ES'; voice.rate = 1; voice.pitch = 1;
        window.speechSynthesis.speak(voice);
      }
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo iniciar la reunión'); }
    finally { setStarting(false); }
  };

  return <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#FCFAF7]/95 p-5 backdrop-blur-sm">
    <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-aimly-border bg-white shadow-2xl">
      <div className="border-b border-aimly-border bg-gradient-to-br from-[#FFF8F2] to-[#FCFAF7] p-7 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-aimly-orange/20 bg-white shadow-sm"><Sparkles className="text-aimly-orange" size={25} /></div><h1 className="font-newsreader text-3xl font-bold text-aimly-text">Preparando la sesión</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-aimly-text/65">AimLy ya conoce el objetivo y preparará la conversación inicial y el plan de trabajo cuando el equipo esté listo.</p></div>
      <div className="p-6"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold text-aimly-text"><Users size={16} className="text-aimly-orange" /> Participantes</div><span className="rounded-full bg-aimly-bg px-2.5 py-1 text-[11px] font-bold text-aimly-text/60">{readiness.filter((participant) => participant.is_ready).length}/{readiness.length} listos</span></div><div className="space-y-2">{readiness.map((participant) => <div key={participant.user_id} className="flex items-center justify-between rounded-xl border border-aimly-border bg-[#FCFAF7] px-3 py-2.5"><span className="text-xs font-bold text-aimly-text">{participant.profiles?.name || 'Participante'}{participant.user_id === user?.id ? ' (Tú)' : ''}</span><span className={`flex items-center gap-1 text-[11px] font-bold ${participant.is_ready ? 'text-emerald-600' : 'text-aimly-text/45'}`}>{participant.is_ready ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{participant.is_ready ? 'Listo' : 'Esperando'}</span></div>)}</div>
      <div className="mt-6 flex flex-col gap-2"><button onClick={() => setReady(!mine?.is_ready)} className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${mine?.is_ready ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-aimly-orange text-white hover:bg-aimly-orangeHover'}`}>{mine?.is_ready ? '✓ Estoy listo' : 'Marcarme como listo'}</button>{isHost && <button disabled={!allReady || starting} onClick={start} className="flex w-full items-center justify-center gap-2 rounded-xl bg-aimly-text py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"><Play size={16} fill="currentColor" />{starting ? 'AimLy está preparando la sesión…' : 'Iniciar sesión guiada'}</button>}{!isHost && <p className="text-center text-[11px] text-aimly-text/50">El host iniciará la sesión cuando todos estén listos.</p>}</div></div>
    </div>
  </div>;
}
