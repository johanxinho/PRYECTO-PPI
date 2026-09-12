// @ts-nocheck
import { supabase } from "./supabaseClient"; // Cliente de conexión con la base de datos en la nube

// dataService concentra toda la lógica de lectura y escritura con Supabase.
// Aquí se protegen las operaciones con validaciones de sesión y se normalizan
// los datos para que la interfaz React pueda consumirlos de manera uniforme.
const taskColumns = // Lista de columnas que se piden al leer tareas (incluye adjuntos)
  "id,user_id,title,description,subject,date,time,priority,reminder,completed,created_at,updated_at,task_attachments(id,storage_path,file_name,content_type)";

/**
 * ensureBackend: evita ejecutar operaciones si el cliente de Supabase no está disponible.
 */
function ensureBackend() { // Comprueba que exista conexión con el backend
  if (!supabase) throw new Error("Supabase no está configurado."); // Detiene el flujo si falta la configuración
}

/**
 * mapTask: convierte el formato devuelto por Supabase a un modelo más simple
 * para uso dentro de la UI de React.
 */
function mapTask(task) { // Recibe una fila de la tabla tasks y la adapta a la interfaz
  return { // Objeto listo para mostrar en React
    id: task.id, // Identificador único de la tarea
    userId: task.user_id, // Dueño de la tarea (snake_case de SQL a camelCase)
    title: task.title, // Título visible
    description: task.description || "", // Descripción; si viene nula se usa cadena vacía
    subject: task.subject, // Materia o asignatura
    date: task.date, // Fecha de entrega
    time: task.time, // Hora de la actividad
    priority: task.priority, // Prioridad (Alta, Media, Baja)
    reminder: task.reminder, // Texto del recordatorio
    completed: task.completed, // true si ya se marcó como hecha
    attachments: task.task_attachments || [], // Imágenes adjuntas o arreglo vacío
  };
}

/**
 * getProfile: devuelve el perfil del usuario autenticado desde la tabla profiles.
 */
export async function getProfile(user) { // Consulta el perfil según el id del usuario
  ensureBackend(); // Verifica que Supabase esté listo
  const { data, error } = await supabase // Espera la respuesta de la consulta
    .from("profiles") // Tabla de perfiles
    .select("id,full_name,email,role,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled") // Campos que necesita la app
    .eq("id", user.id) // Filtra por el identificador del usuario
    .single(); // Espera una sola fila
  if (error) throw error; // Propaga el error si la consulta falla
  return data; // Devuelve el perfil encontrado
}

/**
 * ensureProfile: crea o actualiza el perfil del usuario con el nombre completo
 * y el correo de autenticación para mantener la sincronización con Supabase Auth.
 */
export async function ensureProfile(user, fullName = "") { // Crea el perfil si no existe; si existe, lo actualiza
  ensureBackend(); // Verifica el backend
  const profile = { // Datos mínimos del perfil
    id: user.id, // Mismo id que en Auth
    full_name: // Nombre visible en la app
      fullName || user.user_metadata?.full_name || user.email.split("@")[0], // Usa el parámetro, o metadata, o la parte antes del @
    email: user.email, // Correo de la cuenta
  };
  const { data, error } = await supabase // Ejecuta el upsert
    .from("profiles") // Tabla de perfiles
    .upsert(profile, { onConflict: "id" }) // Inserta o actualiza si el id ya existe
    .select("id,full_name,email,role,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled") // Devuelve los campos de configuración
    .single(); // Una sola fila resultante
  if (error) throw error; // Lanza si algo sale mal
  return data; // Perfil sincronizado
}

/**
 * updateProfileSettings: guarda cambios de configuración del perfil.
 */
