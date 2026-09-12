// Exact RECORDATE WebGL1 fragment shader — do not simplify.
/**
 * Fragment shader WebGL1: puntos de medio tono, paleta RECORDATE y cursor.
 * Se exporta como string porque WebGL no lee archivos .glsl en el navegador.
 */
export const HALFTONE_FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH // Si la GPU admite alta precisión en fragment…
precision highp float; // …usa float de 32 bits para menos bandas en el ruido.
#else // GPUs modestas (móviles viejos) caen aquí.
precision mediump float; // Float de 16–24 bits: suficiente y más barato.
#endif // Cierra el bloque de precisión.

uniform vec3 u_colors[8]; // Paleta de 8 colores RGB enviada desde JS.

uniform vec4 u_scene; // xy = resolución, z = tiempo, w = cuántos colores usar.
uniform vec4 u_shape; // x = escala, y = intensidad, z = radio, w = warp.
uniform vec4 u_surface; // x = detalle, y = contraste, z = brillo, w = saturación.
uniform vec4 u_finish; // x = matiz, y = viñeta, z = blur, w = grano.
uniform vec4 u_transform; // x = semilla, y = rotación, z = deriva, w = flag oklab.
uniform vec4 u_space; // xy = offset del patrón, zw = mouse en NDC.
uniform vec4 u_cursor; // x = presencia, y = tipo de efecto, z = fuerza, w = radio.

#define u_resolution u_scene.xy // Alias: tamaño del framebuffer.
#define u_time u_scene.z // Alias: tiempo animado en segundos.
#define u_colorCount u_scene.w // Alias: número de stops de la paleta.
#define u_scale u_shape.x // Alias: zoom del campo de puntos.
#define u_intensity u_shape.y // Alias: densidad de celdas.
#define u_paramA u_shape.z // Alias: radio base de cada punto.
#define u_warp u_shape.w // Alias: cantidad de distorsión fbm.
#define u_detail u_surface.x // Alias: frecuencia del warp.
#define u_contrast u_surface.y // Alias: contraste final.
#define u_brightness u_surface.z // Alias: brillo final.
#define u_saturation u_surface.w // Alias: saturación final.
#define u_hue u_finish.x // Alias: rotación de matiz en radianes.
#define u_vignette u_finish.y // Alias: oscurecido de esquinas.
#define u_blur u_finish.z // Alias: radio del blur 5 taps.
#define u_grain u_finish.w // Alias: intensidad del grano.

#ifdef GL_FRAGMENT_PRECISION_HIGH // En highp la semilla puede ser grande.
#define u_seed u_transform.x // Usa la semilla completa.
#else // En mediump un float grande pierde dígitos.
#define u_seed mod(u_transform.x, 31.0) // Reduce la semilla al rango 0–31.
#endif // Fin del alias de semilla.

#define u_rotate u_transform.y // Alias: ángulo de rotación del patrón.
#define u_drift u_transform.z // Alias: deriva lenta en el tiempo.
#define u_oklab u_transform.w // Alias: 1 = mezclar colores en OKLab.
#define u_offset u_space.xy // Alias: desplazamiento 2D del patrón.
#define u_mouse u_space.zw // Alias: posición del puntero.
#define u_cursorPresence u_cursor.x // Alias: 0–1, cursor “presente”.
#define u_cursorEffect u_cursor.y // Alias: qué efecto aplica el cursor.
#define u_cursorStrength u_cursor.z // Alias: fuerza de ese efecto.
#define u_cursorRadius u_cursor.w // Alias: radio de influencia.

// Hash 2D barato: un float “aleatorio” estable para cada celda.
float hash21(vec2 p) {  // Abre hash21.
#ifndef GL_FRAGMENT_PRECISION_HIGH // En mediump hay que acotar p.
  p = mod(p, 31.0); // Evita overflow de enteros grandes.
#endif // Fin del recorte mediump.
  p = fract(p * vec2(234.34, 435.345)); // Multiplica y deja solo la fracción.
  p += dot(p, p + 34.23); // Mezcla x e y para romper rayas.
  return fract(p.x * p.y); // Devuelve 0–1 aparentemente aleatorio.
}  // Fin de hash21.

