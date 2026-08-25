# Documentación técnica de PRYECTO-PPI

## 1. Propósito del repositorio

`PRYECTO-PPI` contiene el trabajo del Proyecto Pedagógico Integrador de grado 11 para **RECORDATE**, un sistema de recordatorio de actividades académicas dirigido a estudiantes de la IE La Candelaria, Medellín, Antioquia.

La aplicación principal permite registrar actividades, asignar materia, fecha, hora, prioridad y recordatorio; consultar el calendario, buscar tareas, trabajar en modo enfoque y preparar flujos de comunicación y agenda compartida.

Este repositorio conserva también prototipos y ejercicios anteriores. Por eso hay más de una aplicación Vite y varios archivos HTML independientes.

## 2. Mapa del repositorio

```text
PRYECTO-PPI/
├── ppi-react/                         # Aplicación principal RECORDATE
│   ├── index.html                     # Documento raíz y metadatos de la aplicación
│   ├── package.json                   # Scripts y dependencias de ppi-react
│   ├── .env.example                   # Plantilla de variables públicas de Supabase
│   ├── src/
│   │   ├── main.jsx                   # Punto de entrada React
│   │   ├── App.jsx                    # Landing, autenticación visual y dashboard
│   │   ├── App.css                    # Estilos de la aplicación y responsive
│   │   ├── index.css                  # Tokens globales, tipografías y reset base
│   │   ├── supabaseClient.js          # Cliente Supabase condicionado por variables env
│   │   ├── components/Login.jsx       # Inicio de sesión, registro y acceso DEMO
│   │   └── components/                # Componentes heredados no usados actualmente
│   ├── public/                        # Recursos públicos servidos por Vite
│   └── README.md                      # Guía rápida de la aplicación principal
├── dia-30-07/                         # Ejercicio React/Vite independiente
│   ├── src/App.jsx                    # Formulario de registro de estudiante
│   ├── src/App.css                    # Estilos del formulario
│   ├── src/index.css                  # Estilos base del ejercicio
│   ├── src/main.jsx                   # Punto de entrada React
│   └── package.json                   # Scripts y dependencias del ejercicio
├── iniciodesesión.html                # Prototipo HTML estático de login
├── registrarse.html                   # Prototipo HTML estático de registro
├── menu.html                          # Prototipo HTML estático de navegación
├── Supabase Snippet Población y mantenimiento de tablas del PPI.csv
├── package.json                       # Dependencia Supabase en la raíz, sin scripts de app
├── .vscode/launch.json                # Configuración opcional de depuración en Chrome
└── README.md                          # Entrada general del repositorio
```

## 3. Tecnología

La aplicación principal usa:

- React 19 para la interfaz y el estado.
- Vite 8 como servidor de desarrollo y empaquetador.
- JavaScript con JSX, sin TypeScript.
- Supabase JS para autenticación opcional.
- CSS propio para la identidad visual; Bootstrap figura como dependencia instalada, pero la interfaz actual no depende de sus clases.
- `localStorage` para conservar las tareas del navegador en el modo actual.
- ESLint para validación estática.

`dia-30-07` usa React 19, Vite 8 y Oxlint, pero no forma parte del arranque de RECORDATE.

## 4. Aplicación principal: flujo de ejecución

1. `src/main.jsx` importa los estilos globales y monta `<App />` dentro de `#root`.
2. `App` inicia en la landing de RECORDATE.
3. Los botones de inicio abren `components/Login.jsx`.
4. El usuario puede:
   - autenticarse con Supabase si existen las variables de entorno;
   - registrarse con nombre, correo y contraseña;
   - entrar al acceso DEMO sin enviar credenciales.
5. Una sesión válida muestra el dashboard.
6. `App` consulta la sesión existente y escucha `onAuthStateChange` cuando Supabase está configurado.
7. Las tareas se cargan inicialmente desde `localStorage`; si no existen, usa tres actividades DEMO definidas en `initialTasks`.
8. Cada cambio en las tareas vuelve a guardarse en `localStorage`.

