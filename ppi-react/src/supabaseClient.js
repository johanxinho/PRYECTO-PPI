import { createClient } from "@supabase/supabase-js";

// Este archivo centraliza la conexión con Supabase usando variables de entorno.
// Si faltan las credenciales, la app desactiva la conexión para evitar errores.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// hasSupabaseConfig permite saber si el proyecto ya tiene configurado el acceso público.
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

// supabase queda disponible solo si se detecta que las variables de entorno están presentes.
export const supabase = hasSupabaseConfig
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;