# Josué — resultados, tareas y decisiones que sí persisten

## Misión

Hacer funcional la parte posterior a una reunión. El menú lateral promete `Tareas` y `Decisiones`, pero no existen rutas ni pantallas globales. Tu entrega debe convertir las tareas y decisiones creadas en una reunión en resultados consultables y accionables.

## Entregables obligatorios

### 1. Centro de tareas

- Crear `/tasks` y `apps/web/src/pages/TasksPage.tsx`.
- Mostrar las tareas de todas las reuniones donde el usuario participa, con título de reunión, responsable, estado, fecha si existe y texto.
- Filtros: pendientes, completadas y por reunión. Búsqueda por texto.
- Permitir que quien creó/asignó la tarea o su responsable marque `pendiente` / `completada`; cada cambio debe persistir y verse tras recargar.
- No muestres datos de reuniones donde el usuario no participa.

### 2. Centro de decisiones

- Crear `/decisions` y `apps/web/src/pages/DecisionsPage.tsx`.
- Listar decisiones por reunión, su fecha, contexto/origen y estado si existe.
- Añadir filtros por reunión y búsqueda.
- Cada registro debe enlazar al resultado de su reunión: `/meeting/:id/result`.

### 3. Resultados de reunión completos

- Revisar `MeetingResultPage.tsx`: debe obtener datos reales, no datos de demostración.
- Al finalizar una reunión, mostrar resumen, decisiones y tareas persistidas. Si no hay datos, usar mensajes vacíos, nunca contenido falso.
- Añadir acciones `Ir a tareas` y `Ir a decisiones` que respeten los filtros de la reunión actual.

### 4. API mínima y segura

Puedes modificar solo estas rutas de datos:

- `apps/api/src/server.ts`
- `apps/web/src/lib/api.ts`
- archivos nuevos bajo `apps/web/src/pages/` y `apps/web/src/components/results/`
- `apps/web/src/App.tsx` únicamente para registrar `/tasks` y `/decisions`.

Agrega o completa endpoints para listar tareas y decisiones del usuario autenticado. Todas las consultas deben verificar `meeting_participants`; no confíes en un `meetingId` enviado por el cliente para autorizar acceso.

## No tocar

- Inicio, rutas `/meetings`, edición/eliminación de reuniones (Didi).
- Pizarra, archivos de imagen y `MeetingContext.tsx` (no tocar).
- Sidebar y perfil (`AppLayout.tsx`, asignado a Escobar), salvo registrar las nuevas rutas en `App.tsx`.

## Criterios de aceptación y pruebas

1. En una reunión, crear o aceptar tareas/decisiones y finalizarla.
2. Recargar resultados: muestra datos reales de esa reunión.
3. `/tasks` solo muestra tareas de reuniones propias; filtros, búsqueda y cambio de estado persisten.
4. `/decisions` solo muestra decisiones propias; filtros y enlace al resultado funcionan.
5. Con segunda cuenta participante, confirmar qué acciones puede cambiar según las reglas definidas; con una tercera cuenta ajena, confirmar que no ve ni obtiene datos por API.
6. Estados vacío, carga y fallo de red no rompen la página.

## GitHub

- Rama: `feat/meeting-results-josue`.
- Mantén commits pequeños y descriptivos. Un PR no debe incluir arreglos de pizarra ni cambios de UI no relacionados.
- Ejecuta `npm run lint`, `npm run typecheck` y `npm run build:all` antes de abrirlo.
- Documenta en el PR endpoints, reglas de autorización y evidencia de las seis pruebas.
