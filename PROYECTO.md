# AimLy — Contexto maestro del proyecto

## 1. Descripción general

AimLy es una plataforma web de reuniones colaborativas en tiempo real con un agente de inteligencia artificial integrado como facilitador.

El objetivo del producto es resolver un problema común en equipos de trabajo:

Las reuniones producen muchas conversaciones e ideas, pero frecuentemente terminan sin una decisión clara, sin responsables y sin próximos pasos definidos.

AimLy busca convertir una reunión en un proceso orientado a resultados.

La idea principal es:

**Las reuniones no deberían terminar solamente con conversación. Deben terminar con decisiones y acciones claras.**

El flujo conceptual de AimLy será:

```text
OBJETIVO
   ↓
COLABORACIÓN
   ↓
IDEAS
   ↓
ORGANIZACIÓN
   ↓
DECISIÓN
   ↓
TAREAS
   ↓
RESULTADO
```

AimLy combinará:

- Reuniones colaborativas.
- Chat en tiempo real.
- Pizarra compartida.
- Presencia de participantes.
- Votaciones.
- Registro de decisiones.
- Creación de tareas.
- Resúmenes.
- Un agente de IA basado en Claude.

Claude será utilizado como el cerebro analítico del agente AimLy.

---

# 2. Qué diferencia a AimLy

AimLy no es un chatbot convencional dentro de una reunión.

Un chatbot tradicional funciona así:

```text
Usuario escribe
↓
IA responde

Usuario escribe
↓
IA responde

Usuario escribe
↓
IA responde
```

AimLy funciona diferente.

AimLy observa el estado completo de la reunión:

```text
Objetivo
Conversación
Pizarra
Participantes
Tiempo
Votaciones
Decisiones
Tareas
```

y solamente interviene cuando puede ayudar al equipo a avanzar.

Su comportamiento será:

```text
OBSERVAR
   ↓
ENTENDER
   ↓
DETECTAR
   ↓
PROPONER
   ↓
ESPERAR CONFIRMACIÓN
   ↓
ACTUAR
```

Por ejemplo:

> “Veo dos enfoques principales en la pizarra. Todavía no han tomado una decisión y quedan 12 minutos. Sugiero votar considerando impacto y viabilidad.”

Ese tipo de intervención representa el comportamiento esperado de AimLy.

---

# 3. Objetivo del MVP

El objetivo inmediato no es construir una plataforma empresarial completa.

El objetivo es construir un MVP sólido y demostrable.

El flujo completo que debe funcionar es:

```text
Usuario inicia sesión
↓
Entra al dashboard
↓
Crea una reunión
↓
Define objetivo
↓
Comparte la reunión
↓
Otros participantes entran
↓
Todos aparecen conectados
↓
Escriben mensajes
↓
Crean tarjetas
↓
Los cambios aparecen en tiempo real
↓
AimLy analiza la reunión
↓
AimLy organiza las ideas
↓
AimLy propone una acción
↓
Se inicia una votación
↓
Los participantes votan
↓
El host confirma una decisión
↓
AimLy propone tareas
↓
Se confirman responsables
↓
Se termina la reunión
↓
Claude genera un resumen
↓
Se muestra una página de resultados
```

Ese es el núcleo del producto.

Todo lo demás es secundario.

---

# 4. Stack tecnológico definitivo

## Lenguaje principal

Todo el proyecto utilizará:

```text
TypeScript
```

Tanto frontend como backend.

No utilizar Python para el backend.

No utilizar Java.

No utilizar Go.

El objetivo es mantener un solo lenguaje y compartir tipos entre frontend y servidor.

---

# 5. Frontend

El frontend utilizará:

```text
React
Vite
TypeScript
Tailwind CSS
Framer Motion
Lucide React
TanStack Query
React Router
```

No utilizar Next.js.

AimLy será una SPA construida con React + Vite.

---

# 6. Backend

El backend utilizará:

```text
Node.js
TypeScript
Fastify
Zod
```

Fastify será el servidor principal.

Su responsabilidad será:

- Crear reuniones.
- Obtener reuniones.
- Gestionar participantes.
- Procesar mensajes.
- Procesar tarjetas.
- Validar votaciones.
- Confirmar decisiones.
- Crear tareas.
- Comunicarse con Supabase.
- Comunicarse con Portal.
- Comunicarse con Claude.
- Mantener las API keys seguras.
- Ejecutar reglas de negocio.

---

# 7. Base de datos

La base de datos será:

```text
Supabase
PostgreSQL
```

Supabase representará el estado permanente de AimLy.

La regla arquitectónica principal será:

```text
Supabase = estado durable
Portal = tiempo real
Claude = inteligencia
Fastify = autoridad
React = interfaz
```

---

# 8. Autenticación

Usaremos:

```text
Supabase Auth
```

Los métodos de autenticación inicialmente pueden ser:

```text
Google
GitHub
Email + Password
```

No construiremos nuestro propio sistema de autenticación.

---

# 9. Inteligencia artificial

El proveedor de IA será:

```text
Anthropic
Claude API
```

Utilizaremos el SDK oficial de Anthropic en el backend.

