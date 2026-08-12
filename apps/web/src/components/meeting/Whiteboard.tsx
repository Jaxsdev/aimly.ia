import React, { useState, useEffect, useRef, useCallback } from 'react';
import { convertToExcalidrawElements, Excalidraw } from '@excalidraw/excalidraw';
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw';
import '@excalidraw/excalidraw/index.css';
import { 
  MousePointer2, StickyNote, Trash2, Edit3, Plus,
  Check, X, Move, PenTool, Target
} from 'lucide-react';
import { useMeeting } from '../../contexts/MeetingContext';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';

type BoardViewMode = 'excalidraw' | 'stickyNotes';

const COLOR_PALETTE = [
  { id: 'orange', name: 'Naranja', bg: 'bg-[#FDF2EC]', border: 'border-[#F1B29A]' },
  { id: 'lavender', name: 'Lavanda', bg: 'bg-[#F4F0FC]', border: 'border-[#C7B8EA]' },
  { id: 'sage', name: 'Verde Sage', bg: 'bg-[#F2F4EF]', border: 'border-[#A8B49A]' },
  { id: 'butter', name: 'Mantequilla', bg: 'bg-[#FDFBF2]', border: 'border-[#E9CF87]' },
];
const WHITEBOARD_BUCKET = 'whiteboard-files';
const MAX_WHITEBOARD_IMAGE_BYTES = 8 * 1024 * 1024;

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export function Whiteboard() {
  const { meeting, cards, createCard, updateCard, collaborators, stickyCursors } = useMeeting();
  
  // View Mode: 'excalidraw' (Motor completo estilo Obsidian/Excalidraw) or 'stickyNotes' (Notas adhesivas)
  const [viewMode, setViewMode] = useState<BoardViewMode>('excalidraw');
  const [initialElements, setInitialElements] = useState<any[] | null>(null);
  const [initialFiles, setInitialFiles] = useState<Record<string, any>>({});
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const latestElementsRef = useRef<readonly any[]>([]);
  const latestFilesRef = useRef<Record<string, any>>({});
  const uploadedFilePathsRef = useRef<Record<string, string>>({});
  const hasRenderedInitialSceneRef = useRef(false);
  const isApplyingInitialFilesRef = useRef(false);
  const persistTimerRef = useRef<number | undefined>(undefined);
  const [boardProposal, setBoardProposal] = useState<{ title: string; base: any[]; elements: any[]; files?: any } | null>(null);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!meeting?.id) return;
    hasRenderedInitialSceneRef.current = false;

    api.excalidraw.getScene(meeting.id)
      .then(async (scene) => {
        if (!cancelled) {
          const elements = Array.isArray(scene.elements) ? scene.elements : [];
          const storedFiles = scene.files || {};
          const hydratedEntries = await Promise.all(Object.entries(storedFiles).map(async ([id, file]: [string, any]) => {
            if (!file.storagePath) return null;
            const { data } = supabase.storage.from(WHITEBOARD_BUCKET).getPublicUrl(file.storagePath);
            const response = await fetch(data.publicUrl);
            if (!response.ok) throw new Error(`No se pudo cargar la imagen ${id}`);
            const dataURL = await toDataUrl(await response.blob());
            uploadedFilePathsRef.current[id] = file.storagePath;
            return [id, { ...file, dataURL }];
          }));
          const files = Object.fromEntries(hydratedEntries.filter((entry): entry is [string, any] => entry !== null));
          latestElementsRef.current = elements;
          latestFilesRef.current = files;
          setInitialElements(elements);
          setInitialFiles(files);
        }
      })
      .catch((error) => {
        console.warn('[Whiteboard] Could not load shared scene; using local recovery copy.', error);
        if (cancelled) return;
        try {
          setInitialElements(JSON.parse(localStorage.getItem(`excalidraw_scene_${meeting.id}`) || '[]'));
        } catch {
          setInitialElements([]);
        }
      });

    return () => { cancelled = true; };
  }, [meeting?.id]);

  useEffect(() => () => {
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
  }, []);

  // Excalidraw does not load binary files from `initialData`. They must be
  // registered explicitly so image elements can resolve their fileId after a
  // refresh or when a participant enters later.
  useEffect(() => {
    if (excalidrawApi && Object.keys(initialFiles).length > 0) {
      isApplyingInitialFilesRef.current = true;
      excalidrawApi.addFiles(initialFiles);
      window.setTimeout(() => { isApplyingInitialFilesRef.current = false; }, 0);
    }
  }, [excalidrawApi, initialFiles]);

  const serializeFilesForStorage = async (files: Record<string, any>) => {
    const serialized = await Promise.all(Object.entries(files).map(async ([id, file]: [string, any]) => {
      const existingPath = file.storagePath || uploadedFilePathsRef.current[id];
      if (existingPath) {
        uploadedFilePathsRef.current[id] = existingPath;
        const { dataURL: _dataURL, ...metadata } = file;
        return [id, { ...metadata, storagePath: existingPath }];
      }
      if (!file.dataURL || !meeting?.id) return null;
      const response = await fetch(file.dataURL);
      const blob = await response.blob();
      if (blob.size > MAX_WHITEBOARD_IMAGE_BYTES) {
        throw new Error('La imagen supera el límite de 8 MB. Comprímela o usa una captura más pequeña.');
      }
      const path = `${meeting.id}/${id}`;
      const { error } = await supabase.storage.from(WHITEBOARD_BUCKET).upload(path, blob, { contentType: file.mimeType || blob.type, upsert: false });
      if (error && !/already exists/i.test(error.message)) throw error;
      uploadedFilePathsRef.current[id] = path;
      const { dataURL: _dataURL, ...metadata } = file;
      return [id, { ...metadata, storagePath: path }];
    }));
    return Object.fromEntries(serialized.filter((entry): entry is [string, any] => entry !== null));
  };

  const scheduleScenePersistence = () => {
    if (!meeting?.id || (window as any).isIncomingSync) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(async () => {
      try {
        const files = await serializeFilesForStorage(latestFilesRef.current);
        await api.excalidraw.saveScene(meeting.id, latestElementsRef.current, files);
        (window as any).broadcastWhiteboardFilesReady?.(files);
        setImageError('');
      } catch (error: any) {
        console.warn('[Whiteboard] Could not persist shared scene.', error);
        setImageError(error?.message || 'No se pudo guardar la imagen compartida.');
      }
    }, 1200);
  };

  // Sync collaborators real-time cursors via imperative API
  useEffect(() => {
    const api = (window as any).excalidrawAPI;
    if (api && collaborators) {
      api.updateScene({ collaborators });
    }
  }, [collaborators]);

  useEffect(() => {
    const createTextElement = (text: string, x: number, y: number, fontSize: number) => ({
      id: crypto.randomUUID(), type: 'text', x, y, width: Math.max(140, text.length * (fontSize * 0.55)), height: fontSize * 1.4,
      angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'dashed',
      roughness: 1, opacity: 55, groupIds: [], frameId: null, roundness: null, seed: Math.floor(Math.random() * 2147483647),
      version: 1, versionNonce: Math.floor(Math.random() * 2147483647), isDeleted: false, boundElements: null,
      updated: Date.now(), link: null, locked: false, fontSize, fontFamily: 1, text, textAlign: 'left', verticalAlign: 'top',
      containerId: null, originalText: text, autoResize: true, lineHeight: 1.25, baseline: fontSize
    });
    const onProposal = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; notes: string[] }>).detail;
      const excalidraw = (window as any).excalidrawAPI;
      if (!detail || !excalidraw) return;
      const base = [...(excalidraw.getSceneElementsIncludingDeleted() || [])];
      const generated = [createTextElement(detail.title, 160, 120, 30), ...detail.notes.map((note, index) => createTextElement(`• ${note}`, 180, 190 + index * 62, 20))];
      excalidraw.updateScene({ elements: [...base, ...generated] });
      setBoardProposal({ title: detail.title, base, elements: generated });
    };
    window.addEventListener('aimly:board-proposal', onProposal);
    const onMermaidProposal = async (event: Event) => {
      const code = (event as CustomEvent<{ mermaid: string }>).detail?.mermaid;
      const excalidraw = (window as any).excalidrawAPI;
      if (!code || !excalidraw) return;
      try {
        const base = [...(excalidraw.getSceneElementsIncludingDeleted() || [])];
        const parsed = await parseMermaidToExcalidraw(code, { flowchart: { curve: 'linear' } });
        // Mermaid returns skeletons. Convert them to complete Excalidraw elements so
        // their text labels, bindings and arrows render correctly.
        const elements = convertToExcalidrawElements(parsed.elements as any[], { regenerateIds: false }).map((element: any) => ({
          ...element, x: element.x + 120, y: element.y + 100,
          // Keep Mermaid's container/text IDs intact: Excalidraw uses them to
          // bind each editable label to its node.
          opacity: element.type === 'text' ? 100 : 55,
          strokeStyle: element.type === 'text' ? 'solid' : 'dashed', locked: false
        }));
        excalidraw.updateScene({ elements: [...base, ...elements], files: parsed.files });
        setBoardProposal({ title: 'Diagrama de flujo', base, elements, files: parsed.files });
      } catch (error) { console.error('[AimLy] Mermaid inválido.', error); alert('No se pudo convertir el flujo a la pizarra.'); }
    };
    window.addEventListener('aimly:mermaid-proposal', onMermaidProposal);
    return () => { window.removeEventListener('aimly:board-proposal', onProposal); window.removeEventListener('aimly:mermaid-proposal', onMermaidProposal); };
  }, []);

  const applyBoardProposal = () => {
    if (!boardProposal) return;
    const excalidraw = (window as any).excalidrawAPI;
    const elements = [...boardProposal.base, ...boardProposal.elements];
    latestElementsRef.current = elements;
    excalidraw?.addFiles?.(boardProposal.files || {});
    excalidraw?.updateScene({ elements });
    (window as any).broadcastDelta?.(elements, boardProposal.files || {});
    scheduleScenePersistence();
    setBoardProposal(null);
  };

  const discardBoardProposal = () => {
    const excalidraw = (window as any).excalidrawAPI;
    if (boardProposal) excalidraw?.updateScene({ elements: boardProposal.base });
    setBoardProposal(null);
  };

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

  const handleDeleteCard = useCallback(async (id: string) => {
    try {
      await updateCard(id, { text: '[Eliminada]' });
      setSelectedCardId(null);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  }, [updateCard]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedCardId || editingCardId) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handleDeleteCard(selectedCardId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCardId, editingCardId, handleDeleteCard]);

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
      {meeting?.objective && <div className="absolute left-4 right-4 top-14 z-20 flex items-center gap-2 rounded-xl border border-aimly-border/80 bg-white/90 px-3 py-1.5 text-xs text-aimly-text/70 shadow-sm backdrop-blur pointer-events-none"><Target size={14} className="shrink-0 text-aimly-orange" /><span className="font-semibold text-aimly-text">Objetivo:</span><span className="truncate">{meeting.objective}</span></div>}
      {imageError && <div className="absolute bottom-4 left-4 z-50 max-w-sm rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-lg">{imageError}</div>}
      {boardProposal && <div className="absolute right-4 top-20 z-40 w-72 rounded-2xl border border-aimly-orange/30 bg-white p-3 shadow-xl"><p className="text-xs font-bold text-aimly-text">Propuesta de AimLy: {boardProposal.title}</p><p className="mt-1 text-[11px] text-aimly-text/60">El texto punteado es una vista previa. ¿Deseas añadirlo a la pizarra?</p><div className="mt-3 flex gap-2"><button onClick={applyBoardProposal} className="flex-1 rounded-lg bg-aimly-orange py-2 text-xs font-bold text-white">Aplicar</button><button onClick={discardBoardProposal} className="flex-1 rounded-lg border border-aimly-border py-2 text-xs font-bold text-aimly-text">Descartar</button></div></div>}

      {/* ── MODE 1: EXCALIDRAW ENGINE ── */}
      {viewMode === 'excalidraw' && (
        <div 
          className="w-full h-full relative z-10 pt-20"
          onPointerDown={() => {
            (window as any).isUserDrawing = true;
          }}
          onPointerUp={() => {
            (window as any).isUserDrawing = false;
            if ((window as any).flushPendingDeltas) {
              (window as any).flushPendingDeltas();
            }
            scheduleScenePersistence();
          }}
        >
          {initialElements !== null ? <Excalidraw
            theme="light"
            isCollaborating
            initialData={{
              elements: initialElements,
              files: initialFiles
            }}
            excalidrawAPI={(api) => {
              (window as any).excalidrawAPI = api;
              setExcalidrawApi(api);
            }}
            onChange={(elements, _appState, files) => {
              latestElementsRef.current = elements;
              latestFilesRef.current = files || {};
              // Excalidraw emits onChange while it restores a scene. That is
              // not an edit: rebroadcasting it lets a refreshing client
              // overwrite newer work from another participant.
              if (!hasRenderedInitialSceneRef.current || isApplyingInitialFilesRef.current) {
                hasRenderedInitialSceneRef.current = true;
                return;
              }
              if (meeting?.id) {
                // Save to local storage asynchronously
                try {
                  localStorage.setItem(`excalidraw_scene_${meeting.id}`, JSON.stringify(elements));
                } catch {}

                // Only broadcast strokes if this is a local change, not an incoming sync!
                if (!(window as any).isIncomingSync) {
                  const now = Date.now();
                  if (now - ((window as any).lastExcalidrawBroadcast || 0) > 30) {
                    (window as any).lastExcalidrawBroadcast = now;
                    if ((window as any).broadcastDelta) {
                      (window as any).broadcastDelta(elements, files || {});
                    }
                  }
                }
              }

              scheduleScenePersistence();

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
              if (payload.pointer && (window as any).broadcastPointer) {
                (window as any).broadcastPointer(payload.pointer, payload.button);
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
          /> : <div className="h-full flex items-center justify-center text-sm text-aimly-text/60">Cargando pizarra compartida…</div>}
        </div>
      )}

      {/* ── MODE 2: STICKY NOTES CANVAS ── */}
      {viewMode === 'stickyNotes' && (
        <div 
          className="w-full h-full relative overflow-hidden pt-20"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            (window as any).broadcastStickyCursor?.(
              Math.round(event.clientX - rect.left),
              Math.round(event.clientY - rect.top)
            );
          }}
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
          {Array.from(stickyCursors.entries()).map(([userId, cursor]) => (
            <div
              key={userId}
              className="absolute z-40 pointer-events-none -translate-x-1 -translate-y-1"
              style={{ left: cursor.x, top: cursor.y }}
            >
              <MousePointer2 size={18} className="fill-aimly-orange text-aimly-orange drop-shadow" />
              <span className="ml-2 rounded bg-aimly-orange px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                {cursor.name}
              </span>
            </div>
          ))}

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