export async function updateProfileSettings(settings) { // Recibe un objeto con interruptores (recordatorios, etc.)
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase // Espera la actualización
    .from("profiles") // Tabla de perfiles
    .update(settings) // Aplica solo los campos enviados
    .eq("id", (await supabase.auth.getUser()).data.user.id) // Limita al usuario de la sesión actual
    .select("id,full_name,email,role,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled") // Devuelve el perfil ya actualizado
    .single(); // Una fila
  if (error) throw error; // Error de escritura
  return data; // Configuración guardada
}

/**
 * listTasks: obtiene todas las tareas del usuario ordenadas por fecha y hora.
 */
export async function listTasks() { // Lista las tareas del usuario autenticado
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase // Consulta de lectura
    .from("tasks") // Tabla de tareas
    .select(taskColumns) // Columnas definidas arriba (incluye adjuntos)
    .order("date", { ascending: true }) // Primero las más cercanas por fecha
    .order("time", { ascending: true }); // Luego por hora
  if (error) throw error; // Falla de lectura
  return data.map(mapTask); // Normaliza cada fila al modelo de la UI
}

/**
 * createTask: inserta una nueva tarea con la estructura requerida por la base de datos.
 */
export async function createTask(task) { // Recibe los datos del formulario de nueva tarea
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase // Inserción en la tabla
    .from("tasks") // Tabla de tareas
    .insert({ // Valores de la nueva fila
      title: task.title.trim(), // Quita espacios extra del título
      description: task.description?.trim() || null, // Descripción limpia o nulo
      subject: task.subject.trim(), // Materia sin espacios de más
      date: task.date, // Fecha elegida
      time: task.time, // Hora elegida
      priority: task.priority, // Nivel de prioridad
      reminder: task.reminder, // Cuándo avisar
      completed: false, // Toda tarea nueva nace pendiente
    })
    .select(taskColumns) // Devuelve la fila con el mismo formato de listado
    .single(); // Una sola tarea creada
  if (error) throw error; // Error al insertar
  return mapTask(data); // Modelo listo para la interfaz
}

/**
 * updateTask: modifica una tarea existente y recalcula su fecha de actualización.
 */
export async function updateTask(task) { // Recibe la tarea con los campos ya editados
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase // Actualización en la tabla
    .from("tasks") // Tabla de tareas
    .update({ // Campos que se pueden cambiar
      title: task.title.trim(), // Título limpio
      description: task.description?.trim() || null, // Descripción o nulo
      subject: task.subject.trim(), // Materia
      date: task.date, // Nueva fecha
      time: task.time, // Nueva hora
      priority: task.priority, // Nueva prioridad
      reminder: task.reminder, // Nuevo recordatorio
      completed: task.completed, // Estado hecho / pendiente
    })
    .eq("id", task.id) // Solo la tarea con ese id
    .select(taskColumns) // Devuelve la fila actualizada
    .single(); // Una fila
  if (error) throw error; // Error al actualizar
  return mapTask(data); // Modelo para la UI
}

/**
 * deleteTask: elimina una tarea por su identificador.
 */
export async function deleteTask(id) { // Recibe el id de la tarea a borrar
  ensureBackend(); // Verifica el backend
  const { error } = await supabase.from("tasks").delete().eq("id", id); // Borra la fila cuyo id coincide
  if (error) throw error; // Error al eliminar
}

/**
 * shareTask: comparte una tarea con otro usuario registrado usando la función SQL segura.
 */
export async function shareTask(taskId, email) { // taskId es la tarea; email es el destinatario
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase.rpc("share_task_by_email", { // Llama a una función SQL (RPC)
    requested_task_id: taskId, // Id de la tarea que se comparte
    recipient_email: email.trim().toLowerCase(), // Correo normalizado (minúsculas, sin espacios)
  });
  if (error) throw error; // Error de la función SQL
  return data; // Resultado del share
}

/**
 * listSharedTasks: devuelve las tareas compartidas con el usuario actual o por él.
 */
export async function listSharedTasks() { // Lista relaciones de compartición
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase.rpc("list_task_shares"); // Función SQL que respeta permisos
  if (error) throw error; // Error de lectura
  return data || []; // Si no hay datos, un arreglo vacío
}