La API key estará exclusivamente en el servidor.

Variable:

```env
ANTHROPIC_API_KEY=
```

Nunca utilizar:

```env
VITE_ANTHROPIC_API_KEY=
```

La key de Anthropic nunca debe llegar al frontend.

---

# 10. Tiempo real

Usaremos:

```text
Portal
```

Portal será la infraestructura realtime principal.

Su función será sincronizar:

- Participantes.
- Chat.
- Pizarra.
- Tarjetas.
- Movimientos.
- Votaciones.
- Decisiones.
- Tareas.
- Eventos del agente.

Cada reunión tendrá conceptualmente un canal:

```text
room:{meetingId}
```

Por ejemplo:

```text
room:0da8ee32-b541-42d1-b930
```

---

# 11. Arquitectura general

La arquitectura será:

```text
                         ┌──────────────────────┐
                         │      Supabase        │
                         │                      │
                         │ PostgreSQL           │
                         │ Supabase Auth        │
                         └──────────▲───────────┘
                                    │
                                    │
                         ┌──────────┴───────────┐
                         │                      │
                         │   Fastify Backend    │
                         │                      │
                         │ Node.js              │
                         │ TypeScript           │
                         │ Zod                  │
                         │                      │
                         ├──────────────────────┤
                         │ Business Logic       │
                         │ Auth Validation      │
                         │ Claude Service       │
                         │ Portal Adapter       │
                         └──────▲────────┬──────┘
                                │        │
                           HTTP │        │ realtime
                                │        │
                                │        ▼
                         ┌──────┴──────────────┐
                         │       Portal        │
                         │                    │
                         │ Realtime channels  │
                         └──────▲─────────────┘
                                │
                                │
                ┌───────────────┴────────────────┐
                │                                │
                │ React + Vite + TypeScript      │
                │                                │
                │ Web application                │
                │                                │
                └────────────────────────────────┘


Fastify
      │
      │ AI request
      ▼

Anthropic API
Claude
```

---

# 12. Responsabilidad de cada tecnología

## React

React representa la experiencia del usuario.

Se encarga de:

- Landing.
- Login.
- Dashboard.
- Formularios.
- Sala.
- Chat.
- Pizarra.
- Votaciones.
- Panel AimLy.
- Resultados.

---

## Fastify

Fastify representa la autoridad.

Se encarga de:

- Validación.
- Permisos.
- Reglas.
- Persistencia.
- Claude.
- Portal.
- Seguridad.

---

## Supabase

Supabase representa la memoria.

Guarda:

- Usuarios.
- Reuniones.
- Participantes.
- Mensajes.
- Tarjetas.
- Votaciones.
- Decisiones.
- Tareas.
- Estado permanente.

---

## Portal

Portal representa el sistema nervioso realtime.

Propaga los cambios entre usuarios.

---

## Claude

Claude representa la inteligencia.

Analiza lo que está ocurriendo.

No modifica datos directamente.

---

# 13. Regla crítica del tiempo real

Portal NO es nuestra base de datos.

No hacer:

```text
Usuario crea tarjeta
↓
Portal publica tarjeta
↓
Fin
```

Porque si alguien recarga la página podríamos perder el estado.

Debe hacerse:

```text
Usuario crea tarjeta
↓
React manda HTTP request
↓
Fastify valida
↓
Supabase guarda
↓
Fastify publica evento
↓
Portal
↓
Otros usuarios actualizan la UI
```

Supabase siempre contiene la versión persistente.

---

# 14. Ejemplo completo de evento

Ana crea una tarjeta:

```text
ANA
 │
 ▼
React
 │
 ▼
POST /api/meetings/:id/cards
 │
 ▼
Fastify
 │
 ├── valida usuario
 │
 ├── valida meeting
 │
 ▼
Supabase
 │
 └── INSERT board_card
 │
 ▼
Fastify
 │
 ▼
Portal.publish(
  "board_card_created"
)
 │
 ├───────────────┐
 ▼               ▼
Luis            Sofía
 │               │
 ▼               ▼
React           React
```

---

# 15. Adapter para Portal

No utilizar directamente el SDK de Portal en muchos componentes.

Crear una abstracción.

Por ejemplo:

```text
apps/web/src/realtime/
  portal.client.ts
  portal.events.ts

apps/api/src/realtime/
  portal.server.ts
```

Nuestra aplicación debe utilizar funciones nuestras.

Conceptualmente:

```ts
subscribeToMeeting()

unsubscribeFromMeeting()

publishMeetingEvent()

connectToMeeting()

disconnectFromMeeting()
```

Esto permitirá cambiar detalles de integración sin modificar todo el producto.

---

# 16. Eventos realtime

Crear tipos compartidos.

Por ejemplo:

