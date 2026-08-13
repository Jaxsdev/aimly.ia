import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';

interface Meeting {
  id: string;
  title: string;
}

interface Props {
  meeting: Meeting;
  onDeleted: () => void;
  onClose: () => void;
}

export function DeleteMeetingModal({ meeting, onDeleted, onClose }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Foco inicial en el botón de confirmar
  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  // Escape cierra
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleDelete() {
    setDeleting(true);
    setApiError(null);
    try {
      await api.meetings.delete(meeting.id);
      onDeleted();
    } catch (err: any) {
      setApiError(err?.message || 'Error al eliminar la reunión');
      setDeleting(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aimly-border">
          <h2 id="delete-modal-title" className="font-newsreader text-xl font-bold text-aimly-text flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Eliminar reunión
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-aimly-text/40 hover:text-aimly-text hover:bg-aimly-bg transition-all focus:outline-none focus:ring-2 focus:ring-aimly-orange/30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p id="delete-modal-desc" className="text-aimly-text/80 text-sm leading-relaxed mb-2">
            Estás a punto de eliminar permanentemente la reunión:
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="font-semibold text-aimly-text text-sm truncate">"{meeting.title}"</p>
          </div>
          <p className="text-aimly-text/60 text-sm leading-relaxed">
            Esta acción <strong className="text-aimly-text">no se puede deshacer</strong>. Se eliminarán todos los mensajes, tarjetas y datos asociados.
          </p>

          {apiError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {apiError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-aimly-border bg-aimly-bg/50">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            ref={confirmBtnRef}
            id="delete-modal-confirm"
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            <Trash2 size={14} />
            {deleting ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
