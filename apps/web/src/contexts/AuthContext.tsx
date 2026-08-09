import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInAnonymously: (name?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padStart(12, '0');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = async (name: string = 'Usuario Anónimo') => {
    try {
      setLoading(true);
      // Try native anonymous sign-in first
      let res = await supabase.auth.signInAnonymously();
      
      // Fallback: If anonymous sign-ins are disabled in Supabase, auto-signup an instant guest account!
      if (res.error) {
        const guestEmail = `invitado_${Date.now()}_${Math.floor(Math.random() * 1000)}@aimly.test`;
        const guestPass = 'GuestPass123!';
        const signupRes = await supabase.auth.signUp({
          email: guestEmail,
          password: guestPass,
          options: { data: { full_name: name } }
        });
        if (signupRes.data?.user) {
          res = signupRes as any;
          setSession(signupRes.data.session);
        }
      }

      if (res.data?.user) {
        setUser(res.data.user);
        await supabase.from('profiles').upsert({
          id: res.data.user.id,
          name: name,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.data.user.id}`
        }).catch(console.warn);
      } else {
        // Fallback user with valid PostgreSQL UUID format
        const guestId = generateUUID();
        const localGuest: any = {
          id: guestId,
          email: `${guestId}@aimly.local`,
          name: name,
          user_metadata: { full_name: name }
        };
        localStorage.setItem('aimly_guest_user', JSON.stringify(localGuest));
        setUser(localGuest);
      }
    } catch (error) {
      console.error('Error signing in guest user:', error);
      const guestId = generateUUID();
      const localGuest: any = {
        id: guestId,
        email: `${guestId}@aimly.local`,
        name: name,
        user_metadata: { full_name: name }
      };
      localStorage.setItem('aimly_guest_user', JSON.stringify(localGuest));
      setUser(localGuest);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: name,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`
        }).catch(console.warn);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInAnonymously, signInWithPassword, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
