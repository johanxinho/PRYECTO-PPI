# RECORDATE

Aplicación principal del Proyecto Pedagógico Integrador: sistema de recordatorio de actividades académicas para la IE La Candelaria.

## Inicio

Requiere Node.js 20 o superior.

```bash
npm install
cp .env.example .env
npm run dev
```

Las variables de Supabase son opcionales para explorar el acceso DEMO. Para autenticación real, define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env`. Nunca uses una clave `service_role` en el frontend.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run lint` | Validación ESLint |
| `npm run build` | Compilación de producción |
| `npm run preview` | Servir la compilación local |

## Documentación

La guía técnica del repositorio está en [`../docs/PROJECT-DOCUMENTATION.md`](../docs/PROJECT-DOCUMENTATION.md). Allí se explican los componentes, el modelo de tareas, el flujo de autenticación, la persistencia local, las funcionalidades DEMO y la conexión futura con Supabase.