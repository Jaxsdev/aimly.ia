import React, { useState, useRef, useEffect } from 'react';
import { Portal } from '@portalsdk/core';
import { PortalProvider, useChannel } from '@portalsdk/react';

// 1. Instancia global de Portal
const portal = new Portal({
  apiKey: (import.meta.env.VITE_PORTAL_PUBLIC_KEY as string) || 'pk_your_publishable_key',
});

// 2. Función de autenticación por Token
async function fetchPortalToken(): Promise<string> {
  try {
    const res = await fetch('/api/portal-token', { credentials: 'include' });
    if (!res.ok) throw new Error('No se pudo obtener el token de Portal');
    const { token } = await res.json();
    return token || '';
  } catch (error) {
    console.error('Error al obtener el token de autenticación:', error);
    return '';
  }
}

// Helper para parsear formato básico de markdown
function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  return text.split('\n').map((line, idx) => {
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-aimly-text font-bold text-lg my-3">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-aimly-text font-bold text-xl my-4 border-b border-aimly-border pb-1">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-aimly-orange font-bold text-2xl my-5">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={idx} className="ml-4 mb-2 list-disc text-aimly-text">
          {parseBold(line.slice(2))}
        </li>
      );
    }
    if (line.includes('|')) {
      return (
        <div key={idx} className="font-mono text-xs bg-aimly-surface p-2 border-b border-aimly-border whitespace-pre">
          {line}
        </div>
      );
    }
    return (
      <p key={idx} className="my-2 min-h-[16px] leading-relaxed text-aimly-text">
        {parseBold(line)}
      </p>
    );
  });
}

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split('**');
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="text-aimly-orange font-bold">
          {part}
        </strong>
      );
    }
    return part;
  });
}

