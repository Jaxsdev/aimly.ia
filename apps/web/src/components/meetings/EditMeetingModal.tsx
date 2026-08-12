import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Meeting {
  id: string;
  title: string;
  objective: string;
  expected_outcome: string;
  duration_minutes: number;
  status: string;
}

interface Props {
  meeting: Meeting;
  onSave: (updated: Meeting) => void;
  onClose: () => void;
}

interface FormErrors {
  title?: string;
  objective?: string;
  expectedOutcome?: string;
  durationMinutes?: string;
}

export function EditMeetingModal({ meeting, onSave, onClose }: Props) {
  const [title, setTitle] = useState(meeting.title);
  const [objective, setObjective] = useState(meeting.objective);
  const [expectedOutcome, setExpectedOutcome] = useState(meeting.expected_outcome);
  const [durationMinutes, setDurationMinutes] = useState(String(meeting.duration_minutes));
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Foco inicial
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Escape cierra
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!title.trim()) errs.title = 'El título es obligatorio';
    if (!objective.trim()) errs.objective = 'El objetivo es obligatorio';
    if (!expectedOutcome.trim()) errs.expectedOutcome = 'El resultado esperado es obligatorio';
    const dur = Number(durationMinutes);
    if (!durationMinutes || isNaN(dur) || dur < 5 || dur > 480) {
      errs.durationMinutes = 'La duración debe ser entre 5 y 480 minutos';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const updated = await api.meetings.update(meeting.id, {
        title: title.trim(),
        objective: objective.trim(),
        expectedOutcome: expectedOutcome.trim(),
        durationMinutes: Number(durationMinutes)
      }) as Meeting;
      onSave(updated);
    } catch (err: any) {
      setApiError(err?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aimly-border">
          <h2 id="edit-modal-title" className="font-newsreader text-xl font-bold text-aimly-text">
            Editar reunión
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-aimly-text/40 hover:text-aimly-text hover:bg-aimly-bg transition-all focus:outline-none focus:ring-2 focus:ring-aimly-orange/30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4">
            {apiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {apiError}
              </div>
            )}

            {/* Título */}
            <div>
              <label htmlFor="edit-title" className="block text-sm font-semibold text-aimly-text mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-title"
                ref={firstInputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                className={`w-full bg-aimly-bg border rounded-lg px-3 py-2 text-aimly-text text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.title ? 'border-red-400 focus:ring-red-200' : 'border-aimly-border focus:border-aimly-orange focus:ring-aimly-orange/20'
                }`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Objetivo */}
            <div>
              <label htmlFor="edit-objective" className="block text-sm font-semibold text-aimly-text mb-1">
                Objetivo <span className="text-red-500">*</span>
              </label>
              <textarea
                id="edit-objective"
                value={objective}
                onChange={e => setObjective(e.target.value)}
                rows={2}
                maxLength={2000}
                className={`w-full bg-aimly-bg border rounded-lg px-3 py-2 text-aimly-text text-sm focus:outline-none focus:ring-2 transition-all resize-none ${
                  errors.objective ? 'border-red-400 focus:ring-red-200' : 'border-aimly-border focus:border-aimly-orange focus:ring-aimly-orange/20'
                }`}
              />
              {errors.objective && <p className="text-red-500 text-xs mt-1">{errors.objective}</p>}
            </div>

            {/* Resultado esperado */}
            <div>
              <label htmlFor="edit-outcome" className="block text-sm font-semibold text-aimly-text mb-1">
                Resultado esperado <span className="text-red-500">*</span>
              </label>
              <textarea
                id="edit-outcome"
                value={expectedOutcome}
                onChange={e => setExpectedOutcome(e.target.value)}
                rows={2}
                maxLength={2000}
                className={`w-full bg-aimly-bg border rounded-lg px-3 py-2 text-aimly-text text-sm focus:outline-none focus:ring-2 transition-all resize-none ${
                  errors.expectedOutcome ? 'border-red-400 focus:ring-red-200' : 'border-aimly-border focus:border-aimly-orange focus:ring-aimly-orange/20'
                }`}
              />
              {errors.expectedOutcome && <p className="text-red-500 text-xs mt-1">{errors.expectedOutcome}</p>}
            </div>

            {/* Duración */}
            <div>
              <label htmlFor="edit-duration" className="block text-sm font-semibold text-aimly-text mb-1">
                Duración (minutos) <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-duration"
                type="number"
                min={5}
                max={480}
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                className={`w-full bg-aimly-bg border rounded-lg px-3 py-2 text-aimly-text text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.durationMinutes ? 'border-red-400 focus:ring-red-200' : 'border-aimly-border focus:border-aimly-orange focus:ring-aimly-orange/20'
                }`}
              />
              {errors.durationMinutes && <p className="text-red-500 text-xs mt-1">{errors.durationMinutes}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-aimly-border bg-aimly-bg/50">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="edit-modal-submit"
              disabled={saving}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
