# Manual de usuario - RECORDATE

## 1. Introducción
RECORDATE es una aplicación web para organizar tareas académicas, recordar entregas importantes y compartir actividades con compañeros. Está pensada para estudiantes de la IE La Candelaria y funciona con Supabase para autenticar usuarios y guardar información.

## 2. Requisitos
- Navegador moderno (Chrome, Edge, Firefox o Safari)
- Cuenta en Supabase configurada con proyecto activo
- Variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` definidas con valores reales
- Conexión a internet para iniciar sesión y sincronizar datos

> Importante: si en el archivo `.env` siguen apareciendo valores como `tu_project_url_aqui` o `tu_anon_key_aqui`, la aplicación abrirá, pero la autenticación no funcionará porque esas cadenas no son credenciales reales de Supabase.

## 3. Configuración de Supabase antes de abrir la aplicación
1. Crea o abre tu proyecto en Supabase.
2. Entra a `Project Settings` → `API`.
3. Copia el valor de `Project URL` y `anon public key`.
4. Abre el archivo `ppi-react/.env` y reemplaza los valores de ejemplo por esos datos reales.
5. Guarda el archivo y vuelve a iniciar la aplicación.

Ejemplo de `.env` válido:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_public_key_real
VITE_VAPID_PUBLIC_KEY=tu_clave_publica_vapid_aqui
```

## 4. Inicio de la aplicación
1. Abre una terminal en la carpeta `ppi-react`.
2. Ejecuta:
   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```
3. Ingresa a la URL local indicada por Vite, normalmente `http://localhost:5173`.
4. Si el puerto `5173` está ocupado, Vite puede abrir otro como `5174`.

## 5. Registro e inicio de sesión
1. En la pantalla de inicio, selecciona la opción de registro o inicio de sesión.
2. Si creas una cuenta, escribe tu nombre completo, correo y contraseña.
3. Si Supabase está configurado correctamente, la cuenta se crea en Auth y se sincroniza con la tabla `profiles`.
4. Si se solicita verificación, ingresa el código enviado por correo.
5. Si olvidaste tu contraseña, usa la opción de recuperación y sigue el enlace enviado por correo.

## 4. Registro e inicio de sesión
1. En la pantalla de inicio, selecciona la opción de registro o inicio de sesión.
2. Si creas una cuenta, escribe tu nombre completo, correo y contraseña.
3. Si Supabase está configurado correctamente, la cuenta se crea en Auth y se sincroniza con la tabla `profiles`.
4. Si se solicita verificación, ingresa el código enviado por correo.
5. Si olvidaste tu contraseña, usa la opción de recuperación y sigue el enlace enviado por correo.

## 5. Vista principal
Una vez dentro de la aplicación verás:
- menú lateral con secciones principales
- resumen de tareas pendientes
- acceso a calendario, prioridades, mensajes y configuración
- botón para crear nuevas actividades

## 6. Crear actividades
1. Haz clic en `+ Nueva actividad`.
2. Completa los campos:
   - Título
   - Materia
   - Fecha
   - Hora
   - Prioridad
   - Recordatorio
   - Descripción (opcional)
   - Imagen adjunta (opcional, máximo 5 MB)
3. Guarda la actividad.

## 7. Gestionar tareas
En la lista de tareas podrás:
- marcar como completada o pendiente
- editar una actividad
- eliminar una tarea
- abrir el modo enfoque
- ver o borrar imágenes adjuntas

## 8. Modo enfoque
El modo enfoque ayuda a concentrarte en una sola tarea. Al entrar, verás la actividad seleccionada con prioridad y detalle. Sirve para trabajar sin distracciones.

## 9. Calendario
La vista de calendario permite:
- revisar actividades por fecha
- navegar entre meses
- seleccionar un día para ver la agenda programada
- abrir una actividad directamente desde el calendario

## 10. Recordatorios y notificaciones
La aplicación puede:
- mostrar alarmas visuales y sonoras cuando llega la hora
- enviar notificaciones del navegador si la configuración lo permite
- registrar avisos para tareas próximas

## 11. Compartir agendas
1. Abre la sección `Compartir agendas`.
2. Escribe el correo del compañero.
3. Selecciona una tarea pendiente para compartir.
4. El compañero recibirá acceso a esa actividad.
5. Puedes revocar el acceso desde la misma sección.

## 12. Mensajes
La sección de mensajes permite:
- buscar un destinatario por correo
- iniciar conversaciones internas
- enviar mensajes con contenido académico o coordinación
- ver mensajes recientes con cada compañero

## 13. Perfil y configuración
Desde perfil/configuración puedes:
- revisar tu información personal
- activar o desactivar recordatorios automáticos
- habilitar o deshabilitar notificaciones del navegador
- activar alarmas sonoras
- decidir si mostrar tareas completadas
- cerrar sesión

## 14. Solución rápida de problemas
### La página no abre o el navegador queda en blanco
- Ejecuta primero `npm install` dentro de `ppi-react`.
- Luego inicia con `npm run dev`.
- Si aparece un puerto ocupado, Vite puede elegir `5174` o similar.
- Si quieres confirmar que la aplicación compila, usa:
  ```bash
  npm run build
  ```
- Si el build falla, revisa los mensajes de Vite y corrige el error antes de seguir.

### Error de autenticación o no se puede iniciar sesión
Si aparece el mensaje de que faltan variables de entorno o que Supabase no está configurado:
- abre `ppi-react/.env`
- reemplaza los valores de ejemplo por las claves reales de tu proyecto Supabase
- asegúrate de que no sigan quedando `tu_project_url_aqui` o `tu_anon_key_aqui`
- reinicia la aplicación

### Tareas no se cargan
- verifica que la base de datos tenga las migraciones ejecutadas
- comprueba que la sesión de Supabase esté activa
- revisa las políticas RLS de las tablas

### Supabase no acepta el registro ni la sesión
- habilita `Email` como proveedor de autenticación en Supabase (`Authentication` → `Providers`)
- verifica que la tabla `profiles` exista y que la migración SQL haya sido ejecutada
- revisa que los usuarios se estén creando con la Auth de Supabase y no con un proyecto sin configuración activa

### No se pueden adjuntar imágenes
- revisa que la imagen sea tipo imagen
- confirma que el archivo no supere 5 MB
- verifica que el bucket `task-attachments` exista en Supabase Storage

### Notificaciones no aparecen
- acepta permisos del navegador
- verifica que el proyecto tenga la clave VAPID pública
- revisa que el servicio worker `sw.js` esté funcionando

## 15. Seguridad
- No se usa `service_role` en el frontend.
- La app se conecta con la `anon key` de Supabase.
- Las operaciones sensibles dependen de políticas RLS y de sesiones autenticadas.

## 16. Glosario
- `profiles`: tabla con información del usuario
- `tasks`: tareas académicas del usuario
- `task_shares`: relaciones de tareas compartidas
- `messages`: conversaciones internas
- `notifications`: notificaciones del sistema
- `task_attachments`: archivos de imagen asociados a tareas

## 17. Soporte
Si necesitas ayuda adicional, revisa:
- `README.md` del proyecto
- `docs/PROJECT-DOCUMENTATION.md`
- la documentación de Supabase oficial
