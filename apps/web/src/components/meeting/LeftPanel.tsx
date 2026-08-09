import React, { useState, useRef, useEffect } from 'react';
import { Target, Star, ChevronDown, Smile, Send } from 'lucide-react';
import { Card, Avatar } from '../ui';
import { useMeeting } from '../../contexts/MeetingContext';
import { useAuth } from '../../contexts/AuthContext';

export function LeftPanel() {
  const { meeting, messages, participants, sendMessage } = useMeeting();
  const { user } = useAuth();
  
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    await sendMessage(chatInput);
    setChatInput('');
  };

  return (
    <div className="w-[280px] shrink-0 h-full flex flex-col border-r border-aimly-border bg-aimly-surface overflow-hidden">
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
        
        {/* Objective & Outcome */}
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="text-sm font-bold text-aimly-text flex items-center gap-2 mb-2">
              <Target size={16} className="text-aimly-orange" /> Objetivo de la reunión
            </h4>
            <p className="text-xs text-aimly-text/80 leading-relaxed bg-aimly-bg p-3 rounded-lg border border-aimly-border">
              {meeting?.objective}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-aimly-text flex items-center gap-2 mb-2">
              <Star size={16} className="text-aimly-butter text-amber-500 fill-amber-500" /> Resultado esperado
            </h4>
            <p className="text-xs text-aimly-text/80 leading-relaxed bg-aimly-bg p-3 rounded-lg border border-aimly-border">
              {meeting?.expected_outcome}
            </p>
          </div>
        </div>

        <div className="h-px bg-aimly-border"></div>

        {/* Participants – real-time presence */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-aimly-text">
              Participantes
              <span className="ml-2 text-xs font-normal text-aimly-text/50">
                ({participants.length} en línea)
              </span>
            </h4>
            <ChevronDown size={16} className="text-aimly-text/50" />
          </div>
          <div className="flex flex-col gap-3">
            {participants.length === 0 ? (
              // Fallback: show yourself while presence syncs
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Me" size="sm" />
                  <span className="text-sm text-aimly-text font-medium">Tú</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            ) : (
              participants.map((p) => {
                const isMe = p.userId === user?.id;
                return (
                  <div key={p.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={p.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`}
                        alt={p.name}
                        size="sm"
                      />
                      <span className="text-sm text-aimly-text font-medium">
                        {isMe ? `${p.name} (Tú)` : p.name}
                      </span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Chat Section */}
      <div className="h-[40%] min-h-[300px] border-t border-aimly-border flex flex-col bg-aimly-bg">
        <div className="px-4 py-3 flex items-center justify-between border-b border-aimly-border/50 bg-aimly-surface cursor-pointer">
          <h4 className="text-sm font-bold text-aimly-text">Chat</h4>
          <ChevronDown size={16} className="text-aimly-text/50" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
          {messages.map((m: any) => {
            const currentUserId = user?.id;
            const isMe = Boolean(
              currentUserId && 
              m.author_id && 
              (m.author_id === currentUserId || m.author_id.includes(currentUserId) || currentUserId.includes(m.author_id))
            );
            const authorName = m.profiles?.name || (isMe ? 'Tú' : 'Usuario');
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-aimly-text/50 font-medium mb-0.5 px-1">{isMe ? 'Tú' : authorName}</span>
                <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[90%] shadow-sm ${
                  isMe 
                    ? 'bg-aimly-orange text-white rounded-tr-sm' 
                    : 'bg-white border border-aimly-border text-aimly-text rounded-tl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-aimly-surface border-t border-aimly-border">
          <form onSubmit={handleSendMessage} className="flex items-center bg-white border border-aimly-border rounded-lg p-1 pr-2 shadow-sm focus-within:border-aimly-orange focus-within:ring-1 focus-within:ring-aimly-orange transition-all">
            <button type="button" className="p-1.5 text-aimly-text/40 hover:text-aimly-text transition-colors">
              <Smile size={18} />
            </button>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Escribe un mensaje..." 
              className="flex-1 bg-transparent border-none text-xs text-aimly-text px-2 py-1.5 focus:outline-none"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim()}
              className="p-1.5 text-aimly-orange disabled:text-aimly-text/30 hover:bg-aimly-orange/10 rounded-md transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
