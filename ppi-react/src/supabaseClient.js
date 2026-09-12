// @ts-nocheck
import { createClient } from "@supabase/supabase-js"; // SDK oficial para Auth, REST y Realtime de Supabase.

// Este archivo centraliza la conexión con Supabase usando variables de entorno.
// Si faltan las credenciales o aún están en su valor de ejemplo, la app desactiva
// la conexión para evitar errores y dejar una experiencia usable en local.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim(); // URL pública del proyecto (Vite la inyecta en el build).
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(); // Clave publishable/anon para el cliente del navegador.

const placeholderValues = new Set([ // Valores de ejemplo que NO deben usarse como credenciales reales.
  "tu_project_url_aqui", // Texto de plantilla del .env.example para la URL.
  "tu_anon_key_aqui", // Texto de plantilla del .env.example para la clave.
  "tu_clave_publica_vapid_aqui", // Texto de plantilla de VAPID; no es una clave de Supabase.
]); // Cierra el conjunto de placeholders.

const hasRealSupabaseConfig = (value) => Boolean(value && !placeholderValues.has(value)); // True solo si hay un valor real, no de ejemplo.

// hasSupabaseConfig permite saber si el proyecto ya tiene configurado el acceso público.
export const hasSupabaseConfig = hasRealSupabaseConfig(supabaseUrl) && hasRealSupabaseConfig(supabaseAnonKey); // Exige URL y clave válidas a la vez.

// supabase queda disponible solo si se detecta que las variables de entorno están presentes.
export const supabase = hasSupabaseConfig // Si hay config real se crea el cliente; si no, queda null.
	? createClient(supabaseUrl, supabaseAnonKey) // Cliente del navegador protegido por las políticas RLS.
	: null; // Sin credenciales no se intenta conectar, y la app puede usar el modo demo.
