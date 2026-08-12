import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import CreateMeetingPage from './pages/CreateMeetingPage';
import MeetingRoomPage from './pages/MeetingRoomPage';
import MeetingLobbyPage from './pages/MeetingLobbyPage';
import MeetingResultPage from './pages/MeetingResultPage';
import { Portal } from '@portalsdk/core';
import { PortalProvider } from '@portalsdk/react';
import { AuthProvider } from './contexts/AuthContext';

const portal = new Portal({
  apiKey: (import.meta.env.VITE_PORTAL_PUBLIC_KEY as string) || 'pk_your_publishable_key',
});

// Auth token fetcher for Portal Realtime (will connect to backend later)
async function fetchPortalToken(): Promise<string> {
  try {
    const res = await fetch('/api/portal-token', { credentials: 'include' });
    if (!res.ok) throw new Error('No se pudo obtener el token de Portal');
    const { token } = await res.json();
    return token || '';
  } catch (error) {
    console.error('Error al obtener el token de autenticación:', error);
    return '';
  }
}

export default function App() {
  return (
    <AuthProvider>
      <PortalProvider client={portal} token={fetchPortalToken}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/meetings/new" element={<CreateMeetingPage />} />
            <Route path="/meeting/:meetingId/lobby" element={<MeetingLobbyPage />} />
            <Route path="/meeting/:meetingId" element={<MeetingRoomPage />} />
            <Route path="/meeting/:meetingId/result" element={<MeetingResultPage />} />
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PortalProvider>
    </AuthProvider>
  );
}