/**
 * revokeSharedTask: elimina una relación de compartición existente.
 */
export async function revokeSharedTask(shareId) { // shareId identifica el registro en task_shares
  ensureBackend(); // Verifica el backend
  const { error } = await supabase.from("task_shares").delete().eq("id", shareId); // Borra esa compartición
  if (error) throw error; // Error al revocar
}

/**
 * listMessages: carga los mensajes del usuario para mostrar conversaciones internas.
 */
export async function listMessages() { // Trae los mensajes con destinatario
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase // Consulta de mensajes
    .from("messages") // Tabla de mensajes
    .select("id,sender_id,recipient_id,body,read_at,created_at") // Campos de cada mensaje
    .not("recipient_id", "is", null) // Excluye filas sin destinatario
    .order("created_at", { ascending: true }); // Orden cronológico (antiguos primero)
  if (error) throw error; // Error de lectura
  return data; // Arreglo de mensajes
}

/**
 * findUserByEmail: busca el perfil de un usuario por correo para compartir tareas o mensajes.
 */
export async function findUserByEmail(email) { // Busca un perfil a partir del correo
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase.rpc("find_profile_by_email", { requested_email: email.trim().toLowerCase() }); // RPC con el correo normalizado
  if (error) throw error; // Error de búsqueda
  return data?.[0] || null; // Primer resultado o null si no existe
}

/**
 * sendMessage: crea un mensaje nuevo dirigido a otro usuario con validación de destinatario.
 */
export async function sendMessage(body, recipientId) { // body es el texto; recipientId el destinatario
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase // Inserción del mensaje
    .from("messages") // Tabla de mensajes
    .insert({ body: body.trim(), recipient_id: recipientId }) // Texto limpio y id del receptor
    .select("id,sender_id,recipient_id,body,read_at,created_at") // Devuelve el mensaje creado
    .single(); // Una fila
  if (error) throw error; // Error al enviar
  return data; // Mensaje guardado
}

/**
 * listNotifications: retorna las últimas notificaciones del usuario.
 */
export async function listNotifications() { // Lee las notificaciones más recientes
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase.from("notifications").select("id,task_id,type,title,body,read_at,created_at").order("created_at", { ascending: false }).limit(30); // Últimas 30, más nuevas primero
  if (error) throw error; // Error de lectura
  return data || []; // Arreglo (vacío si no hay)
}

/**
 * markNotificationRead: marca una notificación como leída.
 */
export async function markNotificationRead(id) { // Marca una sola notificación
  ensureBackend(); // Verifica el backend
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id); // Guarda la hora actual de lectura
  if (error) throw error; // Error al marcar
}

/**
 * markAllNotificationsRead: marca todas las notificaciones pendientes como leídas.
 */
export async function markAllNotificationsRead() { // Marca en lote las no leídas
  ensureBackend(); // Verifica el backend
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); // Solo las que aún no tienen fecha de lectura
  if (error) throw error; // Error al marcar todas
}

/**
 * savePushSubscription: guarda la suscripción del navegador para recibir notificaciones Web Push.
 */
export async function savePushSubscription(subscription) { // Recibe la suscripción del Service Worker
  ensureBackend(); // Verifica el backend
  const keys = subscription.toJSON().keys; // Extrae las claves públicas de cifrado
  const { error } = await supabase.from("push_subscriptions").upsert({ // Inserta o actualiza por endpoint
    endpoint: subscription.endpoint, // URL única del navegador
    p256dh: keys.p256dh, // Clave pública del cliente
    auth: keys.auth, // Secreto de autenticación
  }, { onConflict: "endpoint" }); // Si el endpoint ya existe, se actualiza
  if (error) throw error; // Error al guardar
}

/**
 * uploadTaskAttachment: valida y sube una imagen asociada a una tarea al bucket de storage.
 */