No existe un router externo. La navegación interna se controla con los estados `screen` (`landing`, `auth`, `app`) y `view` (`Inicio`, `Mis tareas`, `Calendario`, etc.).

## 5. Componentes de `ppi-react/src/App.jsx`

Aunque actualmente están en un único archivo, estas funciones son componentes reutilizables y tienen responsabilidades separadas:

- `Brand`: marca visual de RECORDATE.
- `Landing`: portada, propuesta del PPI, características y llamada a entrar.
- `DashboardPreview`: representación visual del dashboard en la landing.
- `TaskForm`: formulario controlado para crear o editar actividades.
- `PriorityBadge`: etiqueta visual de prioridad.
- `TaskCard`: tarjeta con completar, editar, eliminar y modo enfoque.
- `Stats`: tarjetas con métricas calculadas desde las tareas reales del navegador.
- `TaskList`: lista reutilizable con estado vacío y modo de selección para enfoque.
- `Calendar`: días que tienen tareas y agenda del día seleccionado.
- `SharePanel`: selección de actividad y preparación de envío por correo.
- `Chat`: conversación DEMO local con envío de mensajes en memoria.
- `Profile`: perfil y configuración de notificaciones de la sesión actual.

### Estado principal

- `session`: sesión Supabase o usuario DEMO.
- `screen`: determina landing, autenticación o aplicación.
- `view`: sección activa del dashboard.
- `tasks`: actividades académicas actuales.
- `query`: búsqueda por título y materia.
- `editingTask` y `showForm`: control del modal de tareas.
- `focusTask`: actividad seleccionada para modo enfoque.
- `notice`: confirmaciones y errores de acciones.
- `mobileNav`: apertura del sidebar en celular.
- `notificationsOpen`: visibilidad del panel de notificaciones.
- `shareEmail` y `shared`: flujo local de compartir agendas.
- `message`: texto que se está escribiendo en el chat.

### Modelo local de actividad

```js
{
  id: number,
  title: string,
  subject: string,
  date: "YYYY-MM-DD",
  time: "HH:mm",
  priority: "Alta" | "Media" | "Baja",
  description: string,
  reminder: "Al momento" | "30 minutos antes" | "1 día antes",
  completed: boolean
}
```

## 6. Funcionalidades y estado actual

| Funcionalidad | Estado actual | Fuente de datos |
| --- | --- | --- |
| Landing responsive | Funcional | Contenido estático del PPI |
| Inicio de sesión | Funcional con Supabase configurado | Supabase Auth |
| Registro | Funcional con Supabase configurado | Supabase Auth |
| Acceso DEMO | Funcional | Estado local del navegador |
| Crear, editar y eliminar tareas | Funcional | `localStorage` |
| Completar y desmarcar tareas | Funcional | `localStorage` |
| Búsqueda por título o materia | Funcional en tiempo real | Estado `tasks` |
| Métricas del dashboard | Dinámicas | Estado `tasks` |
| Calendario | Funcional con fechas de las tareas | Estado `tasks` |
| Recordatorios | Lista de tareas pendientes | Estado `tasks` |
| Prioridades | Orden por Alta, Media y Baja | Estado `tasks` |
| Modo enfoque | Funcional para una tarea | Estado `focusTask` |
| Notificaciones | Panel visual basado en tareas pendientes | Estado `tasks` |
| Compartir agendas | Flujo DEMO local, sin envío real | Estado local |
| Chat | Conversación DEMO local, sin servidor | Estado React |
| Perfil | Visualiza sesión e institución | Sesión actual |
| Configuración | Preferencias visuales locales | Estado del formulario |
| Adjuntar imágenes | No implementado en la versión principal | Requiere almacenamiento/backend |
| Alarmas del sistema | No implementadas como notificaciones del dispositivo | Requiere servicio adicional |

Las etiquetas DEMO y los mensajes de configuración indican cuándo una acción todavía no está conectada a un backend real.

## 7. Supabase y seguridad

`src/supabaseClient.js` lee únicamente estas variables de Vite:

