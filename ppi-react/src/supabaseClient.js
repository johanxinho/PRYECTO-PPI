// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const placeholderValues = new Set([
  "tu_project_url_aqui",
  "tu_anon_key_aqui",
  "tu_clave_publica_vapid_aqui",
]);

const hasRealSupabaseConfig = (value) => Boolean(value && !placeholderValues.has(value));

export const hasSupabaseConfig = hasRealSupabaseConfig(supabaseUrl) && hasRealSupabaseConfig(supabaseAnonKey);

async function supabaseFetch(input, init = {}) {
  const options = { ...init, credentials: "omit" };
  try {
    return await fetch(input, options);
  } catch (firstError) {
    try {
      return await fetch(input, options);
    } catch {
      const reason = firstError?.message || "Failed to fetch";
      throw new Error(
        `No hay conexión con el servidor de la agenda (${reason}). Comprueba internet y que el proyecto de Supabase esté activo.`,
      );
    }
  }
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        fetch: supabaseFetch,
      },
    })
  : null;
