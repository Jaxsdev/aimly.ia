import React, { useState, useRef, useEffect } from 'react';
import { Portal } from '@portalsdk/core';
import { PortalProvider, useChannel } from '@portalsdk/react';
import { GoogleGenAI } from '@google/genai';

// 1. Instancia global de Portal
const portal = new Portal({
  apiKey: import.meta.env.VITE_PORTAL_PUBLIC_KEY || 'pk_your_publishable_key',
});

// 2. Función de autenticación por Token
async function fetchPortalToken() {
  try {
    const res = await fetch('/api/portal-token', { credentials: 'include' });
    if (!res.ok) throw new Error('No se pudo obtener el token de Portal');
    const { token } = await res.json();
    return token;
  } catch (error) {
    console.error('Error al obtener el token de autenticación:', error);
    return null;
  }
}

// Helper para parsear formato básico de markdown
function renderMarkdown(text) {
  if (!text) return '';
  return text.split('\n').map((line, idx) => {
    if (line.startsWith('### ')) {
      return <h3 key={idx} style={{ color: '#f8fafc', margin: '14px 0 6px 0', fontSize: '1.05rem', fontWeight: 'bold' }}>{line.slice(4)}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={idx} style={{ color: '#f8fafc', margin: '18px 0 8px 0', fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>{line.slice(3)}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={idx} style={{ color: '#c084fc', margin: '22px 0 10px 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{line.slice(2)}</h1>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={idx} style={{ marginLeft: '16px', marginBottom: '6px', listStyleType: 'disc' }}>{parseBold(line.slice(2))}</li>;
    }
    if (line.includes('|')) {
      return <div key={idx} style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(15,23,42,0.4)', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre' }}>{line}</div>;
    }
    return <p key={idx} style={{ margin: '8px 0', minHeight: '16px', lineHeight: '1.4' }}>{parseBold(line)}</p>;
  });
}

function parseBold(text) {
  const parts = text.split('**');
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ color: '#c084fc', fontWeight: 'bold' }}>{part}</strong>;
    }
    return part;
  });
}

