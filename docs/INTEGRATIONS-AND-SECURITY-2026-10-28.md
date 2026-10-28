# Integraciones y revisión de seguridad — 2026-10-28

## Cambios aplicados

- Se centralizaron `is_admin()`, `is_staff()`, `is_profesor()` y `current_profile_role()` en el rol persistido de `profiles`; se eliminó la excepción de privilegios por correo electrónico.
- Se añadió `is_active_account()` y se incorporó a las políticas RLS existentes para bloquear lecturas y escrituras de cuentas con `is_active = false`, `status = 'baja'` o `disabled_at` definido.
- Las preferencias `alarm_sound` y `alarm_volume` se guardan en `profiles` con restricciones de valores.
- Las tareas tienen `source` y `external_id`, más un índice único para que una actividad de Google Classroom no se importe dos veces.
- La Edge Function `ai-chat` valida origen, tamaño de cuerpo, tipo/tamaño de imagen y usa `consume_ai_request()` para un rate limit atómico. La clave de Gemini permanece en Supabase; el cliente nunca la recibe.
- El chat acepta mensajes con texto, imágenes o ambos. Las imágenes se envían a Gemini como `inlineData` y no se persisten como archivos en el navegador.
- El workflow de Pages ejecuta `lint`, tests y build antes de publicar.

## Sonidos y licencias

La aplicación usa cuatro presets sintetizados con Web Audio (`Clásica`, `Digital`, `Campanilla` y `Suave`). Esto evita descargar un archivo de audio remoto, reduce el peso del build y elimina una dependencia de hosting externo. Se investigaron fuentes reutilizables y se dejó constancia de ellas: [BigSoundBank — Fire Alarm Communities #3](https://bigsoundbank.com/fire-alarm-communities-3-s2249.html) declara licencia CC0 y permite editar y redistribuir el sonido; la [licencia CC0 de Zapsplat](https://www.zapsplat.com/license-type/cc0-1-0-universal/) describe la renuncia de derechos. No se incorporó un binario de terceros porque los presets locales cubren la selección de sonidos sin añadir una obligación de atribución o una URL que pueda desaparecer.

## Notificaciones

El botón **Probar notificación nativa** pide permiso desde una acción explícita del usuario, registra el Service Worker y llama a `showNotification()`. Las notificaciones persistentes se muestran fuera del viewport de la página y pueden aparecer aunque el usuario haya cambiado de pestaña o aplicación. El navegador y el sistema operativo siguen controlando la posición, duración y sonido predeterminado; una web no puede garantizar que el aviso quede literalmente por encima de todas las ventanas ni reemplazar el sonido del sistema.

Para avisos con la pestaña completamente cerrada se necesita un emisor Web Push con clave privada VAPID. El repositorio conserva la suscripción y el Service Worker receptor, pero no inventa un emisor ni guarda una clave privada en el frontend. La [Notifications API de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API), [ServiceWorkerRegistration.showNotification()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification) y [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) documentan estos límites y requisitos.

## Google Classroom

1. En Google Cloud crea un cliente **Web application** y añade el origen de producción de GitHub Pages y los orígenes locales de desarrollo.
2. Activa Google Classroom API y configura la pantalla de consentimiento.
3. Define `VITE_GOOGLE_CLIENT_ID` en el entorno local y en el secreto de GitHub Actions con el mismo nombre. El Client ID web no es un secreto; nunca subas un client secret al frontend.
4. En **Google Classroom** dentro de RECORDATE pulsa **Conectar**. Para estudiantes se solicita `classroom.courses.readonly` y `classroom.coursework.me.readonly`; para perfiles de profesor/administrador se solicita el scope de coursework de estudiantes en modo solo lectura.
5. Selecciona **Agregar** en cada actividad con fecha. La importación conserva el enlace a Classroom en la descripción y es idempotente por usuario, curso y actividad.

La implementación usa el [token model de Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model), el endpoint oficial [courses.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list), la referencia [courses.courseWork.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork/list) y la guía de [scopes de Classroom](https://developers.google.com/workspace/classroom/guides/auth). Los tokens se mantienen solo en memoria y se revocan al desconectar.

## Gemini

El chat existente queda conectado a Gemini por la Edge Function `ai-chat`. `GEMINI_API_KEY` debe configurarse como secreto de Supabase; no debe ser `VITE_*` ni guardarse en el repositorio. La documentación oficial actual recomienda la Interactions API para integraciones nuevas, pero el endpoint existente usa `generateContent` con `gemini-2.5-flash` para conservar compatibilidad con el contrato actual de la aplicación; la clave sigue protegida en servidor. Consultar la [documentación oficial de Gemini API](https://ai.google.dev/gemini-api/docs) para planificar una futura migración de endpoint/modelo.

## Verificación antes de publicar

Desde `ppi-react`:

```bash
npm ci
npm run lint
npm test -- --run
npm run build
```

Después de aplicar las migraciones, revisar que `profiles`, `tasks` y `ai_messages` incluyan las nuevas columnas. En Supabase se debe validar con usuarios de prueba: estudiante activo, profesor, administrador, usuario de otro perfil y cuenta dada de baja. Una cuenta dada de baja no debe poder consultar ni modificar datos aunque conserve un JWT anterior.


## Revisión de usabilidad móvil — 2026-10-28

La barra inferior mantiene Inicio, Tareas, Calendario y Mensajes; **Más** abre el cajón organizado en Agenda, Seguimiento, Conecta y, para personal autorizado, Gestión. Perfil y Configuración quedan al pie del cajón. Configuración presenta tarjetas independientes para cuenta, recordatorios, alarmas, notificaciones e integraciones, con acceso directo a Classroom. El cajón tiene desplazamiento propio y respeta las zonas seguras de iPhone. En Chromium con viewport 390 × 844 se verificó el flujo de demo, navegación a Configuración, presencia de los cinco grupos y ausencia de desbordamiento horizontal.

En iPhone/iPad, las notificaciones web requieren agregar RECORDATE a la pantalla de inicio y autorizar los avisos en el sistema. Como en otros navegadores, el SO controla su posición y no se garantiza que queden literalmente por encima de todas las ventanas.

## Estado de Google Classroom en producción

El bundle público verificado el 2026-10-28 no contiene un Client ID OAuth de Google y `.env.production` no lo define. La pantalla ahora informa el requisito y da acceso directo desde Configuración, pero la conexión real a Classroom queda bloqueada hasta crear/configurar el Client ID web, activar Classroom API, configurar el consentimiento y autorizar `https://johanxinho.github.io` como origen en Google Cloud. El Client ID no es secreto; nunca debe exponerse un client secret en el frontend.
