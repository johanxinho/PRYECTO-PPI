# Explicación equipo RECORDATE

Manual técnico para el equipo de desarrollo de **RECORDATE** (Proyecto Pedagógico Integrador, grado 11 · IE La Candelaria, Medellín).

> **Audiencia:** compañeros y compañeras que van a leer, modificar o desplegar el código.  
> **No es el manual de usuario final.** Eso está en [`MANUAL-DE-USUARIO.md`](MANUAL-DE-USUARIO.md).  
> **Complemento técnico más corto:** [`PROJECT-DOCUMENTATION.md`](PROJECT-DOCUMENTATION.md).

Este documento se basa en el código y las migraciones reales de la rama `main` (carpeta `ppi-react/`, `supabase/migrations/`, `.github/workflows/pages.yml`). Si algo del código cambia, actualiza este archivo en el mismo PR.

---

## Índice

1. [Visión del proyecto y stack](#1-visión-del-proyecto-y-stack)
2. [Mapa del repositorio](#2-mapa-del-repositorio)
3. [Definiciones / glosario técnico](#3-definiciones--glosario-técnico)
4. [Arranque local y variables de entorno](#4-arranque-local-y-variables-de-entorno)
5. [Arquitectura de la app](#5-arquitectura-de-la-app)
6. [Flujos clave](#6-flujos-clave)
7. [Supabase en detalle](#7-supabase-en-detalle)
8. [Despliegue GitHub Pages](#8-despliegue-github-pages)
9. [Convenciones del equipo](#9-convenciones-del-equipo)
10. [Cómo aportar / checklist de PR](#10-cómo-aportar--checklist-de-pr)
11. [Asistente de IA (detalle)](#11-asistente-de-ia-detalle)

---

## 1. Visión del proyecto y stack

**RECORDATE** es una SPA (Single Page Application) de recordatorios y organización de actividades académicas. El estudiante (u otro rol) puede registrar tareas con materia, fecha, hora, prioridad y recordatorio; ver calendario; usar modo enfoque; recibir alarmas mientras la app está abierta; compartir agendas; enviar mensajes internos; gestionar perfil (rol + avatar); y usar un **asistente de IA** (Gemini) con historial y fotos.

### Stack real (según `ppi-react/package.json` y el código)

| Capa | Tecnología | Dónde se ve |
| --- | --- | --- |
| UI | **React 19** + JSX | `ppi-react/src/App.jsx`, componentes |
| Build / dev | **Vite 8** | `ppi-react/vite.config.js`, scripts `dev` / `build` |
| Backend BaaS | **Supabase** (Auth, Postgres, Storage, Realtime, Edge Functions) | `supabaseClient.js`, `dataService.js`, `aiChatService.js`, migraciones SQL |
| Asistente IA | **Gemini 3.6 Flash** vía Edge Function `ai-chat` | `components/AiChat.jsx`, secreto `GEMINI_API_KEY` |
| Estilos | CSS propio (`recordate.css`) | Identidad navy / vidrio; no depende de Bootstrap de forma central |
| Iconos | Lucide React | Importados en `App.jsx` |
| Motion / tipografía | Motion + componentes UI | `components/ui/morphing-text.tsx`, `dia-text-reveal` |
| Hosting | **GitHub Pages** (rama `gh-pages`) | `.github/workflows/pages.yml` |
| Base path producción | `/PRYECTO-PPI/` | `VITE_BASE` en el workflow + `paths.js` |

Sitio publicado: https://johanxinho.github.io/PRYECTO-PPI/

### Qué NO es este repo

- No hay backend propio (Express, Nest, etc.): la lógica de datos vive en Supabase + el cliente.
- No hay React Router: las rutas las manejan `screen` / `view` + `history.pushState` en `paths.js`.
- `dia-30-07/` y los HTML de la raíz son prototipos heredados, **no** la app principal.
- Web Push está preparado (VAPID + `public/sw.js`), pero **enviar** push con la app cerrada requiere un emisor externo que este repo no incluye.

---

## 2. Mapa del repositorio

```text
PRYECTO-PPI/
├── ppi-react/                          # ← Aplicación principal RECORDATE
│   ├── index.html
│   ├── package.json                    # React 19, Vite 8, @supabase/supabase-js, lucide, motion
│   ├── vite.config.js                  # plugin React, base VITE_BASE, alias @, copia 404.html
│   ├── .env.example                    # Plantilla de variables (sin secretos reales)
│   ├── .env.production                 # URL + anon key usados en el build de Pages
│   ├── public/
│   │   ├── brand/                      # Logo PNG, Electric Gaze, marca
│   │   └── sw.js                       # Service Worker (push)
│   └── src/
│       ├── main.jsx                    # Monta <App /> e importa recordate.css
│       ├── App.jsx                     # Landing, auth, panel, formularios, calendario, chat…
│       ├── Brand.jsx                   # Logo + wordmark
│       ├── recordate.css               # Estilos globales de la identidad
│       ├── paths.js                    # appBase, currentPath, pushRoute, assetUrl
│       ├── supabaseClient.js           # createClient o null si faltan env
│       ├── dataService.js              # CRUD Supabase + RPCs + Storage
│       ├── demoStore.js                # Modo demo (localStorage)
│       ├── services/
│       │   ├── authService.js          # signup / login / logout / perfil (capa auxiliar)
│       │   ├── sharedAgendaService.js  # Wrapper sobre share/list/revoke
│       │   └── aiChatService.js        # invoke ai-chat + historial + signed URLs
│       ├── components/
│       │   ├── AiChat.jsx              # Chat flotante: clip, historial, Gemini
│       │   ├── Login.jsx               # Login, registro, OTP, recovery, demo
│       │   ├── WebGLBackground.jsx
│       │   ├── AsciiEffect.jsx
│       │   └── ui/                     # MorphingText, DiaTextReveal
│       └── shaders/halftoneFrag.js
├── supabase/migrations/                # SQL: tablas, RLS, triggers, RPCs, buckets
│   ├── 20260826_recordate.sql          # Esquema base
│   ├── 20260828_shared_agendas.sql     # Grants + policies de adjuntos compartidos
│   ├── 20260908_fix_task_attachment_storage_policies.sql
│   ├── 20260912_fix_drop_profile_functions.sql  # Hotfix DROP (si falló 42P13)
│   └── 20260912_roles_avatar_messages_shared.sql  # Roles, avatars, mensajes, shares enriquecidos
├── docs/
│   ├── MANUAL-DE-USUARIO.md            # Para usuarios finales
│   ├── PROJECT-DOCUMENTATION.md        # Doc técnica general
│   └── EXPLICACION-EQUIPO-RECORDATE.md # Este manual
├── .github/workflows/pages.yml         # CI: npm ci → build → gh-pages
├── dia-30-07/                          # Ejercicio Vite aparte (no arrancar RECORDATE desde aquí)
├── iniciodesesión.html / registrarse.html / menu.html  # Prototipos HTML estáticos
└── README.md                           # Entrada del repo
```

**Regla práctica:** casi todo el trabajo de producto ocurre en `ppi-react/src/` y, si tocas datos, en `supabase/migrations/`.

---

## 3. Definiciones / glosario técnico

| Término | Significado en RECORDATE |
| --- | --- |
| **Auth** | Supabase Auth: registro, login, sesión JWT, OTP de correo, recovery. El cliente usa `supabase.auth.*` en `Login.jsx` y escucha `onAuthStateChange` en `App.jsx`. |
| **Session** | Objeto con `user` + tokens. Si hay sesión válida, `App` pasa a `screen === "app"` y carga perfil/tareas. |
| **OTP** | Código de 6 dígitos enviado al correo al registrarse. Se confirma con `supabase.auth.verifyOtp({ type: "signup", ... })` en `Login.jsx`. |
| **RLS** | *Row Level Security*: políticas SQL que deciden qué filas puede leer/escribir cada `auth.uid()`. El frontend **no** es la barrera real; RLS sí. |
| **RPC** | Función Postgres expuesta vía `supabase.rpc("nombre", { ... })`. Ej.: `find_profile_by_email`, `list_my_messages`, `mark_messages_read`, `list_task_shares`, `share_task_by_email`. |
| **Security definer** | Función SQL que corre con privilegios del dueño (bypass parcial de RLS controlado). Se usa para buscar perfiles por email o listar mensajes con joins sin abrir toda la tabla `profiles`. |
| **Storage bucket** | Contenedor de archivos en Supabase Storage: `avatars` (público), `task-attachments` (privado) y `ai-chat` (privado, fotos del asistente). |
| **Edge Function** | Función Deno en Supabase. `ai-chat` recibe el JWT, llama a Gemini y guarda el hilo. La API key **no** va al navegador. |
| **appBase** | Prefijo de rutas SPA. En Pages es `/PRYECTO-PPI`; en local es vacío (base `/`). Definido en `ppi-react/src/paths.js` a partir de `import.meta.env.BASE_URL`. |
| **SPA base path** | Vite `base: process.env.VITE_BASE \|\| "/"`. En CI se fuerza `VITE_BASE=/PRYECTO-PPI/` para que assets y rutas no apunten a la raíz de `github.io`. |
| **Demo mode** | Sesión falsa `andrea@recordate.local` vía `demoStore.js` / `DEMO_SESSION`. Datos en `localStorage` (`recordate-demo-v2`). No habla con Supabase. |
| **Modo Supabase** | Cuando `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son reales (`hasSupabaseConfig === true`), `App` usa `dataService.js`. |
| **Anon key** | Clave *publishable* del cliente. Va en el frontend a propósito. **Nunca** uses `service_role` en el navegador. |
| **Trigger `handle_new_user`** | Al insertar en `auth.users`, crea/actualiza fila en `public.profiles` (nombre, email, rol, avatar). |
| **Realtime** | Suscripciones Postgres Changes en `messages` y `notifications` (`subscribeToMessages` / `subscribeToNotifications`). |
| **screen / view** | `screen`: `landing` \| `auth` \| `app`. `view`: sección del panel (`Inicio`, `Mis tareas`, `Calendario`, …). |

---

## 4. Arranque local y variables de entorno

### Requisitos

- Node.js **20+** (el workflow de Pages usa Node **22**)
- npm
- Git
- (Opcional pero recomendado) proyecto Supabase propio o acceso al del equipo

### Pasos

```bash
git clone https://github.com/johanxinho/PRYECTO-PPI.git
cd PRYECTO-PPI/ppi-react
npm install
cp .env.example .env
# Edita .env con URL y anon key reales si vas a probar Auth / datos en la nube
npm run dev
```

Abre la URL que imprime Vite (normalmente `http://localhost:5173/`).

### Variables (`ppi-react/.env.example`)

```env
VITE_SUPABASE_URL=tu_project_url_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_VAPID_PUBLIC_KEY=tu_clave_publica_vapid_aqui
```

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Para Auth/datos reales | URL del proyecto (`https://….supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Para Auth/datos reales | Clave anon/publishable |
| `VITE_VAPID_PUBLIC_KEY` | No | Solo Web Push; sin emisor backend no sirve con la app cerrada |

`supabaseClient.js` trata los textos `tu_project_url_aqui` / `tu_anon_key_aqui` como placeholders: si no los cambias, `supabase` queda `null` y la UI invita a la **demostración**.

Para producción (Pages), el build usa `ppi-react/.env.production` salvo que existan secretos de Actions (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`) que lo sobreescriban (ver workflow).

### Scripts útiles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` | ESLint |
| `npm run build` | Genera `dist/` |
| `npm run preview` | Sirve el build local |

---

## 5. Arquitectura de la app

### Arranque

1. `main.jsx` → importa `recordate.css` → monta `<App />` en `#root`.
2. `App.jsx` decide `screen`:
   - `landing`: portada (`Landing`)
   - `auth`: `Login.jsx`
   - `app`: panel autenticado / demo

### Rutas SPA (`paths.js` + mapas en `App.jsx`)

No hay React Router. `pushRoute("/tareas")` escribe `/PRYECTO-PPI/tareas` en Pages o `/tareas` en local. `currentPath()` quita el `appBase` para que la app siempre “vea” rutas internas.

| Ruta interna | Vista |
| --- | --- |
| `/dashboard` | Inicio |
| `/tareas` | Mis tareas |
| `/calendario` | Calendario |
| `/recordatorios` | Recordatorios |
| `/prioridades` | Prioridades |
| `/enfoque` | Modo enfoque |
| `/compartir` | Compartir agendas |
| `/mensajes` | Mensajes |
| `/perfil` | Perfil |
| `/configuracion` | Configuración |
| `/login` | Auth |
| `/reset-password` | Recovery (tras enlace del correo) |

El plugin `spaFallback` en `vite.config.js` copia `dist/index.html` → `dist/404.html` para que GitHub Pages no rompa deep links.

### Capas de datos

```text
App.jsx
  ├─ Si isDemoSession(session) → demoApi (demoStore.js / localStorage)
  └─ Si no → dataService.js → supabase (Auth / REST / RPC / Storage / Realtime)
```

- **`dataService.js`**: API canónica para perfiles, tareas, shares, mensajes, notificaciones, avatars y adjuntos.
- **`authService.js`**: helpers de Auth (signup con rol, login, logout, getSession). `Login.jsx` actualmente llama mucho a `supabase.auth` directo; el servicio sirve para reutilizar o alinear mensajes.
- **`sharedAgendaService.js`**: thin wrapper sobre `shareTask` / `listSharedTasks` / `revokeSharedTask`.

### Brand y CSS

- `Brand.jsx` / `LogoMark`: logo en `public/brand/recordate-logo.png` vía `import.meta.env.BASE_URL`.
- `recordate.css`: tokens (`--navy`, `--lilac`, superficies glass), layout del panel, auth, calendario, chat, perfil.
- `App.css` / `Professional.css` / `index.css` existen en el árbol, pero el arranque oficial importa **`recordate.css`** desde `main.jsx` y `App.jsx`.

### Componentes importantes dentro de `App.jsx`

Aunque viven en un solo archivo, conviene tratarlos como módulos mentales:

| Función | Rol |
| --- | --- |
| `Landing` | Hero, features, FAQ |
| `TaskForm` / `TaskCard` / `TaskList` | CRUD visual de tareas |
| `Calendar` | Mes + tareas del día |
| `SharePanel` | Compartir / revocar por email |
| `Chat` | Recibidos / Enviados, hilos, envío |
| `Profile` | Avatar, rol, toggles de recordatorios/alarmas |
| `UserAvatar` | Inicial o imagen |
| `Stats` | Métricas del dashboard |

`Login.jsx` está separado a propósito (auth denso).

---

## 6. Flujos clave

### 6.1 Registro / OTP / login / recovery

Archivo: `ppi-react/src/components/Login.jsx`.

1. **Registro**  
   - `supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo } })`.  
   - Si no hay `session` inmediata (confirmación por correo activa), pasa a pantalla OTP (`needsVerification`).  
   - El trigger `handle_new_user` crea el perfil en `profiles`.

2. **OTP**  
   - Usuario escribe 6 dígitos → `verifyOtp({ email, token, type: "signup" })`.  
   - Si hay sesión → `onLogin(session)`.  
   - Reenvío: `supabase.auth.resend({ type: "signup", email })`.

3. **Login**  
   - `signInWithPassword`. Errores traducidos (`email not confirmed`, credenciales inválidas, rate limit).

4. **Recovery**  
   - `resetPasswordForEmail` con `redirectTo: …/reset-password`.  
   - `App` detecta ruta o evento `PASSWORD_RECOVERY` y abre Login en modo recovery.  
   - Nueva clave: `supabase.auth.updateUser({ password })`.

5. **Demo**  
   - Botón “Explorar demostración” → `onDemo` en `App` carga `DEMO_SESSION` sin Supabase.

### 6.2 Tareas CRUD

- Listar: `listTasks()` → `from("tasks").select(…task_attachments…)`.
- Crear / editar / completar: `createTask` / `updateTask`.
- Borrar: `deleteTask` (confirmación en UI).
- Adjunto imagen (solo modo real): `uploadTaskAttachment` → bucket `task-attachments` + fila en `task_attachments` (máx. 5 MB, solo `image/*`).
- Al crear una tarea, el trigger `notify_task_created` inserta notificación `type = 'system'`.

En demo: `demoApi.saveTask` / `deleteTask` (sin Storage).

### 6.3 Calendario

Componente `Calendar` en `App.jsx`: navega meses, marca días con tareas, lista del día seleccionado. Los datos son el mismo array `tasks` (no hay tabla calendario aparte).

### 6.4 Modo enfoque

Estado `focusTask`. La vista `/enfoque` o el botón de la tarjeta deja **una sola** actividad en pantalla (completar / volver). Es UI; no hay tabla `focus`.

### 6.5 Notificaciones y alarmas

1. **Bandeja interna** (`notifications`): `listNotifications`, marcar una/todas leídas; Realtime INSERT.
2. **Alarmas locales** (intervalo 15 s en `App`): si `reminders_enabled` y llega la ventana del `reminder` de la tarea → modal `alarmTask`, tono Web Audio si `alarms_enabled`, y `Notification` del navegador si `browser_notifications_enabled`.
3. **Web Push**: `enablePushNotifications` registra `sw.js`, suscribe con VAPID y guarda en `push_subscriptions`. Sin servidor que envíe el push, no hay avisos con la pestaña cerrada.

### 6.6 Mensajes (Recibidos / Enviados)

Componente `Chat`:

- Carga: RPC `list_my_messages` (fallback a `from("messages")` si la RPC falla).
- Tabs: `recibidos` (`recipient_id === userId`) vs `enviados` (`sender_id === userId`).
- Hilos agrupados por interlocutor; al abrir, `markMessagesRead`.
- Nuevo mensaje: `findUserByEmail` → `sendMessage` (máx. 2000 caracteres).
- Trigger `notify_private_message` crea notificación `type = 'message'`.
- Realtime en INSERT/UPDATE de `messages`.

### 6.7 Compartir agendas

- UI: `SharePanel` + `shareTask` → RPC `share_task_by_email`.
- Listado enriquecido: RPC `list_task_shares` (incluye título, descripción, fecha, avatares, roles).
- Revocar: `delete` en `task_shares` (solo `owner_id`).
- El destinatario puede **leer** la tarea compartida (policy select en `tasks`) y adjuntos (policies `attachments shared read` + storage).

### 6.8 Perfil / roles / avatar

- Roles válidos (`ROLE_OPTIONS` en `dataService.js`): `estudiante`, `padre`, `madre`, `profesor`, `trabajador`.
- Cambio de rol / preferencias: `updateProfileSettings` (también sincroniza metadata de Auth si cambia nombre/rol/avatar).
- Avatar: `uploadAvatar` → bucket público `avatars` en ruta `{userId}/avatar-….ext` (máx. 3 MB) → guarda `avatar_url` en `profiles`.
- La migración `20260912_…` **quitó** el trigger que bloqueaba cambios de rol desde el cliente; ahora el usuario puede elegir su rol en Perfil/Configuración.

---

## 7. Supabase en detalle

### 7.1 Conexión del proyecto

En el cliente (`ppi-react/src/supabaseClient.js`):

- Lee `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Si son placeholders o faltan → `hasSupabaseConfig = false`, `supabase = null`.
- Si son reales → `createClient(url, anonKey)`.

La URL/clave de producción del build de Pages viven en `ppi-react/.env.production` (clave **anon/publishable**, no service role).

### 7.2 Migraciones: orden de ejecución

Ejecutar **en este orden** en el **SQL Editor** del proyecto Supabase (o con CLI si el equipo la usa):

1. `supabase/migrations/20260826_recordate.sql` — esquema base, RLS, triggers, RPCs iniciales, bucket `task-attachments`.
2. `supabase/migrations/20260828_shared_agendas.sql` — grants RPC + policies de lectura compartida de adjuntos.
3. `supabase/migrations/20260908_fix_task_attachment_storage_policies.sql` — ajusta matching de carpetas en Storage (`storage.foldername @> ARRAY[uid]`).
4. `supabase/migrations/20260912_roles_avatar_messages_shared.sql` — roles ampliados, `avatar_url`, bucket `avatars`, `list_my_messages`, `mark_messages_read`, `list_task_shares` enriquecido, `find_profile_by_email` con rol/avatar, `handle_new_user` actualizado.

**Hotfix opcional:** si el paso 4 falló con error `42P13` (no se puede cambiar el tipo de retorno de una función con `CREATE OR REPLACE`), ejecuta primero:

- `supabase/migrations/20260912_fix_drop_profile_functions.sql`

y vuelve a correr el archivo `20260912_roles_avatar_messages_shared.sql` (ese archivo ya incluye los `DROP FUNCTION` necesarios).

### 7.3 Tablas principales

#### `public.profiles`

| Columna | Propósito |
| --- | --- |
| `id` | PK = `auth.users.id` |
| `full_name`, `email` | Datos visibles |
| `role` | `estudiante` \| `padre` \| `madre` \| `profesor` \| `trabajador` (default `estudiante`) |
| `avatar_url` | URL pública del avatar |
| `reminders_enabled`, `show_completed`, `browser_notifications_enabled`, `alarms_enabled`, `push_notifications_enabled` | Preferencias de UI/avisos |
| `created_at` | Alta |

#### `public.tasks`

| Columna | Propósito |
| --- | --- |
| `id` | UUID |
| `user_id` | Dueño (`auth.uid()`) |
| `title`, `description`, `subject` | Contenido académico |
| `date`, `time` | Cuándo vence |
| `priority` | `Alta` \| `Media` \| `Baja` |
| `reminder` | Texto alineado con opciones de UI (“30 minutos antes”, …) |
| `completed` | Estado |
| `created_at`, `updated_at` | Auditoría (`touch_task_updated_at`) |

#### `public.task_shares`

Comparte **una tarea** con un destinatario: `task_id`, `owner_id`, `recipient_id`, unique `(task_id, recipient_id)`.

#### `public.messages`

Mensajes privados: `sender_id`, `recipient_id`, `body`, `read_at`, `created_at`. Trigger protege que en UPDATE solo cambie lectura.

#### `public.notifications`

Avisos in-app: `type` ∈ `reminder` \| `alarm` \| `share` \| `message` \| `system`; `task_id` opcional; `read_at`.

#### `public.task_attachments`

Metadatos de imagen: `task_id`, `user_id`, `storage_path`, `file_name`, `content_type`.

#### Otras tablas (preparadas / parciales)

- `ai_conversations`, `ai_messages` (`image_urls` jsonb), `ai_request_usage` — historial y cupo del asistente (`AiChat.jsx` + Edge Function `ai-chat`).
- `push_subscriptions` — endpoint Web Push del navegador.

### 7.4 Idea de RLS (quién lee/escribe qué)

Resumen orientativo (detalle exacto en los `.sql`):

| Recurso | Lectura | Escritura |
| --- | --- | --- |
| `profiles` | Solo tu fila | Insert/update de tu fila |
| `tasks` | Dueño **o** destinatario de un `task_shares` | Solo dueño (CRUD) |
| `task_shares` | Participantes (owner o recipient) | Insert/delete solo owner (y debe ser dueño de la tarea) |
| `messages` | Remitente o destinatario | Insert como remitente hacia otro; update de lectura solo destinatario |
| `notifications` | Solo tuyas | Update (marcar leídas) solo tuyas |
| `task_attachments` | Dueño; destinatario del share (select) | Solo dueño de la tarea |
| Storage `task-attachments` | Carpeta de tu uid; o path ligado a share | Insert/delete en tu carpeta |
| Storage `avatars` | Público (select) | Solo tu carpeta `{uid}/…` |
| Storage `ai-chat` | Solo tu carpeta `{uid}/…` | Insert/delete en tu carpeta |

**Lección para el equipo:** si “en la UI falla el permiso”, casi siempre es una policy o una RPC faltante en el proyecto Supabase, no un bug de React.

### 7.5 Functions / RPCs relevantes

| Función | Para qué |
| --- | --- |
| `handle_new_user` | Trigger post-registro → `profiles` |
| `find_profile_by_email(text)` | Buscar interlocutor (mensajes / share) con rol y avatar |
| `share_task_by_email(uuid, text)` | Crear share + notificación `share` |
| `list_task_shares()` | Listado enriquecido de agendas compartidas |
| `list_my_messages()` | Inbox/enviados con datos de perfiles |
| `mark_messages_read(uuid[])` | Marca leídos (todos o ids) |
| `notify_task_created` / `notify_private_message` | Triggers → `notifications` |
| `touch_task_updated_at` | Mantiene `tasks.updated_at` |
| `protect_message_fields` | Impide editar cuerpo/participantes en UPDATE |
| `consume_ai_request` | Rate limit IA (si se usa) |

Todas las RPC de producto que usa el frontend están otorgadas a `authenticated` (ver migraciones).

### 7.6 Storage

| Bucket | Público | Uso |
| --- | --- | --- |
| `avatars` | Sí | Foto de perfil; `getPublicUrl` |
| `task-attachments` | No | Imágenes de tareas; `createSignedUrl` (~5 min) |
| `ai-chat` | No | Fotos del asistente; `createSignedUrl` (1 h en el cliente) |

Rutas típicas:

- Avatar: `{userId}/avatar-{timestamp}.{ext}`
- Adjunto: `{userId}/{taskId}/{uuid}-{safeName}`

### 7.7 Qué debe correr el equipo después de un `git pull`

1. `cd ppi-react && npm install` (si cambió el lockfile).
2. Revisar si hay **migraciones nuevas** en `supabase/migrations/`.
3. Si las hay y tu proyecto Supabase aún no las tiene:
   - Abrir **SQL Editor** en el dashboard de Supabase.
   - Pegar y ejecutar cada archivo **en orden** (sección 7.2).
4. Confirmar en Auth → Providers que Email esté activo y, si usan OTP, que el template/flujo coincida con lo que espera `Login.jsx`.
5. En Realtime, asegurar que `messages` y `notifications` estén en la publication (la migración base intenta añadirlas).
6. Probar localmente con `.env` real **o** con demo si solo tocas UI.

---

## 8. Despliegue GitHub Pages

Archivo: `.github/workflows/pages.yml`.

### Flujo

1. Push a `main` (o `workflow_dispatch`).
2. Job en `ubuntu-latest`, `working-directory: ppi-react`.
3. `npm ci` → `npm run build` con `VITE_BASE=/PRYECTO-PPI/`.
4. `peaceiris/actions-gh-pages` publica `ppi-react/dist` en la rama **`gh-pages`** (`force_orphan: true`).

### Configuración del repo

Settings → Pages → Source: **Deploy from a branch** → branch **`gh-pages`** / root.

URL: https://johanxinho.github.io/PRYECTO-PPI/

### Implicaciones para el código

- Toda ruta de asset y navegación debe respetar `appBase` / `assetUrl` / `Brand` con `BASE_URL`.
- No hardcodear `/algo` asumiendo que el sitio vive en la raíz del dominio.
- El `404.html` clonado de `index.html` permite recargar `/PRYECTO-PPI/tareas` sin error de Pages.

---

## 9. Convenciones del equipo

### Comentarios en JSX: regla crítica

**No pongas `//` dentro del texto o de expresiones que rompan el JSX.** Hubo un bug histórico en el que comentarios estilo JavaScript dentro del árbol JSX o mal ubicados rompían el parseo / el texto visible.

- ✅ Comentarios JSX: `{/* esto es seguro */}`
- ✅ Comentarios fuera del return: `// arriba del return está bien`
- ❌ Evitar `//` “metidos” en medio de hijos JSX o concatenados de forma ambigua con texto

Si necesitas anotar una línea dentro del `return`, usa siempre `{/* … */}`.

### Otras convenciones

- Español de Colombia (`es-CO`) en textos de UI y docs de usuario.
- Preferir rutas absolutas del repo en la documentación: `ppi-react/src/...`, `supabase/migrations/...`.
- No subir `.env` local ni `service_role`.
- Cambios de esquema → **migración nueva fechada** + instrucción clara en el PR de qué SQL correr.
- Demo y Supabase deben seguir coexistiendo: si agregas un flujo de datos, implementa rama `demo ? demoApi… : await dataService…` cuando aplique.
- Mantener políticas RLS al añadir tablas; no “arreglar” permisos solo en el cliente.

---

## 10. Cómo aportar / checklist de PR

### Flujo Git sugerido

```bash
git checkout main
git pull origin main
git checkout -b feat/mi-cambio   # o fix/…, docs/…
# …código…
cd ppi-react && npm run lint && npm run build
git add -A
git commit -m "feat: descripción clara en español o inglés consistente con el historial"
git push -u origin HEAD
# Abrir PR hacia main
```

### Checklist antes de pedir review

- [ ] Probé el flujo en **demo** (si toqué UI del panel).
- [ ] Probé con **Supabase real** (si toqué Auth, RLS, RPC o Storage).
- [ ] Si hay SQL nuevo: está en `supabase/migrations/` con fecha y orden documentado.
- [ ] No metí `service_role` ni secretos en el frontend.
- [ ] Rutas/assets respetan `appBase` (Pages).
- [ ] Comentarios JSX usan `{/* */}`; no reintroduje `//` problemáticos dentro del JSX.
- [ ] `npm run lint` y `npm run build` pasan en `ppi-react/`.
- [ ] Actualicé docs si el cambio afecta al equipo (`EXPLICACION-EQUIPO-RECORDATE.md` / `PROJECT-DOCUMENTATION.md` / `MANUAL-DE-USUARIO.md` según audiencia).
- [ ] Descripción del PR explica **qué**, **por qué** y **cómo probar**.

### Dónde mirar si algo falla

| Síntoma | Mirar primero |
| --- | --- |
| Login / OTP | `Login.jsx`, Auth settings en Supabase, `handle_new_user` |
| “No tienes permiso” / 401-ish PostgREST | Policies RLS de la tabla / grants de la RPC |
| Assets 404 en Pages | `VITE_BASE`, `paths.js`, `Brand.jsx` |
| Mensajes sin nombre/avatar | Migración `20260912_…` y RPC `list_my_messages` |
| Adjuntos de tareas compartidas | Policies storage + `attachments shared read` |
| Demo “borra” datos | `localStorage` clave `recordate-demo-v2` |

---

## 11. Asistente de IA (detalle)

El chat flotante (robot abajo a la derecha) **solo** se monta con sesión real, no en demo.

### Flujo

```text
AiChat.jsx
  → aiChatService.sendMessage({ message, conversation_id, images[] })
  → supabase.functions.invoke("ai-chat")   // JWT del usuario
  → Edge Function ai-chat
       1. auth.getUser()
       2. rate limit en ai_request_usage (40 / hora / usuario)
       3. crea o reusa ai_conversations
       4. sube fotos al bucket privado ai-chat/{uid}/{conversationId}/…
       5. llama Gemini 3.6 Flash (secreto GEMINI_API_KEY)
       6. inserta ai_messages (user + assistant, image_urls = paths)
  → UI muestra reply; historial se lista desde ai_conversations
```

### Contrato de `ai-chat`

Request (POST, `verify_jwt: true`):

```json
{
  "message": "texto opcional si hay foto",
  "conversation_id": "uuid opcional",
  "images": [{ "mime_type": "image/jpeg", "data": "<base64>" }]
}
```

- Máx. 2 imágenes; jpg/png/webp/gif; 4 MB cada una.
- Mensaje máx. 4000 caracteres. Mensaje vacío permitido si hay foto.

Response: `{ reply, conversation_id, model, image_urls }`. `image_urls` son **paths** del bucket. El cliente firma con `supabase.storage.from("ai-chat").createSignedUrl(path, 3600)`.

### Tablas

| Tabla | Uso | RLS |
| --- | --- | --- |
| `ai_conversations` | Un hilo por usuario (`title`, `updated_at`) | solo `user_id = auth.uid()` |
| `ai_messages` | `role` user/assistant, `content`, `image_urls` jsonb | insert/select propios |
| `ai_request_usage` | contador de ventana horaria | select propio; escribe la función con service role |

### Secretos

Dashboard → Edge Function Secrets del proyecto `oavqxmsyhmtnnwkyiycr`: `GEMINI_API_KEY`. Nunca en `.env` del front ni en git.

### Cómo probar

1. Cuenta real (no demo).
2. Abrir el robot, mandar texto, adjuntar foto, reabrir un chat.
3. `missing_gemini_key` = falta el secreto.
4. `rate_limit` = 40 mensajes en la hora.


---

## Referencias rápidas

| Recurso | Ruta |
| --- | --- |
| App principal | `ppi-react/src/App.jsx` |
| Auth UI | `ppi-react/src/components/Login.jsx` |
| API Supabase | `ppi-react/src/dataService.js` |
| Asistente IA | `ppi-react/src/components/AiChat.jsx`, `ppi-react/src/services/aiChatService.js` |
| Cliente | `ppi-react/src/supabaseClient.js` |
| Demo | `ppi-react/src/demoStore.js` |
| Rutas | `ppi-react/src/paths.js` |
| Migraciones | `supabase/migrations/` |
| Deploy | `.github/workflows/pages.yml` |
| Manual de usuario | `docs/MANUAL-DE-USUARIO.md` |

— Equipo RECORDATE · PPI IE La Candelaria
