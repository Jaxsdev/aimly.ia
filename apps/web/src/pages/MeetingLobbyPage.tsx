import React, { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { WaitingLobby } from '../components/meeting/WaitingLobby';
import { MeetingProvider, useMeeting } from '../contexts/MeetingContext';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function MeetingLobbyContent({ meetingId }: { meetingId: string }) {
  const navigate = useNavigate();
  const { meeting, loading, refreshMeeting } = useMeeting();

  useEffect(() => {
    if (meeting?.status === 'active') navigate(`/meeting/${meetingId}`, { replace: true });
  }, [meeting?.status, meetingId, navigate]);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const latest = await api.meetings.get(meetingId) as any;
        if (latest?.status === 'active') await refreshMeeting();
      } catch {
        // The realtime subscription remains the primary update channel.
      }
    };
    const timer = window.setInterval(pollStatus, 2000);
    return () => window.clearInterval(timer);
  }, [meetingId, refreshMeeting]);

  if (!loading && meeting?.status === 'closed') {
    return <Navigate to={`/meeting/${meetingId}/result`} replace />;
  }

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-9rem)]">
        <WaitingLobby onMeetingStarted={() => navigate(`/meeting/${meetingId}`, { replace: true })} />
      </div>
    </AppLayout>
  );
}

export default function MeetingLobbyPage() {
  const { meetingId } = useParams();
  const { user, loading } = useAuth();
  if (!meetingId) return <Navigate to="/home" replace />;
  if (loading) return null;
  if (!user) return <Navigate to={`/meeting/${meetingId}`} replace />;

  return (
    <MeetingProvider meetingId={meetingId}>
      <MeetingLobbyContent meetingId={meetingId} />
    </MeetingProvider>
  );
}
