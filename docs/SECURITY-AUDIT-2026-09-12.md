# Auditoría de seguridad — RECORDATE (`johanxinho/PRYECTO-PPI`)

Fecha: 2026-09-12 · Alcance: Supabase + React/Vite + GitHub Pages · Sin Vercel.

## Vulnerabilidades encontradas

| Severidad | Hallazgo |
|-----------|----------|
| **ALTA** | `anon` tenía `EXECUTE` sobre funciones `SECURITY DEFINER` (RPC públicas). |
| **ALTA** | Policies duplicadas en `tasks` basadas en `owner_id`/`assigned_to` con `WITH CHECK` nulo (posible manipulación). |
| **MEDIA** | Grants amplios (`TRUNCATE`, etc.) a `anon`/`authenticated` en tablas públicas. |
| **MEDIA** | Tablas legacy ES (`usuarios`, `actividades`, …) con grants + RLS sin policies (ruido / superficie). |
| **MEDIA** | `search_path` mutable en `touch_task_updated_at` / `protect_message_fields`. |
| **MEDIA** | UPDATE de `profiles` permitía cambiar `email`/`id` vía cliente si no había trigger. |
| **BAJA** | Buckets sin `file_size_limit` / mime allowlist. |
| **BAJA** | Auth: protección de contraseñas filtradas (HIBP) desactivada (manual). |
| **INFO** | Realtime filtraba por `userId` del cliente; endurecido para exigir sesión coincidente. |

## Correcto (sin cambio destructivo)

- RLS **habilitado** en todas las tablas `public` activas.
- Policies de `messages`, `task_shares`, `ai_*`, storage `ai-chat` / `task-attachments` orientadas a ownership.
- Edge Function `ai-chat`: JWT requerido, rate limit, Gemini key solo en secretos del backend.
- No hay `dangerouslySetInnerHTML` / `innerHTML` en `ppi-react/src`.
- Workflow Pages solo usa `VITE_*` públicas + `GITHUB_TOKEN`; no escribe `service_role` ni `GEMINI_API_KEY`.
- No hay rol `admin` en el check de `profiles.role` (roles: estudiante/padre/madre/profesor/trabajador).

## Vulnerabilidades corregidas

1. Revoke de acceso `anon` a tablas y a `EXECUTE` de DEFINER.
2. Revoke de DEFINER solo-trigger (`handle_new_user`, `notify_*`, `consume_ai_request`) a clientes.
3. Eliminación de policies duplicadas peligrosas en `tasks` / `messages` / `profiles`.
4. Trigger `protect_profile_fields` (bloquea cambio de `id`, conserva `email`, valida rol).
5. `search_path` fijo + `SECURITY INVOKER` en helpers de trigger.
6. Límites de tamaño/mime en buckets Storage.
7. Revoke de grants a tablas legacy no usadas por la app React.
8. Front: suscripciones Realtime solo si `auth.uid() === userId`.

## Archivos modificados (repo)

- `ppi-react/src/dataService.js`
- `supabase/migrations/20260913_security_hardening_recordate.sql`
- `docs/SECURITY-AUDIT-2026-09-12.md`

## Migraciones

- Aplicada en proyecto `oavqxmsyhmtnnwkyiycr`: `security_hardening_recordate`
- Documentada en repo: `supabase/migrations/20260913_security_hardening_recordate.sql`

## Estado por área

| Área | Estado |
|------|--------|
| RLS | OK en tablas activas; legacy sin policies + sin grants cliente |
| Storage | Privado `ai-chat` / `task-attachments`; `avatars` público (lectura) con ownership en write |
| Auth | Flujos Supabase Auth; falta HIBP manual |
| Asistente IA | Key no en front; JWT + rate limit + RLS historial |
| Secretos | Sin `service_role`/`GEMINI` en repo; anon en `.env.production` esperado con RLS |
| Realtime | Filtros + check de sesión |

## npm lint / build

Pendiente de ejecución en CI/local (`@Codigo Y Infrastructura`): Cloud Agents no disponibles en el plan. El workflow Pages sigue siendo la prueba de build en merge.

## Riesgos manuales restantes

1. Activar **Leaked password protection** en Supabase Auth.
2. Confirmar secretos Actions opcionales (`VITE_SUPABASE_*`) sin rotar logs.
3. Rotar anon key solo si alguna vez se filtró fuera de Pages.
4. Considerar hacer `avatars` privado + signed URLs (cambio de UX).

## Nivel de seguridad final estimado

**Bueno / Alto-medio (≈ 8/10)** para un PPI escolar con Supabase + Pages, tras el hardening. Antes: medio (~5.5/10) por superficie `anon` + policies duplicadas.
