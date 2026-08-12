import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, Copy, Pencil, Trash2, Check } from 'lucide-react';

export interface MeetingActionHandlers {
  onEdit?: () => void;
  onDelete?: () => void;
}

interface Props {
  meeting: {
    id: string;
    status: string;
    title: string;
  };
  isHost: boolean;
  handlers: MeetingActionHandlers;
}

export function MeetingActionsMenu({ meeting, isHost, handlers }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Cerrar con Escape y devolver foco
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(prev => !prev);
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    if (meeting.status === 'draft') navigate(`/meeting/${meeting.id}/lobby`);
    else if (meeting.status === 'active') navigate(`/meeting/${meeting.id}`);
    else navigate(`/meeting/${meeting.id}/result`);
  }

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/meeting/${meeting.id}/lobby`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    handlers.onEdit?.();
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    handlers.onDelete?.();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        id={`meeting-menu-trigger-${meeting.id}`}
        aria-label="Opciones de reunión"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggle}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-aimly-text/40 hover:text-aimly-text hover:bg-aimly-bg transition-all focus:outline-none focus:ring-2 focus:ring-aimly-orange/30"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          aria-labelledby={`meeting-menu-trigger-${meeting.id}`}
          className="absolute right-0 top-full mt-1 z-50 min-w-[168px] bg-white border border-aimly-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          onClick={e => e.stopPropagation()}
        >
          {/* Abrir */}
          <button
            role="menuitem"
            onClick={handleOpen}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-aimly-text hover:bg-aimly-bg transition-colors text-left"
          >
            <ExternalLink size={14} className="text-aimly-text/50" />
            {meeting.status === 'draft' ? 'Ir al lobby' : meeting.status === 'active' ? 'Entrar a la sala' : 'Ver resultados'}
          </button>

          {/* Copiar invitación */}
          <button
            role="menuitem"
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-aimly-text hover:bg-aimly-bg transition-colors text-left"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-500" />
                <span className="text-green-600 font-medium">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-aimly-text/50" />
                Copiar invitación
              </>
            )}
          </button>

          {/* Solo anfitrión: Editar */}
          {isHost && meeting.status === 'draft' && (
            <button
              role="menuitem"
              onClick={handleEdit}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-aimly-text hover:bg-aimly-bg transition-colors text-left"
            >
              <Pencil size={14} className="text-aimly-text/50" />
              Editar
            </button>
          )}

          {/* Solo anfitrión: Eliminar */}
          {isHost && (
            <>
              <div className="border-t border-aimly-border/50 mx-2" />
              <button
                role="menuitem"
                onClick={handleDelete}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
