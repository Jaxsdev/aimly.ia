# Tarea de Escobar — calidad, fallos y pruebas de integración

## Objetivo

Ser responsable de calidad transversal: detectar errores antes de que lleguen a `main`, documentarlos de forma reproducible y corregir únicamente errores aislados que no invadan el trabajo de Didi o Josué.

## Alcance permitido

- Revisar el flujo completo de producto y crear una guía de pruebas bajo `docs/` si es necesaria.
- Corregir errores pequeños y aislados de interfaz, validación o mensajes de error en archivos que no estén siendo modificados por los demás.
- Revisar especialmente:
  - inicio de sesión y creación de cuenta;
  - creación e ingreso a reuniones;
  - llamada de audio/video;
  - chat, notas adhesivas, panel AimLy;
  - reproductor de música de prueba;
  - mensajes de consola y fallos de red.
- Para cada fallo importante, abrir un issue o anotarlo con: pasos, resultado esperado, resultado actual, captura y severidad.

## Fuera de alcance

- No rediseñar funcionalidades ni rehacer componentes grandes.
- No editar `Whiteboard.tsx`, `MeetingLobbyPage.tsx`, `WaitingLobby.tsx` ni `MeetingRoomPage.tsx` sin coordinación: son las zonas asignadas a Didi/Josué.
- No modificar secretos, `.env`, configuraciones de Vercel/Supabase ni ejecutar migraciones de producción.

## Matriz mínima de pruebas

Realiza estas pruebas con cuentas reales, preferiblemente Chrome y otro navegador:

| Área | Prueba que debe pasar |
| --- | --- |
| Cuenta | Registro e inicio de sesión; ningún usuario anónimo se crea. |
| Lobby | Anfitrión e invitado ven el mismo estado `Listo`; solo el anfitrión inicia. |
| Llamada | Dos participantes pueden entrar, responder y salir sin que la página falle. |
| Chat | Mensajes nuevos aparecen para ambos sin recargar. |
| Pizarra | Texto y una imagen se ven desde ambas cuentas; reporta a Josué si falla. |
| AimLy | Una propuesta y un flujo Mermaid se añaden sin error en consola. |
| Música | El anfitrión controla reproducción; cada persona pulsa `Escuchar música` por la restricción del navegador. |
| Recuperación | Recargar no expulsa al usuario ni pierde los datos persistidos de la reunión. |

## Cómo reportar un error

Usa este formato en el issue o PR:

```md
### Título breve
Severidad: bloqueante / alta / media / baja
Entorno: navegador, dispositivo y URL (sin compartir tokens)
Pasos para reproducir:
1. ...
Resultado esperado: ...
Resultado actual: ...
Evidencia: captura, video o error de consola
```

Nunca pegues contraseñas, JWT, claves de Supabase ni archivos `.env` en GitHub, capturas o chat.

## GitHub y calidad

1. Empieza desde `main` actualizado y crea `chore/qa-integration-escobar`.
2. Separa los hallazgos de los arreglos: un issue por fallo y un PR por arreglo relacionado.
3. Antes de proponer un arreglo, revisa `git status` y `git diff`; no arrastres cambios ajenos.
4. Ejecuta siempre:

   ```bash
   npm run lint
   npm run typecheck
   npm run build:all
   ```

5. No apruebes ni mezcles tu propio PR. Pide revisión de al menos una persona.
6. Un PR solo puede ir a `main` si los tres comandos pasan y las pruebas manuales afectadas están anotadas en la descripción.
