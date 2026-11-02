# Auditoría y correcciones de RECORDATE — 2 de noviembre de 2026

## Correcciones verificadas

- **Alarmas por zona horaria:** RECORDATE calcula la alarma con la zona IANA guardada en la tarea y limpia el estado de alarma/snooze cuando se modifican los datos que determinan su programación.
- **Accesibilidad de diálogos:** el formulario real administra el foco, contiene el tabulador, responde a Escape, devuelve el foco al disparador y vuelve inerte el fondo mientras el modal está abierto. El diálogo de alarma también evita que el foco escape.
- **Seguridad y rendimiento de `ai-chat`:** el servidor valida sesión, cuenta activa y propiedad del hilo; limita el cuerpo de la solicitud y el historial, y aborta la llamada a Gemini a los 25 segundos. El cliente muestra errores más claros.
- **RLS de tareas asignadas:** las políticas requieren cuenta activa, rol vigente de profesor/administrador y que quien asignó la tarea sea el usuario autenticado.
- **CI de Pull Request:** se agregó un workflow de solo verificación que ejecuta auditoría de dependencias, lint, pruebas y build sin permisos de publicación.
- **OAuth y sesión de Classroom:** Google Identity Services se precarga antes del clic. La conexión de Classroom se conserva en `sessionStorage` de la pestaña y se restaura junto con el rol y los cursos al recargar; se borra al desconectar, vencer el token o recibir HTTP 401. El token no se guarda en `localStorage` ni en un backend.

## Verificación de código y servicios

La suite completa ejecutó **85 pruebas aprobadas en 18 archivos**; también pasaron `pnpm run lint` y `pnpm run build`. Las nuevas regresiones comprueban la restauración de una sesión de Classroom tras recargar el módulo, el rechazo de tokens vencidos, la limpieza al desconectar y la restauración automática de rol/cursos en el panel. `npm audit --omit=dev` había reportado 0 vulnerabilidades de producción en la revisión previa; este cambio no modifica dependencias. Node verificó la sintaxis de `ai-chat/index.ts` y `ai-chat/chatUtils.ts`.

Supabase confirmó `ai-chat` activa en versión 14 con `verify_jwt=true`; la llamada anónima de humo devolvió 401. También registró la migración `staff_task_policy_role_guard_20261102094500` (versión `20261102145550`) y la consulta posterior confirmó el control de rol en las tres políticas correspondientes.

El arreglo se publicó desde `main` en el commit **`03ba7ee`**. GitHub Actions terminó correctamente el workflow [41473981360](https://github.com/johanxinho/PRYECTO-PPI/actions/runs/41473981360); Pages registró el build `ec597d5`. El smoke test público verificó la portada con HTTP 200, **7 assets JS/CSS con HTTP 200** y la clave `recordate.google-classroom.session.v1` en el bundle publicado. `/classroom` devuelve HTTP 404 por el alojamiento estático de GitHub Pages, pero entrega la shell SPA (`id="root"` y assets), por lo que el cliente puede renderizar la ruta.

## Resultado de la prueba real de Classroom

La aplicación pública se abrió con la sesión de RECORDATE del usuario. El usuario confirmó que su cuenta de Google Classroom es **Estudiante**. En la prueba actual, al pulsar **Conectar Google Classroom**, la interfaz volvió al estado desconectado sin mostrar un consentimiento de Google ni un error visible; no se concedieron permisos y no se leyó información de Classroom. En una prueba anterior, el panel mostró 18 cursos y un HTTP 403 por materia. La conexión de extremo a extremo, la cuenta de Google elegida y la carga de tareas todavía no se han podido confirmar en el navegador.

La desconexión al recargar tenía una causa concreta: el access token y el estado `connected` vivían solo en memoria. El nuevo código restaura ambos desde el almacenamiento de sesión de la pestaña y vuelve a consultar cursos sin pedir OAuth cada vez. Esta restauración solo puede durar hasta que expire el token de acceso que entrega Google; después se debe volver a conectar.

## Límites y estado de cierre

`sessionStorage` permite conservar la sesión después de actualizar la página en esa misma pestaña, pero sigue siendo accesible para JavaScript del sitio y no es un almacén permanente de credenciales. Se borra al cerrar la pestaña o al vencer el token (normalmente alrededor de una hora, según el valor entregado por Google). Una conexión de larga duración o entre dispositivos requiere un flujo OAuth de servidor con almacenamiento protegido y renovación de tokens; no se implementa aquí.

Un HTTP 403 no se resuelve solo habilitando Classroom API: la cuenta debe tener acceso real a cada curso y el consentimiento debe corresponder al rol y scope de lectura adecuados. Por ello, la auditoría de código y la corrección de persistencia están verificadas localmente, pero el proyecto no debe declararse completamente terminado hasta publicar este cambio y completar una autorización OAuth real que muestre las materias/tareas (o un error específico y reproducible que señale la configuración externa).
