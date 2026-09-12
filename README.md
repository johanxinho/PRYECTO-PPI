# RECORDATE

RECORDATE es un sistema de recordatorio y organización de actividades académicas desarrollado como Proyecto Pedagógico Integrador (PPI) de grado 11 para estudiantes de la IE La Candelaria, Medellín, Antioquia.

## Sitio publicado

La aplicación se publica en GitHub Pages:

**https://johanxinho.github.io/PRYECTO-PPI/**

Cada push a `main` vuelve a construir y desplegar `ppi-react` mediante [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

### Cómo dejar GitHub Pages activo

1. En el repositorio, abre **Settings → Pages**.
2. En **Build and deployment → Source**, elige **Deploy from a branch**.
3. Branch: **gh-pages** / **/** (root) y guarda.
4. Abre https://johanxinho.github.io/PRYECTO-PPI/

El workflow publica el sitio en la rama `gh-pages` en cada push a `main`. Supabase ya va incluido en ese build.


## Descripción del proyecto

Este repositorio contiene la aplicación principal de RECORDATE en [ppi-react](ppi-react/), junto con documentación, prototipos heredados y archivos de soporte para Supabase. La aplicación está orientada a ayudar a estudiantes a organizar tareas, trabajos, fechas importantes y actividades académicas en un único espacio, con funciones para registrar actividades, priorizarlas, consultar el calendario, buscar información y mantener seguimiento del avance.

La idea principal de RECORDATE es reducir el olvido y facilitar la planificación académica, permitiendo que el estudiante vea sus pendientes, configure recordatorios, gestione su agenda y, cuando está conectada con Supabase, mantenga los datos sincronizados en una base de datos real.

## Características principales

La aplicación principal actualmente incluye, según el código y la documentación del repositorio:

- Landing y presentación del proyecto.
- Registro de usuarios con Supabase Auth.
- Inicio de sesión con correo y contraseña.
- Verificación por código OTP al registrarse.
- Recuperación de contraseña.
- Sesión persistente y cierre de sesión.
- Dashboard con métricas de tareas.
- Creación de actividades académicas.
- Edición de actividades existentes.
- Eliminación de tareas.
- Completar y desmarcar tareas.
- Prioridades: Alta, Media y Baja.
- Campos de fecha, hora, materia, descripción y recordatorio.
- Búsqueda por título, materia y descripción.
- Calendario con tareas por fecha.
- Recordatorios configurables dentro de la aplicación.
- Alarmas de tareas en la interfaz con audio y avisos del navegador, cuando el usuario habilita las opciones de notificación.
- Modo enfoque para una tarea en pantalla.
- Compartir agendas con usuarios registrados.
- Mensajes internos entre usuarios autenticados.
- Perfil del usuario y configuración de preferencias.
- Adjuntar imágenes a tareas.
- Notificaciones internas del sistema para tareas, mensajes y comparticiones.

> La funcionalidad de Web Push está preparada para configurarse con una clave pública VAPID, pero la entrega real de notificaciones con la aplicación cerrada requiere además un emisor backend externo. Eso no está implementado como parte de este repositorio.

## Tecnologías utilizadas

La aplicación principal en [ppi-react](ppi-react/) utiliza estas tecnologías reales:

- React 19
- Vite 8
- JavaScript con JSX
- Supabase JavaScript SDK
- Supabase Auth
- CSS propio para la interfaz
- Lucide React (iconos)
- Motion (tipografía del hero)
- ESLint
- Bootstrap aparece como dependencia instalada en [ppi-react/package.json](ppi-react/package.json), pero la interfaz actual no depende de sus clases de forma central.

## Requisitos

Para ejecutar la aplicación principal necesitas:

- Git
- npm
- Node.js
- Un proyecto de Supabase con las variables de entorno configuradas
- Acceso al SQL Editor de Supabase para ejecutar la migración disponible en [supabase/migrations/20260826_recordate.sql](supabase/migrations/20260826_recordate.sql)

No se incluyen claves ni secretos en este README.

## Instalación y ejecución

La aplicación principal está dentro de [ppi-react](ppi-react/).

1. Abre la terminal en la raíz del repositorio.
2. Ejecuta los siguientes comandos:

```bash
cd ppi-react
npm install
cp .env.example .env
# Edita .env con tu proyecto de Supabase si vas a usar autenticación y datos reales
npm run dev
```

### Variables de entorno

La aplicación usa las siguientes variables de entorno en [ppi-react/.env.example](ppi-react/.env.example):

```env
VITE_SUPABASE_URL=tu_project_url_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_VAPID_PUBLIC_KEY=tu_clave_publica_vapid_aqui
```

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son necesarias para autenticación y persistencia con Supabase.
- `VITE_VAPID_PUBLIC_KEY` es opcional y se usa para la configuración de Web Push; no reemplaza un backend externo para enviar notificaciones con la app cerrada.

### Migración de Supabase

Antes de probar registro, tareas, mensajes o compartición, ejecuta la migración en el SQL Editor de tu proyecto Supabase:

- [supabase/migrations/20260826_recordate.sql](supabase/migrations/20260826_recordate.sql)

La migración crea las tablas, políticas RLS y funciones necesarias para perfiles, tareas, mensajes, notificaciones, agendas compartidas, attachments y configuraciones del sistema.

## Documentación adicional

- [docs/MANUAL-DE-USUARIO.md](docs/MANUAL-DE-USUARIO.md): cómo usar la página publicada (portada, cuenta, demo, tareas, calendario, enfoque, mensajes).
- [docs/PROJECT-DOCUMENTATION.md](docs/PROJECT-DOCUMENTATION.md): documentación técnica del repositorio, flujo del proyecto y estado real de funciones.
- [ppi-react/README.md](ppi-react/README.md): guía específica de la aplicación principal.

## Estructura relevante del repositorio

- [ppi-react](ppi-react/): aplicación principal de RECORDATE
- [dia-30-07](dia-30-07/): ejercicio React/Vite independiente, no es la aplicación principal de RECORDATE
- [iniciodesesión.html](iniciodesesión.html), [registrarse.html](registrarse.html), [menu.html](menu.html): prototipos HTML estáticos heredados
- [Supabase Snippet Población y mantenimiento de tablas del PPI.csv](Supabase%20Snippet%20Población%20y%20mantenimiento%20de%20tablas%20del%20PPI.csv): archivo de datos del modelo del PPI, no es una migración SQL ni una definición completa de tablas

## Verificación y comandos útiles

Desde [ppi-react](ppi-react/), puedes ejecutar:

```bash
npm run lint
npm run build
```
