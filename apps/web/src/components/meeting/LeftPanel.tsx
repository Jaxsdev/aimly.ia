import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Target, Users, Video, VideoOff } from 'lucide-react';
import { useMeeting } from '../../contexts/MeetingContext';
import { useAuth } from '../../contexts/AuthContext';
import type { PeerState } from '../../hooks/useWebRTC';

interface CallPanelProps {
  isInCall: boolean;
  localStream: MediaStream | null;
  peers: Record<string, PeerState>;
  audioOn: boolean;
  videoOn: boolean;
  isScreenSharing: boolean;
  onJoinCall: () => void;
  onLeaveCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

function ParticipantTile({ name, stream, videoOn, isMe, muted }: { name: string; stream?: MediaStream | null; videoOn: boolean; isMe?: boolean; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-aimly-border bg-[#2D2A27] shadow-sm">
    {stream && videoOn ? <video ref={videoRef} autoPlay playsInline muted={isMe} className={`h-full w-full object-cover ${isMe ? 'scale-x-[-1]' : ''}`} /> : <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#423D37] to-[#24211F] text-white"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-aimly-orange text-sm font-bold">{initials}</span><span className="max-w-[90%] truncate px-2 text-[10px] font-semibold">{isMe ? 'Tú' : name}</span></div>}
    <div className="absolute bottom-1.5 left-1.5 flex max-w-[90%] items-center gap-1 rounded-md bg-black/55 px-1.5 py-1 text-[9px] font-semibold text-white"><span className="truncate">{isMe ? 'Tú' : name}</span>{muted && <MicOff size={10} className="text-red-300" />}</div>
  </div>;
}

export function LeftPanel(props: CallPanelProps) {
  const { meeting, participants } = useMeeting();
  const { user } = useAuth();
  const myName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tú';
  const peers = Object.values(props.peers);
  const inCallIds = new Set([user?.id, ...peers.map((peer) => peer.userId)]);
  const waitingParticipants = participants.filter((participant) => !inCallIds.has(participant.userId));

  return <aside className="flex h-full w-[310px] shrink-0 flex-col overflow-hidden border-r border-aimly-border bg-aimly-surface">
    <div className="border-b border-aimly-border px-4 py-3">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Users size={16} className="text-aimly-orange" /><h3 className="text-sm font-bold text-aimly-text">En la sala</h3></div><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{participants.length || 1} online</span></div>
      <p className="mt-1 text-[11px] text-aimly-text/55">Cámara y controles de la reunión</p>
    </div>

    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
      <div className="grid grid-cols-2 gap-2">
        {props.isInCall && <ParticipantTile name={myName} stream={props.localStream} videoOn={props.videoOn} isMe muted={!props.audioOn} />}
        {peers.map((peer) => <ParticipantTile key={peer.userId} name={peer.name} stream={peer.stream} videoOn={peer.videoOn} muted={!peer.audioOn} />)}
        {waitingParticipants.map((participant) => <ParticipantTile key={participant.userId} name={participant.name} videoOn={false} />)}
        {!props.isInCall && waitingParticipants.length === 0 && <ParticipantTile name={myName} videoOn={false} isMe />}
      </div>

      <div className="mt-4 rounded-xl border border-aimly-border bg-aimly-bg p-3"><div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-aimly-text"><Target size={13} className="text-aimly-orange" /> Objetivo</div><p className="text-[11px] leading-relaxed text-aimly-text/70">{meeting?.objective || 'Define el objetivo de esta reunión.'}</p></div>
    </div>

    <div className="border-t border-aimly-border bg-white p-3">
      {!props.isInCall ? <button onClick={props.onJoinCall} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"><Phone size={15} /> Unirme a la llamada</button> : <div className="flex items-center justify-between gap-2"><button onClick={props.onToggleAudio} title="Micrófono" className={`flex h-10 w-10 items-center justify-center rounded-xl ${props.audioOn ? 'bg-aimly-bg text-aimly-text' : 'bg-red-50 text-red-500'}`}>{props.audioOn ? <Mic size={17} /> : <MicOff size={17} />}</button><button onClick={props.onToggleVideo} title="Cámara" className={`flex h-10 w-10 items-center justify-center rounded-xl ${props.videoOn ? 'bg-aimly-bg text-aimly-text' : 'bg-red-50 text-red-500'}`}>{props.videoOn ? <Video size={17} /> : <VideoOff size={17} />}</button><button onClick={props.onToggleScreenShare} title="Compartir pantalla" className={`flex h-10 w-10 items-center justify-center rounded-xl ${props.isScreenSharing ? 'bg-aimly-orange text-white' : 'bg-aimly-bg text-aimly-text'}`}><MonitorUp size={17} /></button><button onClick={props.onLeaveCall} title="Salir" className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white"><PhoneOff size={17} /></button></div>}
    </div>
  </aside>;
}
