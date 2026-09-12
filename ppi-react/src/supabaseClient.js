// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

// Este archivo centraliza la conexión con Supabase usando variables de entorno.
// Si faltan las credenciales o aún están en su valor de ejemplo, la app desactiva
// la conexión para evitar errores y dejar una experiencia usable en local.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const placeholderValues = new Set([
  "tu_project_url_aqui",
  "tu_anon_key_aqui",
  "tu_clave_publica_vapid_aqui",
]);

const hasRealSupabaseConfig = (value) => Boolean(value && !placeholderValues.has(value));

// hasSupabaseConfig permite saber si el proyecto ya tiene configurado el acceso público.
export const hasSupabaseConfig = hasRealSupabaseConfig(supabaseUrl) && hasRealSupabaseConfig(supabaseAnonKey);

// supabase queda disponible solo si se detecta que las variables de entorno están presentes.
export const supabase = hasSupabaseConfig
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;