```ts
type MeetingRealtimeEvent =
  | {
      type: "participant_joined";
      payload: Participant;
    }
  | {
      type: "participant_left";
      payload: {
        userId: string;
      };
    }
  | {
      type: "chat_message_created";
      payload: ChatMessage;
    }
  | {
      type: "board_card_created";
      payload: BoardCard;
    }
  | {
      type: "board_card_updated";
      payload: BoardCard;
    }
  | {
      type: "board_card_moved";
      payload: {
        cardId: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "board_cards_grouped";
      payload: BoardGroup[];
    }
  | {
      type: "vote_started";
      payload: Vote;
    }
  | {
      type: "vote_cast";
      payload: VoteResponse;
    }
  | {
      type: "vote_closed";
      payload: Vote;
    }
  | {
      type: "decision_confirmed";
      payload: Decision;
    }
  | {
      type: "tasks_created";
      payload: Task[];
    }
  | {
      type: "agent_message";
      payload: AgentMessage;
    }
  | {
      type: "agent_action";
      payload: AgentAction;
    }
  | {
      type: "meeting_closed";
      payload: MeetingSummary;
    };
```

---

# 17. Estructura del repositorio

Utilizaremos un monorepo sencillo.

```text
aimly/
│
├── apps/
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── realtime/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   │
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/
│       │
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── repositories/
│       │   ├── ai/
│       │   ├── realtime/
│       │   ├── plugins/
│       │   ├── lib/
│       │   └── server.ts
│       │
│       └── package.json
│
├── packages/
│   │
│   └── shared/
│       └── src/
│           ├── types/
│           ├── schemas/
│           └── events/
│
├── package.json
└── README.md
```

---

# 18. Shared package

`packages/shared` contendrá información compartida.

Ejemplo:

```text
shared/
  types/
    meeting.ts
    participant.ts
    chat.ts
    board.ts
    vote.ts
    decision.ts
    task.ts
    agent.ts

  schemas/
    meeting.schema.ts
    board.schema.ts
    vote.schema.ts

  events/
    meeting-events.ts
```

---

# 19. Validación

Usaremos:

```text
Zod
```

Todas las entradas importantes del backend deben validarse.

Ejemplo:

```ts
const createMeetingSchema = z.object({
  title: z.string().min(1).max(120),

  objective: z.string().min(1).max(500),

  expectedOutcome: z.string().min(1).max(500),

  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(180)
});
```

El frontend también puede utilizar los mismos schemas cuando sea posible.

---

# 20. Base de datos

Las tablas iniciales serán las siguientes.

---

## profiles

Extiende usuarios de Supabase Auth.

```text
id
name
avatar_url
created_at
updated_at
```

---

## meetings

```text
id

title

objective

expected_outcome

status

host_id

duration_minutes

started_at

closed_at

created_at

updated_at
```

Estados:

```text
draft
active
closed
```

---

## meeting_participants

```text
id

meeting_id

user_id

role

joined_at
```

Roles:

```text
host
participant
```

---

## chat_messages

```text
id

meeting_id

author_id

content

created_at
```

---

## board_cards

```text
id

meeting_id

text

type

x

y

group_id

created_by

created_at

updated_at
```

Tipos iniciales:

```text
idea
```

No necesitamos más tipos inicialmente.

---

## board_groups

```text
id

meeting_id

title

created_by_agent

created_at
```

Permite agrupar tarjetas.

---

## votes

```text
id

meeting_id

question

status

created_by

created_at

closed_at
```

Estados:

```text
open
closed
```

---

## vote_options

```text
id

vote_id

label

sort_order
```

---

## vote_responses

```text
id

vote_id

option_id

user_id

created_at
```

Agregar restricción única:

```text
vote_id + user_id
```

para evitar doble voto si queremos un voto por participante.

---

## decisions

```text
id

meeting_id

text

source_vote_id

confirmed_by

created_at
```

---

## tasks

```text
id

meeting_id

title

description

assignee_id

status

source_decision_id

created_at

updated_at
```

Estados:

```text
todo
in_progress
done
```

---

## agent_events

Registrar las intervenciones importantes de AimLy.

```text
id

meeting_id

type

summary

payload

created_at
```

Esto puede ser útil para el historial y depuración.

---

# 21. Auth y permisos

Supabase Auth manejará usuarios.

Después del login:

```text
Supabase Auth
↓
access_token
↓
React
↓
Fastify
↓
Fastify valida token
```

Fastify debe identificar al usuario real.

No confiar en:

```text
userId enviado por React
```

como identidad.

El usuario debe derivarse del token.

---

# 22. Frontend state

Utilizaremos principalmente:

```text
TanStack Query
React state
React Context
```

TanStack Query administrará datos del servidor.

Por ejemplo:

```text
meeting
messages
cards
votes
tasks
decisions
```

React state manejará UI:

```text
modal abierto
card seleccionada
zoom
tab activa
```

No introducir Redux inicialmente.

Si aparece una necesidad real de estado global complejo de UI:

```text
Zustand
```

puede añadirse posteriormente.

---

# 23. Rutas principales

## /

Landing y login.

---

## /home

Dashboard autenticado.

---

## /meetings/new

Creación de reunión.

---

## /meeting/:meetingId

Sala principal.

---

## /meeting/:meetingId/result

Resultado final.

---

# 24. Landing

La landing debe sentirse premium desde el primer segundo.

Objetivo:

```text
impactar
explicar
convertir
```

Mensaje principal:

**Reuniones que terminan en decisiones.**

Subtexto:

