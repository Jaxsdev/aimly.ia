import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, Badge, Avatar } from '../components/ui';
import { CheckCircle2, ListTodo, Sparkles, Download, Share2, Home, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

export default function MeetingResultPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!meetingId) return;
      setLoading(true);
      setError(null);
      try {
        const [meetingRes, tasksRes, decisionsRes, readinessRes] = await Promise.all([
          api.meetings.get(meetingId).catch(() => null),
          api.tasks.list(meetingId).catch(() => []),
          api.decisions.listAll().catch(() => []),
          api.meetings.readiness(meetingId).catch(() => [])
        ]);

        if (!meetingRes) {
          setError('Reunión no encontrada');
          return;
        }

        setMeeting(meetingRes);
        setTasks(tasksRes || []);
        // Filter decisions for this specific meeting
        setDecisions((decisionsRes || []).filter((d: any) => d.meeting_id === meetingId));
        setReadiness(readinessRes || []);
      } catch (err: any) {
        console.error('Failed to load meeting results:', err);
        setError('Error al cargar los resultados de la reunión');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [meetingId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aimly-orange"></div>
        </div>
      </AppLayout>
    );
  }

  if (error || !meeting) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 text-center">
          <Card className="p-8 border-red-200 bg-red-50/50">
            <h2 className="font-bold text-red-600 text-lg mb-2">{error || 'Reunión no encontrada'}</h2>
            <button onClick={() => navigate('/home')} className="btn-secondary py-2 px-4 rounded-lg text-sm mt-4">
              Volver al inicio
            </button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isClosed = meeting.status === 'closed';

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-aimly-border pb-6">
          <div>
            <Badge variant={isClosed ? 'success' : 'warning'} className="mb-3 px-3 py-1">
              {isClosed ? 'Reunión finalizada' : 'Reunión en curso'}
            </Badge>
            <h1 className="font-newsreader text-4xl font-bold text-aimly-text mb-2">
              Resultados: {meeting.title}
            </h1>
            <p className="text-aimly-text/60">
              Objetivo: {meeting.objective}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Share2 size={16} /> Compartir
            </button>
            <button className="btn-secondary py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Download size={16} /> Exportar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Results */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Decisiones Confirmadas */}
            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-[#FFFDF9] border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <h3 className="font-bold text-aimly-text text-lg">Decisiones Acordadas ({decisions.length})</h3>
                </div>
                <button
                  onClick={() => navigate(`/decisions?meetingId=${meetingId}`)}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Ir a decisiones <ArrowRight size={12} />
                </button>
              </div>

              {decisions.length === 0 ? (
                <p className="text-sm text-aimly-text/50 italic py-2">
                  No se registraron decisiones formales en esta reunión.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {decisions.map((decision) => (
                    <div key={decision.id} className="p-3 bg-white/80 rounded-xl border border-emerald-100 flex flex-col gap-2">
                      <p className="text-base text-aimly-text font-medium leading-relaxed">
                        {decision.text}
                      </p>
                      {decision.profiles && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-aimly-text/60">Confirmado por</span>
                          <Avatar src={decision.profiles.avatar_url} alt={decision.profiles.name || 'Usuario'} size="sm" />
                          <span className="text-xs font-semibold text-aimly-text">{decision.profiles.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Tareas Asignadas */}
            <Card className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-aimly-orange/10 text-aimly-orange flex items-center justify-center">
                    <ListTodo size={18} />
                  </div>
                  <h3 className="font-bold text-aimly-text text-lg">Tareas y próximos pasos ({tasks.length})</h3>
                </div>
                <button
                  onClick={() => navigate(`/tasks?meetingId=${meetingId}`)}
                  className="text-xs font-semibold text-aimly-orange hover:underline flex items-center gap-1"
                >
                  Ir a tareas <ArrowRight size={12} />
                </button>
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-aimly-text/50 italic py-2">
                  No hay tareas creadas para esta reunión.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start md:items-center justify-between p-4 rounded-xl border border-aimly-border bg-aimly-bg/50 hover:bg-aimly-bg transition-colors gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`mt-1 w-4 h-4 rounded border-2 shrink-0 ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-aimly-text/30'}`}></div>
                        <span className={`font-medium text-aimly-text leading-tight ${task.status === 'done' ? 'line-through text-aimly-text/50' : ''}`}>
                          {task.title}
                        </span>
                      </div>

                      {task.profiles ? (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-aimly-border shrink-0">
                          <Avatar size="sm" src={task.profiles.avatar_url} alt={task.profiles.name || 'Usuario'} />
                          <span className="text-xs font-semibold text-aimly-text">{task.profiles.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-aimly-text/40 italic">Sin asignar</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="flex flex-col gap-6">
            {/* AimLy Objective & Expected Outcome */}
            <Card className="p-6 bg-gradient-to-b from-[#FFFDF9] to-aimly-bg border-aimly-orange/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-aimly-orange/5 rounded-bl-[100px] pointer-events-none"></div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-aimly-orange/10 text-aimly-orange flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-bold text-aimly-text">Resumen del Resultado</h3>
              </div>

              <div className="prose prose-sm prose-p:text-aimly-text/80 prose-p:leading-relaxed flex flex-col gap-3">
                <div>
                  <span className="font-semibold text-xs text-aimly-text/60 uppercase tracking-wider block">Objetivo</span>
                  <p className="text-sm text-aimly-text mt-0.5">{meeting.objective}</p>
                </div>
                <div>
                  <span className="font-semibold text-xs text-aimly-text/60 uppercase tracking-wider block">Resultado Esperado</span>
                  <p className="text-sm text-aimly-text mt-0.5">{meeting.expected_outcome}</p>
                </div>
              </div>
            </Card>

            {/* Participants Summary */}
            <Card className="p-6 shadow-sm">
              <h3 className="font-bold text-aimly-text mb-4">Participantes ({readiness.length})</h3>
              {readiness.length === 0 ? (
                <p className="text-sm text-aimly-text/50 italic">Sin lista de participantes disponible.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {readiness.map((p: any) => (
                    <div key={p.user_id} className="flex items-center gap-3">
                      <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`} alt={p.profiles?.name || 'Participante'} size="md" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-aimly-text">{p.profiles?.name || 'Invitado'}</span>
                        <span className="text-xs text-aimly-text/60">{p.role === 'host' ? 'Organizador' : 'Participante'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