// -----------------------------------------------------------------------------
// COMPONENTE: NOTA ADHESIVA (STICKY NOTE)
// -----------------------------------------------------------------------------
function StickyNote({ note, onMove, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const noteRef = useRef(null);

  useEffect(() => {
    setPos({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = pos.x;
    const initY = pos.y;

    const containerWidth = 450;
    const containerHeight = 380;
    const noteWidth = 110;
    const noteHeight = 110;

    const handleMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newX = initX + dx;
      let newY = initY + dy;

      newX = Math.max(0, Math.min(containerWidth - noteWidth, newX));
      newY = Math.max(0, Math.min(containerHeight - noteHeight, newY));

      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = (ev) => {
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
        color: '#0f172a',
        padding: '10px 8px 6px 8px',
        boxSizing: 'border-box',
        borderRadius: '6px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        cursor: 'move',
        transform: `rotate(${note.id.charCodeAt(0) % 6 - 3}deg)`,
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
function Whiteboard({ activeNotes, onAddNote, onMoveNote, onEditNote, onDeleteNote }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const prevPoint = useRef({ x: 0, y: 0 });

  const { messages, send } = useChannel({
    channelId: 'pizarra',
    history: 100,
  });

  const drawLineOnCanvas = (x0, y0, x1, y1, strokeColor) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
      if (messages[i].content?.type === 'CLEAR_CANVAS') {
        lastClearIdx = i;
        break;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    messages.forEach((m, idx) => {
      if (idx > lastClearIdx && m.content?.type === 'DRAW') {
        const { x0, y0, x1, y1, strokeColor } = m.content;
        drawLineOnCanvas(x0, y0, x1, y1, strokeColor);
      }
    });
  }, [messages]);

  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
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

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    prevPoint.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);

    drawLineOnCanvas(prevPoint.current.x, prevPoint.current.y, x, y, color);

    send({
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
      send({ content: { type: 'CLEAR_CANVAS' } });
    }
  };

  return (
    <div className="glass-panel" style={{ flex: '1 1 480px', minWidth: '320px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#cbd5e1' }}>🖌️ Trazo:</span>
          <button onClick={() => setColor('#3b82f6')} style={{ width: '20px', height: '20px', background: '#3b82f6', border: color === '#3b82f6' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Azul" />
          <button onClick={() => setColor('#ef4444')} style={{ width: '20px', height: '20px', background: '#ef4444', border: color === '#ef4444' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Rojo" />
          <button onClick={() => setColor('#10b981')} style={{ width: '20px', height: '20px', background: '#10b981', border: color === '#10b981' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Verde" />
          <button onClick={() => setColor('#f59e0b')} style={{ width: '20px', height: '20px', background: '#f59e0b', border: color === '#f59e0b' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Naranja" />
          <button onClick={() => setColor('#0f172a')} style={{ width: '20px', height: '20px', background: '#0f172a', border: color === '#0f172a' ? '2px solid #fff' : 'none', borderRadius: '50%', cursor: 'pointer' }} title="Borrador/Negro" />
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
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#cbd5e1' }}>➕ Agregar Nota:</span>
        <button onClick={() => onAddNote('#fef08a')} style={{ background: '#fef08a', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Amarillo</button>
        <button onClick={() => onAddNote('#fbcfe8')} style={{ background: '#fbcfe8', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Rosa</button>
        <button onClick={() => onAddNote('#bfdbfe')} style={{ background: '#bfdbfe', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Azul</button>
        <button onClick={() => onAddNote('#bbf7d0')} style={{ background: '#bbf7d0', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Verde</button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPONENTE: CHAT Y FACILITACIÓN CON IA
// -----------------------------------------------------------------------------
function ChatRoom({ messages, send, typing, sendTyping, presence, currentGoal, activeNotes, userName }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const chatMessages = messages.filter(
    (m) => m.content?.type === 'CHAT' || (!m.content?.type && m.content?.text)
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

      // 2. Obtener clave de API y configurar cliente Gemini
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No se detectó VITE_GEMINI_API_KEY en las variables de entorno (.env)');
      }

      const ai = new GoogleGenAI({ apiKey });

      // Convertir notas adhesivas a contexto
      const boardNotesText = activeNotes.length > 0
        ? activeNotes.map(n => `- Idea: "${n.text}" (Color: ${n.color})`).join('\n')
        : '(Sin ideas en la pizarra aún)';

      const chatHistoryText = chatMessages
        .map((m) => `${m.content?.senderName || 'Usuario'}: ${m.content?.text || ''}`)
        .join('\n');

      const promptText = `Eres la IA facilitadora de la reunión en Aimly. Tu rol es guiar al equipo de forma inteligente, activa y concisa.

Objetivo actual: "${currentGoal}"

Notas/Ideas en la pizarra en tiempo real:
${boardNotesText}

Historial de conversación:
${chatHistoryText}

Último mensaje recibido: "${userText}"

Instrucciones para responder:
1. Responde brevemente y orienta al equipo hacia el objetivo.
2. Si se proponen ideas viables, sugiere agregarlas a la pizarra o comenta sobre las notas ya presentes.
3. Si detectas que se desvían de "${currentGoal}", reoriéntalos amablemente.
4. Si detectas indecisión o conflicto, propone preguntas directas o sugiere una votación rápida.
5. Usa un tono cercano, profesional y facilitador. No escribas respuestas largas. Responde en español.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
      });

      // 3. Enviar la respuesta de la IA al canal de Portal
      await send({
        content: {
          type: 'CHAT',
          text: response.text,
          senderName: 'IA Facilitadora 🤖'
        }
      });
    } catch (err) {
      console.error('Error en ChatRoom handleSend:', err);
      setApiError(err.message || 'Error al enviar o procesar el mensaje.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ flex: '1 1 420px', minWidth: '320px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.05rem', color: '#cbd5e1' }}>💬 Conversación</h3>
        <span style={{ fontSize: '0.8rem', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>
          🟢 {onlineCount} online
        </span>
      </div>

      {apiError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
          ⚠️ <strong>Error del sistema:</strong> {apiError}
        </div>
      )}

      <div style={{ flexGrow: 1, border: '1px solid var(--border)', height: '330px', overflowY: 'auto', padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {chatMessages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#64748b', marginTop: '120px', fontSize: '0.85rem' }}>
            Escribe un mensaje para comenzar la facilitación...
          </p>
        )}

        {chatMessages.map((m) => {
          const senderName = m.content?.senderName || m.senderId || 'Usuario';
          const isAI = senderName.includes('IA');
          const isMe = senderName === userName;

          return (
            <div key={m.id} style={{ alignSelf: isAI ? 'center' : (isMe ? 'flex-end' : 'flex-start'), maxWidth: '85%' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                display: 'block',
                marginBottom: '2px',
                textAlign: isAI ? 'center' : (isMe ? 'right' : 'left'),
                color: isAI ? '#c084fc' : (isMe ? '#60a5fa' : '#94a3b8')
              }}>
                {senderName}
              </span>
              <div style={{
                background: isAI ? 'rgba(139, 92, 246, 0.15)' : (isMe ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.04)'),
                border: `1px solid ${isAI ? 'rgba(139, 92, 246, 0.3)' : (isMe ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.06)')}`,
                padding: '8px 12px',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                wordBreak: 'break-word',
              }}>
                {m.content?.text}
              </div>
            </div>
          );
        })}
        {typing.length > 0 && !isLoading && <p style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>✍️ Alguien está escribiendo...</p>}
        {isLoading && <p style={{ color: '#c084fc', fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>🤖 La IA facilitadora está pensando...</p>}
      </div>

      <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); sendTyping(); }}
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
  const [userName, setUserName] = useState(() => {
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
  const notesMap = {};

  lobbyMessages.forEach((m) => {
    const c = m.content;
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

  const activeNotes = Object.values(notesMap);

  const chatMessages = lobbyMessages.filter(
    (m) => m.content?.type === 'CHAT' || (!m.content?.type && m.content?.text)
  );

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
    if (cleaned) {
      sendLobby({
        content: {
          type: 'SET_GOAL',
          goal: cleaned
        }
      });
    }
    setIsEditingGoal(false);
  };

  const handleAddNote = (color) => {
    const id = 'note_' + Math.random().toString(36).substring(2, 9);
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
  };

  const handleMoveNote = (id, x, y) => {
    sendLobby({
      content: {
        type: 'MOVE_NOTE',
        noteId: id,
        x,
        y
      }
    });
  };

  const handleEditNote = (id, text) => {
    sendLobby({
      content: {
        type: 'UPDATE_NOTE',
        noteId: id,
        text
      }
    });
  };

  const handleDeleteNote = (id) => {
    sendLobby({
      content: {
        type: 'DELETE_NOTE',
        noteId: id
      }
    });
  };

  // Acción final para redactar el resumen
  const handleFinalizeMeeting = async () => {
    setIsGeneratingSummary(true);
    setShowSummary(false); // Primero abrimos el modal vacio o en carga
    setSummaryText('');

    // Abrir pantalla de resumen
    setShowSummary(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No se detectó VITE_GEMINI_API_KEY.');
      }
      const ai = new GoogleGenAI({ apiKey });

      const notesText = activeNotes.length > 0
        ? activeNotes.map(n => `- Nota: "${n.text}"`).join('\n')
        : '(No se agregaron notas a la pizarra)';

      const chatHistoryText = chatMessages
        .map((m) => `${m.content?.senderName || 'Usuario'}: ${m.content?.text || ''}`)
        .join('\n');

      const promptText = `Como la IA facilitadora de Aimly, genera un resumen final muy estructurado en formato Markdown.

Objetivo de la reunión: "${currentGoal}"

Notas en la pizarra:
${notesText}

Historial de la conversación:
${chatHistoryText}

Estructura el resumen de la siguiente manera:
1. **Resumen Ejecutivo**: Un párrafo conciso explicando lo que se logró en la sesión.
2. **Decisiones Clave**: Lista ordenada de decisiones concretas tomadas.
3. **Reparto de Tareas**: Tabla detallada en Markdown (Tarea | Responsable | Estimado) basada en las ideas y el chat. Si no hay responsable explícito, coloca "Por definir".
4. **Próximos Pasos**: Lista con viñetas de las acciones a seguir de inmediato.

Responde de forma clara y formateada en Markdown. Todo en español.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
      });

      setSummaryText(response.text);
    } catch (e) {
      console.error(e);
      setSummaryText('⚠️ **Error al generar resumen:** Asegúrate de tener tu clave de API correctamente configurada en el archivo `.env`.');
    } finally {
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
          <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#38bdf8' }}>Aimly 🚀</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Hackathon Facilitador Inteligente</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Tu Nombre:</span>
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
              <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{userName}</strong>
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
      <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #a855f7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objetivo de la Reunión</span>
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
              <h2 style={{ fontSize: '1.25rem', marginTop: '6px', color: '#f8fafc' }}>
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
          send={sendLobby}
          typing={lobbyTyping}
          sendTyping={sendLobbyTyping}
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
          background: 'rgba(15, 23, 42, 0.85)',
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
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#c084fc' }}>📝 Acta Final de la Reunión</h2>
              <button
                onClick={() => setShowSummary(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {isGeneratingSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '40px 0' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(192, 132, 252, 0.2)',
                  borderTopColor: '#c084fc',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>La IA facilitadora está consolidando el acta de reunión...</p>

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
                  background: 'rgba(15,23,42,0.4)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e2e8f0',
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