> AimLy es tu copiloto de reuniones con IA. Organiza ideas, alinea al equipo y transforma conversaciones en resultados claros.

Debe mostrar:

- Logo.
- Mascota.
- Hero.
- Beneficios.
- Login.
- Google.
- GitHub.
- Email.
- CTA.

---

# 25. Identidad visual

La dirección visual será:

```text
cálida
editorial
humana
premium
minimalista
amigable
```

Inspirada en productos editoriales y herramientas modernas de IA, pero con identidad propia.

No copiar directamente identidades existentes.

---

# 26. Paleta

## Background

```text
#F7F3EB
```

---

## Surface

```text
#FFFDF9
```

---

## Text

```text
#25221F
```

---

## Primary orange

```text
#E8683A
```

---

## Primary hover

```text
#D95A30
```

---

## Peach

```text
#F1B29A
```

---

## Sage

```text
#A8B49A
```

---

## Butter

```text
#E9CF87
```

---

## Lavender

```text
#C7B8EA
```

---

## Border

```text
#E8E1D7
```

---

# 27. Tipografía

Para encabezados:

```text
Newsreader
```

Para UI:

```text
Inter
```

o:

```text
Instrument Sans
```

No utilizar serif en elementos pequeños o densos de interfaz.

---

# 28. Mascota AimLy

AimLy tendrá una mascota propia.

La mascota representará visualmente al agente.

Será una pequeña criatura cálida con púas suaves de color naranja.

Puede tener estados:

```text
idle
observing
thinking
organizing
suggesting
waiting
celebrating
```

Ejemplos:

Cuando Claude está procesando:

```text
thinking
```

Cuando reorganiza tarjetas:

```text
organizing
```

Cuando el equipo confirma una decisión:

```text
celebrating
```

---

# 29. Dashboard

Después del login:

```text
/home
```

Debe contener:

- Bienvenida.
- Botón crear reunión.
- Reuniones recientes.
- Próximas reuniones.
- Tareas.
- Decisiones.
- Alguna sugerencia de AimLy.

El CTA dominante:

```text
+ Crear nueva reunión
```

---

# 30. Crear reunión

Ruta:

```text
/meetings/new
```

Campos:

```text
Título
Objetivo
Resultado esperado
Duración
```

Ejemplo:

```text
Título

Selección de proyecto Hackathon
```

```text
Objetivo

Elegir qué proyecto construiremos.
```

```text
Resultado esperado

Una idea seleccionada y tres tareas iniciales asignadas.
```

```text
Duración

20 minutos
```

---

# 31. Crear meeting

React manda:

```text
POST /api/meetings
```

Fastify:

```text
valida usuario
↓
valida body
↓
crea meeting
↓
crea participant host
↓
devuelve meeting
```

Frontend navega:

```text
/meeting/:meetingId
```

---

# 32. Sala

La sala es el corazón de AimLy.

Layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ Meeting title  Timer    Participants     Finalizar reunión   │
├───────────────┬───────────────────────────┬───────────────────┤
│               │                           │                   │
│ Objective     │                           │                   │
│               │                           │                   │
│ Participants  │       WHITEBOARD          │      AIMLY        │
│               │                           │                   │
│               │                           │                   │
├───────────────┤                           │                   │
│ CHAT          │                           │                   │
│               │                           │                   │
│               │                           │                   │
└───────────────┴───────────────────────────┴───────────────────┘
```

La pizarra es el componente central.

---

# 33. Pizarra

El MVP necesita:

```text
crear tarjeta

editar tarjeta

mover tarjeta

eliminar tarjeta opcional

agrupar tarjetas

mostrar grupos
```

No construir un clon completo de Miro.

No crear nuestro propio motor canvas desde cero si una solución sencilla es suficiente.

---

# 34. Tarjetas

Cada tarjeta representa inicialmente una idea.

Ejemplo:

```text
┌────────────────────┐
│                    │
│ Asistente de       │
│ reuniones con IA   │
│                    │
│ Luis               │
│                    │
└────────────────────┘
```

---

# 35. Agrupación

AimLy podrá convertir:

```text
[Meeting assistant]

[AI tutor]

[Travel planner]

[Wellness]
```

en:

```text
PRODUCTIVIDAD

[Meeting assistant]
[AI tutor]


CONSUMER

[Travel planner]
[Wellness]
```

Este cambio debe ser visualmente evidente.

La IA no debe limitarse a escribir texto.

---

# 36. Chat

El chat estará en la misma sala.

Cada mensaje:

```text
author
content
createdAt
```

Flujo:

```text
React
↓
POST message
↓
Fastify
↓
Supabase
↓
Portal
↓
todos los participantes
```

---

# 37. Presencia

Los usuarios deben poder ver quién está conectado.

Ejemplo:

```text
Luis Herrera      ●
Ana Martínez      ●
Sofía Gómez       ●
Diego Ruiz        ●
```

Se puede almacenar participación durable en Supabase y estado online mediante Portal.

---

# 38. Claude como agente AimLy

Claude debe actuar bajo un rol muy específico.

No debe funcionar como:

```text
general assistant
```

Debe funcionar como:

```text
AI Meeting Facilitator
```

---

# 39. Servicio de Claude

Backend:

```text
apps/api/src/ai/
```

Estructura:

```text
ai/
  anthropic.client.ts
  aimly.service.ts
  aimly.prompts.ts
  aimly.schemas.ts
  aimly.types.ts