// Hash 3D compacto para el grano de película (un valor por píxel).
float grainHash(vec2 p) {  // Abre grainHash.
  vec3 p3 = fract(vec3(p.xyx) * 0.1031); // Expande 2D a 3D y fractura.
  p3 += dot(p3, p3.yzx + 33.33); // Mezcla canales para más difusión.
  return fract((p3.x + p3.y) * p3.z); // Un float 0–1 por fragmento.
}  // Fin de grainHash.

// Hash 2D que devuelve un vec2 (útil si se necesitara jitter extra).
vec2 hash22(vec2 p) {  // Abre hash22.
#ifndef GL_FRAGMENT_PRECISION_HIGH // Misma precaución mediump.
  p = mod(p, 31.0); // Recorta coordenadas grandes.
#endif // Fin del recorte.
  float n = sin(dot(p, vec2(41.0, 289.0))); // Seno de un producto punto “mágico”.
  return fract(vec2(15731.743, 7892.321) * n); // Dos fracciones distintas.
}  // Fin de hash22.

// Ruido value 2D interpolado (Hermite) a partir de hash21.
float noise(vec2 p) {  // Abre noise.
  vec2 i = floor(p); // Celda entera.
  vec2 f = fract(p); // Posición dentro de la celda 0–1.
  vec2 u = f * f * (3.0 - 2.0 * f); // Curva suave Hermite (suaviza juntas).
  return mix( // Interpola los 4 vértices de la celda.
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), // Arista inferior.
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), // Arista superior.
    u.y); // Mezcla vertical.
}  // Fin de noise.

// Fractal Brownian Motion: 5 octavas de ruido para el warp.
float fbm(vec2 p) {  // Abre fbm.
  float v = 0.0; // Acumulador del ruido.
  float a = 0.5; // Amplitud de la primera octava.
  for (int i = 0; i < 5; i++) { // WebGL1 exige un límite constante en el for.
    v += a * noise(p); // Suma esta octava.
    p = p * 2.03 + vec2(17.0, 9.2); // Sube frecuencia y desplaza para no alinear.
    a *= 0.5; // Cada octava aporta la mitad.
  } // Fin de las 5 octavas.
  return v; // Valor aproximado 0–1.
}  // Fin de fbm.

// Convierte sRGB (gamma) a lineal para mezclar luz de forma correcta.
vec3 srgbToLinear(vec3 c) {  // Abre srgbToLinear.
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), // Rama lineal vs. potencia 2.4.
    step(0.04045, c)); // Elige rama según el umbral IEC 61966-2-1.
}  // Fin de srgbToLinear.

// Convierte lineal de vuelta a sRGB para escribir gl_FragColor.
vec3 linearToSrgb(vec3 c) {  // Abre linearToSrgb.
  return mix(c * 12.92, // Rama lineal (negros).
    1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, // Rama gamma.
    step(0.0031308, c)); // Umbral de la inversa sRGB.
}  // Fin de linearToSrgb.

// RGB lineal → OKLab (espacio perceptual para mezclar sin grises sucios).
vec3 linToOklab(vec3 c) {  // Abre linToOklab.
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b; // Cono L.
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b; // Cono M.
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b; // Cono S.
  l = pow(max(l, 0.0), 1.0 / 3.0); // Raíz cúbica (no linealidad LMS).
  m = pow(max(m, 0.0), 1.0 / 3.0); // Raíz cúbica de M.
  s = pow(max(s, 0.0), 1.0 / 3.0); // Raíz cúbica de S.
  return vec3( // Empaqueta L, a, b de OKLab.
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, // Luminosidad L.
    1.9779984951 * l - 2.4285923458 * m + 0.4505937099 * s, // Eje a (verde–rojo).
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s); // Eje b (azul–amarillo).
}  // Fin de linToOklab.

// OKLab → RGB lineal (matriz inversa de linToOklab).
vec3 oklabToLin(vec3 c) {  // Abre oklabToLin.
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z; // LMS' L.
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z; // LMS' M.
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z; // LMS' S.
  l = l * l * l; // Cubo: inversa de la raíz cúbica.
  m = m * m * m; // Cubo de M.
  s = s * s * s; // Cubo de S.
  return vec3( // RGB lineal.
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, // Canal R.
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, // Canal G.
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s); // Canal B.
}  // Fin de oklabToLin.

