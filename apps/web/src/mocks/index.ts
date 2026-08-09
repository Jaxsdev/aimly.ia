export const demoUser = {
  id: 'usr_1',
  name: 'Luis Herrera',
  email: 'luis@aimly.com',
  avatarUrl: 'https://i.pravatar.cc/150?u=luis',
};

export const demoMeeting = {
  id: 'demo',
  title: 'Selección del proyecto Hackathon',
  objective: 'Elegir la mejor idea de proyecto para el hackathon y distribuir las primeras tareas.',
  expectedOutcome: 'Una idea seleccionada y 3 tareas iniciales asignadas.',
  status: 'in_progress',
  durationMinutes: 30,
  timeRemainingSeconds: 18 * 60 + 24, // 18:24
  startedAt: new Date(Date.now() - 12 * 60000).toISOString(),
};

export const demoParticipants = [
  { id: 'usr_1', name: 'Luis Herrera', role: 'host', isOnline: true },
  { id: 'usr_2', name: 'Ana Martínez', role: 'participant', isOnline: true },
  { id: 'usr_3', name: 'Sofía Gómez', role: 'participant', isOnline: true },
  { id: 'usr_4', name: 'Diego Ruiz', role: 'participant', isOnline: true },
];

export const demoMessages = [
  { id: 'msg_1', authorId: 'usr_2', authorName: 'Ana Martínez', content: '¿Qué tal un tutor con IA?', createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: 'msg_2', authorId: 'usr_3', authorName: 'Sofía Gómez', content: 'Me gusta la idea del asistente de reuniones 🤖', createdAt: new Date(Date.now() - 240000).toISOString() },
  { id: 'msg_3', authorId: 'usr_4', authorName: 'Diego Ruiz', content: 'También podríamos hacer algo para viajeros ✈️', createdAt: new Date(Date.now() - 180000).toISOString() },
  { id: 'msg_4', authorId: 'usr_1', authorName: 'Luis Herrera', content: 'Buen punto, pongámoslo en la pizarra.', createdAt: new Date(Date.now() - 120000).toISOString() },
];

export const demoGroups = [
  { id: 'grp_1', title: 'Herramientas de productividad', color: 'orange' },
  { id: 'grp_2', title: 'Aplicaciones para consumidores', color: 'lavender' },
];

export const demoBoardCards = [
  { id: 'c_1', text: 'Asistente de reuniones con IA', authorName: 'Luis', groupId: 'grp_1', x: 50, y: 50, color: 'orange' },
  { id: 'c_2', text: 'Tutor educativo con IA', authorName: 'Ana', groupId: 'grp_1', x: 250, y: 50, color: 'orange' },
  { id: 'c_3', text: 'Generador de presentaciones inteligentes', authorName: 'Sofía', groupId: 'grp_1', x: 150, y: 180, color: 'orange' },
  
  { id: 'c_4', text: 'Planificador de viajes con IA', authorName: 'Diego', groupId: 'grp_2', x: 50, y: 50, color: 'lavender' },
  { id: 'c_5', text: 'App de bienestar y hábitos', authorName: 'Ana', groupId: 'grp_2', x: 250, y: 50, color: 'lavender' },
  { id: 'c_6', text: 'Compañero de estudio con IA', authorName: 'Sofía', groupId: 'grp_2', x: 150, y: 180, color: 'lavender' },
  
  { id: 'c_7', text: '¿Y si combinamos ambos enfoques?', authorName: 'Luis', groupId: null, x: 100, y: 400, color: 'sage', reactions: [{ emoji: '👍', count: 2 }] },
  { id: 'c_8', text: 'Necesitamos elegir una sola dirección', authorName: 'Ana', groupId: null, x: 350, y: 380, color: 'butter', reactions: [{ emoji: '💡', count: 3 }] },
];

export const demoVote = {
  id: 'vote_1',
  question: '¿Qué dirección deberíamos construir?',
  options: [
    { id: 'opt_1', text: 'Herramientas de productividad', votes: 3 },
    { id: 'opt_2', text: 'Aplicaciones para consumidores', votes: 1 },
  ],
  criteria: ['Impacto', 'Viabilidad'],
  status: 'open', // open | closed
};

export const demoDecision = {
  id: 'dec_1',
  text: 'Construir una herramienta de productividad con IA para el hackathon.',
  confirmedBy: 'Luis Herrera',
  confirmedAt: new Date().toISOString(),
};

export const demoTasks = [
  { id: 't_1', title: 'Implementar realtime de la sala', assigneeName: 'Luis Herrera', status: 'Todo' },
  { id: 't_2', title: 'Integrar Claude con el backend', assigneeName: 'Ana Martínez', status: 'Todo' },
  { id: 't_3', title: 'Preparar interfaz de demo', assigneeName: 'Sofía Gómez', status: 'Todo' },
];

export type AimLyState = 'idle' | 'thinking' | 'suggesting' | 'voting' | 'decision_ready' | 'tasks_ready' | 'completed';
