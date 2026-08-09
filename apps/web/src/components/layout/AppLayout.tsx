import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, LayoutTemplate, CheckSquare, Layers, Puzzle, Settings, Bell, ChevronDown } from 'lucide-react';
import { Avatar } from '../ui';
import { demoUser } from '../../mocks';

export function AppSidebar() {
  const location = useLocation();
  const navItems = [
    { icon: <Home size={18} />, label: 'Inicio', path: '/home' },
    { icon: <Calendar size={18} />, label: 'Mis reuniones', path: '/meetings' },
    { icon: <LayoutTemplate size={18} />, label: 'Plantillas', path: '/templates' },
    { icon: <CheckSquare size={18} />, label: 'Tareas', path: '/tasks' },
    { icon: <Layers size={18} />, label: 'Decisiones', path: '/decisions' },
    { icon: <Puzzle size={18} />, label: 'Integraciones', path: '/integrations' },
    { icon: <Settings size={18} />, label: 'Ajustes', path: '/settings' },
  ];

  return (
    <div className="w-[240px] lg:w-[280px] h-screen fixed left-0 top-0 bg-aimly-bg border-r border-aimly-border flex flex-col pt-6 pb-6 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-10">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L12 22M2 12L22 12M4.9 4.9L19.1 19.1M4.9 19.1L19.1 4.9" stroke="#E8683A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-newsreader font-bold text-2xl text-aimly-text">AimLy</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item, idx) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link 
              key={idx} 
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-[0.95rem] ${
                isActive 
                  ? 'bg-aimly-peach/20 text-aimly-orange' 
                  : 'text-aimly-text/80 hover:bg-black/5 hover:text-aimly-text'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Plan Pro Ad */}
      <div className="bg-aimly-surface border border-aimly-border rounded-xl p-4 mb-4 shadow-sm text-center">
        <div className="text-aimly-butter mb-1">👑</div>
        <h4 className="font-bold text-sm text-aimly-text mb-1">Plan Pro</h4>
        <p className="text-xs text-aimly-text/70 mb-3">Desbloquea más IA, almacenamiento ilimitado y funciones avanzadas.</p>
        <button className="text-aimly-orange bg-aimly-orange/10 hover:bg-aimly-orange/20 w-full py-1.5 rounded-md text-sm font-semibold transition-colors">
          Actualizar plan
        </button>
      </div>

      {/* User Profile */}
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-colors mt-auto">
        <div className="flex items-center gap-2">
          <Avatar src={demoUser.avatarUrl} alt={demoUser.name} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-aimly-text leading-tight">{demoUser.name}</span>
            <span className="text-xs text-aimly-text/60 leading-tight">{demoUser.email}</span>
          </div>
        </div>
        <ChevronDown size={16} className="text-aimly-text/50" />
      </div>
    </div>
  );
}

export function DashboardHeader() {
  return (
    <header className="h-[72px] flex items-center justify-between px-8 bg-aimly-bg">
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-aimly-text/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Buscar reuniones, decisiones o tareas..." 
            className="w-full bg-aimly-surface border border-aimly-border rounded-full pl-9 pr-4 py-2 text-sm text-aimly-text focus:outline-none focus:border-aimly-orange transition-colors"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative text-aimly-text/70 hover:text-aimly-text transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-aimly-orange rounded-full border-2 border-aimly-bg"></span>
        </button>
        <Avatar src={demoUser.avatarUrl} alt={demoUser.name} size="md" />
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-aimly-bg flex">
      <AppSidebar />
      <div className="flex-1 ml-[240px] lg:ml-[280px] flex flex-col min-h-screen">
        <DashboardHeader />
        <main className="flex-1 px-8 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
