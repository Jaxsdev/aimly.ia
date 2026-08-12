# Didi — gestión real de reuniones desde Inicio

## Misión

Convertir el inicio de AimLy en un gestor funcional de reuniones. Hoy el menú de tres puntos, el botón `Revisar ahora`, la búsqueda y la ruta `Mis reuniones` no completan una acción real. Tu entrega debe permitir administrar reuniones sin tocar la pizarra, las llamadas ni la IA.

## Entregables obligatorios

### 1. Lista de reuniones funcional

- Crear la pantalla `apps/web/src/pages/MeetingsPage.tsx` para `/meetings`.
- Mostrar reuniones del usuario autenticado separadas o filtrables por: en espera, activas, finalizadas y eliminadas no visibles.
- Añadir búsqueda por título y objetivo; debe filtrar en el navegador sobre los datos ya cargados.
- Añadir estados de carga, lista vacía y error con botón `Reintentar`.
- El botón `Revisar ahora` de Inicio debe llevar a `/meetings?status=active,draft`.

### 2. Menú de cada reunión

El botón de tres puntos de cada tarjeta debe abrir un menú real, sin activar la navegación de la tarjeta:

- `Abrir` lleva al lobby si está en espera, a la sala si está activa y a resultados si finalizó.
- `Copiar invitación` copia la URL del lobby y confirma visualmente el resultado.
- `Editar` permite cambiar título, objetivo, resultado esperado y duración **solo si el usuario es anfitrión**. Usa un modal con validación y mensajes de error.
- `Eliminar` solo aparece al anfitrión. Debe pedir confirmación explícita escribiendo o confirmando el nombre de la reunión. Al confirmar, desaparece de la lista y no puede abrirse mediante URL.

### 3. API segura de ciclo de vida

Trabaja únicamente en estos archivos de API si es necesario:

- `apps/api/src/server.ts`
- `apps/web/src/lib/api.ts`

Implementa `PATCH /api/meetings/:meetingId` y `DELETE /api/meetings/:meetingId`.

- Ambos requieren sesión autenticada.
- Solo `host_id` puede editar o eliminar.
- La eliminación debe ser permanente y depender de las claves foráneas con `on delete cascade`; no borres tablas una a una desde el cliente.
- Devuelve `404` si no existe y `403` si no es anfitrión.
- Después de eliminar, publica un evento de reunión si el sistema actual lo permite y evita dejar participantes dentro de una sala rota.

## Archivos que sí puedes tocar

- `apps/web/src/pages/HomePage.tsx`
- `apps/web/src/pages/MeetingsPage.tsx` (nuevo)
- `apps/web/src/App.tsx` (solo para registrar `/meetings`)
- `apps/web/src/lib/api.ts`
- `apps/api/src/server.ts` (solo endpoints de editar/eliminar)
- componentes nuevos bajo `apps/web/src/components/meetings/`

## No tocar

- `MeetingContext.tsx`, `Whiteboard.tsx`, `MeetingLobbyPage.tsx`, `MeetingRoomPage.tsx`, `MeetingResultPage.tsx`, esquema SQL y autenticación.

## Criterios de aceptación y pruebas

Con anfitrión e invitado reales:

1. Inicio muestra las reuniones y `Revisar ahora` aplica el filtro correcto.
2. Buscar por una palabra del título y del objetivo funciona; no hay resultados muestra estado claro.
3. El anfitrión edita una reunión en espera, recarga y ve los cambios persistidos.
4. Un invitado no ve editar/eliminar y recibe `403` si intenta llamar a la API manualmente.
5. Copiar invitación genera el enlace del lobby correcto.
6. Eliminar pide confirmación, quita la reunión del home y `/meeting/:id` ya no abre una reunión inexistente.
7. Probar móvil y teclado: Escape cierra modales, Tab llega a acciones y Enter confirma solo cuando corresponde.

## GitHub

1. Actualiza `main`, crea `feat/meeting-management-didi` y no trabajes directamente en `main`.
2. Un commit por cambio lógico: `feat: add meeting deletion endpoint`, `feat: add meeting actions menu`.
3. Antes del PR: `npm run lint`, `npm run typecheck`, `npm run build:all`.
4. El PR debe incluir capturas, resultado de las siete pruebas y qué endpoints nuevos incluye. No incluyas `.env`, `node_modules` ni archivos ajenos.
5. Solicita revisión; no hagas merge de tu propio PR.
