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

Para avisos con la pestaña cerrada ya se desplegó `send-push` en Supabase. Las claves VAPID privadas y el secreto del scheduler viven en Supabase, no en el frontend; Vault entrega al cron únicamente la clave publishable y el secreto dedicado. `pg_cron` llama al emisor cada minuto y la tabla de entregas evita duplicados y conserva estado durante 90 días. La prueba autenticada `dry_run` respondió HTTP 200 con cero envíos. En producción todavía no hay suscripciones Push ni perfiles que hayan aceptado el opt-in; cada persona debe activar **Notificaciones del navegador** en Configuración y conceder permiso en su navegador. La presentación depende del navegador y del sistema operativo; en iPhone/iPad se requiere instalar RECORDATE en la pantalla de inicio. Referencias: [Notifications API de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API), [ServiceWorkerRegistration.showNotification()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification) y [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

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
- Las notificaciones del sistema solicitan persistencia y vibración cuando la plataforma las admite. Eso no fuerza banners superpuestos ni el sonido del sistema operativo. El emisor Web Push de Supabase y su scheduler ya están activos; las pruebas no enviaron avisos reales. La verificación agregada encontró cero suscripciones Push y cero perfiles con opt-in, así que la entrega a un dispositivo queda pendiente de que el usuario habilite la función.
- Se añadió un manifiesto PWA para facilitar la instalación en móviles. En iPhone, además, hay que agregar el sitio a la pantalla de inicio y habilitar notificaciones desde Ajustes de iOS; el comportamiento final sigue sujeto a iOS.

Verificación local y de CI del commit `e06a9c3`: lint correcto, `npm test -- --run` correcto (**5 archivos / 32 pruebas**), build correcto y `git diff --check` limpio. El workflow de GitHub Pages para `e06a9c3` terminó exitosamente; las pruebas simulan Web Audio y no sustituyen una prueba acústica en cada modelo de teléfono o configuración de volumen del sistema.


Verificación local actual: **9 archivos de prueba y 48 pruebas aprobadas**, lint y build correctos; `npm audit` y `npm audit --omit=dev` reportan cero vulnerabilidades. Deno `check`, `node --check public/sw.js` y una prueba de inicialización de `web-push` en su runtime también pasaron. El chequeo global opcional `npm run format:check` sigue marcando 53 archivos del repositorio; no se reformateó toda la base para evitar un diff masivo. La versión de producción usa `VITE_BASE=/PRYECTO-PPI/`.

## Hallazgos de seguimiento de roles/RLS — corrección aplicada en producción

Antes de la corrección, la inspección de solo lectura de Supabase confirmó que el trigger `auth.users → public.handle_new_user()` podía asignar un rol privilegiado usando una excepción por correo y aceptaba `profesor` desde `user_metadata`. Además, la política `profiles insert own row` solo comprobaba `id = auth.uid()`, sin restringir el rol de una inserción directa. Los helpers `is_admin()`, `is_staff()` y `current_profile_role()` ya autorizaban según el rol persistido y el estado activo.

La migración [20261028181507_auth_signup_role_hardening.sql](../supabase/migrations/20261028181507_auth_signup_role_hardening.sql) se aplicó y quedó registrada en Supabase como versión `20261028181507`. La comprobación posterior confirmó que el trigger ya no contiene la excepción ni admite los literales de rol privilegiado; la política de INSERT exige un rol no privilegiado y cuenta activa; los cuatro RPC de roles/directorio rechazan `anon` y conservan `authenticated`. La migración no modificó filas ni el rol almacenado del administrador actual.


## Publicación y smoke test público — 2026-10-28

El commit `fae3863` quedó en `main`; el workflow de GitHub Pages `40743575830` terminó en `success`, incluidos `npm ci`, lint, las 39 pruebas, build y publicación. La aplicación, el manifiesto, el Service Worker y los bundles referenciados responden HTTP 200. El `start_url` y el `scope` relativos del manifiesto resuelven correctamente bajo `/PRYECTO-PPI/`. Se comprobó sin imprimir el valor que el bundle contiene el Client ID web de Google; también se encontraron en los chunks publicados los textos del control de alarma, anticipación Classroom, error de importación y navegación de tarea.

No se hizo un inicio de sesión/consentimiento real de Google ni una conversación autenticada de Gemini: requieren una sesión de usuario y aprobación OAuth. Tampoco se puede validar el sonido o la presentación de notificaciones en cada modelo de teléfono desde CI. El workflow se actualizó a actions fijadas por commit con runtime Node 24. Web Push quedó configurado en Supabase; no se probó una entrega real porque en producción no hay suscripciones activas. Una web no puede forzar banners siempre encima de otras aplicaciones.


## Avisos residuales de Supabase — seguimiento recomendado

Después de las migraciones, el asesor de seguridad ya no reporta funciones SECURITY DEFINER ejecutables por `anon`. Aún marca 19 RPC SECURITY DEFINER accesibles a `authenticated`; es un aviso genérico, no una prueba de vulnerabilidad. La migración `20261028190423_push_scheduler_and_profile_lookup` endureció `find_profile_by_email(text)`: exige una sesión autenticada activa, valida el correo exacto y solo devuelve perfiles de destino activos; en producción se verificó que `anon` no puede ejecutar el RPC y `authenticated` sí. La revisión de otros RPC sensibles confirmó guardas por rol/sesión o filtrado por `auth.uid()` en asignación de tareas, mensajes, compartición y directorio. El asesor también informa que la protección de contraseñas filtradas está desactivada; puede habilitarse en Auth de Supabase, teniendo en cuenta que rechazará contraseñas comprometidas al registrar o cambiar contraseña. Referencias: [funciones SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Siete tablas heredadas (`actividades`, `agendas_compartidas`, `cursos`, `matriculas`, `mensajes`, `recordatorios` y `usuarios`) tienen RLS activado pero ninguna política; por diseño, los clientes no pueden leer ni escribirlas. La búsqueda del repositorio no encontró uso actual de esas tablas en el frontend/Edge Functions, pero conviene confirmarlo antes de borrarlas o añadir políticas. Referencia: [RLS activado sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

El asesor de rendimiento reporta 21 claves foráneas sin índice de cobertura, 30 políticas con reevaluación de `auth.*` por fila, 4 índices no usados y 8 conjuntos de políticas permisivas solapadas. No son fallos funcionales ni se modificaron automáticamente: índices y políticas requieren revisar consultas reales antes de cambios. Referencias: [índices de claves foráneas](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [índices no usados](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) y [políticas permisivas solapadas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).


## Cierre Web Push y deep-links — 2026-10-28

El commit `6151498` publicó la función `send-push`, la migración `20261028190423_push_scheduler_and_profile_lookup`, las claves públicas de build y las acciones actualizadas de GitHub; el workflow `40751671806` terminó correctamente. El commit `3ce1715` añadió `dist/404.html` para que GitHub Pages sirva la SPA en rutas internas; su workflow y despliegue dinámico (`40751997454`, `40752083351`) finalizaron correctamente. El commit final `d328df2` hizo que el Service Worker resuelva el clic de una alarma mediante `/?view=%2Ftareas`, valide que el destino permanezca dentro del origen/alcance de RECORDATE y use el mismo formato en notificaciones locales; el workflow `40752802183` y el despliegue Pages `40752879257` finalizaron en `success`.

La prueba HTTP en producción confirmó que la raíz y `/?view=%2Ftareas` responden 200; el manifiesto, el Service Worker y los seis chunks JavaScript referenciados también responden 200. El bundle contiene la clave VAPID pública configurada y los textos de activación Push. El Service Worker publicado contiene el enlace seguro a tareas y la protección contra destinos externos. GitHub Pages todavía devuelve estado HTTP 404 para la URL antigua `/tareas`, pero sirve el mismo shell de la app desde `404.html`; las notificaciones usan el query route de raíz y evitan esa respuesta 404.

En Supabase se comprobó que `recordate-send-push-every-minute` está activo cada minuto y que sus tres ejecuciones más recientes terminaron `succeeded`. La prueba autenticada `dry_run` respondió HTTP 200 con `sent: 0`, `failed: 0`, `expired: 0` y `skipped: 0`; no envió notificaciones. El recuento agregado registró cero suscripciones Push y cero perfiles activos con opt-in al momento de la auditoría. Por lo tanto, el backend está listo, pero la entrega real a un teléfono no se puede probar hasta que un usuario active **Configuración → Notificaciones del navegador** y autorice el permiso en un dispositivo/navegador compatible. En iPhone/iPad debe instalarse primero la PWA desde la pantalla de inicio. El sistema operativo decide cómo presenta cada aviso y la web no puede forzar que siempre quede por encima de otras aplicaciones.

La tabla `push_delivery_log` quedó con RLS habilitado: `anon` y `authenticated` no tienen `SELECT`, mientras `service_role` sí. El RPC `find_profile_by_email(text)` quedó ejecutable solo por `authenticated` y validado contra cuentas activas. No se expusieron secretos VAPID ni la clave del scheduler en el repositorio; la clave pública de VAPID es la única incluida en el build.


## Correcciones de consola reportadas — 2026-10-28

Se añadió `mobile-web-app-capable=yes` y se conservó `apple-mobile-web-app-capable=yes`, de modo que Chromium deja de advertir por la etiqueta obsoleta sin perder compatibilidad de instalación en iOS. El HTML público actualizado referencia `index-BHGpdmZd.css`, mientras que la consola del navegador solicitaba el hash anterior `index-BOrMBj_F.css`: el post-build ahora publica un alias compatible con ese hash, apuntando al mismo contenido de la hoja actual; el workflow de Pages también conserva archivos existentes de `assets/` para que una página antigua aún cacheada no provoque 404 después de próximas publicaciones.

El selector de idioma cargaba Google Translate al montar la página, aunque el usuario permaneciera en español. Ahora carga el script externo solo cuando se solicita inglés. `ERR_BLOCKED_BY_CLIENT` significa que el navegador o una extensión/filtro bloqueó esa petición; no se puede eludir desde la app. Si se desea usar el cambio a inglés, hay que permitir Google Translate para el sitio; el resto de la app no depende de ese servicio.

El endpoint de salud de Supabase Auth respondió HTTP 200 en 0,17 s desde el entorno de auditoría con la clave pública de producción, y el endpoint REST también respondió a la prueba de conectividad. El `ERR_CONNECTION_TIMED_OUT` observado en el navegador no se reprodujo aquí y apunta a un corte transitorio o a la red/filtro del dispositivo. No se cambió la configuración de Supabase; si persiste, probar otra red y revisar VPN, firewall o bloqueadores del navegador.

Validación local: lint correcto, **8 archivos / 46 pruebas aprobadas**, build correcto; se comprobó que el CSS de compatibilidad es byte a byte igual al CSS generado, que `404.html` existe y que ambos metadatos PWA están presentes en el HTML compilado. El chequeo HTTP público se completa tras el siguiente despliegue.


Actualización final de pruebas: se añadieron dos pruebas de regresión para el selector de idioma (no cargar Google Translate en español y revertir a español si el navegador lo bloquea). El total vigente es **9 archivos / 48 pruebas aprobadas**; esta cifra sustituye el primer pase local de 8 archivos / 46 pruebas indicado en la sección de correcciones.
