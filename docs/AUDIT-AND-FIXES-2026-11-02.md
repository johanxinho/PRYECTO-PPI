# Auditoría y correcciones de RECORDATE — 2 de noviembre de 2026

## Correcciones incluidas

- **Alarmas por zona horaria:** RECORDATE calcula la alarma con la zona IANA guardada en la tarea y limpia el estado de alarma/snooze cuando se modifican los datos que determinan su programación.
- **Accesibilidad de diálogos:** el formulario real administra el foco, contiene el tabulador, responde a Escape, devuelve el foco al disparador y vuelve inerte el fondo mientras el modal está abierto. El diálogo de alarma también evita que el foco escape.
- **Seguridad y rendimiento de `ai-chat`:** el servidor valida sesión, cuenta activa y propiedad del hilo; limita el cuerpo de la solicitud y el historial, y aborta la llamada a Gemini a los 25 segundos. El cliente muestra errores más claros.
- **RLS de tareas asignadas:** las políticas requieren cuenta activa, rol vigente de profesor/administrador y que quien asignó la tarea sea el usuario autenticado.
- **CI de Pull Request:** se agregó un workflow de solo verificación que ejecuta auditoría de dependencias, lint, pruebas y build sin permisos de publicación.
- **OAuth de Classroom:** Google Identity Services se precarga al abrir el panel (sin pedir consentimiento). Si no está disponible, la interfaz no intenta abrir el popup fuera del clic del usuario; ofrece un mensaje para reintentar. La carga del script tiene timeout de 15 s y la autorización, de 60 s, para evitar el estado indefinido “Conectando…”. Una respuesta tardía de Google se revoca.

## Verificación de código y servicios

- `pnpm exec vitest run`: **82 pruebas aprobadas en 18 archivos**, incluidas regresiones de timeouts, precarga de GIS y el clic requerido para OAuth.
- `pnpm run lint`: aprobado.
- `pnpm run build`: aprobado.
- `npm audit --omit=dev`: **0 vulnerabilidades de producción** en la revisión previa; este hotfix no modifica dependencias.
- Node verificó la sintaxis de `ai-chat/index.ts` y `ai-chat/chatUtils.ts`.
- Supabase confirmó `ai-chat` activa en versión 14 con `verify_jwt=true`; la llamada anónima de humo devolvió 401.
- Supabase registró la migración `staff_task_policy_role_guard_20261102094500` (versión `20261102145550`) y la consulta posterior confirmó el control de rol en las tres políticas correspondientes.
- El despliegue de Pages del commit `551c027` había servido la aplicación y sus assets con HTTP 200. El hotfix de Classroom descrito aquí todavía necesita commit, publicación y smoke test.

## Resultado de la prueba real de Classroom

Se abrió la aplicación publicada con la sesión de RECORDATE del usuario. Classroom estaba desconectado; se seleccionó el rol **Estudiante** y se pulsó **Conectar Google Classroom**. La interfaz permaneció en **“Conectando…”** durante más de 40 segundos, sin mostrar autorización ni error. Por ello, en esa sesión todavía **no se pudo confirmar la lectura real de cursos o tareas ni resolver de extremo a extremo el HTTP 403**.

El hotfix evita que ese bloqueo quede girando indefinidamente y prepara el script de Google antes del clic. Tras publicarlo, se debe volver a conectar con la cuenta Google que realmente está inscrita en los cursos. Si aparece una pantalla de consentimiento, revisar los scopes solicitados; si después de autorizar se reciben 403 por materia, comprobar que la cuenta pertenece a esos cursos y que el rol elegido (estudiante o docente) coincide con la cuenta.

## Límites y estado de cierre

Un HTTP 403 no se resuelve solo habilitando Classroom API: la cuenta debe tener acceso real al curso y el consentimiento debe corresponder al rol y scope de lectura adecuados. La auditoría de código está verificada, pero el proyecto no debe declararse completamente terminado hasta publicar este hotfix y completar una conexión OAuth real que muestre las actividades esperadas (o un error específico y reproducible que apunte a la configuración externa).
