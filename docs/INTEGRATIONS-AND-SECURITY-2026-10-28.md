# Integraciones y revisión de seguridad — 2026-10-28

## Cambios aplicados

- Se centralizaron `is_admin()`, `is_staff()`, `is_profesor()` y `current_profile_role()` en el rol persistido de `profiles`. Una auditoría posterior encontró y corrigió en producción una excepción residual de alta por correo y la aceptación de `profesor` desde metadata, mediante la migración `auth_signup_role_hardening`.
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

La versión publicada en GitHub Pages tras el commit `e06a9c3` contiene un Client ID OAuth web (verificado por patrón sin exponer su valor). La página, el manifiesto y el Service Worker responden correctamente. Para completar una conexión real, el proyecto de Google Cloud debe mantener habilitada Classroom API, consentimiento OAuth válido y el origen autorizado `https://johanxinho.github.io`; también se requiere que la cuenta otorgue permisos de lectura. El Client ID no es secreto; nunca debe exponerse un client secret en el frontend.


## Corrección funcional de alarmas y Classroom — 2026-10-28

- El tono `Clásica` se presenta ahora como **Sirena potente**; el preset digital también usa pulsos más audibles. El volumen se transforma a una ganancia útil en Web Audio, en lugar de quedar limitado al 18% de la señal como antes.
- Un gesto del usuario (o el botón **Escuchar y activar sonido**) desbloquea el contexto de audio. La alarma repite el tono durante hasta 30 segundos; el aviso permite reintentar el audio, detenerlo, marcar la tarea como completada o posponerla realmente 5 minutos. Los recordatorios vencidos se comprueban al volver a la pestaña y tienen una ventana de recuperación de hasta una hora después del vencimiento.
- En Google Classroom cada actividad tiene un selector de anticipación y el botón **Agregar alarma**. La elección se guarda como `reminder` en la tarea existente, con idempotencia por `external_id`; se aplican también los interruptores globales Recordatorios y Alarmas. No hizo falta una nueva migración de esquema.
- Las notificaciones del sistema solicitan persistencia y vibración cuando la plataforma las admite. Eso no fuerza banners superpuestos ni el sonido del sistema operativo. **RECORDATE aún no tiene un emisor Web Push en Supabase**; la suscripción/Service Worker receptora no basta para avisar cuando la página está cerrada. Para eso falta configurar la clave privada VAPID y desplegar un emisor/scheduler backend seguro.
- Se añadió un manifiesto PWA para facilitar la instalación en móviles. En iPhone, además, hay que agregar el sitio a la pantalla de inicio y habilitar notificaciones desde Ajustes de iOS; el comportamiento final sigue sujeto a iOS.

Verificación local y de CI del commit `e06a9c3`: lint correcto, `npm test -- --run` correcto (**5 archivos / 32 pruebas**), build correcto y `git diff --check` limpio. El workflow de GitHub Pages para `e06a9c3` terminó exitosamente; las pruebas simulan Web Audio y no sustituyen una prueba acústica en cada modelo de teléfono o configuración de volumen del sistema.


Verificación final local de esta revisión: **6 archivos de prueba y 39 pruebas aprobadas**, lint y build correctos; `npm audit` y `npm audit --omit=dev` reportan cero vulnerabilidades tras actualizar dependencias dentro de los rangos semver existentes. También se compiló con `VITE_BASE=/PRYECTO-PPI/` y se comprobó que el manifiesto queda bajo `/PRYECTO-PPI/`, con alcance correcto para GitHub Pages.

## Hallazgos de seguimiento de roles/RLS — corrección aplicada en producción

Antes de la corrección, la inspección de solo lectura de Supabase confirmó que el trigger `auth.users → public.handle_new_user()` podía asignar un rol privilegiado usando una excepción por correo y aceptaba `profesor` desde `user_metadata`. Además, la política `profiles insert own row` solo comprobaba `id = auth.uid()`, sin restringir el rol de una inserción directa. Los helpers `is_admin()`, `is_staff()` y `current_profile_role()` ya autorizaban según el rol persistido y el estado activo.

