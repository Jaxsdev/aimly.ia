import React, { useState } from 'react';
import { Music2, Pause, Play, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMeeting } from '../../contexts/MeetingContext';

function videoIdFromUrl(value: string) {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match?.[1] || (value.match(/^[\w-]{11}$/)?.[0] ?? null);
}

export function SharedMusicPlayer() {
  const { meeting, sharedMusic, setSharedMusic } = useMeeting();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const isHost = meeting?.host_id === user?.id;
  if (!sharedMusic && !isHost) return null;

  const startMusic = () => {
    const videoId = videoIdFromUrl(url.trim());
    if (!videoId) return window.alert('Pega un enlace válido de YouTube.');
    setSharedMusic({ videoId, playing: true, updatedAt: Date.now() });
    setUrl('');
  };

  return <div className="absolute bottom-4 right-4 z-40 w-72 overflow-hidden rounded-2xl border border-aimly-border bg-white shadow-xl">
    <div className="flex items-center justify-between bg-[#FFF8F2] px-3 py-2"><span className="flex items-center gap-1.5 text-xs font-bold text-aimly-text"><Music2 size={14} className="text-aimly-orange" /> Música de prueba</span>{isHost && sharedMusic && <button onClick={() => setSharedMusic(null)}><X size={15} /></button>}</div>
    {sharedMusic ? <><iframe title="Música compartida" className="h-40 w-full" src={`https://www.youtube-nocookie.com/embed/${sharedMusic.videoId}?autoplay=${sharedMusic.playing ? 1 : 0}&enablejsapi=1`} allow="autoplay; encrypted-media" allowFullScreen /><div className="p-2">{isHost ? <button onClick={() => setSharedMusic({ ...sharedMusic, playing: !sharedMusic.playing, updatedAt: Date.now() })} className="flex w-full items-center justify-center gap-2 rounded-lg bg-aimly-orange py-2 text-xs font-bold text-white">{sharedMusic.playing ? <Pause size={14} /> : <Play size={14} />}{sharedMusic.playing ? 'Pausar para todos' : 'Reproducir para todos'}</button> : <p className="text-center text-[10px] text-aimly-text/55">El anfitrión controla la música.</p>}</div></> : <div className="p-3"><p className="mb-2 text-[11px] text-aimly-text/60">Pega una canción de YouTube para compartirla durante la prueba.</p><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Enlace de YouTube" className="w-full rounded-lg border border-aimly-border px-2 py-2 text-xs" /><button onClick={startMusic} className="mt-2 w-full rounded-lg bg-aimly-orange py-2 text-xs font-bold text-white">Reproducir en la sala</button></div>}
  </div>;
}
