import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, Badge } from '../components/ui';
import { Sparkles, Calendar as CalIcon, Clock, MoreHorizontal, Target, CheckCircle2, ChevronRight, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function fetchMeetings() {
      try {
        const data = await api.meetings.list();
        setMeetings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching meetings:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMeetings();
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/" replace />;

  const inProgressMeetings = meetings.filter(m => m.status === 'in_progress' || m.status === 'draft');
  const completedMeetings = meetings.filter(m => m.status === 'closed');
          
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Top Section - Hero & Suggestion */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Hero */}
          <Card className="lg:col-span-2 p-8 bg-gradient-to-br from-[#FFFDF9] to-[#FDF9F1] border-aimly-border relative overflow-hidden flex flex-col justify-center min-h-[240px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-aimly-orange/5 rounded-full -translate-y-1/4 translate-x-1/4 blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <Badge variant="default" className="mb-4">👋 ¡Hola de nuevo!</Badge>
              <h1 className="font-newsreader text-4xl lg:text-5xl font-bold text-aimly-text mb-4 leading-tight">
                Listo para una <span className="text-aimly-orange italic">gran reunión</span> hoy?
              </h1>
              <p className="text-aimly-text/70 mb-8 max-w-md text-sm leading-relaxed">
                AimLy está preparado para ayudarte a facilitar, tomar notas y asegurar que el equipo llegue a decisiones claras.
              </p>
              
              <button onClick={() => navigate('/meetings/new')} className="btn-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-aimly-orange/20 max-w-max">
                <Sparkles size={18} /> Nueva reunión
              </button>
            </div>
          </Card>

          {/* AimLy Suggestion */}
          <Card className="p-6 flex flex-col justify-between bg-aimly-surface relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-aimly-text flex items-center gap-2">
                  <Sparkles size={16} className="text-aimly-orange" />
                  AimLy te sugiere
                </h3>
              </div>
              <div className="bg-aimly-bg p-4 rounded-xl border border-aimly-border mb-6">
                <p className="text-sm text-aimly-text/80 leading-relaxed font-medium">
                  "Tienes {inProgressMeetings.length} reuniones en curso que podrías terminar hoy."
                </p>
                <p className="text-sm text-aimly-text/60 mt-2">¿Quieres revisarlas?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary py-2 px-4 rounded-lg text-sm flex-1">Revisar ahora</button>
              <button className="btn-secondary py-2 px-4 rounded-lg text-sm flex-1">Más tarde</button>
            </div>
          </Card>
        </div>

        {/* Meetings Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-newsreader text-2xl font-bold text-aimly-text flex items-center gap-2">
              <CalIcon size={24} className="text-aimly-orange" /> Tus Reuniones
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aimly-orange"></div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-aimly-border border-dashed">
              <p className="text-aimly-text/60 mb-4">Aún no tienes reuniones creadas.</p>
              <button onClick={() => navigate('/meetings/new')} className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">
                Crear tu primera reunión
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {inProgressMeetings.map(meeting => (
                <Card key={meeting.id} onClick={() => navigate(meeting.status === 'draft' ? `/meeting/${meeting.id}/lobby` : `/meeting/${meeting.id}`)} className="p-5 hover:border-aimly-orange/40 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full bg-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-aimly-orange"></div>
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="warning" className="animate-pulse">{meeting.status === 'draft' ? 'En espera' : 'En curso'}</Badge>
                    <button className="text-aimly-text/40 hover:text-aimly-text"><MoreHorizontal size={18} /></button>
                  </div>
                  <h3 className="font-bold text-aimly-text text-lg mb-2 group-hover:text-aimly-orange transition-colors leading-tight">
                    {meeting.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-aimly-text/60 mb-6 font-medium">
                    <Clock size={14} /> <span>{meeting.duration_minutes} min</span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-aimly-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-aimly-text/60">
                      <Target size={14} className="text-aimly-text/40" />
                      <span className="truncate max-w-[120px]">{meeting.objective}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-aimly-orange/10 flex items-center justify-center text-aimly-orange">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </Card>
              ))}

              {completedMeetings.map(meeting => (
                <Card key={meeting.id} onClick={() => navigate(`/meeting/${meeting.id}/result`)} className="p-5 hover:border-aimly-text/20 transition-all cursor-pointer flex flex-col h-full bg-aimly-surface">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="success">Finalizada</Badge>
                    <button className="text-aimly-text/40 hover:text-aimly-text"><MoreHorizontal size={18} /></button>
                  </div>
                  <h3 className="font-bold text-aimly-text text-lg mb-2 leading-tight">
                    {meeting.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-aimly-text/60 mb-6 font-medium">
                    <Clock size={14} /> <span>{meeting.duration_minutes} min</span>
                    <span className="w-1 h-1 rounded-full bg-aimly-border"></span>
                    <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-aimly-border/50 flex items-center justify-between">
                     <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center z-10 border-2 border-white text-emerald-600">
                          <CheckCircle2 size={12} />
                        </div>
                     </div>
                     <span className="text-[10px] font-bold text-aimly-text/40 uppercase tracking-wider">Ver resultados</span>
                  </div>
                </Card>
              ))}

            </div>
          )}
        </div>

        {/* Bottom Progress Bar */}
        <Card className="p-0 overflow-hidden flex items-stretch bg-gradient-to-r from-[#FFFDF9] to-[#Fdf7eb]">
          <div className="flex-1 p-6 lg:px-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-0 justify-between relative z-10">
            <div className="w-full sm:w-auto mb-4 sm:mb-0">
              <h3 className="font-bold text-aimly-text text-lg">Transforma conversaciones en resultados</h3>
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-2 lg:gap-6 w-full max-w-2xl px-4 lg:px-8">
              <div className="flex flex-col items-center gap-2 flex-1 relative">
                <div className="w-10 h-10 rounded-full bg-aimly-orange/10 text-aimly-orange flex items-center justify-center relative z-10"><Target size={18}/></div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-aimly-text">Define el objetivo</span>
                  <span className="hidden lg:block text-[10px] text-aimly-text/60">Alinea a tu equipo</span>
                </div>
                <div className="hidden sm:block absolute top-5 left-1/2 w-full h-[2px] bg-aimly-border -z-0"></div>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 relative">
                <div className="w-10 h-10 rounded-full bg-aimly-sage/20 text-aimly-sage flex items-center justify-center relative z-10"><Users size={18}/></div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-aimly-text">Colabora real</span>
                  <span className="hidden lg:block text-[10px] text-aimly-text/60">Chat, pizarra y votos</span>
                </div>
                <div className="hidden sm:block absolute top-5 left-1/2 w-full h-[2px] bg-aimly-border -z-0"></div>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 relative">
                <div className="w-10 h-10 rounded-full bg-aimly-butter/40 text-amber-700 flex items-center justify-center relative z-10"><CheckCircle2 size={18}/></div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-aimly-text">Toma decisiones</span>
                  <span className="hidden lg:block text-[10px] text-aimly-text/60">Confirma y avanza</span>
                </div>
                <div className="hidden sm:block absolute top-5 left-1/2 w-full h-[2px] bg-aimly-border -z-0"></div>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 relative">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center relative z-10"><Sparkles size={18}/></div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-aimly-text">Obtén resultados</span>
                  <span className="hidden lg:block text-[10px] text-aimly-text/60">Tareas y próximos pasos</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mascot peek */}
          <div className="hidden md:flex items-end pr-8">
            <div className="w-24 h-24 bg-aimly-surface border-4 border-aimly-bg rounded-t-[40px] shadow-sm flex items-center justify-center -mb-2">
              <span className="text-3xl">🦔</span>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
