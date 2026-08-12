# Tarea de Didi — experiencia de sala de espera y reuniones

## Objetivo

Dejar el recorrido de una reunión claro y resistente a errores: crear reunión, entrar a la sala de espera, confirmar `Listo`, iniciar la sesión y llegar a la sala de trabajo. Esta tarea es solo de interfaz y experiencia; no modifica llamadas de video, Excalidraw, IA ni la API.

## Alcance permitido

- Revisar y mejorar las pantallas de creación, sala de espera y redirecciones:
  - `apps/web/src/pages/CreateMeetingPage.tsx`
  - `apps/web/src/pages/MeetingLobbyPage.tsx`
  - `apps/web/src/pages/MeetingRoomPage.tsx`
  - componentes de `apps/web/src/components/meeting/WaitingLobby.tsx`
- Mostrar estados comprensibles: cargando, sin conexión, invitación copiada, usuario pendiente, todos listos y error al iniciar.
- Comprobar que el enlace de invitación lleva a una cuenta existente a la sala de espera de esa reunión; nunca debe crear un invitado ni una cuenta automática.
- Mejorar accesibilidad básica: botones con etiquetas, foco visible, mensajes de error legibles y navegación por teclado.

## Fuera de alcance

- No modificar `MeetingContext.tsx`, la señalización de llamadas, la pizarra, el backend ni migraciones SQL.
- No reformatear archivos ajenos ni cambiar dependencias sin conversar primero.

## Flujo que debe conservarse

1. El anfitrión crea la reunión y entra a `/meeting/:id/lobby`.
2. Un invitado autenticado abre el enlace y también llega al lobby.
3. Cada persona marca o desmarca `Listo`.
4. Solo el anfitrión puede iniciar cuando todos estén listos.
5. Al iniciar, todos pasan a `/meeting/:id` y ven la sala de trabajo.
6. Si entra una persona después, no debe romper la sesión ni crear una cuenta nueva.

## Pruebas manuales obligatorias

Hazlas con dos ventanas o dos navegadores y dos cuentas reales:

- Crear una reunión con un solo participante: marcar `Listo` e iniciar correctamente.
- Crear una reunión con anfitrión e invitado: ambos ven la lista y los cambios de `Listo` se reflejan sin recargar.
- Intentar iniciar con alguien no listo: debe explicar qué falta y no enviar a la sala.
- Probar el enlace sin sesión: debe pedir iniciar sesión o registrarse, sin crear usuario automáticamente.
- Copiar el enlace y abrirlo en otra ventana autenticada.
- Recargar el lobby y la sala de trabajo; no debe perderse el estado de la reunión.
- Reducir la pantalla a móvil y verificar que los botones principales siguen disponibles.

## GitHub y calidad

1. Antes de empezar, sincroniza tu rama: `git checkout main` y `git pull origin main`.
2. Crea solo esta rama: `feat/lobby-ux-didi`.
3. Haz commits pequeños, por ejemplo: `fix: clarify lobby readiness states`.
4. Nunca trabajes directamente en `main` ni uses `git push --force`, `git reset --hard` o cambios masivos sin avisar.
5. Antes de abrir el PR ejecuta:

   ```bash
   npm run lint
   npm run typecheck
   npm run build:all
   ```

6. En el PR incluye: qué cambió, capturas de pantalla y resultados de las pruebas manuales anteriores.
7. Si debes tocar un archivo fuera de alcance, detente y coordínalo antes; así evitamos cruces de código.