// -----------------------------------------------------------------------------
// COMPONENTE: NOTA ADHESIVA (STICKY NOTE)
// -----------------------------------------------------------------------------
interface NoteType {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface StickyNoteProps {
  note: NoteType;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

function StickyNote({ note, onMove, onEdit, onDelete }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = pos.x;
    const initY = pos.y;

    const containerWidth = 450;
    const containerHeight = 380;
    const noteWidth = 110;
    const noteHeight = 110;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newX = initX + dx;
      let newY = initY + dy;

      newX = Math.max(0, Math.min(containerWidth - noteWidth, newX));
      newY = Math.max(0, Math.min(containerHeight - noteHeight, newY));

      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let finalX = initX + dx;
      let finalY = initY + dy;

      finalX = Math.max(0, Math.min(containerWidth - noteWidth, finalX));
      finalY = Math.max(0, Math.min(containerHeight - noteHeight, finalY));

      onMove(note.id, finalX, finalY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSaveText = () => {
    setIsEditing(false);
    if (text.trim() !== note.text) {
      onEdit(note.id, text.trim());
    }
  };

  return (
    <div
      ref={noteRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '110px',
        height: '110px',
        background: note.color,
        color: '#25221F',
        padding: '10px 8px 6px 8px',
        boxSizing: 'border-box',
        borderRadius: '6px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        cursor: 'move',
        transform: `rotate(${(note.id.charCodeAt(0) || 0) % 6 - 3}deg)`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        fontWeight: '600',
        zIndex: isEditing ? 10 : 2,
      }}
      className="sticky-note"
    >
      {isEditing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSaveText}
          autoFocus
          style={{
            width: '100%',
            height: '65px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            color: 'inherit',
            padding: 0,
          }}
        />
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          style={{
            width: '100%',
            height: '75px',
            overflowY: 'auto',
            wordBreak: 'break-word',
            lineHeight: '1.2',
          }}
          title="Doble click para editar"
        >
          {note.text || 'Idea...'}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '14px' }}>
        <button
          onClick={() => onDelete(note.id)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.65rem',
            padding: 0,
            opacity: 0.5,
          }}
          title="Eliminar"
          onMouseDown={(e) => e.stopPropagation()}
        >
          ❌
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPONENTE: PIZARRA (WHITEBOARD + STICKY NOTES)
// -----------------------------------------------------------------------------
interface WhiteboardProps {
  activeNotes: NoteType[];
  onAddNote: (color: string) => void;
  onMoveNote: (id: string, x: number, y: number) => void;
  onEditNote: (id: string, text: string) => void;
  onDeleteNote: (id: string) => void;
}

function Whiteboard({ activeNotes, onAddNote, onMoveNote, onEditNote, onDeleteNote }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#E8683A');
  const prevPoint = useRef({ x: 0, y: 0 });

  const { messages, send } = useChannel({
    channelId: 'pizarra',
    history: 100,
  });

  const drawLineOnCanvas = (x0: number, y0: number, x1: number, y1: number, strokeColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
  };

  useEffect(() => {
    if (!messages) return;

    // Encontrar último borrado de pizarra
    let lastClearIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if ((messages[i]?.content as any)?.type === 'CLEAR_CANVAS') {
        lastClearIdx = i;
        break;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    messages.forEach((m, idx) => {
      const content = m?.content as any;
      if (idx > lastClearIdx && content?.type === 'DRAW') {
        const { x0, y0, x1, y1, strokeColor } = content;
        drawLineOnCanvas(x0, y0, x1, y1, strokeColor);
      }
    });
  }, [messages]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    const { x, y } = getCoordinates(e);
    prevPoint.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);

    drawLineOnCanvas(prevPoint.current.x, prevPoint.current.y, x, y, color);

    send?.({
      content: {
        type: 'DRAW',
        x0: prevPoint.current.x,
        y0: prevPoint.current.y,
        x1: x,
        y1: y,
        strokeColor: color,
      },
    });

    prevPoint.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (window.confirm('¿Quieres borrar todos los dibujos de la pizarra?')) {
      send?.({ content: { type: 'CLEAR_CANVAS' } });
    }
  };

  return (
    <div className="glass-panel" style={{ flex: '1 1 480px', minWidth: '320px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#25221F' }}>🖌️ Trazo:</span>
          <button onClick={() => setColor('#E8683A')} style={{ width: '20px', height: '20px', background: '#E8683A', border: color === '#E8683A' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Naranja" />
          <button onClick={() => setColor('#ef4444')} style={{ width: '20px', height: '20px', background: '#ef4444', border: color === '#ef4444' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Rojo" />
          <button onClick={() => setColor('#A8B49A')} style={{ width: '20px', height: '20px', background: '#A8B49A', border: color === '#A8B49A' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Sage" />
          <button onClick={() => setColor('#E9CF87')} style={{ width: '20px', height: '20px', background: '#E9CF87', border: color === '#E9CF87' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Butter" />
          <button onClick={() => setColor('#25221F')} style={{ width: '20px', height: '20px', background: '#25221F', border: color === '#25221F' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Negro" />
        </div>

        <button className="btn-secondary" onClick={handleClear} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}>
          🗑️ Borrar Lienzo
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '380px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <canvas
          ref={canvasRef}
          width={450}
          height={380}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ display: 'block', background: '#ffffff', cursor: 'crosshair', width: '100%', height: '380px' }}
        />
        {activeNotes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            onMove={onMoveNote}
            onEdit={onEditNote}
            onDelete={onDeleteNote}
          />
        ))}
      </div>

      <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#25221F' }}>➕ Agregar Nota:</span>
        <button onClick={() => onAddNote('#E9CF87')} style={{ background: '#E9CF87', color: '#25221F', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Butter</button>
        <button onClick={() => onAddNote('#F1B29A')} style={{ background: '#F1B29A', color: '#25221F', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Peach</button>
        <button onClick={() => onAddNote('#C7B8EA')} style={{ background: '#C7B8EA', color: '#25221F', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Lavender</button>
        <button onClick={() => onAddNote('#A8B49A')} style={{ background: '#A8B49A', color: '#25221F', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Sage</button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPONENTE: CHAT Y FACILITACIÓN CON IA (SKELETON CLIENT SIDE)
// -----------------------------------------------------------------------------
interface ChatRoomProps {
  messages: readonly any[];
  send: (payload: any) => Promise<any>;
  typing: readonly string[];
  sendTyping: () => void;
  presence: any;
  currentGoal: string;
  activeNotes: NoteType[];
  userName: string;
}

function ChatRoom({ messages, send, typing, sendTyping, presence, currentGoal, activeNotes, userName }: ChatRoomProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const chatMessages = messages.filter(
    (m) => m?.content?.type === 'CHAT' || (!m?.content?.type && m?.content?.text)
  );

  const onlineCount = presence?.kind === 'detailed'
    ? presence.participants.length
    : (presence?.count || 1);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setApiError('');
    setIsLoading(true);

    try {
      // 1. Enviar mensaje del usuario al canal de Portal
      await send({
        content: {
          type: 'CHAT',
          text: userText,
          senderName: userName
        }
      });

      // 2. Enviar a nuestro backend para llamar a Claude
      // Para esta primera fase estructural, enviamos la petición a nuestro Fastify server.
      const res = await fetch('/api/meetings/mock-meeting-id/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          notes: activeNotes,
          goal: currentGoal
        })
      });

      if (res.ok) {
        const responseData = await res.json();
        if (responseData.success && responseData.data?.reply) {
          await send({
            content: {
              type: 'CHAT',
              text: responseData.data.reply,
              senderName: 'IA Facilitadora 🤖'
            }
          });
        }
      } else {
        // Fallback local mock facilitador si el backend no responde
        setTimeout(async () => {
          await send({
            content: {
              type: 'CHAT',
              text: `Hola ${userName}. Entiendo que tu mensaje es: "${userText}". Estoy analizando la reunión para guiar al equipo.`,
              senderName: 'AimLy AI 🤖'
            }
          });
        }, 1000);
      }
    } catch (err: any) {
      console.error('Error en ChatRoom handleSend:', err);
      setApiError(err.message || 'Error al enviar o procesar el mensaje.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ flex: '1 1 420px', minWidth: '320px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.05rem', color: '#25221F' }}>💬 Conversación</h3>
        <span style={{ fontSize: '0.8rem', color: '#E8683A', background: 'rgba(232,104,58,0.1)', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>
          🟢 {onlineCount} online
        </span>
      </div>

      {apiError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
          ⚠️ <strong>Error del sistema:</strong> {apiError}
        </div>
      )}

      <div style={{ flexGrow: 1, border: '1px solid var(--border)', height: '330px', overflowY: 'auto', padding: '12px', borderRadius: '8px', background: '#FFFDF9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {chatMessages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#a8b49a', marginTop: '120px', fontSize: '0.85rem' }}>
            Escribe un mensaje para comenzar la facilitación...
          </p>
        )}

        {chatMessages.map((m) => {
          const senderName = m?.content?.senderName || m?.senderId || 'Usuario';
          const isAI = senderName.includes('IA') || senderName.includes('AimLy');
          const isMe = senderName === userName;

          return (
            <div key={m?.id} style={{ alignSelf: isAI ? 'center' : (isMe ? 'flex-end' : 'flex-start'), maxWidth: '85%' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                display: 'block',
                marginBottom: '2px',
                textAlign: isAI ? 'center' : (isMe ? 'right' : 'left'),
                color: isAI ? '#E8683A' : (isMe ? '#ef4444' : '#25221F')
              }}>
                {senderName}
              </span>
              <div style={{
                background: isAI ? 'rgba(232, 104, 58, 0.1)' : (isMe ? 'rgba(241, 178, 154, 0.2)' : '#F7F3EB'),
                border: `1px solid ${isAI ? 'rgba(232, 104, 58, 0.2)' : (isMe ? 'rgba(241, 178, 154, 0.3)' : 'rgba(37,34,31,0.06)')}`,
                padding: '8px 12px',
                borderRadius: '10px',
                color: '#25221F',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                wordBreak: 'break-word',
              }}>
                {m?.content?.text}
              </div>
            </div>
          );
        })}
        {typing && typing.length > 0 && !isLoading && <p style={{ color: '#a8b49a', fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>✍️ Alguien está escribiendo...</p>}
        {isLoading && <p style={{ color: '#E8683A', fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>🤖 La IA facilitadora está pensando...</p>}
      </div>

      <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); sendTyping?.(); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe tu mensaje..."
          style={{ flex: 1, padding: '10px', borderRadius: '6px', fontSize: '0.85rem' }}
        />
        <button className="btn-primary" onClick={handleSend} style={{ padding: '10px 18px', borderRadius: '6px', fontSize: '0.85rem' }}>
          Enviar
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CONTENEDOR PRINCIPAL: APP
// -----------------------------------------------------------------------------
function RoomContent() {
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('aimly_username') || `Usuario_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Estados para el resumen de fin de reunión
  const [showSummary, setShowSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  const { messages: lobbyMessages, send: sendLobby, typing: lobbyTyping, sendTyping: sendLobbyTyping, presence: lobbyPresence } = useChannel({
    channelId: 'lobby',
    history: 100,
  });

  // Reconstruir estado actual del objetivo y las notas desde el historial de Portal
  let currentGoal = 'Elegir una idea de proyecto y repartir tareas';
  const notesMap: Record<string, NoteType> = {};

  if (lobbyMessages) {
    lobbyMessages.forEach((m) => {
      const c = m?.content as any;
      if (!c) return;
      if (c.type === 'SET_GOAL') {
        currentGoal = c.goal;
      } else if (c.type === 'ADD_NOTE') {
        notesMap[c.noteId] = {
          id: c.noteId,
          text: c.text,
          x: c.x,
          y: c.y,
          color: c.color,
        };
      } else if (c.type === 'UPDATE_NOTE') {
        if (notesMap[c.noteId]) {
          notesMap[c.noteId].text = c.text;
        }
      } else if (c.type === 'MOVE_NOTE') {
        if (notesMap[c.noteId]) {
          notesMap[c.noteId].x = c.x;
          notesMap[c.noteId].y = c.y;
        }
      } else if (c.type === 'DELETE_NOTE') {
        delete notesMap[c.noteId];
      }
    });
  }

  const activeNotes = Object.values(notesMap);

  const handleSaveName = () => {
    const cleaned = nameInput.trim();
    if (cleaned) {
      setUserName(cleaned);
      localStorage.setItem('aimly_username', cleaned);
    }
    setIsEditingName(false);
  };

  const handleSaveGoal = () => {
    const cleaned = goalInput.trim();
    if (cleaned && sendLobby) {
      sendLobby({
        content: {
          type: 'SET_GOAL',
          goal: cleaned
        }
      });
    }
    setIsEditingGoal(false);
  };

  const handleAddNote = (color: string) => {
    const id = 'note_' + Math.random().toString(36).substring(2, 9);
    if (sendLobby) {
      sendLobby({
        content: {
          type: 'ADD_NOTE',
          noteId: id,
          text: 'Doble click para editar',
          x: 50 + Math.random() * 150,
          y: 50 + Math.random() * 150,
          color,
        }
      });
    }
  };

  const handleMoveNote = (id: string, x: number, y: number) => {
    if (sendLobby) {
      sendLobby({
        content: {
          type: 'MOVE_NOTE',
          noteId: id,
          x,
          y
        }
      });
    }
  };

  const handleEditNote = (id: string, text: string) => {
    if (sendLobby) {
      sendLobby({
        content: {
          type: 'UPDATE_NOTE',
          noteId: id,
          text
        }
      });
    }
  };

  const handleDeleteNote = (id: string) => {
    if (sendLobby) {
      sendLobby({
        content: {
          type: 'DELETE_NOTE',
          noteId: id
        }
      });
    }
  };

  // Acción final para redactar el resumen
  const handleFinalizeMeeting = async () => {
    setIsGeneratingSummary(true);
    setShowSummary(true);
    setSummaryText('');

    try {
      const res = await fetch('/api/meetings/mock-meeting-id/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: currentGoal,
          notes: activeNotes,
          messages: lobbyMessages
        })
      });

      if (res.ok) {
        const responseData = await res.json();
        if (responseData.success && responseData.data?.summary) {
          setSummaryText(responseData.data.summary);
          return;
        }
      }

      // Fallback local mock summary
      setTimeout(() => {
        setSummaryText(`# Acta Final de la Reunión

## Resumen Ejecutivo
El equipo se reunió para avanzar en el objetivo: **"${currentGoal}"**. Se aportaron ideas valiosas en la pizarra y se consolidó el plan de trabajo.

## Decisiones Clave
1. Trabajar de forma coordinada integrando las notas de la pizarra.

## Reparto de Tareas
| Tarea | Responsable | Estimado |
|---|---|---|
| Crear prototipo principal | ${userName} | 2 días |
| Integrar SDKs | Por definir | 3 días |

## Próximos Pasos
- Conectar Supabase para persistencia duradera.
- Integrar Claude en Fastify backend.`);
        setIsGeneratingSummary(false);
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setSummaryText('⚠️ **Error al generar resumen:** Falló la comunicación con el servidor.');
      setIsGeneratingSummary(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    alert('¡Resumen copiado al portapapeles!');
  };

  return (
    <div style={{ padding: '30px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* CABECERA */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#E8683A' }}>Aimly 🚀</h1>
          <p style={{ fontSize: '0.85rem', color: '#A8B49A', marginTop: '4px' }}>Hackathon Facilitador Inteligente</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: '#25221F' }}>Tu Nombre:</span>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', width: '120px' }}
              />
              <button className="btn-primary" onClick={handleSaveName} style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem' }}>Guardar</button>
              <button className="btn-secondary" onClick={() => setIsEditingName(false)} style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem' }}>Cerrar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ color: '#25221F', fontSize: '0.9rem' }}>{userName}</strong>
              <button
                onClick={() => { setNameInput(userName); setIsEditingName(true); }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                title="Editar Nombre"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OBJETIVO DE LA REUNIÓN */}
      <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #E8683A' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#E8683A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objetivo de la Reunión</span>
            {isEditingGoal ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', width: '100%' }}>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', flex: 1 }}
                />
                <button className="btn-primary" onClick={handleSaveGoal} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}>Establecer</button>
                <button className="btn-secondary" onClick={() => setIsEditingGoal(false)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}>Cancelar</button>
              </div>
            ) : (
              <h2 style={{ fontSize: '1.25rem', marginTop: '6px', color: '#25221F' }}>
                {currentGoal}
              </h2>
            )}
          </div>
          {!isEditingGoal && (
            <button
              className="btn-secondary"
              onClick={() => { setGoalInput(currentGoal); setIsEditingGoal(true); }}
              style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px' }}
            >
              ✏️ Cambiar Objetivo
            </button>
          )}
        </div>
      </div>

      {/* CUERPO PRINCIPAL */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* PIZARRA */}
        <Whiteboard
          activeNotes={activeNotes}
          onAddNote={handleAddNote}
          onMoveNote={handleMoveNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
        />

        {/* CHAT */}
        <ChatRoom
          messages={lobbyMessages}
          send={sendLobby!}
          typing={lobbyTyping}
          sendTyping={sendLobbyTyping!}
          presence={lobbyPresence}
          currentGoal={currentGoal}
          activeNotes={activeNotes}
          userName={userName}
        />
      </div>

      {/* ACCIONES DE CIERRE */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <button className="btn-primary" onClick={handleFinalizeMeeting} style={{ padding: '14px 28px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}>
          🏁 Finalizar Reunión y Generar Resumen
        </button>
      </div>

      {/* MODAL DE RESUMEN FINAL */}
      {showSummary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(37, 34, 31, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }} className="fade-in">
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            overflowY: 'auto',
            background: '#FFFDF9',
            border: '1px solid #E8E1D7',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E8E1D7', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#E8683A' }}>📝 Acta Final de la Reunión</h2>
              <button
                onClick={() => setShowSummary(false)}
                style={{ border: 'none', background: 'transparent', color: '#25221F', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {isGeneratingSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '40px 0' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(232, 104, 58, 0.2)',
                  borderTopColor: '#E8683A',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <p style={{ color: '#25221F', fontSize: '0.95rem' }}>La IA facilitadora está consolidando el acta de reunión...</p>

                {/* Animación keyframe spin en línea para evitar complicaciones de CSS */}
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : (
              <>
                <div style={{
                  background: '#F7F3EB',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #E8E1D7',
                  color: '#25221F',
                  fontSize: '0.9rem',
                  overflowY: 'auto',
                  maxHeight: '400px',
                }}>
                  {renderMarkdown(summaryText)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn-secondary" onClick={handleCopySummary} style={{ padding: '10px 20px', borderRadius: '6px' }}>
                    📋 Copiar al Portapapeles
                  </button>
                  <button className="btn-primary" onClick={() => setShowSummary(false)} style={{ padding: '10px 20px', borderRadius: '6px' }}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <PortalProvider client={portal} token={fetchPortalToken}>
      <RoomContent />
    </PortalProvider>
  );
}
