import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, Avatar, Input } from '../components/ui';
import { CheckCircle2, Search, RefreshCw, Calendar, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

export default function DecisionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const meetingFilter = searchParams.get('meetingId') || 'all';

  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.decisions.listAll();
      setDecisions(data || []);
    } catch (err: any) {
      console.error('Failed to fetch decisions:', err);
      setError(err.message || 'No se pudieron cargar las decisiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  // Unique list of meetings for dropdown filter
  const meetingsList = Array.from(
    new Map<string, string>(
      decisions
        .filter((d) => Boolean(d.meetings?.id && d.meetings?.title))
        .map((d) => [d.meetings.id, d.meetings.title] as [string, string])
    ).entries()
  );

  // Filtering
  const filteredDecisions = decisions.filter((decision) => {
    // Meeting filter
    if (meetingFilter !== 'all' && decision.meeting_id !== meetingFilter) {
      return false;
    }
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const textMatch = decision.text?.toLowerCase().includes(q);
      const meetingMatch = decision.meetings?.title?.toLowerCase().includes(q);
      const confirmedMatch = decision.profiles?.name?.toLowerCase().includes(q);
      return textMatch || meetingMatch || confirmedMatch;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6 pt-6 pb-12 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-aimly-border pb-6">
          <div>
            <h1 className="font-newsreader text-3xl font-bold text-aimly-text">
              Centro de Decisiones
            </h1>
            <p className="text-aimly-text/60 text-sm mt-1">
              Registro histórico de acuerdos y consensos alcanzados en tus reuniones
            </p>
          </div>
          <button
            onClick={fetchDecisions}
            disabled={loading}
            className="btn-secondary py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 self-start md:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-aimly-text/40"
            />
            <Input
              type="text"
              placeholder="Buscar por texto de decisión, reunión o autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Meeting dropdown filter */}
          {meetingsList.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={meetingFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    searchParams.delete('meetingId');
                  } else {
                    searchParams.set('meetingId', val);
                  }
                  setSearchParams(searchParams);
                }}
                className="bg-aimly-surface border border-aimly-border rounded-lg px-3 py-2 text-xs font-medium text-aimly-text focus:outline-none focus:border-aimly-orange h-full cursor-pointer"
              >
                <option value="all">Todas las reuniones</option>
                {meetingsList.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aimly-orange"></div>
            <p className="text-sm text-aimly-text/60">Cargando decisiones...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center border-red-200 bg-red-50/50">
            <p className="text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={fetchDecisions}
              className="btn-secondary py-2 px-4 text-xs rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw size={14} /> Reintentar
            </button>
          </Card>
        ) : filteredDecisions.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-bold text-aimly-text text-lg">No hay decisiones</h3>
            <p className="text-sm text-aimly-text/60 max-w-md">
              {searchQuery || meetingFilter !== 'all'
                ? 'No se encontraron decisiones con los filtros aplicados.'
                : 'Aún no se han acordado decisiones en tus reuniones.'}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredDecisions.map((decision) => (
              <Card
                key={decision.id}
                className="p-6 bg-gradient-to-br from-emerald-50/40 via-aimly-surface to-aimly-surface border-emerald-100/60 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={18} />
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-base text-aimly-text font-medium leading-relaxed">
                        {decision.text}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-aimly-text/60 pt-1">
                        {decision.meetings && (
                          <div className="flex items-center gap-1 font-medium text-aimly-text/80">
                            <Calendar size={13} />
                            <span>{decision.meetings.title}</span>
                          </div>
                        )}

                        <span>•</span>

                        <span>
                          {new Date(decision.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>

                        {decision.profiles && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                              <Avatar
                                src={decision.profiles.avatar_url}
                                alt={decision.profiles.name}
                                size="sm"
                              />
                              <span>Confirmado por {decision.profiles.name}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Link to meeting result */}
                  {decision.meetings?.id && (
                    <button
                      onClick={() => navigate(`/meeting/${decision.meetings.id}/result`)}
                      className="btn-secondary py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 self-start md:self-auto hover:border-aimly-orange hover:text-aimly-orange transition-colors"
                    >
                      <span>Ver resultado</span>
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
