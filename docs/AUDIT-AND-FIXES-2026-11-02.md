# Auditoría y correcciones de RECORDATE — 2 de noviembre de 2026

## Cambios aplicados

- **Alarmas locales por zona horaria:** el reloj del dispositivo ya no determina por error cuándo debe dispararse una tarea. RECORDATE convierte fecha y hora con la zona IANA guardada en la tarea, usando la misma utilidad que el emisor Web Push. Si se modifica fecha, hora, zona o anticipación de una tarea, se limpia su estado de alarma/snooze para que se programe de nuevo.
- **Accesibilidad de diálogos:** el formulario que realmente renderiza `App.jsx` ya no usa `autoFocus` antes de que el diálogo gestione el foco. El formulario contiene el foco de teclado, responde a Escape, devuelve foco al disparador y deja inertes los controles de fondo. Si se presenta una alarma mientras el formulario está abierto, este se oculta temporalmente del árbol accesible; el alertdialog recupera el foco si Tab lo encuentra fuera.
- **Protección de `ai-chat`:** el servidor comprueba la sesión y el estado activo de la cuenta, valida que el hilo pertenezca al usuario, valida el UUID recibido, limita el cuerpo leyendo el stream (no solo confiando en `Content-Length`), conserva como máximo 16 mensajes recientes y aborta la solicitud a Gemini a los 25 segundos. Los límites/errores se traducen a mensajes útiles en el cliente.
- **RLS de tareas asignadas:** las políticas de lectura, actualización y borrado de tareas asignadas ahora requieren simultáneamente cuenta activa, rol vigente de profesor/administrador y `assigned_by = auth.uid()`.
- **CI para cambios futuros:** se agregó un workflow de Pull Request que ejecuta auditoría de dependencias de producción, lint, pruebas y build sin permisos para publicar.

## Verificación ejecutada

- `pnpm exec vitest run`: **78 pruebas aprobadas en 18 archivos**.
- `pnpm run lint`: aprobado.
- `pnpm run build`: aprobado.
- `npm audit --omit=dev`: **0 vulnerabilidades de producción**.
- El parser de Node verificó la sintaxis de `ai-chat/index.ts` y `ai-chat/chatUtils.ts`.
- Supabase confirmó `ai-chat` activa en **versión 14**, con `verify_jwt=true`.
- La llamada de humo sin sesión al endpoint de `ai-chat` devolvió **401**, como corresponde a una función protegida.
- Se aplicó la migración `staff_task_policy_role_guard_20261102094500` (versión registrada por Supabase: `20261102145550`) y una consulta posterior confirmó `is_staff()` en las tres políticas indicadas.

## Dependencias externas que requieren validación de cuenta

Un **HTTP 403 de Google Classroom no se resuelve solo habilitando la API**. La cuenta debe tener acceso real al curso y las tareas, y el consentimiento OAuth debe incluir el scope de lectura correcto para el rol (estudiante o docente). Después de desplegar este código, reconectar Classroom eligiendo la cuenta y el rol correctos; si persiste el 403, revisar el permiso del curso y el estado de publicación/consentimiento de la aplicación en Google Cloud.

La sesión disponible no permitió ejecutar una prueba autenticada con la cuenta real del usuario, así que no se afirma que la lectura de todas las tareas de Classroom esté validada de extremo a extremo. La confirmación del nuevo despliegue público queda sujeta a que GitHub Actions termine correctamente tras publicar el commit.
