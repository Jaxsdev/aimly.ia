# Escobar — navegación, cuenta y pantallas que hoy son maqueta

## Misión

Eliminar promesas falsas de la interfaz principal. La barra lateral contiene enlaces sin ruta, el perfil usa un usuario de demostración y el buscador/avisos no realizan una acción. Tu tarea es volver útil la navegación y la cuenta, sin modificar reuniones, resultados ni pizarra.

## Entregables obligatorios

### 1. Navegación y perfil reales

- Sustituir `demoUser` en `apps/web/src/components/layout/AppLayout.tsx` por el usuario de `AuthContext`.
- Mostrar nombre, correo y avatar disponibles; tener alternativa legible cuando no exista avatar o nombre.
- Al pulsar el perfil, abrir un menú con `Ajustes` y `Cerrar sesión` funcional. Cerrar sesión debe limpiar la sesión y redirigir a `/`.
- Eliminar o desactivar claramente el botón `Actualizar plan` hasta que haya facturación. No debe aparentar que funciona.

### 2. Ajustes funcionales

- Crear la ruta `/settings` y `SettingsPage.tsx`.
- Permitir editar nombre visible y avatar por URL (si el perfil actual lo soporta); validar URL y mostrar estado guardando/error/éxito.
- Incluir una sección de cuenta con correo de solo lectura y cierre de sesión.
- No guardes secretos, tokens ni claves en la interfaz.

### 3. Búsqueda global honesta y útil

- Conectar el buscador del encabezado a la ruta `/meetings` con el parámetro `?q=`. Didi implementará el filtrado de reuniones; aquí solo captura el texto, usa Enter y muestra un botón para limpiar.
- Mientras Didi no integre su PR, la búsqueda debe seguir navegando sin romper la app.
- Botón de campana: si no existe sistema de notificaciones, reemplazarlo por un icono sin punto naranja y `title="Sin notificaciones todavía"`. No dejes una alerta falsa.

### 4. Enlaces que aún no existen

- `Plantillas` e `Integraciones` deben ser rutas reales de estado `Próximamente`, explicando que aún no están disponibles. No inventes datos ni botones que aparenten guardar.
- `Tareas` y `Decisiones` deben enlazar a `/tasks` y `/decisions`; Josué implementará su contenido. Si esas rutas aún no existen en su rama, crea solo una navegación segura y coordina la integración, no una página duplicada.

## Archivos que sí puedes tocar

- `apps/web/src/components/layout/AppLayout.tsx`
- nuevos: `apps/web/src/pages/SettingsPage.tsx`, `ComingSoonPage.tsx`
- `apps/web/src/App.tsx` solo para settings/plantillas/integraciones
- `apps/web/src/contexts/AuthContext.tsx` y `apps/web/src/lib/api.ts` solo si son imprescindibles para editar perfil.

## No tocar

- `HomePage.tsx`, `MeetingsPage.tsx`, `server.ts` (Didi).
- `MeetingResultPage.tsx`, tareas, decisiones (Josué).
- lobby, sala, pizarra, llamadas y `MeetingContext.tsx`.

## Criterios de aceptación y pruebas

1. Iniciar con dos cuentas y comprobar que cada una ve su propio nombre/correo, no `demoUser`.
2. Guardar un nombre/avatar válido, recargar e iniciar sesión de nuevo: los datos continúan.
3. URL de avatar inválida muestra error y no cambia el perfil.
4. Cerrar sesión lleva a `/`; al intentar `/home` se exige iniciar sesión.
5. Buscar, presionar Enter y limpiar; la URL y navegación son correctas.
6. Plantillas e Integraciones muestran aviso honesto; Tareas y Decisiones navegan a las rutas de Josué al integrar ambos PR.
7. Revisar consola y móvil: no hay enlaces rotos ni errores rojos.

## GitHub

- Rama: `feat/account-navigation-escobar`.
- Coordina con Didi/Josué antes de modificar `App.tsx`; cada uno agrega rutas distintas y el conflicto debe resolverse en un único commit de integración.
- Ejecuta `npm run lint`, `npm run typecheck` y `npm run build:all` antes del PR.
- Describe funciones terminadas, capturas y resultados de las siete pruebas. Pide revisión y no mezcles tu propio PR.