```

---

# 40. anthropic.client.ts

Su única responsabilidad es crear/configurar el cliente Anthropic.

Conceptualmente:

```ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

La selección exacta del modelo debe mantenerse centralizada y configurable.

No repetir el nombre del modelo en múltiples archivos.

---

# 41. aimly.service.ts

Funciones principales:

```text
analyzeMeeting()

suggestTasks()

generateMeetingSummary()
```

Más adelante:

```text
detectBlockers()

suggestAgenda()

evaluateMeetingProgress()
```

No son necesarias inicialmente.

---

# 42. Endpoint Ask AimLy

Endpoint:

```text
POST /api/meetings/:meetingId/analyze
```

Cuando alguien pulsa:

```text
Ask AimLy
```

Fastify obtiene:

```text
meeting

participants

chat messages

board cards

board groups

current vote

decisions

tasks

time remaining
```

Después manda el contexto a Claude.

---

# 43. Prompt principal

El prompt de sistema debe establecer algo similar a:

```text
You are AimLy, an AI meeting facilitator.

Your purpose is to help a team reach the expected outcome
of its meeting.

You are NOT a generic chatbot.

Do not react to every individual message.

Observe the entire state of the meeting and intervene only
when doing so can help the group move forward.

You understand:

- the meeting objective
- the expected outcome
- the participants
- the conversation
- the shared board
- current votes
- confirmed decisions
- tasks
- remaining time

Your responsibilities are:

1. Identify the main ideas.
2. Identify ideas that can be grouped.
3. Detect unresolved disagreements.
4. Detect when the team is drifting from the objective.
5. Detect when a decision is required.
6. Suggest one useful next action.

Possible recommendations include:

- organize ideas
- ask a facilitation question
- propose evaluation criteria
- propose a vote
- ask for confirmation
- suggest next steps

Important rules:

- Never confirm a decision yourself.
- Never permanently assign a responsibility yourself.
- Never execute SQL.
- Never interact directly with the database.
- Never perform arbitrary backend actions.
- Important actions require human confirmation.

Return structured data only.
```

---

# 44. Contexto enviado a Claude

Claude recibe algo conceptualmente similar a:

```ts
{
  meeting: {
    title,
    objective,
    expectedOutcome,
    durationMinutes,
    timeRemaining
  },

  participants,

  messages,

  boardCards,

  boardGroups,

  currentVote,

  decisions,

  tasks
}
```

No enviar datos innecesarios.

---

# 45. Respuesta de Claude

Claude debe producir datos estructurados.

Por ejemplo:

```ts
type AimLyAnalysis = {
  summary: string;

  observations: string[];

  groups: {
    title: string;
    cardIds: string[];
  }[];

  suggestedAction:
    | {
        type: "none";
      }
    | {
        type: "ask_question";
        message: string;
      }
    | {
        type: "propose_vote";
        message: string;
        question: string;
        options: string[];
        criteria?: string[];
      };
};
```

---

# 46. Validación de Claude

Nunca confiar directamente en la respuesta de Claude.

El flujo será:

```text
Claude
↓
structured output
↓
Zod
↓
validated object
↓
business logic
```

Si falla:

```text
no ejecutar ninguna acción
```

Mostrar un error recuperable.

---

# 47. Ejemplo

Claude puede producir:

```json
{
  "summary": "El equipo está evaluando cuatro propuestas.",
  "observations": [
    "Las ideas se dividen claramente en dos enfoques.",
    "Todavía no existe una decisión.",
    "El objetivo requiere elegir una única opción."
  ],
  "groups": [
    {
      "title": "Herramientas de productividad",
      "cardIds": [
        "card-1",
        "card-2"
      ]
    },
    {
      "title": "Aplicaciones para consumidores",
      "cardIds": [
        "card-3",
        "card-4"
      ]
    }
  ],
  "suggestedAction": {
    "type": "propose_vote",
    "message": "Tenemos dos enfoques principales. Sugiero votar para avanzar.",
    "question": "¿Qué dirección debería construir el equipo?",
    "options": [
      "Productividad",
      "Consumer"
    ],
    "criteria": [
      "Impacto",
      "Viabilidad"
    ]
  }
}
```

---

# 48. Aplicación de grupos

Fastify recibe los grupos validados.

Actualiza Supabase.

Después publica:

```text
board_cards_grouped
```

Portal comunica el cambio.

Los clientes reorganizan la pizarra.

---

# 49. Panel AimLy

El panel derecho tendrá tabs:

```text
Resumen

Sugerencias

Decisiones

Tareas
```

Ejemplo:

```text
AimLy
IA Facilitadora


He analizado la conversación y la pizarra.


LO QUE VEO

✓ Existen dos enfoques principales.

✓ Todavía no hay una decisión.

✓ Quedan 18 minutos.


MI SUGERENCIA

Propongo una votación considerando:

Impacto
Viabilidad


[Iniciar votación sugerida]

[Hacer una pregunta al equipo]
```

