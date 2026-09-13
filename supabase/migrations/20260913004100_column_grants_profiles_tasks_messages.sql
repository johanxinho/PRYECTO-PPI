-- NOTA (2026-09-13): PostgREST requiere GRANT UPDATE a nivel de TABLA
-- (has_table_privilege), no basta el UPDATE por columnas.
-- Este archivo queda como documentación histórica. El estado correcto es 04000
-- + triggers RLS: protect_profile_fields, protect_message_fields, protect_task_owner.
-- No revoques el UPDATE de tabla o volverá el error 42501 en Pages.
SELECT 1;
