# Tarea de Josué — colaboración de pizarra e imágenes

## Objetivo

Validar y mejorar la colaboración visual de Excalidraw: texto, formas, imágenes y recuperación al recargar. El resultado debe ser que todos los participantes vean el mismo tablero sin borrar el trabajo ajeno.

## Alcance permitido

- Trabajar únicamente en la pizarra y su soporte de archivos:
  - `apps/web/src/components/meeting/Whiteboard.tsx`
  - pruebas o utilidades nuevas exclusivamente bajo `apps/web/src/components/meeting/`
  - documentación de pruebas de pizarra, si hace falta.
- Priorizar problemas reproducibles: imágenes que no cargan, elementos duplicados, parpadeos, pérdida tras recargar o conflicto al dibujar a la vez.
- Comprobar la migración de imágenes existente y documentar claramente si falta aplicarla en Supabase:
  - `apps/api/src/db/migrations/20260811_excalidraw_image_files.sql`

## Fuera de alcance

- No cambies `MeetingContext.tsx`: es la capa compartida de tiempo real y puede estar siendo modificada por otra persona.
- No modificar rutas API, esquema SQL, autenticación, llamadas ni panel de IA.
- No añadir librerías ni almacenamiento externo sin aprobarlo primero.

## Reglas técnicas

- No envíes imágenes pesadas directamente por el canal de tiempo real. El canal sirve para actualización rápida; la escena persistida es la recuperación confiable.
- No borres ni sobrescribas elementos remotos al recibir cambios. Conserva la reconciliación de Excalidraw.
- Usa archivos de imagen de tamaño razonable durante las pruebas (PNG/JPG/WebP) y documenta límites observados.
- Si detectas que falta una migración, no la ejecutes contra producción: informa primero y deja la instrucción SQL clara.

## Pruebas manuales obligatorias

Con dos cuentas y dos navegadores en la misma reunión:

- Crear texto, rectángulos, flechas y notas: ambas pantallas los ven.
- Subir una imagen pequeña y confirmar que aparece en el otro navegador sin recargar.
- Subir una imagen más grande; confirmar que se recupera después del guardado automático.
- Recargar el navegador que no subió la imagen: la escena e imagen deben recuperarse.
- Entrar a la reunión después de que la imagen exista: debe verla.
- Dos personas dibujan al mismo tiempo: los trazos no desaparecen ni reemplazan el contenido del otro.
- Borrar una imagen y recargar: no debe reaparecer.
- Verificar consola: no debe haber errores rojos relacionados con Excalidraw ni archivos faltantes.

## GitHub y calidad

1. Sincroniza `main` y crea la rama `fix/whiteboard-collaboration-josue`.
2. No edites los mismos archivos que Didi o Escobar. Si necesitas `MeetingContext.tsx`, abre un issue o pregunta antes.
3. Commits atómicos: `fix: preserve image files in whiteboard` es mejor que un commit genérico.
4. No incluyas `.env`, `node_modules`, archivos de prueba sueltos ni cambios de compilación en el PR.
5. Ejecuta antes de subir:

   ```bash
   npm run lint
   npm run typecheck
   npm run build:all
   ```

6. En el PR incluye una tabla con cada prueba manual, resultado y navegador usado. Adjunta un video corto o capturas de la prueba con dos participantes.
