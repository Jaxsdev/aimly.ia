import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Check, Send, AlertCircle, BarChart3, Lock, MessageSquare, PlusCircle, ListTodo, UserRound } from 'lucide-react';
import { Card, Badge } from '../ui';
import { AimLyState, demoVote, demoDecision, demoTasks } from '../../mocks';
import { useMeeting } from '../../contexts/MeetingContext';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export function AimLyPanel() {
  const { meeting, createCard, messages, sendMessage } = useMeeting();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Sala' | 'Copiloto' | 'Sugerencias' | 'Decisiones' | 'Tareas'>('Sala');
  const [state, setState] = useState<AimLyState>('idle');
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState<string>('');
  
  // ── Private Chat State (Per user 1-on-1 discussion) ──
  const [privateMessages, setPrivateMessages] = useState<PrivateChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: '¡Hola! Soy tu Copiloto Privado. Puedes discutir tus ideas conmigo antes de presentarlas al grupo o pedirme ayuda para redactar propuestas.',
      createdAt: new Date().toISOString()
    }
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isPreparingTasks, setIsPreparingTasks] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'Copiloto' || activeTab === 'Sala') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [privateMessages, messages, activeTab]);

  useEffect(() => {
    if (activeTab !== 'Tareas' || !meeting?.id) return;
    api.tasks.list(meeting.id).then(setTasks).catch((error) => console.warn('[AimLy] No se pudieron cargar las tareas.', error));
  }, [activeTab, meeting?.id]);

  const handleSendRoomMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = input.trim();
    if (!content) return;
    await sendMessage(content);
    setInput('');
  };

  const handleGroupIntervention = async () => {
    if (!meeting?.id || isSendingChat) return;
    setIsSendingChat(true);
    try {
      const response = await api.aimly.facilitateGroup(meeting.id);
      await sendMessage(`🤖 AimLy: ${response.text}`);
    } catch (error) {
      console.error('[AimLy] No se pudo generar la intervención grupal.', error);
      alert('AimLy no pudo intervenir en este momento. Inténtalo nuevamente.');
    } finally { setIsSendingChat(false); }
  };

  const handleGenerateTasks = async () => {
    if (!meeting?.id || isPreparingTasks) return;
    setIsPreparingTasks(true);
    try {
      const suggestions = await api.aimly.suggestTasks(meeting.id);
      if (!suggestions.length) return;
      const created = await api.tasks.create(meeting.id, suggestions.map((task) => ({ title: task.title, description: task.description, assigneeId: task.suggestedAssigneeId })));
      setTasks((prev) => [...created, ...prev]);
    } catch (error) {
      console.error('[AimLy] No se pudieron generar tareas.', error);
      alert('AimLy no pudo generar tareas ahora mismo.');
    } finally { setIsPreparingTasks(false); }
  };

  const handleAskAimLy = async () => {
    if (!meeting?.id) return;
    setState('thinking');
    try {
      const savedScene = localStorage.getItem(`excalidraw_scene_${meeting.id}`);
      const excalidrawElements = savedScene ? JSON.parse(savedScene) : [];
      const response: any = await api.aimly.analyze(meeting.id, excalidrawElements);
      const suggestionText = response.summary || response.suggestedAction?.text || response.suggestedAction?.question || 'AimLy ha analizado el estado de la reunión.';
      setSuggestion(suggestionText);
      setState('suggesting');
      setActiveTab('Sugerencias');
    } catch (error) {
      console.error('Error in AimLy analyze:', error);
      alert('Hubo un problema al consultar a AimLy. Verifica que el servidor API esté respondiendo.');
      setState('idle');
    }
  };

  const handleSendPrivateMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const promptText = input.trim();
    if (!promptText || !meeting?.id || isSendingChat) return;

    const userMsg: PrivateChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      createdAt: new Date().toISOString()
    };

    setPrivateMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSendingChat(true);

    try {
      const savedScene = localStorage.getItem(`excalidraw_scene_${meeting.id}`);
      const excalidrawElements = savedScene ? JSON.parse(savedScene) : [];
      const history = privateMessages.map(m => ({ role: m.role, content: m.content }));
      const response: any = await api.aimly.chat(meeting.id, promptText, history, excalidrawElements);
      
      const assistantMsg: PrivateChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.text || 'Sin respuesta.',
        createdAt: new Date().toISOString()
      };
      setPrivateMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error in private copilot chat:', err);
      setPrivateMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'No pude procesar tu mensaje en este momento. Inténtalo de nuevo.',
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSendToBoard = async (text: string) => {
    try {
      await createCard({
        text,
        type: 'idea',
        x: Math.floor(Math.random() * 200) + 100,
        y: Math.floor(Math.random() * 150) + 100,
        color: 'orange'
      });
      alert('¡Idea enviada a la pizarra pública!');
    } catch (err) {
      console.error('Error sending card:', err);
    }
  };

  const handleStartVote = () => {
    setState('voting');
  };

  const handleCloseVote = () => {
    setState('decision_ready');
  };

  const handleConfirmDecision = () => {
    setState('tasks_ready');
    setActiveTab('Tareas');
  };

  return (
    <div className="w-[340px] shrink-0 h-full flex flex-col border-l border-aimly-border bg-aimly-surface overflow-hidden">
      
      {/* Header */}
      <div className="p-3.5 border-b border-aimly-border bg-gradient-to-b from-[#FFFDF9] to-aimly-bg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-aimly-border shadow-sm flex items-center justify-center relative shrink-0">
            <span className="text-xl">🦔</span>
            {(state === 'thinking' || isSendingChat) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-aimly-orange rounded-full animate-ping"></div>
            )}
          </div>
          <div>
            <h3 className="font-newsreader font-bold text-lg text-aimly-text flex items-center gap-1.5 leading-tight">
              <Sparkles size={15} className="text-aimly-orange" /> AimLy
            </h3>
            <p className="text-[11px] text-aimly-text/60 font-medium">IA Facilitadora & Copiloto</p>
          </div>
        </div>

        <button 
          onClick={handleAskAimLy}
          title="Analizar reunión con IA"
          className="btn-secondary py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-white hover:bg-black/5 border border-aimly-border shadow-sm"
        >
          <Sparkles size={12} className="text-aimly-orange" /> Analizar
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex px-1 pt-1.5 border-b border-aimly-border bg-aimly-bg">
        {(['Sala', 'Copiloto', 'Sugerencias', 'Decisiones', 'Tareas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 pb-2 text-[11px] font-bold transition-colors border-b-2 ${
              activeTab === tab 
                ? 'border-aimly-orange text-aimly-orange' 
                : 'border-transparent text-aimly-text/50 hover:text-aimly-text'
            }`}
          >
            {tab === 'Copiloto' ? '🔒 Copiloto' : tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar bg-aimly-bg flex flex-col gap-3">
        {activeTab === 'Sala' && (
          <div className="flex flex-1 flex-col gap-3">
            <div className="rounded-xl border border-aimly-orange/20 bg-aimly-orange/10 p-2 text-[11px] text-aimly-text"><div className="flex items-center gap-2"><Sparkles size={14} className="text-aimly-orange" /><span><strong>Conversación compartida.</strong> AimLy conoce este contexto y puede intervenir para facilitar.</span></div><button onClick={handleGroupIntervention} disabled={isSendingChat} className="mt-2 w-full rounded-lg bg-white px-2 py-1.5 text-[10px] font-bold text-aimly-orange shadow-sm disabled:opacity-50">{isSendingChat ? 'AimLy está pensando…' : 'Pedir intervención de AimLy'}</button></div>
            {messages.map((message: any) => {
              const isAimLy = message.content?.startsWith('🤖 AimLy:');
              const isMe = message.author_id === user?.id && !isAimLy;
              const author = message.profiles?.name || (isMe ? 'Tú' : 'Participante');
              return <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}><span className="mb-0.5 px-1 text-[9px] font-semibold text-aimly-text/55">{isAimLy ? '🤖 AimLy · Facilitadora' : isMe ? 'Tú' : author}</span><div className={`max-w-[92%] rounded-2xl p-2.5 text-xs leading-relaxed shadow-sm ${isAimLy ? 'border border-aimly-orange/30 bg-[#FFF7EF] text-aimly-text' : isMe ? 'rounded-tr-sm bg-aimly-orange text-white' : 'rounded-tl-sm border border-aimly-border bg-white text-aimly-text'}`}>{message.content}</div></div>;
            })}
            {messages.length === 0 && <div className="py-10 text-center text-xs text-aimly-text/50">Inicien la conversación. AimLy usará estos mensajes como contexto.</div>}
            <div ref={chatEndRef} />
          </div>
        )}
        
        {/* ── TAB 1: COPILOTO PRIVADO 1-ON-1 ── */}
        {activeTab === 'Copiloto' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="bg-aimly-orange/10 border border-aimly-orange/20 rounded-xl p-2.5 flex items-center gap-2 text-xs text-aimly-text">
              <Lock size={14} className="text-aimly-orange shrink-0" />
              <span className="leading-snug text-[11px]">
                <strong>Chat 1-a-1 Privado:</strong> Tus otros compañeros no ven esta conversación. Discute tus propuestas aquí.
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              {privateMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-aimly-text/50 font-semibold px-1 mb-0.5">
                    {msg.role === 'user' ? 'Tú (Privado)' : 'AimLy Copiloto 🦔'}
                  </span>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[95%] shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-aimly-orange text-white rounded-tr-sm font-medium'
                      : 'bg-white border border-aimly-border text-aimly-text rounded-tl-sm'
                  }`}>
                    <div className="markdown-content text-xs leading-relaxed font-normal whitespace-normal break-words overflow-x-auto [&_strong]:font-bold [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h1]:font-bold [&_h1]:text-sm [&_h2]:font-bold [&_h2]:text-xs [&_code]:bg-black/5 [&_code]:px-1 [&_code]:rounded [&_table]:w-full [&_table]:my-2 [&_table]:border-collapse [&_table]:text-[11px] [&_th]:bg-black/5 [&_th]:p-1.5 [&_th]:border [&_th]:border-aimly-border [&_th]:font-bold [&_th]:text-left [&_td]:p-1.5 [&_td]:border [&_td]:border-aimly-border [&_tr:nth-child(even)]:bg-black/[0.02]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Quick action button for AI suggestions: Send to Whiteboard */}
                    {msg.role === 'assistant' && msg.id !== 'init-1' && (
                      <button
                        onClick={() => handleSendToBoard(msg.content)}
                        className="mt-2 text-[10px] font-bold text-aimly-orange hover:underline flex items-center gap-1 pt-1 border-t border-black/5"
                      >
                        <PlusCircle size={12} /> Publicar esta respuesta en la Pizarra
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isSendingChat && (
                <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-aimly-border w-fit text-xs text-aimly-text/70 animate-pulse">
                  <span className="animate-spin">🦔</span> AimLy está escribiendo...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* ── TAB 2: SUGERENCIAS GENERALES ── */}
        {activeTab === 'Sugerencias' && (
          <>
            {state === 'idle' && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 animate-in fade-in py-8">
                <div className="w-14 h-14 rounded-full bg-aimly-surface border border-aimly-border shadow-sm flex items-center justify-center">
                  <Sparkles size={20} className="text-aimly-orange/60" />
                </div>
                <p className="text-xs text-aimly-text/70 leading-relaxed px-2">
                  AimLy analiza periódicamente el estado de la reunión para sugerir votaciones y organizar la pizarra.
                </p>
                <button onClick={handleAskAimLy} className="btn-primary py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-2 mt-1">
                  <Sparkles size={14} /> Analizar ahora con IA
                </button>
              </div>
            )}

            {state === 'thinking' && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 animate-in fade-in py-10">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-aimly-orange/20 border-t-aimly-orange animate-spin"></div>
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">🦔</span>
                </div>
                <p className="text-xs font-bold text-aimly-text animate-pulse">Analizando tarjetas y chat de la reunión...</p>
              </div>
            )}

            {state === 'suggesting' && (
              <div className="flex flex-col gap-3 animate-in fade-in">
                <Card className="p-3.5 bg-gradient-to-br from-[#FFFDF9] to-[#Fdf7eb] border-aimly-orange/20 shadow-sm">
                  <h4 className="text-xs font-bold text-aimly-text flex items-center gap-1.5 mb-2">
                    <Sparkles size={14} className="text-aimly-orange" /> Análisis de AimLy
                  </h4>
                  <div className="markdown-content text-xs text-aimly-text leading-relaxed mb-3 font-medium whitespace-normal break-words overflow-x-auto [&_strong]:font-bold [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_table]:my-2 [&_table]:border-collapse [&_table]:text-[11px] [&_th]:bg-black/5 [&_th]:p-1.5 [&_th]:border [&_th]:border-aimly-border [&_th]:font-bold [&_th]:text-left [&_td]:p-1.5 [&_td]:border [&_td]:border-aimly-border [&_tr:nth-child(even)]:bg-black/[0.02]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{suggestion}</ReactMarkdown>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2 border-t border-black/5">
                    <button onClick={handleStartVote} className="w-full btn-primary py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                      <BarChart3 size={14} /> Iniciar votación grupal
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {state === 'voting' && (
              <Card className="p-4 bg-white border-aimly-border">
                <h4 className="font-bold text-aimly-text text-xs mb-3 flex items-center gap-1.5">
                  <BarChart3 size={16} className="text-aimly-orange" /> Votación en curso
                </h4>
                <p className="text-xs text-aimly-text/80 font-medium mb-3">{demoVote.question}</p>
                <button onClick={handleCloseVote} className="w-full btn-secondary py-2 rounded-xl text-xs font-bold text-aimly-orange border-aimly-orange/30">
                  Cerrar votación
                </button>
              </Card>
            )}

            {state === 'decision_ready' && (
              <Card className="p-4 bg-gradient-to-br from-[#FFFDF9] to-[#Fdf7eb] border-aimly-orange/30 shadow-md">
                <h4 className="font-bold text-aimly-text text-xs mb-2">¿Confirmar como decisión?</h4>
                <p className="text-xs text-aimly-text/70 mb-4">Herramientas de productividad obtuvo el mayor consenso.</p>
                <button onClick={handleConfirmDecision} className="w-full btn-primary py-2.5 rounded-xl text-xs font-bold">
                  Confirmar decisión
                </button>
              </Card>
            )}
          </>
        )}

        {/* ── TAB 3: DECISIONES ── */}
        {activeTab === 'Decisiones' && (
          <div className="flex flex-col gap-3 animate-in fade-in">
            {state === 'tasks_ready' ? (
              <Card className="p-3.5 bg-white border-l-4 border-l-emerald-500 shadow-sm">
                <Badge variant="success" className="mb-2 text-[10px]">Confirmada</Badge>
                <h4 className="font-bold text-aimly-text text-xs">{demoDecision.text}</h4>
              </Card>
            ) : (
              <div className="text-center py-10 text-xs text-aimly-text/50">
                Aún no hay decisiones confirmadas en esta reunión.
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: TAREAS ── */}
        {activeTab === 'Tareas' && (
          <div className="flex flex-col gap-3 animate-in fade-in">
            <div className="rounded-xl border border-aimly-orange/20 bg-aimly-orange/10 p-2.5"><div className="flex items-center gap-2 text-[11px] text-aimly-text"><ListTodo size={14} className="text-aimly-orange" /><span><strong>Asignación asistida.</strong> AimLy analiza el chat, la pizarra y los participantes.</span></div><button onClick={handleGenerateTasks} disabled={isPreparingTasks} className="mt-2 w-full rounded-lg bg-aimly-orange py-2 text-[10px] font-bold text-white disabled:opacity-50">{isPreparingTasks ? 'Generando y asignando…' : 'Generar tareas con AimLy'}</button></div>
            {tasks.length ? tasks.map((task) => <Card key={task.id} className="p-3 bg-white"><h5 className="font-bold text-aimly-text text-xs">{task.title}</h5>{task.description && <p className="mt-1 text-[11px] leading-relaxed text-aimly-text/60">{task.description}</p>}<div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-aimly-orange"><UserRound size={12} /> {task.profiles?.name || 'Sin asignar'}</div></Card>) : <div className="py-8 text-center text-xs text-aimly-text/50">Aún no hay tareas. Pide a AimLy que las proponga y las asigne.</div>}
          </div>
        )}

      </div>

      {/* Bottom Input Field */}
      <div className="p-3 bg-aimly-surface border-t border-aimly-border flex flex-col gap-1.5">
        <form 
          onSubmit={(e) => {
            if (activeTab === 'Sala') {
              handleSendRoomMessage(e);
            } else if (activeTab === 'Copiloto') {
              handleSendPrivateMessage(e);
            } else {
              e.preventDefault();
              handleAskAimLy();
            }
          }} 
          className="flex items-center bg-white border border-aimly-border rounded-xl p-1 pr-2 shadow-sm focus-within:border-aimly-orange focus-within:ring-1 focus-within:ring-aimly-orange transition-all"
        >
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeTab === 'Sala' ? 'Escribe para el equipo y AimLy…' : activeTab === 'Copiloto' ? 'Mensaje privado para AimLy...' : 'Consulta general...'}
            className="flex-1 bg-transparent border-none text-xs text-aimly-text px-3 py-1.5 focus:outline-none placeholder:text-aimly-text/40"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isSendingChat}
            className="p-1.5 text-aimly-orange disabled:text-aimly-text/30 hover:bg-aimly-orange/10 rounded-lg transition-colors"
          >
            <Send size={15} />
          </button>
        </form>
        
        <div className="flex items-center gap-1 px-1 text-[9px] text-aimly-text/40 font-medium">
          <Lock size={9} />
          <span>{activeTab === 'Sala' ? 'Chat compartido: AimLy usa esta conversación como contexto' : activeTab === 'Copiloto' ? 'Conversación privada de copiloto 1-a-1' : 'AimLy facilita tu reunión'}</span>
        </div>
      </div>

    </div>
  );
}
