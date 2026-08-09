import React, { useState, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { 
  MousePointer2, StickyNote, Type, Trash2, Edit3, Plus, 
  Check, X, Sparkles, Move, LayoutGrid, PenTool
} from 'lucide-react';
import { useMeeting } from '../../contexts/MeetingContext';
import { api } from '../../lib/api';
import { sendPortalEvent } from '../../realtime/portal.client';

type BoardViewMode = 'excalidraw' | 'stickyNotes';

const COLOR_PALETTE = [
  { id: 'orange', name: 'Naranja', bg: 'bg-[#FDF2EC]', border: 'border-[#F1B29A]' },
  { id: 'lavender', name: 'Lavanda', bg: 'bg-[#F4F0FC]', border: 'border-[#C7B8EA]' },
  { id: 'sage', name: 'Verde Sage', bg: 'bg-[#F2F4EF]', border: 'border-[#A8B49A]' },
  { id: 'butter', name: 'Mantequilla', bg: 'bg-[#FDFBF2]', border: 'border-[#E9CF87]' },
];

export function Whiteboard() {
  const { meeting, cards, createCard, updateCard, refreshMeeting, collaborators } = useMeeting();
  
  // View Mode: 'excalidraw' (Motor completo estilo Obsidian/Excalidraw) or 'stickyNotes' (Notas adhesivas)
  const [viewMode, setViewMode] = useState<BoardViewMode>('excalidraw');

  // Sync collaborators real-time cursors via imperative API
  useEffect(() => {
    const api = (window as any).excalidrawAPI;
    if (api && collaborators) {
      api.updateScene({ collaborators });
    }
  }, [collaborators]);

  // Sticky notes state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCardPos, setNewCardPos] = useState({ x: 200, y: 150 });
  const [newCardText, setNewCardText] = useState('');
  const [newCardColor, setNewCardColor] = useState('orange');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // ── Sticky Note Actions ──────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text');
    if (!id || !meeting?.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left - 65);
    const y = Math.round(e.clientY - rect.top - 65);

    await updateCard(id, { x: Math.max(20, x), y: Math.max(20, y) });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardText.trim()) return;

    await createCard({
      text: newCardText.trim(),
      type: 'idea',
      x: newCardPos.x,
      y: newCardPos.y,
      color: newCardColor
    });

    setNewCardText('');
    setShowCreateModal(false);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    await updateCard(id, { text: editingText.trim() });
    setEditingCardId(null);
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await api.cards.update(meeting.id, id, { text: '[Eliminada]' });
      refreshMeeting();
      setSelectedCardId(null);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  return (
    <div className="flex-1 h-full bg-[#FCFAf7] relative overflow-hidden flex flex-col">

      {/* ── TOP SWITCHER BAR ── */}
      <div className="absolute top-3 left-4 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-aimly-border p-1.5 pointer-events-auto">
        <button 
          onClick={() => setViewMode('excalidraw')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            viewMode === 'excalidraw' ? 'bg-aimly-orange text-white shadow-sm' : 'text-aimly-text/70 hover:text-aimly-text hover:bg-black/5'
          }`}
        >
          <PenTool size={14} /> Pizarra Excalidraw
        </button>

        <button 
          onClick={() => setViewMode('stickyNotes')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            viewMode === 'stickyNotes' ? 'bg-aimly-orange text-white shadow-sm' : 'text-aimly-text/70 hover:text-aimly-text hover:bg-black/5'
          }`}
        >
          <StickyNote size={14} /> Notas Adhesivas ({cards.filter(c => c.text !== '[Eliminada]').length})
        </button>
      </div>

      {/* ── MODE 1: EXCALIDRAW ENGINE ── */}
      {viewMode === 'excalidraw' && (
        <div className="w-full h-full relative z-10 pt-12">
          <Excalidraw 
            theme="light"
            initialData={{
              elements: (() => {
                try {
                  const saved = localStorage.getItem(`excalidraw_scene_${meeting?.id}`);
                  return saved ? JSON.parse(saved) : [];
                } catch (e) {
                  return [];
                }
              })()
            }}
            excalidrawAPI={(api) => {
              (window as any).excalidrawAPI = api;
            }}
            onChange={(elements) => {
              if (meeting?.id) {
                // Save to local storage asynchronously
                try {
                  localStorage.setItem(`excalidraw_scene_${meeting.id}`, JSON.stringify(elements));
                } catch (e) {}

                // Only broadcast strokes if this is a local change, not an incoming sync!
                if (!(window as any).isIncomingSync) {
                  const now = Date.now();
                  if (now - ((window as any).lastExcalidrawBroadcast || 0) > 30) {
                    (window as any).lastExcalidrawBroadcast = now;
                    if ((window as any).broadcastStroke) {
                      (window as any).broadcastStroke(elements);
                    }
                  }
                }
              }

              // Extract non-deleted text elements from Excalidraw canvas for AI context
              const textNodes = elements.filter((el: any) => el.type === 'text' && el.text && el.text.trim().length > 0 && !el.isDeleted);
              for (const node of textNodes) {
                const text = (node as any).text.trim();
                const existing = cards.find(c => c.id === node.id || c.text === text);
                if (!existing && meeting?.id) {
                  createCard({
                    text,
                    type: 'idea',
                    x: Math.round((node as any).x || 100),
                    y: Math.round((node as any).y || 100),
                    color: 'orange'
                  }).catch(() => {});
                }
              }
            }}
            onPointerUpdate={(payload) => {
              if (payload.pointer && (window as any).broadcastPointer && payload.button !== "down") {
                (window as any).broadcastPointer(payload.pointer);
              }
            }}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: true,
                clearCanvas: true,
                export: { saveFileToDisk: true },
                loadScene: true,
                saveToActiveFile: false,
                toggleTheme: false
              }
            }}
          />
        </div>
      )}

      {/* ── MODE 2: STICKY NOTES CANVAS ── */}
      {viewMode === 'stickyNotes' && (
        <div 
          className="w-full h-full relative overflow-hidden pt-12"
          onClick={() => setSelectedCardId(null)}
          onDoubleClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left - 65);
            const y = Math.round(e.clientY - rect.top - 65);
            setNewCardPos({ x: Math.max(20, x), y: Math.max(20, y) });
            setShowCreateModal(true);
          }}
          onDrop={handleDrop} 
          onDragOver={(e) => e.preventDefault()}
          style={{
            backgroundImage: 'radial-gradient(circle, #E8E1D7 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Top Quick Create Button */}
          <div className="absolute top-16 right-4 z-20">
            <button
              onClick={() => {
                setNewCardPos({ x: 250, y: 180 });
                setShowCreateModal(true);
              }}
              className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md bg-aimly-orange hover:bg-aimly-orangeHover"
            >
              <Plus size={16} /> + Nueva Nota
            </button>
          </div>

          {/* Render Sticky Notes */}
          {cards.map(card => {
            if (card.text === '[Eliminada]') return null;
            const colorScheme = COLOR_PALETTE.find(c => c.id === card.color) || COLOR_PALETTE[0];
            const isSelected = selectedCardId === card.id;
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, card.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCardId(card.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingCardId(card.id);
                  setEditingText(card.text);
                }}
                className={`absolute w-[150px] min-h-[140px] rounded-2xl border-2 ${colorScheme.bg} ${colorScheme.border} p-3.5 flex flex-col shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                  isSelected ? 'ring-2 ring-aimly-orange shadow-lg scale-105 z-30' : 'hover:shadow-md hover:scale-102 z-10'
                }`}
                style={{ left: card.x, top: card.y }}
              >
                <div className="flex items-center justify-between mb-2 opacity-40 hover:opacity-100 transition-opacity">
                  <Move size={12} className="text-aimly-text" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-aimly-text/70">{colorScheme.name}</span>
                </div>

                {isEditing ? (
                  <div className="flex-1 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full h-full bg-white/80 border border-aimly-orange rounded-lg p-1.5 text-xs text-aimly-text focus:outline-none resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingCardId(null)} className="p-1 rounded bg-black/5 text-aimly-text">
                        <X size={12} />
                      </button>
                      <button onClick={() => handleSaveEdit(card.id)} className="p-1 rounded bg-aimly-orange text-white">
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-aimly-text leading-snug mb-auto break-words">
                    {card.text}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 text-[9px] font-semibold text-aimly-text/50">
                  <span>{card.authorName || 'Idea'}</span>
                  {isSelected && !isEditing && (
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingCardId(card.id); setEditingText(card.text); }} className="p-1 rounded hover:bg-black/10 text-aimly-text">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => handleDeleteCard(card.id)} className="p-1 rounded hover:bg-red-100 text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE CARD MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-aimly-border p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-newsreader font-bold text-xl text-aimly-text flex items-center gap-2">
                <StickyNote size={20} className="text-aimly-orange" /> Nueva Idea / Nota
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-aimly-text/50 hover:text-aimly-text rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-aimly-text/70 mb-1.5">Contenido de la nota</label>
                <textarea
                  autoFocus
                  placeholder="Escribe tu idea o propuesta para la reunión..."
                  value={newCardText}
                  onChange={(e) => setNewCardText(e.target.value)}
                  className="w-full bg-aimly-bg border border-aimly-border rounded-xl p-3 text-sm text-aimly-text focus:outline-none focus:ring-2 focus:ring-aimly-orange/40 focus:border-aimly-orange transition-all"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-aimly-text/70 mb-1.5">Color de la nota</label>
                <div className="flex gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewCardColor(c.id)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1 ${c.bg} ${c.border} ${
                        newCardColor === c.id ? 'ring-2 ring-aimly-orange scale-105 shadow-sm' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {newCardColor === c.id && <Check size={12} />}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 bg-aimly-orange hover:bg-aimly-orangeHover"
                >
                  <Plus size={14} /> Crear nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
