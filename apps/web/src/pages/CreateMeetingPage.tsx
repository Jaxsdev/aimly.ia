import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, Input } from '../components/ui';
import { Target, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: 'Selección del proyecto Hackathon',
    objective: 'Elegir la mejor idea de proyecto para el hackathon.',
    expectedOutcome: 'Una idea seleccionada y tres tareas iniciales asignadas.',
    durationMinutes: 20,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const meeting = await api.meetings.create({
        title: formData.title,
        objective: formData.objective,
        expectedOutcome: formData.expectedOutcome,
        durationMinutes: Number(formData.durationMinutes)
      });
      navigate(`/meeting/${(meeting as any).id}`);
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Error al crear la reunión');
    } finally {
      setIsCreating(false);
    }
  };
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center mt-6 mb-2">
          <h1 className="font-newsreader text-4xl font-bold text-aimly-text mb-3">
            Crea una reunión con un objetivo claro
          </h1>
          <p className="text-aimly-text/70 text-[1.05rem] leading-relaxed max-w-lg mx-auto">
            AimLy utilizará este contexto para ayudarte a mantener la reunión enfocada.
          </p>
        </div>

        <Card className="p-8 lg:p-10 shadow-lg shadow-aimly-orange/5 border-aimly-border/60">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Título */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-aimly-text flex items-center gap-2">
                Título de la reunión
              </label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ej. Planificación de Sprint..."
                className="text-lg py-3"
                required
              />
            </div>

            {/* Objetivo */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-aimly-text flex items-center gap-2">
                <Target size={16} className="text-aimly-orange" />
                Objetivo
              </label>
              <textarea 
                value={formData.objective}
                onChange={(e) => setFormData({...formData, objective: e.target.value})}
                placeholder="¿Qué vamos a discutir?"
                className="w-full bg-aimly-surface border border-aimly-border rounded-lg px-4 py-3 text-aimly-text focus:outline-none focus:border-aimly-orange focus:ring-2 focus:ring-aimly-orange/20 transition-all min-h-[100px] resize-y"
                required
              />
            </div>

            {/* Resultado esperado */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-aimly-text flex items-center gap-2">
                <CheckCircle2 size={16} className="text-aimly-sage" />
                Resultado esperado
              </label>
              <textarea 
                value={formData.expectedOutcome}
                onChange={(e) => setFormData({...formData, expectedOutcome: e.target.value})}
                placeholder="¿Con qué debemos salir de esta reunión?"
                className="w-full bg-aimly-surface border border-aimly-border rounded-lg px-4 py-3 text-aimly-text focus:outline-none focus:border-aimly-orange focus:ring-2 focus:ring-aimly-orange/20 transition-all min-h-[80px] resize-y"
                required
              />
            </div>

            {/* Duración */}
            <div className="flex flex-col gap-2 w-1/2">
              <label className="text-sm font-bold text-aimly-text flex items-center gap-2">
                <Clock size={16} className="text-aimly-text/60" />
                Duración (minutos)
              </label>
              <Input 
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({...formData, durationMinutes: Number(e.target.value)})}
                placeholder="20"
                min="5"
                max="240"
                required
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                type="submit" 
                disabled={isCreating}
                className="btn-primary py-3 px-8 rounded-xl text-[1.05rem] flex items-center justify-center gap-2 min-w-[200px]"
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Crear reunión
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>

      </div>
    </AppLayout>
  );
}