// Mezcla dos colores: en OKLab si el uniform lo pide, si no en RGB crudo.
vec3 mixColour(vec3 a, vec3 b, float t) {  // Abre mixColour.
  if (u_oklab > 0.5) { // Flag oklab activo.
    vec3 la = linToOklab(srgbToLinear(a)); // Color A a OKLab.
    vec3 lb = linToOklab(srgbToLinear(b)); // Color B a OKLab.
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0); // Mezcla y vuelve a sRGB.
  } // Fin de la rama OKLab.
  return mix(a, b, t); // Mezcla RGB simple (más barata).
}  // Fin de mixColour.

// Recorre la paleta u_colors según x en 0–1.
vec3 palette(float x) {  // Abre palette.
  float n = max(u_colorCount - 1.0, 1.0); // Número de intervalos entre colores.
  float f = clamp(x, 0.0, 1.0) * n; // Posición continua en esos intervalos.
  vec3 col = u_colors[0]; // Empieza en el primer color.

  for (int i = 0; i < 7; i++) { // Máximo 7 mezclas (8 colores). WebGL1: for constante.
    if (float(i) < n) // Solo mezcla si este stop existe.
      col = mixColour( // Actualiza col hacia el siguiente stop.
        col, // Color acumulado.
        u_colors[i + 1], // Siguiente color de la paleta.
        smoothstep( // Hermite 0–1 dentro del intervalo i.
          0.0, // Inicio del smoothstep.
          1.0, // Fin del smoothstep.
          clamp(f - float(i), 0.0, 1.0) // Fracción dentro de este tramo.
        ) // Fin del factor de mezcla.
      ); // Fin de mixColour.
  } // Fin del for de paleta.

  return col; // Color interpolado.
}  // Fin de palette.

// Gira el matiz en espacio YIQ (más barato que HSV completo).
vec3 hueRotate(vec3 col, float a) {  // Abre hueRotate.
  const mat3 toYIQ = mat3( // RGB → YIQ (NTSC).
    0.299, 0.596, 0.211, // Columna que alimenta Y, I, Q desde R.
    0.587, -0.274, -0.523, // Desde G.
    0.114, -0.322, 0.312 // Desde B.
  ); // Fin de toYIQ.

  const mat3 toRGB = mat3( // YIQ → RGB.
    1.0, 1.0, 1.0, // Y aporta por igual a R, G, B.
    0.956, -0.272, -1.106, // I.
    0.621, -0.647, 1.703 // Q.
  ); // Fin de toRGB.

  vec3 yiq = toYIQ * col; // Pasa el color a YIQ.

  float ca = cos(a); // Coseno del ángulo de matiz.
  float sa = sin(a); // Seno del ángulo de matiz.

  yiq = vec3( // Rota solo I y Q; Y (luma) se queda.
    yiq.x, // Luma intacta.
    yiq.y * ca - yiq.z * sa, // I rotada.
    yiq.y * sa + yiq.z * ca // Q rotada.
  ); // Fin del vec3 rotado.

  return toRGB * yiq; // Regresa a RGB.
}  // Fin de hueRotate.

// Sombrea un punto: campo sinusoidal + máscara circular tipo halftone.
vec3 shade(vec2 uv, vec2 p, float t) {  // Abre shade.
  float cells = 18.0 + u_intensity * 30.0; // Más intensidad → más puntos por pantalla.

  vec2 f = fract(p * cells) - 0.5; // Coordenada local de la celda, centrada en 0.

  float field = // Campo 0–1 que “late” con el tiempo.
    0.5 + // Centro en 0.5.
    0.5 * // Amplitud 0.5.
    sin(p.x * 3.0 + t + u_seed) * // Onda en X.
    sin(p.y * 2.4 - t * 0.7); // Onda en Y (fase distinta).

  float r = // Radio del punto en la celda.
    (0.06 + u_paramA * 0.34) + // Radio base según paramA.
    field * 0.2; // El campo engorda o adelgaza el punto.

  float dotMask = // 1 dentro del punto, 0 fuera, con borde suave.
    1.0 - // Invertimos el smoothstep (queremos el interior).
    smoothstep( // Antialias del borde del círculo.
      r - 0.08, // Empieza a caer un poco antes del radio.
      r, // Fuera de r el valor es 1 (y luego se invierte a 0).
      length(f) // Distancia al centro de la celda.
    ); // Fin del smoothstep.

  return mix( // Fondo vs. paleta según la máscara.
    u_colors[0], // Color de fondo (el más oscuro).
    palette(field), // Color de la paleta guiado por el campo.
    dotMask // 1 = punto visible.
  ); // Fin del mix.
}  // Fin de shade.