---

# 50. AimLy no ejecuta votación sin permiso

Claude puede devolver:

```text
propose_vote
```

Pero no crea directamente el voto.

El frontend muestra:

```text
Iniciar votación sugerida
```

El usuario confirma.

---

# 51. Crear votación

Flujo:

```text
User
↓
Start vote
↓
POST /api/meetings/:meetingId/votes
↓
Fastify
↓
Supabase
↓
Vote + options
↓
Portal vote_started
↓
Todos ven la votación
```

---

# 52. Votación

Ejemplo:

```text
¿Qué proyecto deberíamos construir?

○ AimLy Meeting Assistant

○ AI Travel Planner


Criterios

Impacto
Viabilidad


[Votar]
```

---

# 53. Emitir voto

```text
React
↓
POST vote response
↓
Fastify
↓
Supabase
↓
Portal vote_cast
↓
UI actualizada
```

---

# 54. Resultados

Ejemplo:

```text
AimLy Meeting Assistant

████████████ 2 votos


AI Travel Planner

██████ 1 voto
```

---

# 55. Decisión

Votación no equivale automáticamente a decisión.

AimLy puede decir:

```text
AimLy Meeting Assistant recibió el mayor apoyo.

¿Desean confirmarla como decisión?
```

El host pulsa:

```text
Confirmar decisión
```

---

# 56. Confirmar decisión

Flujo:

```text
React
↓
POST decision
↓
Fastify
↓
validación host
↓
Supabase
↓
Decision
↓
Portal
↓
decision_confirmed
```

---

# 57. Claude propone tareas

Una vez existe una decisión:

```text
Decision
↓
Fastify
↓
Claude
↓
Task suggestions
```

Ejemplo:

```json
{
  "tasks": [
    {
      "title": "Implementar la sala realtime",
      "suggestedAssigneeId": "luis"
    },
    {
      "title": "Integrar Claude con Fastify",
      "suggestedAssigneeId": "ana"
    },
    {
      "title": "Preparar interfaz final",
      "suggestedAssigneeId": "sofia"
    }
  ]
}
```

---

# 58. Confirmación de tareas

Las tareas propuestas deben poder revisarse.

Ejemplo:

```text
AimLy propone:


Implementar sala realtime
Luis

[Confirmar]


Integrar Claude
Ana

[Confirmar]


Preparar demo
Sofía

[Confirmar]
```

Después se guardan.

---

# 59. Finalizar reunión

Solo el host puede cerrar inicialmente una reunión.

Botón:

```text
Finalizar reunión
```

Antes de terminar:

Fastify obtiene todo el contexto.

---

# 60. Resumen final con Claude

Claude recibe:

```text
objective

expected outcome

participants

messages

cards

groups

votes

decisions

tasks
```

Debe devolver:

```ts
type MeetingSummary = {
  summary: string;

  keyPoints: string[];

  decisions: string[];

  nextSteps: string[];
};
```

---

# 61. Página de resultados

Ruta:

```text
/meeting/:meetingId/result
```

Debe mostrar:

```text
REUNIÓN COMPLETADA
```

Objetivo:

```text
Elegir el proyecto para el hackathon.
```

Decisión:

```text
Construir AimLy.
```

Tareas:

```text
Luis
Implementar realtime


Ana
Integrar Claude


Sofía
Preparar demo
```

Resumen:

```text
El equipo evaluó diferentes propuestas,
agrupó las ideas en dos enfoques y realizó
una votación considerando impacto y
viabilidad.

Finalmente decidió construir AimLy y
estableció tres tareas iniciales.
```

---

# 62. API endpoints iniciales

```text
POST   /api/meetings

GET    /api/meetings

GET    /api/meetings/:meetingId


POST   /api/meetings/:meetingId/join


GET    /api/meetings/:meetingId/messages

POST   /api/meetings/:meetingId/messages


GET    /api/meetings/:meetingId/cards

POST   /api/meetings/:meetingId/cards

PATCH  /api/meetings/:meetingId/cards/:cardId


POST   /api/meetings/:meetingId/analyze


POST   /api/meetings/:meetingId/votes

POST   /api/meetings/:meetingId/votes/:voteId/responses

POST   /api/meetings/:meetingId/votes/:voteId/close


POST   /api/meetings/:meetingId/decisions


POST   /api/meetings/:meetingId/tasks


POST   /api/meetings/:meetingId/finish
```

---

# 63. API response format

Éxito:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "MEETING_NOT_FOUND",
    "message": "Meeting not found"
  }
}
```

---

# 64. Manejo de fallos de Claude

Claude puede fallar por:

```text
network error

rate limit

invalid output

timeout

invalid API key

provider issue
```

La reunión NO debe dejar de funcionar.

AimLy es una funcionalidad dentro de la sala.

La sala debe poder seguir usando:

```text
chat

board

participants

votes
```

aunque Claude falle temporalmente.

UI:

```text
AimLy no pudo analizar la reunión.

