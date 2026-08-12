import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar as CalIcon,
  Clock,
  Target,
  ChevronRight,
  CheckCircle2,
  Search,
  RefreshCw,
  Sparkles,
  Plus,
  AlertCircle
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, Badge } from '../components/ui';
import { MeetingActionsMenu } from '../components/meetings/MeetingActionsMenu';
import { EditMeetingModal } from '../components/meetings/EditMeetingModal';
import { DeleteMeetingModal } from '../components/meetings/DeleteMeetingModal';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type FilterTab = 'all' | 'draft' | 'active' | 'closed';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'draft', label: 'En espera' },
  { key: 'active', label: 'Activas' },
  { key: 'closed', label: 'Finalizadas' }
];

function statusToBadge(status: string) {
  if (status === 'draft') return <Badge variant="warning" className="animate-pulse">En espera</Badge>;
  if (status === 'active') return <Badge variant="primary">Activa</Badge>;
  return <Badge variant="success">Finalizada</Badge>;
}

function statusToRoute(meeting: any): string {
  if (meeting.status === 'draft') return `/meeting/${meeting.id}/lobby`;
  if (meeting.status === 'active') return `/meeting/${meeting.id}`;
  return `/meeting/${meeting.id}/result`;
}

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>(() => {
    // Leer ?status=active,draft del URL y mapear al primer estado reconocido
    const statusParam = searchParams.get('status') || '';
    if (statusParam.includes('draft') || statusParam.includes('active')) return 'draft';
    return 'all';
  });

  const [editingMeeting, setEditingMeeting] = useState<any | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.meetings.list();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las reuniones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMeetings();
  }, [user, fetchMeetings]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/" replace />;

  // Filtrar por tab
  const byTab = meetings.filter(m => {
    if (activeTab === 'all') return true;
    return m.status === activeTab;
  });

  // Filtrar por búsqueda (título y objetivo)
  const searchLower = search.toLowerCase().trim();
  const filtered = searchLower
    ? byTab.filter(
        m =>
          (m.title || '').toLowerCase().includes(searchLower) ||
          (m.objective || '').toLowerCase().includes(searchLower)
      )
    : byTab;

  function handleMeetingUpdated(updated: any) {
    setMeetings(prev => prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m)));
    setEditingMeeting(null);
  }

  function handleMeetingDeleted(meetingId: string) {
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
    setDeletingMeeting(null);
  }

  // Contar por tab para badges
  const counts: Record<FilterTab, number> = {
    all: meetings.length,
    draft: meetings.filter(m => m.status === 'draft').length,
    active: meetings.filter(m => m.status === 'active').length,
    closed: meetings.filter(m => m.status === 'closed').length
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-newsreader text-3xl font-bold text-aimly-text flex items-center gap-2">
              <CalIcon size={28} className="text-aimly-orange" />
              Mis Reuniones
            </h1>
            <p className="text-aimly-text/60 text-sm mt-1">
              {meetings.length} reunión{meetings.length !== 1 ? 'es' : ''} en total
            </p>
          </div>
          <button
            id="meetings-new-btn"
            onClick={() => navigate('/meetings/new')}
            className="btn-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-aimly-orange/20 max-w-max"
          >
            <Plus size={16} />
            Nueva reunión
          </button>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Buscador */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-aimly-text/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="meetings-search"
              type="search"
              placeholder="Buscar por título u objetivo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-aimly-border rounded-xl pl-9 pr-3 py-2 text-sm text-aimly-text placeholder:text-aimly-text/40 focus:outline-none focus:border-aimly-orange focus:ring-2 focus:ring-aimly-orange/20 transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-aimly-bg border border-aimly-border rounded-xl p-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                id={`meetings-tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-aimly-orange/30 ${
                  activeTab === tab.key
                    ? 'bg-white text-aimly-text shadow-sm'
                    : 'text-aimly-text/60 hover:text-aimly-text'
                }`}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-aimly-orange/10 text-aimly-orange' : 'bg-aimly-border text-aimly-text/60'
                  }`}>
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-aimly-text/50">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-aimly-orange" />
              <span className="text-sm">Cargando reuniones…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-aimly-text mb-1">No se pudieron cargar las reuniones</p>
              <p className="text-sm text-aimly-text/60">{error}</p>
            </div>
            <button
              id="meetings-retry-btn"
              onClick={fetchMeetings}
              className="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-aimly-border border-dashed">
            {searchLower ? (
              <>
                <Search size={36} className="mx-auto text-aimly-text/20 mb-3" />
                <p className="font-semibold text-aimly-text mb-1">Sin resultados</p>
                <p className="text-sm text-aimly-text/60">
                  No hay reuniones que coincidan con "<span className="font-medium">{search}</span>"
                </p>
              </>
            ) : activeTab === 'all' ? (
              <>
                <Sparkles size={36} className="mx-auto text-aimly-orange/40 mb-3" />
                <p className="font-semibold text-aimly-text mb-1">Aún no tienes reuniones</p>
                <p className="text-sm text-aimly-text/60 mb-4">Crea tu primera reunión para empezar</p>
                <button
                  onClick={() => navigate('/meetings/new')}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Crear reunión
                </button>
              </>
            ) : (
              <>
                <CalIcon size={36} className="mx-auto text-aimly-text/20 mb-3" />
                <p className="font-semibold text-aimly-text mb-1">
                  No hay reuniones {TABS.find(t => t.key === activeTab)?.label.toLowerCase()}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(meeting => {
              const isHost = meeting.host_id === user.id;
              return (
                <Card
                  key={meeting.id}
                  onClick={() => navigate(statusToRoute(meeting))}
                  className="p-5 hover:border-aimly-orange/40 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full bg-white relative overflow-hidden"
                >
                  {/* Barra de estado */}
                  {meeting.status === 'draft' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-aimly-orange" />
                  )}
                  {meeting.status === 'active' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-400" />
                  )}

                  <div className="flex justify-between items-start mb-3">
                    {statusToBadge(meeting.status)}
                    {/* Menú contextual — stopPropagation interno */}
                    <MeetingActionsMenu
                      meeting={meeting}
                      isHost={isHost}
                      handlers={{
                        onEdit: () => setEditingMeeting(meeting),
                        onDelete: () => setDeletingMeeting(meeting)
                      }}
                    />
                  </div>

                  <h3 className="font-bold text-aimly-text text-base mb-2 group-hover:text-aimly-orange transition-colors leading-tight line-clamp-2">
                    {meeting.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-aimly-text/60 mb-4 font-medium">
                    <Clock size={13} />
                    <span>{meeting.duration_minutes} min</span>
                    {meeting.created_at && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-aimly-border" />
                        <span>{new Date(meeting.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-aimly-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-aimly-text/60 min-w-0">
                      <Target size={12} className="text-aimly-text/40 shrink-0" />
                      <span className="truncate max-w-[140px]">{meeting.objective}</span>
                    </div>
                    {meeting.status === 'closed' ? (
                      <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-aimly-orange shrink-0" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          onSave={handleMeetingUpdated}
          onClose={() => setEditingMeeting(null)}
        />
      )}
      {deletingMeeting && (
        <DeleteMeetingModal
          meeting={deletingMeeting}
          onDeleted={() => handleMeetingDeleted(deletingMeeting.id)}
          onClose={() => setDeletingMeeting(null)}
        />
      )}
    </AppLayout>
  );
}