La migración [20261028181507_auth_signup_role_hardening.sql](../supabase/migrations/20261028181507_auth_signup_role_hardening.sql) se aplicó y quedó registrada en Supabase como versión `20261028181507`. La comprobación posterior confirmó que el trigger ya no contiene la excepción ni admite los literales de rol privilegiado; la política de INSERT exige un rol no privilegiado y cuenta activa; los cuatro RPC de roles/directorio rechazan `anon` y conservan `authenticated`. La migración no modificó filas ni el rol almacenado del administrador actual.


## Publicación y smoke test público — 2026-10-28

El commit `fae3863` quedó en `main`; el workflow de GitHub Pages `40743575830` terminó en `success`, incluidos `npm ci`, lint, las 39 pruebas, build y publicación. La aplicación, el manifiesto, el Service Worker y los bundles referenciados responden HTTP 200. El `start_url` y el `scope` relativos del manifiesto resuelven correctamente bajo `/PRYECTO-PPI/`. Se comprobó sin imprimir el valor que el bundle contiene el Client ID web de Google; también se encontraron en los chunks publicados los textos del control de alarma, anticipación Classroom, error de importación y navegación de tarea.

No se hizo un inicio de sesión/consentimiento real de Google ni una conversación autenticada de Gemini: requieren una sesión de usuario y aprobación OAuth. Tampoco se puede validar el sonido/notificación en cada modelo de teléfono desde CI. La notificación con la página cerrada sigue requiriendo VAPID y un emisor Web Push seguro. GitHub dejó dos avisos no bloqueantes sobre la retirada de Node 20 en algunas actions y la futura/migrada versión de `ubuntu-latest`; el workflow se completó correctamente, pero conviene actualizar las actions/runner en una mejora posterior.


## Avisos residuales de Supabase — seguimiento recomendado

Después de la migración, el asesor de seguridad ya no reporta funciones SECURITY DEFINER ejecutables por `anon`. Aún marca 19 RPC SECURITY DEFINER accesibles a `authenticated`; es un aviso genérico, no una prueba de vulnerabilidad. La revisión de los RPC sensibles confirmó guardas por rol/sesión o filtrado por `auth.uid()` en asignación de tareas, mensajes, compartición y directorio. Sí queda un punto concreto para decidir: `find_profile_by_email(text)` es usado por la app para iniciar mensajes/compartir y devuelve el perfil coincidente (id, nombre, correo, rol y avatar) a cualquier sesión autenticada que conozca el correo; no comprueba que la cuenta solicitante ni el destinatario estén activos. No se cambió su contrato en esta publicación para no alterar la función de búsqueda sin aprobación específica. El asesor también informa que la protección de contraseñas filtradas está desactivada; puede habilitarse en Auth de Supabase, teniendo en cuenta que rechazará contraseñas comprometidas al registrar o cambiar contraseña. Referencias: [funciones SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Siete tablas heredadas (`actividades`, `agendas_compartidas`, `cursos`, `matriculas`, `mensajes`, `recordatorios` y `usuarios`) tienen RLS activado pero ninguna política; por diseño, los clientes no pueden leer ni escribirlas. La búsqueda del repositorio no encontró uso actual de esas tablas en el frontend/Edge Functions, pero conviene confirmarlo antes de borrarlas o añadir políticas. Referencia: [RLS activado sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

El asesor de rendimiento reporta 21 claves foráneas sin índice de cobertura, 30 políticas con reevaluación de `auth.*` por fila, 4 índices no usados y 8 conjuntos de políticas permisivas solapadas. No son fallos funcionales ni se modificaron automáticamente: índices y políticas requieren revisar consultas reales antes de cambios. Referencias: [índices de claves foráneas](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [índices no usados](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) y [políticas permisivas solapadas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