[Intentar nuevamente]
```

---

# 65. Manejo de errores realtime

Si Portal pierde conexión:

```text
connected
↓
connection lost
↓
reconnecting
↓
connected
```

La UI debe mostrar el estado.

Después de reconectar:

```text
GET current meeting state
↓
reconcile
```

Supabase permitirá recuperar información perdida.

---

# 66. Estado inicial al cargar sala

Cuando alguien abre:

```text
/meeting/:meetingId
```

necesitamos obtener el snapshot actual.

Por ejemplo:

```text
GET meeting
GET participants
GET messages
GET cards
GET current vote
GET decisions
GET tasks
```

Después usar Portal para los nuevos cambios.

Portal no debe utilizarse como historial.

---

# 67. Orden de implementación

El agente de código debe desarrollar en este orden.

## Fase 1 — Setup

```text
Monorepo

React + Vite

Fastify

TypeScript

Tailwind

Shared package

ESLint

Prettier
```

---

## Fase 2 — Supabase

Configurar:

```text
database

authentication

environment variables

clients
```

---

## Fase 3 — Login

Crear:

```text
landing

login

register

protected routes
```

---

## Fase 4 — Dashboard

Crear:

```text
/home

sidebar

hero

create meeting

recent meetings
```

---

## Fase 5 — Crear meeting

Implementar:

```text
formulario

API

database

redirect
```

---

## Fase 6 — Meeting UI

Primero crear visualmente:

```text
header

objective panel

participants

chat

board

AimLy panel
```

Utilizar datos mock inicialmente.

---

## Fase 7 — Persistencia

Conectar:

```text
messages

cards

participants
```

con Supabase.

---

## Fase 8 — Portal

Probar con dos navegadores.

Prueba mínima:

```text
Usuario A crea card
↓
Usuario B la ve inmediatamente
```

Después:

```text
chat

presence

card updates
```

---

## Fase 9 — Claude

Integrar Anthropic SDK.

Crear:

```text
/analyze
```

Primera versión solamente debe:

```text
resumir
agrupar tarjetas
proponer pregunta/votación
```

---

## Fase 10 — Voting

Crear:

```text
vote

vote options

vote responses

results
```

---

## Fase 11 — Decision

Crear:

```text
decision confirmation
```

---

## Fase 12 — Tasks

Claude propone.

Usuario confirma.

Supabase guarda.

---

## Fase 13 — Results

Crear resumen final.

---

## Fase 14 — Polish

Solo al final:

```text
animations

loading states

error states

responsive

mascot reactions

microinteractions
```

---

# 68. Funciones fuera del MVP

NO construir inicialmente:

```text
video

audio

WebRTC

voice agent

live transcription

recordings

screen share

calendar integrations

Slack

Jira

Notion

Linear integration

enterprise permissions

billing

mobile app

analytics avanzados
```

Pueden añadirse después.

---

# 69. Variables del backend

Ejemplo:

```env
PORT=3001

SUPABASE_URL=

SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

PORTAL_API_KEY=

PORTAL_SECRET=
```

Los nombres exactos de las variables de Portal deben basarse en su SDK oficial.

---

# 70. Variables del frontend

```env
VITE_API_URL=

VITE_SUPABASE_URL=

VITE_SUPABASE_PUBLISHABLE_KEY=
```

Nunca exponer:

```text
ANTHROPIC_API_KEY

SUPABASE_SERVICE_ROLE_KEY

PORTAL_SECRET
```

---

# 71. Seguridad de Claude

Claude jamás debe recibir capacidad para ejecutar SQL directamente.

No:

```text
Claude
↓
SQL
↓
database
```

Sí:

```text
Claude
↓
structured intention
↓
Zod
↓
Fastify
↓
controlled function
↓
database
```

---

# 72. Ejemplo de funciones permitidas

Internamente Fastify puede tener:

```ts
groupBoardCards()

createVoteProposal()

recordDecision()

createTasks()

generateMeetingSummary()
```

Claude devuelve lo que recomienda.

Fastify decide qué función puede ejecutarse.

---

# 73. Confirmación humana

Requieren confirmación:

```text
decisiones

responsables

tareas importantes
```

No requieren necesariamente confirmación:

```text
resumen

observaciones

agrupación visual

preguntas
```

---

# 74. Flujo principal definitivo

```text
LOGIN
  ↓
HOME
  ↓
CREATE MEETING
  ↓
OBJECTIVE
  ↓
ROOM
  ↓
PARTICIPANTS JOIN
  ↓
PORTAL REALTIME
  ↓
CHAT
  ↓
BOARD
  ↓
ASK AIMLY
  ↓
FASTIFY
  ↓
SUPABASE CONTEXT
  ↓
CLAUDE API
  ↓
STRUCTURED ANALYSIS
  ↓
ZOD
  ↓
BOARD GROUPING
  ↓
PORTAL
  ↓
ALL CLIENTS UPDATE
  ↓
AIMLY PROPOSES VOTE
  ↓
HUMAN CONFIRMS
  ↓
VOTE STARTS
  ↓
USERS VOTE
  ↓
PORTAL
  ↓
RESULT
  ↓
HOST CONFIRMS DECISION
  ↓
