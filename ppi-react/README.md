# RECORDATE

Aplicación principal del Proyecto Pedagógico Integrador: sistema de recordatorio de actividades académicas para la IE La Candelaria.

## Inicio

Requiere Node.js 20 o superior.

```bash
npm install
cp .env.example .env
npm run dev
```

La aplicación requiere Supabase para registrar usuarios y guardar tareas. Define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env`. Nunca uses una clave `service_role` en el frontend.

Antes de probar la aplicación, ejecuta `supabase/migrations/20260826_recordate.sql` en el SQL Editor de tu proyecto Supabase. La migración crea perfiles, tareas, agendas compartidas y mensajes, además de sus políticas RLS. El trigger crea automáticamente el perfil al registrarse.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run lint` | Validación ESLint |
| `npm run build` | Compilación de producción |
| `npm run preview` | Servir la compilación local |

## Funcionalidad conectada

El dashboard usa la sesión persistente de Supabase Auth y carga las tareas del usuario desde `public.tasks`. Crear, editar, completar y eliminar tareas son operaciones de base de datos protegidas por RLS; no se usa `localStorage` ni información demo para el usuario autenticado.

Compartir agendas y mensajes ya usan las tablas, políticas y la función segura de la migración. La migración añade `messages` a `supabase_realtime`; si el proyecto tiene Realtime desactivado globalmente, actívalo en la configuración de Supabase. Los recordatorios del dispositivo y los correos requieren además una Edge Function y un proveedor externo de notificaciones.

## Documentación

La guía técnica del repositorio está en [`../docs/PROJECT-DOCUMENTATION.md`](../docs/PROJECT-DOCUMENTATION.md). Allí se explican los componentes, el modelo de tareas, el flujo de autenticación, la persistencia local, las funcionalidades DEMO y la conexión futura con Supabase.