import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Sparkles, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('admin@aimly.ia');
  const [password, setPassword] = useState('password123');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signInWithPassword(email, password);
      navigate('/home');
    } catch (error) {
      console.error('Login failed', error);
      alert('Error al iniciar sesión: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#FDF6F0] overflow-hidden grid grid-cols-[1fr_auto] relative">

      {/* Decorative center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-b from-[#FADDBF]/50 to-transparent rounded-full blur-3xl opacity-70"></div>
      </div>

      {/* ── LEFT PANEL ── */}
      <div className="flex flex-col justify-center pl-16 pr-8 py-10 z-10 relative">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L12 22M2 12L22 12M4.9 4.9L19.1 19.1M4.9 19.1L19.1 4.9" stroke="#E8683A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-newsreader font-bold text-3xl text-[#2B2827]">AimLy</span>
        </div>

        {/* Hero */}
        <h1 className="font-newsreader text-5xl xl:text-6xl leading-[1.05] tracking-tight text-[#2B2827] mb-4">
          Reuniones que<br />terminan en<br />
          <span className="text-[#E8683A]">decisiones.</span>
        </h1>

        <p className="text-[#595552] text-sm xl:text-base leading-relaxed mb-8 max-w-sm">
          AimLy es tu copiloto de reuniones con IA. Organiza ideas,
          alinea a tu equipo y transforma conversaciones en resultados claros.
        </p>

        {/* Benefits */}
        <div className="flex flex-col gap-2.5 max-w-sm">
          {[
            { icon: <Target size={18} className="text-[#E8683A]" />, title: 'Objetivo claro', desc: 'Cada reunión empieza con un propósito.' },
            { icon: <Sparkles size={18} className="text-[#E8683A]" />, title: 'IA que te guía', desc: 'Detecta bloqueos y propone el siguiente paso.' },
            { icon: <Users size={18} className="text-[#F5A883]" />, title: 'Colaboración en tiempo real', desc: 'Chat, pizarra y votos sincronizados.' },
            { icon: <CheckCircle2 size={18} className="text-[#7BAF94]" />, title: 'Decisiones y tareas', desc: 'Convierte acuerdos en tareas con responsables.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 flex gap-3 items-center border border-white/80 shadow-sm">
              <div className="shrink-0">{icon}</div>
              <div>
                <h4 className="font-semibold text-[#2B2827] text-xs">{title}</h4>
                <p className="text-[11px] text-[#7A7571] leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL – Login card ── */}
      <div className="w-[420px] xl:w-[460px] flex flex-col justify-center pr-10 pl-4 py-10 z-10 relative">

        {/* Top badge */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-[#EBE6E0] self-end mb-6">
          <Sparkles size={13} className="text-[#E8683A]" />
          <span className="text-xs font-medium text-[#2B2827]">Reuniones más inteligentes con IA</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.07)]">

          <div className="text-center mb-5">
            <Sparkles size={20} className="text-[#F5A883] mx-auto mb-2" />
            <h2 className="font-newsreader text-2xl font-bold text-[#2B2827] mb-1">¡Bienvenido a AimLy!</h2>
            <p className="text-[#7A7571] text-xs">Inicia sesión para continuar</p>
          </div>

          {/* Social login */}
          <div className="flex flex-col gap-2 mb-5">
            {[
              { src: 'https://www.svgrepo.com/show/475656/google-color.svg', label: 'Continuar con Google' },
              { src: 'https://www.svgrepo.com/show/512317/github-142.svg', label: 'Continuar con GitHub' },
              { src: 'https://www.svgrepo.com/show/452234/microsoft.svg', label: 'Continuar con Microsoft' },
            ].map(({ src, label }) => (
              <button key={label} type="button" onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2.5 bg-white border border-[#EBE6E0] py-2.5 px-4 rounded-xl text-sm font-medium text-[#2B2827] hover:bg-neutral-50 transition-colors shadow-sm">
                <img src={src} className="w-4 h-4" alt="" />
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#EBE6E0]"></div>
            <span className="text-[10px] text-[#A8A19B] font-bold uppercase tracking-wider">o con email</span>
            <div className="flex-1 h-px bg-[#EBE6E0]"></div>
          </div>

          {/* Email form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#595552] mb-1.5">Correo electrónico</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A19B]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <input type="email" placeholder="tu@ejemplo.com"
                  className="w-full border border-[#EBE6E0] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#2B2827] placeholder:text-[#A8A19B] focus:outline-none focus:ring-2 focus:ring-[#E8683A]/30 focus:border-[#E8683A] transition-all"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-[#595552]">Contraseña</label>
                <a href="#" className="text-[10px] text-[#F28B66] hover:text-[#E8683A] transition-colors">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A19B]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input type="password" placeholder="••••••••"
                  className="w-full border border-[#EBE6E0] rounded-xl py-2.5 pl-9 pr-9 text-sm text-[#2B2827] placeholder:text-[#A8A19B] focus:outline-none focus:ring-2 focus:ring-[#E8683A]/30 focus:border-[#E8683A] transition-all"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-[#FA8E62] to-[#F16A3C] text-white py-3 rounded-xl font-bold text-sm shadow-[0_6px_16px_rgba(241,106,60,0.3)] hover:opacity-90 transition-all flex justify-center items-center gap-2 disabled:opacity-60 mt-1">
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              {!loading && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
            </button>

            <div className="flex justify-between items-center pt-1 pb-3 border-b border-[#EBE6E0]">
              <label className="flex items-center gap-2 text-[11px] text-[#7A7571] cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#EBE6E0]" />
                Recordarme
              </label>
              <a href="#" className="text-[11px] font-bold text-[#E8683A] hover:opacity-80 transition-opacity">Crear cuenta</a>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#A8A19B] pt-0.5">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Tus datos están seguros con cifrado de extremo a extremo.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