CLAUDE SUGGESTS TASKS
  ↓
HUMAN CONFIRMS
  ↓
MEETING ENDS
  ↓
CLAUDE SUMMARY
  ↓
RESULT PAGE
```

---

# 75. Ejemplo de demo

## Inicio

Luis abre AimLy.

Login.

Dashboard.

---

## Crear

Pulsa:

```text
Crear nueva reunión
```

Escribe:

```text
Selección del proyecto Hackathon
```

Objetivo:

```text
Elegir qué proyecto construiremos.
```

Resultado esperado:

```text
Una idea seleccionada y tres tareas asignadas.
```

---

## Sala

Ana y Sofía entran.

Portal muestra:

```text
Luis ●
Ana ●
Sofía ●
```

---

## Ideas

Crean:

```text
Meeting assistant

AI Tutor

Travel planner

Wellness app
```

---

## Claude

Host pulsa:

```text
Ask AimLy
```

Mascota:

```text
thinking
```

Claude analiza.

---

## Organización

La pizarra cambia.

```text
PRODUCTIVIDAD

Meeting assistant
AI tutor
```

```text
CONSUMER

Travel planner
Wellness app
```

---

## AimLy

Muestra:

```text
He detectado dos enfoques principales.

Todavía debemos escoger uno.

Sugiero votar considerando:

Impacto
Viabilidad
```

---

## Voto

Host inicia voto.

Todos votan.

---

## Resultado

```text
Meeting assistant

2 votos
```

```text
Travel planner

1 voto
```

---

## Decisión

AimLy:

```text
Meeting assistant tiene mayor apoyo.

¿Confirmamos esta decisión?
```

Host confirma.

---

## Tareas

Claude propone:

```text
Luis
Realtime

Ana
Claude integration

Sofía
Demo UI
```

Se confirman.

---

## Final

Host termina reunión.

Claude genera resumen.

---

# 76. Definición de éxito

El MVP está terminado cuando dos navegadores diferentes pueden:

```text
entrar a la misma reunión

verse mutuamente

enviar mensajes

crear tarjetas

ver tarjetas realtime

pedir análisis a Claude

ver tarjetas agrupadas

iniciar voto

votar

ver resultado

confirmar decisión

crear tareas

cerrar reunión

ver resumen
```

sin necesitar modificar manualmente la base de datos.

---

# 77. Principio del proyecto

Cuando exista duda sobre qué construir, preguntar:

**¿Esta funcionalidad hace que la historia objetivo → colaboración → decisión → resultado sea mejor?**

Si la respuesta es sí:

```text
priorizar
```

Si es no:

```text
posponer
```

---

# 78. Regla para el agente de programación

El agente de programación debe:

1. Leer este contexto antes de modificar la arquitectura.
2. Mantener TypeScript.
3. Mantener React + Vite.
4. Mantener Fastify.
5. Mantener Supabase.
6. Mantener Portal.
7. Utilizar Claude mediante Anthropic API.
8. No introducir otro proveedor de IA.
9. No reemplazar Portal por Supabase Realtime.
10. No reemplazar Fastify por Next.js.
11. No construir funcionalidades fuera del MVP sin necesidad.
12. Mantener APIs y tipos claros.
13. Priorizar una aplicación funcionando por encima de abstracciones innecesarias.
14. Manejar correctamente estados de carga y error.
15. Evitar código duplicado.
16. No exponer secretos.
17. No dejar `any` innecesarios.
18. Mantener TypeScript estricto.

---

# 79. Resumen técnico rápido

AimLy utiliza:

```text
TypeScript
```

para todo.

Frontend:

```text
React
Vite
Tailwind
Framer Motion
TanStack Query
```

Backend:

```text
Node.js
Fastify
Zod
```

Base de datos:

```text
Supabase PostgreSQL
```

Auth:

```text
Supabase Auth
```

Realtime:

```text
Portal
```

IA:

```text
Anthropic Claude API
```

---

# 80. Modelo mental definitivo

Recordar siempre:

```text
React
=
lo que ve el usuario


Fastify
=
la autoridad


Supabase
=
la memoria


Portal
=
el realtime


Claude
=
el cerebro
```

Claude comprende.

Fastify decide.

Supabase guarda.

Portal comunica.

React representa.

---

# 81. Producto en una frase

**AimLy es una sala colaborativa en tiempo real con un agente de IA basado en Claude que entiende el objetivo de una reunión, organiza las ideas del equipo y transforma la conversación en decisiones, tareas y próximos pasos.**

---

# 82. Mensaje central

**Reuniones que terminan en decisiones.**

En inglés:

**Meetings that end with decisions.**

O alternativamente:

**Turn conversations into decisions.**

---

# 83. Prioridad absoluta

No construir primero la arquitectura perfecta.

Construir primero:

```text
LOGIN
↓
CREATE MEETING
↓
ROOM
↓
CHAT
↓
BOARD
↓
REALTIME
↓
CLAUDE
↓
VOTE
↓
DECISION
↓
TASKS
↓
RESULT
```

Una vez que ese recorrido funciona de extremo a extremo, mejorar la experiencia visual y añadir funcionalidades secundarias.