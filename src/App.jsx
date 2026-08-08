import React, { useState, useRef, useEffect } from 'react';
import { Portal } from '@portalsdk/core';
import { PortalProvider, useChannel } from '@portalsdk/react';

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
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => setColor('#3b82f6')}>Azul</button>
        <button onClick={() => setColor('#ef4444')}>Rojo</button>
        <button onClick={() => setColor('#10b981')}>Verde</button>
        <button onClick={handleClear}>Borrar Todo</button>
      </div>

      <div style={{ position: 'relative', width: '450px', height: '380px', border: '1px solid #ccc' }}>
        <canvas
          ref={canvasRef}
          width={450}
          height={380}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{ display: 'block', background: '#ffffff', cursor: 'crosshair' }}
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

      <div style={{ marginTop: '10px' }}>
        <button onClick={() => onAddNote('#fef08a')}>Agregar Nota Amarilla</button>
        <button onClick={() => onAddNote('#fbcfe8')}>Agregar Nota Rosa</button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CONTENEDOR DE LA SALA
// -----------------------------------------------------------------------------
function RoomContent() {
  const { messages: lobbyMessages, send: sendLobby } = useChannel({
    channelId: 'lobby',
    history: 100,
  });

  const notesMap = {};
  lobbyMessages.forEach((m) => {
    const c = m.content;
    if (!c) return;
    if (c.type === 'ADD_NOTE') {
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

  return (
    <div>
      <h1>Pizarra en Tiempo Real</h1>
      <Whiteboard
        activeNotes={activeNotes}
        onAddNote={handleAddNote}
        onMoveNote={handleMoveNote}
        onEditNote={handleEditNote}
        onDeleteNote={handleDeleteNote}
      />
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