// Punto de entrada: un color por fragmento (píxel).
void main() {  // Abre main.
  vec2 uv = // UV 0–1 de la pantalla.
    gl_FragCoord.xy / // Coordenada del píxel en el framebuffer.
    u_resolution.xy; // Dividida por el tamaño → 0–1.

  vec2 screenUv = uv; // Copia para la viñeta (no se distorsiona).

  vec2 p = // Coordenada centrada y aspect-correct.
    (gl_FragCoord.xy - 0.5 * u_resolution.xy) / // Centra el origen.
    min(u_resolution.x, u_resolution.y); // Divide por el lado menor (círculos redondos).

  float cursorMask = 0.0; // Máscara del cursor (se llena si hay presencia).

  if (u_cursorPresence > 0.001) { // El puntero está (o estuvo) cerca.

    vec2 cursor = // Posición del mouse en el mismo espacio que p.
      (0.5 * u_mouse * u_resolution.xy) / // NDC × resolución / 2.
      min(u_resolution.x, u_resolution.y); // Misma normalización de aspecto.

    vec2 cursorDelta = // Vector del cursor al fragmento.
      p - cursor; // Resta de posiciones.

    if (u_cursorEffect < 0.5) { // Efecto 0: empuja todo el campo.

      p += // Desplaza p hacia el cursor.
        cursor * // Dirección del cursor.
        u_cursorPresence * // Cuánto está “presente”.
        u_cursorStrength * // Fuerza configurada.
        0.55; // Factor de escala visual.

    } else { // Otros efectos usan distancia y dirección.

      float cursorDistance = // Distancia al cursor.
        length(cursorDelta); // Norma del delta.

      vec2 cursorDirection = // Dirección unitaria.
        cursorDelta / // Delta crudo.
        max(cursorDistance, 0.0001); // Evita dividir por cero.

      cursorMask = // 1 cerca del cursor, 0 fuera del radio.
        u_cursorPresence * // Se apaga al salir el mouse.
        ( // Paréntesis de la caída suave.
          1.0 - // Invertimos el smoothstep.
          smoothstep( // Caída 1→0 a lo largo del radio.
            0.0, // Empieza en el centro.
            u_cursorRadius, // Termina en el radio.
            cursorDistance // Distancia actual.
          ) // Fin del smoothstep.
        ); // Fin del factor espacial.

      if (u_cursorEffect < 1.5) { // Efecto 1: empuja radialmente hacia afuera.

        p -= // Resta = aleja del cursor.
          cursorDirection * // A lo largo del radio.
          cursorMask * // Solo cerca.
          u_cursorStrength * // Fuerza.
          0.24; // Escala suave.

      } else if (u_cursorEffect < 2.5) { // Efecto 2: remolino.

        float cursorAngle = // Ángulo de giro local.
          cursorMask * // Más giro cerca.
          u_cursorStrength * // Fuerza.
          2.2; // Escala en radianes.

        float cc = cos(cursorAngle); // Cos del giro.
        float cs = sin(cursorAngle); // Sen del giro.

        p = // Rota el delta alrededor del cursor.
          cursor + // Centro de rotación.
          mat2( // Matriz 2×2 de rotación.
            cc, // cos
            -cs, // -sin
            cs, // sin
            cc // cos
          ) * // Aplica la matriz.
          cursorDelta; // Vector a rotar.

      } else if (u_cursorEffect < 3.5) { // Efecto 3: ondulación (ripple).

        float ripple = // Onda senoidal según distancia y tiempo.
          sin( // Seno = vaivén.
            cursorDistance / // Distancia normalizada…
            max(u_cursorRadius, 0.001) * // …por el radio (evita /0).
            18.0 - // Frecuencia espacial.
            u_time * 5.0 // Viaja con el tiempo.
          ); // Fin del sin.

        p -= // Desplaza a lo largo de la dirección.
          cursorDirection * // Unidad radial.
          ripple * // Signo y magnitud de la onda.
          cursorMask * // Solo cerca.
          u_cursorStrength * // Fuerza.
          0.07; // Escala pequeña (ripple sutil).
      } // Fin de efectos 1–3.
    } // Fin de la rama no-0.
  } // Fin del bloque de cursor.

  uv = // Recalcula UV a partir de p (por si el cursor lo movió).
    p * // Espacio centrado.
    min(u_resolution.x, u_resolution.y) / // Deshace la normalización.
    u_resolution.xy + // Pasa a 0–1 relativo al framebuffer.
    0.5; // Recoloca el origen al centro.

  p *= u_scale; // Zoom del patrón.

  if (abs(u_rotate) > 0.0001) { // Si hay rotación apreciable…

    float cr = cos(u_rotate); // Cos del ángulo global.
    float sr = sin(u_rotate); // Sen del ángulo global.

    p = // Rota p alrededor del origen.
      mat2( // Matriz de rotación 2D.
        cr, // cos
        -sr, // -sin
        sr, // sin
        cr // cos
      ) * // Producto matriz × vector.
      p; // Coordenada a rotar.
  } // Fin de la rotación.

  p += u_offset; // Desplaza el patrón (pan).

  if (u_drift > 0.0001) { // Deriva temporal lenta.

    p += // Suma un offset que orbita.
      u_drift * // Intensidad de la deriva.
      vec2( // Dirección 2D.
        sin(u_time * 0.31), // X oscila despacio.
        cos(u_time * 0.23) // Y con otra frecuencia (no es un círculo perfecto).
      ); // Fin del vec2.
  } // Fin del drift.

  if (u_warp > 0.0) { // Distorsión fractal opcional.

    p += // Desplaza p con fbm.
      u_warp * // Cantidad de warp.
      ( // El fbm está centrado en 0.5; restamos 0.5 para ir −0.5…0.5.
        vec2( // Offset 2D independiente por eje.
          fbm(p * u_detail + u_seed), // X: ruido con la semilla.
          fbm(p * u_detail + vec2(5.2, 1.3)) // Y: misma frecuencia, fase distinta.
        ) - // Fin del vec2 fbm.
        0.5 // Centra el desplazamiento.
      ); // Fin del factor.
  } // Fin del warp.

  vec3 col; // Color que vamos a sombrear.

  if (u_blur > 0.0) { // Blur barato de 5 tomas (cruz).

    float e = u_blur; // Radio del blur en UV.
    float pe = e * u_scale; // El mismo radio en espacio p.

    vec2 uvE = // Offset UV que respeta el aspecto.
      vec2(e) * // Radio uniforme.
      min(u_resolution.x, u_resolution.y) / // Compensa el lado menor.
      u_resolution.xy; // Pasa a UV.

    col = // Toma central, peso 0.36.
      shade(uv, p, u_time) * // Sombrea el centro.
      0.36; // Peso mayor en el centro.

    col += // Toma derecha.
      shade( // Llama shade desplazado.
        uv + vec2(uvE.x, 0.0), // UV +X.
        p + vec2(pe, 0.0), // p +X.
        u_time // Mismo tiempo.
      ) * // Fin de shade.
      0.16; // Peso de la toma.

    col += // Toma izquierda.
      shade( // Llama shade desplazado.
        uv - vec2(uvE.x, 0.0), // UV −X.
        p - vec2(pe, 0.0), // p −X.
        u_time // Mismo tiempo.
      ) * // Fin de shade.
      0.16; // Peso de la toma.

    col += // Toma arriba.
      shade( // Llama shade desplazado.
        uv + vec2(0.0, uvE.y), // UV +Y.
        p + vec2(0.0, pe), // p +Y.
        u_time // Mismo tiempo.
      ) * // Fin de shade.
      0.16; // Peso de la toma.

    col += // Toma abajo.
      shade( // Llama shade desplazado.
        uv - vec2(0.0, uvE.y), // UV −Y.
        p - vec2(0.0, pe), // p −Y.
        u_time // Mismo tiempo.
      ) * // Fin de shade.
      0.16; // Peso de la toma.

  } else { // Sin blur: una sola evaluación.

    col = // Color directo.
      shade( // Una llamada.
        uv, // UV actual.
        p, // p actual.
        u_time // Tiempo actual.
      ); // Fin de shade.
  } // Fin del if blur.

  if (abs(u_contrast - 1.0) > 0.0001) // Si el contraste no es 1…
    col = // Recentra en 0.5, escala y vuelve.
      (col - 0.5) * // Quita el punto medio.
      u_contrast + // Multiplica el contraste.
      0.5; // Restaura el punto medio.

  if (abs(u_saturation - 1.0) > 0.0001) { // Si hay que desaturar o saturar…

    float luma = // Luma rec. 601.
      dot( // Producto punto = suma ponderada.
        col, // Color actual.
        vec3( // Pesos R, G, B.
          0.299, // Rojo.
          0.587, // Verde (el ojo es más sensible).
          0.114 // Azul.
        ) // Fin de los pesos.
      ); // Fin del dot.

    col = // Mezcla gris ↔ color.
      mix( // mix(a,b,t).
        vec3(luma), // Gris de esa luma.
        col, // Color original.
        u_saturation // 0 = gris, 1 = original, >1 = más vivo.
      ); // Fin del mix.
  } // Fin de saturación.

  if (abs(u_hue) > 0.0001) // Si hay giro de matiz…
    col = // Aplica hueRotate.
      hueRotate( // RGB → YIQ → rota I/Q → RGB.
        col, // Color de entrada.
        u_hue // Ángulo en radianes.
      ); // Fin de hueRotate.

  if (abs(u_brightness) > 0.0001) // Si hay brillo distinto de 0…
    col += u_brightness; // Suma (puede ser negativo = oscurecer).

  if (u_vignette > 0.0001) { // Oscurece las esquinas.

    float vd = // Distancia del centro, 0–√2.
      length( // Norma 2D.
        screenUv - 0.5 // UV original centrada.
      ) * // Fin de length.
      1.41421356; // ×√2 para que la esquina valga ~1.

    col *= // Atenúa el color.
      1.0 - // 1 en el centro.
      u_vignette * // Intensidad de la viñeta.
      smoothstep( // 0 hasta 0.35, 1 en el borde.
        0.35, // Empieza lejos del centro.
        1.0, // Llega a 1 en la esquina.
        vd // Distancia actual.
      ); // Fin del smoothstep.
  } // Fin de la viñeta.

  if ( // Brillo extra del cursor (efecto ≥ 4).
    u_cursorPresence > 0.001 && // Hay cursor.
    u_cursorEffect > 3.5 // Y el efecto es “glow”.
  ) { // Cuerpo del glow.

    col += // Suma luz local.
      ( // Tinte: gris + un poco del propio color.
        vec3(0.18) + // Base clara.
        col * 0.12 // Toma el color actual.
      ) * // Fin del tinte.
      cursorMask * // Solo cerca del puntero.
      u_cursorStrength; // Fuerza del glow.
  } // Fin del glow.

  if (u_grain > 0.0001) { // Grano de película por píxel.

    col += // Suma ruido centrado.
      ( // (hash − 0.5) está en −0.5…0.5.
        grainHash( // Hash estable por fragmento.
          gl_FragCoord.xy + // Coordenada de píxel.
          vec2( // Offset con la semilla para variar el patrón.
            u_seed * 17.0, // X dependiente de la semilla.
            u_seed * 31.0 // Y con otro múltiplo.
          ) // Fin del vec2.
        ) - // Fin de grainHash.
        0.5 // Centra el ruido.
      ) * // Fin del paréntesis.
      u_grain; // Escala por la intensidad.
  } // Fin del grano.

  gl_FragColor = // Color final del fragmento.
    vec4( // RGB + alfa 1 (opaco).
      clamp( // Recorta canales a 0–1 (evita bloom inválido).
        col, // Color procesado.
        0.0, // Mínimo.
        1.0 // Máximo.
      ), // Fin del clamp.
      1.0 // Alfa opaco.
    ); // Fin del vec4.
} // Fin de main.
`; // Cierra el template string del fragment shader.

/**
 * Vertex shader mínimo: pasa el full-screen triangle al clip space.
 * a_position ya viene en NDC (−1 a 3) para cubrir toda la pantalla con 3 vértices.
 */
export const HALFTONE_VERT = `  // Abre el string del shader.
attribute vec2 a_position; // Posición 2D de cada vértice del triángulo.
void main() { // Un vértice de salida por vértice de entrada.
  gl_Position = vec4(a_position, 0.0, 1.0); // z=0, w=1: queda en el plano de la pantalla.
} // Fin del vertex shader.
`; // Cierra el template string del vertex shader.
