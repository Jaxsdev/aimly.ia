import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, Badge, Avatar } from '../components/ui';
import { CheckCircle2, ListTodo, Sparkles, Download, Share2, Home } from 'lucide-react';
import { demoDecision, demoTasks, demoParticipants } from '../mocks';
import { api } from '../lib/api';

export default function MeetingResultPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!meetingId) return;
      try {
        const data = await api.meetings.get(meetingId);
        setMeeting(data);
      } catch (e) {
        console.error('Failed to load meeting', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aimly-orange"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-aimly-border pb-6">
          <div>
            <Badge variant="success" className="mb-3 px-3 py-1">Reunión finalizada</Badge>
            <h1 className="font-newsreader text-4xl font-bold text-aimly-text mb-2">
              Resultados: {meeting?.title || 'Reunión'}
            </h1>
            <p className="text-aimly-text/60">
              Finalizada hoy, {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {meeting?.duration_minutes || 30} minutos de duración
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Share2 size={16} /> Compartir
            </button>
            <button className="btn-secondary py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Download size={16} /> Exportar PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Results */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* Decisión Final */}
            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-[#FFFDF9] border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="font-bold text-aimly-text text-lg">Decisión Final Confirmada</h3>
              </div>
              <p className="text-lg text-aimly-text font-medium leading-relaxed mb-4">
                {demoDecision.text}
              </p>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg inline-flex">
                <span className="text-xs text-aimly-text/60">Confirmado por</span>
                <Avatar src="https://i.pravatar.cc/150?u=usr_1" alt="Luis" size="sm" />
                <span className="text-sm font-semibold text-aimly-text">{demoDecision.confirmedBy}</span>
              </div>
            </Card>

            {/* Tareas Asignadas */}
            <Card className="p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-aimly-orange/10 text-aimly-orange flex items-center justify-center">
                  <ListTodo size={18} />
                </div>
                <h3 className="font-bold text-aimly-text text-lg">Tareas y próximos pasos</h3>
              </div>
              
              <div className="flex flex-col gap-3">
                {demoTasks.map((task, i) => (
                  <div key={i} className="flex items-start md:items-center justify-between p-4 rounded-xl border border-aimly-border bg-aimly-bg/50 hover:bg-aimly-bg transition-colors gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 w-4 h-4 rounded border-2 border-aimly-text/30 flex-shrink-0"></div>
                      <span className="font-medium text-aimly-text leading-tight">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-aimly-border shrink-0">
                      <Avatar size="sm" alt={task.assigneeName} />
                      <span className="text-xs font-semibold text-aimly-text">{task.assigneeName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="flex flex-col gap-6">
            
            {/* AimLy Summary */}
            <Card className="p-6 bg-gradient-to-b from-[#FFFDF9] to-aimly-bg border-aimly-orange/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-aimly-orange/5 rounded-bl-[100px] pointer-events-none"></div>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-aimly-orange/10 text-aimly-orange flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-bold text-aimly-text">Resumen de AimLy</h3>
              </div>
              
              <div className="prose prose-sm prose-p:text-aimly-text/80 prose-p:leading-relaxed">
                <p>
                  El equipo evaluó dos enfoques para el hackathon: herramientas de productividad vs aplicaciones de consumo.
                </p>
                <p>
                  Tras una votación en la que el enfoque de productividad ganó por 3 votos a 1, se decidió unánimemente construir el Asistente de Reuniones con IA.
                </p>
                <p>
                  El resultado esperado se cumplió satisfactoriamente 5 minutos antes del límite de tiempo.
                </p>
              </div>
            </Card>

            {/* Participants Summary */}
            <Card className="p-6 shadow-sm">
              <h3 className="font-bold text-aimly-text mb-4">Participantes ({demoParticipants.length})</h3>
              <div className="flex flex-col gap-3">
                {demoParticipants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <Avatar src={`https://i.pravatar.cc/150?u=${p.id}`} alt={p.name} size="md" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-aimly-text">{p.name}</span>
                      <span className="text-xs text-aimly-text/60">{p.role === 'host' ? 'Organizador' : 'Participante'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Return Action */}
            <button 
              onClick={() => navigate('/home')}
              className="w-full btn-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-aimly-orange/20"
            >
              <Home size={18} />
              Volver al inicio
            </button>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