export async function uploadTaskAttachment(taskId, file) { // taskId es la tarea; file es el archivo del usuario
  ensureBackend(); // Verifica el backend
  if (!file || !file.type.startsWith("image/")) { // Solo acepta imágenes
    throw new Error("Solo puedes adjuntar imágenes."); // Mensaje si el tipo no es imagen
  }
  if (file.size > 5 * 1024 * 1024) { // Límite de 5 megabytes
    throw new Error("La imagen no puede superar los 5 MB."); // Mensaje si pesa demasiado
  }
  const { data: { user } } = await supabase.auth.getUser(); // Usuario de la sesión
  if (!user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente."); // Sin sesión no se sube nada
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); // Quita caracteres raros del nombre
  const path = `${user.id}/${taskId}/${crypto.randomUUID()}-${safeName}`; // Ruta única en el bucket
  const { error: uploadError } = await supabase.storage.from("task-attachments").upload(path, file, { contentType: file.type, upsert: false }); // Sube el archivo (sin sobrescribir)
  if (uploadError) throw uploadError; // Error de storage
  const { data, error } = await supabase.from("task_attachments").insert({ task_id: taskId, storage_path: path, file_name: file.name, content_type: file.type }).select().single(); // Registra el adjunto en la tabla
  if (error) { // Si falla el registro, se borra el archivo huérfano
    await supabase.storage.from("task-attachments").remove([path]); // Limpia el bucket
    throw error; // Propaga el error de la tabla
  }
  return data; // Fila del adjunto creado
}

/**
 * getAttachmentUrl: genera una URL firmada temporal para abrir una imagen adjunta.
 */
export async function getAttachmentUrl(path) { // path es la ruta dentro del bucket
  ensureBackend(); // Verifica el backend
  const { data, error } = await supabase.storage.from("task-attachments").createSignedUrl(path, 300); // URL válida 300 segundos
  if (error) throw error; // Error al firmar
  return data.signedUrl; // Enlace temporal para <img> o descarga
}

/**
 * deleteTaskAttachment: elimina el archivo del storage y limpia su registro en la tabla task_attachments.
 */
export async function deleteTaskAttachment(attachment) { // Recibe el objeto adjunto (id + ruta)
  ensureBackend(); // Verifica el backend
  const { error: storageError } = await supabase.storage.from("task-attachments").remove([attachment.storage_path]); // Borra el archivo físico
  if (storageError) throw storageError; // Error de storage
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachment.id); // Borra la fila de la tabla
  if (error) throw error; // Error de la tabla
}

/**
 * subscribeToNotifications: escucha inserts nuevos en la tabla notifications para actualizar la UI en tiempo real.
 */
export function subscribeToNotifications(userId, onChange) { // userId filtra; onChange se llama en cada insert
  if (!supabase) return () => {}; // Si no hay backend, devuelve una función vacía de limpieza
  const channel = supabase.channel(`recordate-notifications-${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, onChange).subscribe(); // Canal Realtime filtrado por usuario
  return () => supabase.removeChannel(channel); // Al desmontar, se cierra el canal
}

/**
 * subscribeToMessages: escucha cambios en mensajes para mantener conversaciones sincronizadas en tiempo real.
 */
export function subscribeToMessages(userId, onChange) { // userId nombra el canal; onChange reacciona a cualquier cambio
  if (!supabase) return () => {}; // Sin backend no hay suscripción
  const channel = supabase // Crea el canal de mensajes
    .channel(`recordate-messages-${userId}`) // Nombre único por usuario
    .on( // Escucha eventos de Postgres
      "postgres_changes", // Tipo de evento Realtime
      { event: "*", schema: "public", table: "messages" }, // Todos los cambios (insert/update/delete) en messages
      onChange, // Callback de la interfaz
    )
    .subscribe(); // Activa la escucha
  return () => supabase.removeChannel(channel); // Función de limpieza al salir de la vista
}
