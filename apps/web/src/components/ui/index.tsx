import React from 'react';

// Card
export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-aimly-surface border border-aimly-border rounded-[16px] shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

// Badge
export function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'primary', className?: string }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-aimly-butter text-aimly-text',
    primary: 'bg-aimly-orange/10 text-aimly-orange',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Avatar
export function Avatar({ src, alt, size = 'md', className = '' }: { src?: string, alt: string, size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };
  return (
    <div className={`rounded-full overflow-hidden border border-aimly-border flex items-center justify-center bg-aimly-bg ${sizes[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-aimly-text">{alt.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

// Input
export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-aimly-surface border border-aimly-border rounded-lg px-3 py-2 text-aimly-text focus:outline-none focus:border-aimly-orange focus:ring-2 focus:ring-aimly-orange/20 transition-all ${className}`}
      {...props}
    />
  );
}
