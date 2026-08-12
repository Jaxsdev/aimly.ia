import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, Badge, Avatar, Input } from '../components/ui';
import { CheckSquare, Square, Search, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const meetingFilter = searchParams.get('meetingId') || 'all';
  const statusFilterParam = searchParams.get('status') || 'all';

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>(
    statusFilterParam as any
  );
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.tasks.listAll();
      setTasks(data || []);
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message || 'No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleStatus = async (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setUpdatingTaskId(task.id);
    try {
      const updated = await api.tasks.updateStatus(task.id, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: updated.status } : t))
      );
    } catch (err: any) {
      alert(`No se pudo actualizar la tarea: ${err.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Get list of unique meetings for dropdown filter
  const meetingsList = Array.from(
    new Map<string, string>(
      tasks
        .filter((t) => Boolean(t.meetings?.id && t.meetings?.title))
        .map((t) => [t.meetings.id, t.meetings.title] as [string, string])
    ).entries()
  );

  // Filtering
  const filteredTasks = tasks.filter((task) => {
    // Meeting filter
    if (meetingFilter !== 'all' && task.meeting_id !== meetingFilter) {
      return false;
    }
    // Status filter
    if (statusFilter === 'todo' && task.status === 'done') {
      return false;
    }
    if (statusFilter === 'done' && task.status !== 'done') {
      return false;
    }
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = task.title?.toLowerCase().includes(q);
      const descMatch = task.description?.toLowerCase().includes(q);
      const meetingMatch = task.meetings?.title?.toLowerCase().includes(q);
      const assigneeMatch = task.profiles?.name?.toLowerCase().includes(q);
      return titleMatch || descMatch || meetingMatch || assigneeMatch;
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
              Centro de Tareas
            </h1>
            <p className="text-aimly-text/60 text-sm mt-1">
              Gestiona los compromisos y accionables derivados de tus reuniones
            </p>
          </div>
          <button
            onClick={fetchTasks}
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
              placeholder="Buscar por tarea, responsable o reunión..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex bg-aimly-surface border border-aimly-border rounded-lg p-1 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-aimly-orange text-white'
                  : 'text-aimly-text/70 hover:text-aimly-text'
              }`}
            >
              Todas ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter('todo')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'todo'
                  ? 'bg-aimly-orange text-white'
                  : 'text-aimly-text/70 hover:text-aimly-text'
              }`}
            >
              Pendientes ({tasks.filter((t) => t.status !== 'done').length})
            </button>
            <button
              onClick={() => setStatusFilter('done')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'done'
                  ? 'bg-aimly-orange text-white'
                  : 'text-aimly-text/70 hover:text-aimly-text'
              }`}
            >
              Completadas ({tasks.filter((t) => t.status === 'done').length})
            </button>
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
            <p className="text-sm text-aimly-text/60">Cargando tareas...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center border-red-200 bg-red-50/50">
            <p className="text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={fetchTasks}
              className="btn-secondary py-2 px-4 text-xs rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw size={14} /> Reintentar
            </button>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-aimly-orange/10 text-aimly-orange flex items-center justify-center">
              <CheckSquare size={24} />
            </div>
            <h3 className="font-bold text-aimly-text text-lg">No hay tareas</h3>
            <p className="text-sm text-aimly-text/60 max-w-md">
              {searchQuery || statusFilter !== 'all' || meetingFilter !== 'all'
                ? 'No se encontraron tareas con los filtros aplicados.'
                : 'Aún no se han asignado tareas en tus reuniones.'}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTasks.map((task) => {
              const isDone = task.status === 'done';
              const isUpdating = updatingTaskId === task.id;

              return (
                <Card
                  key={task.id}
                  className={`p-4 transition-all hover:shadow-md ${
                    isDone ? 'opacity-75 bg-aimly-bg/30' : 'bg-aimly-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox button */}
                      <button
                        onClick={() => handleToggleStatus(task)}
                        disabled={isUpdating}
                        className={`mt-0.5 shrink-0 transition-colors ${
                          isDone ? 'text-emerald-600' : 'text-aimly-text/40 hover:text-aimly-orange'
                        }`}
                        title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
                      >
                        {isUpdating ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-aimly-orange"></div>
                        ) : isDone ? (
                          <CheckSquare size={20} />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>

                      <div className="flex flex-col gap-1 flex-1">
                        <span
                          className={`font-semibold text-aimly-text leading-snug ${
                            isDone ? 'line-through text-aimly-text/60' : ''
                          }`}
                        >
                          {task.title}
                        </span>

                        {task.description && (
                          <p className="text-xs text-aimly-text/70">{task.description}</p>
                        )}

                        {/* Meeting tag */}
                        {task.meetings && (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => navigate(`/meeting/${task.meetings.id}/result`)}
                              className="inline-flex items-center gap-1 text-xs text-aimly-orange hover:underline font-medium"
                            >
                              <Calendar size={12} />
                              {task.meetings.title}
                              <ArrowRight size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side info (Assignee + Status badge) */}
                    <div className="flex items-center gap-3 shrink-0">
                      {task.profiles ? (
                        <div className="flex items-center gap-2 bg-aimly-bg px-2.5 py-1 rounded-lg border border-aimly-border">
                          <Avatar
                            src={task.profiles.avatar_url}
                            alt={task.profiles.name || 'Asignado'}
                            size="sm"
                          />
                          <span className="text-xs font-semibold text-aimly-text">
                            {task.profiles.name || 'Sin nombre'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-aimly-text/40 italic">Sin asignar</span>
                      )}

                      <Badge variant={isDone ? 'success' : 'warning'}>
                        {isDone ? 'Completada' : 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