```env
VITE_SUPABASE_URL=tu_project_url_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

El archivo `.env.example` es una plantilla. El archivo `.env` está excluido por `.gitignore` y no debe publicarse.

La clave que puede llegar al navegador es la clave anónima (`anon`). Nunca se debe colocar una clave `service_role` en `VITE_*`, en archivos públicos ni en el frontend.

La autenticación utiliza:

- `supabase.auth.getSession()` al iniciar.
- `supabase.auth.onAuthStateChange()` para cambios de sesión.
- `supabase.auth.signInWithPassword()` para entrar.
- `supabase.auth.signUp()` para registrar.
- `supabase.auth.signOut()` para cerrar sesión.

La persistencia de tareas todavía es por navegador. Para producción se debe crear una tabla de actividades con políticas RLS y asociarla al usuario autenticado.

## 8. Archivo de datos del PPI

`Supabase Snippet Población y mantenimiento de tablas del PPI.csv` contiene datos separados por comas con estas columnas:

- `id_actividad`
- `fecha_a`
- `actividad_a`
- `alarma_a`
- `id_administrador_fk`
- `id_trabajador_fk`
- `id_estudiante_fk`

Actualmente contiene ocho registros de actividades con fechas de junio y julio de 2026. Los campos terminados en `_fk` representan referencias a otros roles del modelo físico: administradores, trabajadores y estudiantes. El archivo es un conjunto de datos, no una migración SQL ni una definición completa de tablas.

## 9. Prototipos y código legado

Los archivos `iniciodesesión.html`, `registrarse.html` y `menu.html` son prototipos estáticos independientes. No se importan desde `ppi-react` y sus formularios no tienen conexión con Supabase.

Los componentes `Header.jsx`, `Menu.jsx`, `AcercaDe.jsx`, `Footer.jsx`, `InicioSesion.jsx` y `Registro.jsx` también pertenecen a una versión anterior de la interfaz. Se conservan para referencia, pero el punto de entrada actual no los renderiza. La autenticación vigente está en `components/Login.jsx`.

`dia-30-07` es otro ejercicio React: muestra un formulario de perfil de estudiante con validación de correo y edad, selección de lenguajes, modalidad, país, imagen, color y resumen. No comparte estado, autenticación ni componentes con RECORDATE.

## 10. Comandos

### Aplicación principal

Desde `PRYECTO-PPI/ppi-react`:

```bash
npm install
cp .env.example .env
# Edita .env solo si vas a usar Supabase
npm run dev
```

Comprobaciones:

```bash
npm run lint
npm run build
npm run preview
```

La URL de desarrollo habitual es `http://localhost:5173/`.

### Ejercicio `dia-30-07`

Desde `PRYECTO-PPI/dia-30-07`:

```bash
npm install
npm run dev
npm run lint
npm run build
```

La auditoría completa de dependencias se ejecuta con `npm audit`. La alerta que había sido detectada en `nanoid` fue corregida mediante `npm audit fix`; el lockfile quedó en `nanoid 3.3.18` y la auditoría actual reporta `0 vulnerabilities`.

### Depuración

`.vscode/launch.json` contiene una configuración para abrir Chrome en `http://localhost:5173`. Debe ejecutarse primero el servidor Vite de `ppi-react`.

## 11. Próximos pasos recomendados

1. Separar los componentes de `App.jsx` en `components/`, `pages/` y `services/` cuando se vaya a ampliar el proyecto.
2. Crear tablas Supabase para perfiles y actividades con `user_id`, timestamps y políticas RLS.
3. Migrar las tareas de `localStorage` a Supabase manteniendo el fallback DEMO.
4. Conectar compartir agendas y chat a tablas o funciones Edge de Supabase.
5. Añadir Supabase Storage para imágenes de actividades.
6. Añadir pruebas de interacción para crear, editar, completar, eliminar, filtrar y enfocar actividades.

## 12. Última verificación

La aplicación principal pasa `npm run build` y `npm run lint`. El ejercicio `dia-30-07` pasa `npm run build`, `npm run lint` y `npm audit` sin vulnerabilidades reportadas.
