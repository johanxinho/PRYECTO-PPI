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

/**
 * Fetch sin cookies de supabase.co (terceros). Chrome las bloquea y eso
 * rompe el registro de compañeros. credentials: "omit" evita depender de ellas.
 */
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

/**
 * Sesión en localStorage de ESTA página (first-party).
 * Si el navegador bloquea almacenamiento, usa memoria de la pestaña.
 */
function firstPartyStorage() {
  const memory = {};
  return {
    getItem(key) {
      try {
        if (typeof window !== "undefined") return window.localStorage.getItem(key);
      } catch {
        /* storage bloqueado */
      }
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },
    setItem(key, value) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch {
        /* storage bloqueado */
      }
      memory[key] = String(value);
    },
    removeItem(key) {
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(key);
      } catch {
        /* storage bloqueado */
      }
      delete memory[key];
    },
  };
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: firstPartyStorage(),
        storageKey: "recordate-auth",
      },
      global: {
        fetch: supabaseFetch,
      },
    })
  : null;
