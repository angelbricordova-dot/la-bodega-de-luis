# TuBodega: contexto y estrategia de videos

> **Para el chat de edición de video.** Este documento tiene todo el contexto de TuBodega, la estrategia de contenido y los guiones listos para editar. Los archivos que menciona vienen en el ZIP `TuBodega-videos.zip`. El primer encargo está en la sección 5: el Reel "Cómo usar TuBodega".

## 1. Qué es TuBodega

**TuBodega** es una app de punto de venta para bodegas, abastos y kioscos de Venezuela. Funciona en el teléfono Android del bodeguero, sin computadora ni caja registradora.

**Frase de marca:** Tu bodega completa en el teléfono.

**Lo que hace** (todo es real y se ve en los archivos):

- **Cobrar con la cámara:** apuntas al código de barras y el producto entra al carrito.
- **Dólares y bolívares:** cada precio se ve en $ y en Bs con la tasa del día, y calcula el vuelto en las dos monedas.
- **Vender por peso o por presentación:** queso por gramos o por monto ("dame $1 de queso"), huevos por unidad o por cartón.
- **Métodos de pago de Venezuela:** efectivo $, efectivo Bs, Pago Móvil (le muestra al cliente tus datos), punto, Zelle, Biopago y pago mixto.
- **Cuaderno de fiados:** quién debe, cuánto, abonos y recordatorio por WhatsApp.
- **Inventario:** lo que se está acabando y lo que está por vencer; crea códigos de barras para productos que no tienen e imprime la etiqueta.
- **Caja:** cuadre del día (cuánto se vendió, cuánto se ganó, cómo pagaron) y cierre de caja.
- **Ticket:** por impresora térmica Bluetooth o por WhatsApp. Es una nota de entrega.
- **Sin internet:** sigue vendiendo y se respalda en la nube cuando vuelve la señal.
- **Varios teléfonos (plan Pro):** el empleado vende en su teléfono y el dueño ve todo desde su casa.

**Para quién:** dueños de bodegas, abastos y kioscos en Venezuela, de 30 a 60 años. Usan WhatsApp todos los días pero no son "de tecnología". Ven los videos en el teléfono, muchas veces **sin sonido**. Les importa que sea fácil, que no se pierda la plata y que funcione aunque se vaya el internet o la luz.

**El problema que resolvemos:** anotan todo en un cuaderno, se les olvidan los fiados, no saben cuánto ganaron en el día, la caja no les cuadra cuando atiende un empleado y recalculan los precios en bolívares cada vez que cambia la tasa.

## 2. Oferta

| Qué | Precio |
| --- | --- |
| Prueba | **7 días gratis**, con sus productos, sin compromiso |
| Plan Básico | **$10 al mes**: 1 teléfono, ventas, fiados, inventario, caja y respaldo |
| Plan Pro | **$18 al mes**: varios teléfonos, usuario para el empleado, ver las ventas desde la casa |
| Instalación | $30 una vez: se la instalamos, cargamos sus productos y le enseñamos |
| Kit de impresión | $45: impresora térmica de 58 mm + 5 rollos + configuración |
| Paquete Arranque | $75: instalación + kit + primer mes (ahorra $10) |
| Referidos | Quien recomienda gana 1 mes gratis; el recomendado paga la instalación a mitad de precio |

- **Frase de precio:** "Menos de lo que vale una malta al día" ($10 al mes son unos 33 centavos diarios).
- **Pago:** en dólares o en bolívares a tasa BCV, mes a mes, sin contrato.
- **Llamado a la acción:** "Pruébala 7 días gratis. Escríbenos por WhatsApp" (en redes: "enlace en el perfil").
- **Enlaces:** página `tubodega-app.vercel.app/conocer` · Instagram **@tubodega.app** (cambiar si el usuario es otro) · WhatsApp **[TU WHATSAPP]**.

## 3. Marca y estilo

| Elemento | Valor |
| --- | --- |
| Nombre | **TuBodega**, todo junto: "Tu" en el color del texto y "Bodega" en verde |
| Verde principal | `#2F9E6E` · oscuro `#1D6548` · claro `#ECF8F2` |
| Texto oscuro | `#17201C` |
| Fondo claro | `#F4F7F5` |
| Fiados (morado) | `#B62FC9` |
| Letra | **Plus Jakarta Sans**: ExtraBold 800 para títulos, Bold 700 para subtítulos |
| Logo | `brand/icon.svg` y `brand/icon-512.png`: bolsa de compras blanca con código de barras sobre verde |

**Estilo visual:**
- Limpio, verde y blanco, esquinas redondeadas.
- La pantalla de la app dentro de un marco de teléfono negro con bordes redondeados, sobre fondo verde degradado (`#2F9E6E` → `#1D6548`).
- Los videos de `tiktok/` ya tienen ese estilo y sirven de referencia.

**Tono:**
- Cercano y de tú, como un vecino que te muestra algo útil.
- Español de Venezuela neutro, frases cortas, una idea por escena.
- Palabras de bodega: fiado, cuaderno, vuelto, Pago Móvil, punto, tasa, cuadrar la caja, mercancía, el empleado.

**Formato de todos los videos:**
- Vertical 9:16 a 1080×1920, 30 fps.
- **Subtítulos siempre**, porque la mayoría los ve sin sonido.
- **Gancho en los primeros 2 segundos:** una pregunta o una situación de bodega, nunca el logo.
- **Zona segura:** nada importante en los 250 px de arriba, los 350 de abajo ni los 140 de la derecha, porque Instagram y TikTok los tapan.
- **Cierre:** logo + "Pruébala 7 días gratis" + "Escríbenos por WhatsApp" (1,5 a 2 s).
- **Música y voz:** instrumental alegre (latina suave, marimba o guitarra) para promos; tranquila para tutoriales. Música 18 dB por debajo de la voz.
- **Efectos de sonido:** pitido de escáner al escanear, caja registradora al confirmar la venta, monedas en los abonos y "pop" suave al agregar productos.

**Lo que NO se puede decir ni mostrar:**
- **Factura fiscal:** el ticket es una "nota de entrega" sin valor fiscal. Nunca "factura", "homologado por el SENIAT" ni "cumple con el SENIAT".
- **Invenciones:** no inventar clientes, testimonios ni cifras ("500 bodegas ya la usan", "vende 30 % más").
- **Promesas falsas:** no cobra con tarjeta en el teléfono ni se conecta al banco. Pago Móvil y punto se registran; no se cobran desde la app.
- **Marcas de productos** (Harina PAN, Polar, Coca-Cola…): pueden verse de pasada, pero no se destacan, no se nombran en la voz y no se usan sus logos.
- **La tasa** de las grabaciones es la BCV del 17/11/2026 (915,75 Bs/$). No hagas primeros planos de montos en bolívares si el video se publica semanas después.

## 4. Archivos del ZIP

| Archivo | Qué muestra | Duración |
| --- | --- | --- |
| `clips/01-escanear-y-cobrar.mp4` | Escanea "Pasta Primor", agrega "Hielo" como venta libre, cobra en efectivo con $5, muestra el vuelto y "¡Venta registrada!" | 19 s |
| `clips/02-catalogo-peso-y-pago-movil.mp4` | Catálogo, queso por peso, cartón de huevos y pago con Pago Móvil | 17 s |
| `clips/03-fiado-y-abono.mp4` | Venta fiada a "Señora Carmen", cuaderno de fiados y abono | 15 s |
| `clips/04-inventario-y-etiquetas.mp4` | Inventario, producto nuevo con código generado e impresión de etiquetas | 10 s |
| `clips/05-cuadre-y-cierre-de-caja.mp4` | Cuadre del día, avisos y cierre de caja | 8 s |
| `screens/01` a `screens/24` | Pantallas fijas de cada paso (nombres descriptivos, por ejemplo `09-vuelto-efectivo.png`) | — |
| `tiktok/01` a `tiktok/05` | Los mismos clips ya montados en vertical con marco de teléfono y gancho arriba, sin sonido | 8 a 19 s |
| `brand/` | Logo en SVG y PNG | — |

**Detalles técnicos:**
- Los clips y las pantallas están a 1170×2532 (teléfono a 3×), sin sonido y a 30 fps.
- Para un video 1080×1920, escala el clip a unos 630×1360 dentro del marco de teléfono, o hazle zoom a la parte que importa.

**Momentos clave de `clips/01-escanear-y-cobrar.mp4`:**

| Segundo | Qué pasa | Efecto |
| --- | --- | --- |
| 0,6 | Escanea el código y entra "Pasta Primor 1kg" | pitido |
| 1 a 5 | Venta libre: agrega "Hielo" | toques y "pop" |
| 7 | Revisar orden | "whoosh" |
| 9 a 10 | Toca $5 y aparece el vuelto | toque |
| 10,8 | "¡Venta registrada!" | caja registradora |

## 5. Primer encargo: Reel "Cómo usar TuBodega" (45 s)

**Objetivo:** que un bodeguero vea en menos de un minuto que la app es fácil. Se publica en Instagram y TikTok y se fija en el perfil.

**Estructura:** gancho → 4 pasos → cierre.
- Cada paso lleva un número grande arriba ("1", "2"…) y un título corto.
- Un círculo o una flecha verde marca dónde tocar.

| Tiempo | Imagen | Texto en pantalla | Voz | Sonido |
| --- | --- | --- | --- | --- |
| 0–2 s | `clips/01` en 0,6 s, con zoom al código | **¿Así de rápido cobras tú?** | ¿Así de rápido cobras tú? | pitido |
| 2–4 s | Logo sobre verde | **Así se usa TuBodega** | Te enseño a usar Tu Bodega en cuatro pasos. | whoosh |
| 4–12 s | `clips/01` de 0 a 5 s | **1. Escanea o agrega** | Apunta la cámara al código. Y si no tiene código, como el hielo, toca Venta libre. | pop |
| 12–20 s | `clips/01` de 6 a 11 s | **2. Cobra en $ o Bs** | Elige cómo te pagan. Toca el billete y te dice el vuelto en dólares y bolívares. | caja registradora en 10,8 s |
| 20–29 s | `clips/03` de 0 a 9 s | **3. ¿Fiado? Anotado** | ¿Te lo paga después? Fíalo y queda en el cuaderno, con cada abono. | monedas |
| 29–37 s | `clips/05` completo | **4. Cuadra la caja** | Al final del día ves cuánto vendiste, cuánto ganaste y si te cuadra la caja. | — |
| 37–41 s | `screens/17-cuadre-del-dia.png` con zoom lento | **Funciona sin internet** | Y todo funciona aunque se vaya el internet. | — |
| 41–45 s | Logo + textos de cierre | **Pruébala 7 días gratis · Escríbenos por WhatsApp** | Pruébala siete días gratis. Escríbenos. | golpe final |

**Para la voz (ElevenLabs u otra):**
- Escribe "Tu Bodega" separado, para que lo diga bien.
- Los montos van en letras ("siete días", "diez dólares").
- Usa una voz latinoamericana cálida, ni de locutor ni de vendedor. Velocidad 0,95 en tutoriales y 1,0 a 1,05 en promos.

**Descripción para redes:**

```
Así de fácil se usa TuBodega 👇
1️⃣ Escaneas o agregas
2️⃣ Cobras en $ o Bs, con vuelto
3️⃣ El fiado queda anotado
4️⃣ La caja te cuadra sola
Funciona sin internet. Pruébala 7 días gratis 👉 enlace en el perfil
#bodega #abasto #bodegasvenezuela #emprendedoresvenezolanos #puntodeventa
```

## 6. Estrategia de contenido

Cinco tipos de video, cada uno con un trabajo distinto:

| Tipo | Para qué | Duración | Cuántos por semana |
| --- | --- | --- | --- |
| **A. Cómo usar** | Mostrar que es fácil; enseñar a los clientes nuevos | 20 a 45 s | 2 |
| **B. Problema → solución** | Que el bodeguero se reconozca ("eso me pasa a mí") | 10 a 20 s | 2 |
| **C. Promoción** | Llevar a escribir por WhatsApp: prueba gratis, precios, referidos | 10 a 20 s | 1 |
| **D. Presentación** | Qué es TuBodega y quién está detrás | 30 a 60 s | 1 cada 2 semanas |
| **E. Confianza** | Visitas reales, preguntas frecuentes, detrás de cámara | 15 a 30 s | 1 o 2 |

**Regla general:** 1 video al día, publicado entre 6 y 8 de la noche, en Instagram (Reel) y TikTok. Los de "Cómo usar" también se mandan por WhatsApp a cada cliente nuevo.

### A. Cómo usar (serie de 5 tutoriales)

Título fijo arriba: "TuBodega · Tutorial N". Música tranquila, voz pausada y una flecha verde en cada toque.

| N | Tema | Material | Pasos que muestra |
| --- | --- | --- | --- |
| T1 | Tu primera venta (40 s) | `clips/01`, `screens/01`, `07`, `09`, `10` | Escanear → venta libre → revisar orden → elegir pago y vuelto → confirmar e imprimir o mandar por WhatsApp |
| T2 | Vender por peso y por caja (35 s) | `clips/02`, `screens/04`, `05`, `06`, `08` | Catálogo → queso por peso o por monto → huevos por cartón → cobrar con Pago Móvil |
| T3 | Fiados y abonos (40 s) | `clips/03`, `screens/11`, `12`, `13` | Cobrar como fiado → Historial → Fiados → registrar abono → recordatorio por WhatsApp |
| T4 | Productos, inventario y etiquetas (40 s) | `clips/04`, `screens/14`, `15`, `16`, `18` | Nuevo producto → escanear o generar código → imprimir etiqueta → avisos de lo que se acaba |
| T5 | Cuadre del día y cierre de caja (35 s) | `clips/05`, `screens/17`, `19`, `20` | Cuadre del día → métodos de pago → cerrar caja → finanzas del mes |

### B. Problema → solución

Empiezan con una situación de bodega, actuada o en texto, y terminan con la app resolviéndola. Gancho en texto grande:

| Video | Gancho (0–2 s) | Solución | Material |
| --- | --- | --- | --- |
| B1 | "Cuando el cliente dice 'yo ya te pagué'…" | Cuaderno de fiados con cada abono | `clips/03`, `screens/12` |
| B2 | "Subió la tasa otra vez 😩" | Actualizas la tasa con un toque y todos los precios en Bs cambian solos | `screens/04`, `screens/21` |
| B3 | "¿Cuánto ganaste hoy? … ¿No sabes?" | Cuadre del día con ganancia | `clips/05`, `screens/17` |
| B4 | "Se fue el internet 🙃" | Sigues vendiendo igual | `clips/01` + texto "Sin internet ✓" |
| B5 | "El vuelto en bolívares con calculadora…" | Toca el billete y sale el vuelto | `screens/09` |
| B6 | "Tu empleado cerró la caja y no cuadra" | Cierre de caja con efectivo esperado | `screens/19` |

### C. Promoción

| Video | Mensaje | Estructura |
| --- | --- | --- |
| C1 | 7 días gratis | Gancho "¿Y si la pruebas gratis?" → 3 tomas rápidas de la app → "7 días gratis · te la instalo" → WhatsApp |
| C2 | Precios | "¿Cuánto cuesta?" → $10 Básico / $18 Pro en pantalla → "menos que una malta al día" → WhatsApp |
| C3 | Paquete Arranque | Impresora imprimiendo el ticket (`screens/24`) → "Instalación + impresora + primer mes: $75" |
| C4 | Referidos | "¿Tienes un amigo con bodega?" → 1 mes gratis para ti, instalación a mitad de precio para él |
| C5 | Plan Pro | "Tu bodega desde tu casa" → el dueño en otro lugar ve una venta del empleado (`screens/27` si existe, o texto) |

### D. Presentación

- **D1, "Qué es TuBodega" (45 a 60 s):** problema (cuaderno) → la app en 4 tomas → para quién es → precio y prueba gratis → WhatsApp. Sirve de video fijado y para enviar a bodegas que preguntan "¿qué es eso?".
- **D2, "Quién está detrás" (30 s):** tú hablando a cámara: quién eres, por qué hiciste TuBodega para las bodegas de tu zona y que vas personalmente a instalarla. Es el que más confianza da.

### E. Confianza

- **E1, "Día 1 visitando bodegas":** tú en la calle, en voz baja, cuentas qué te dijeron. Sin mostrar caras ni nombres sin permiso.
- **E2, "Le instalé TuBodega a…":** solo con permiso escrito del dueño. Muestra su primer escaneo.
- **E3, preguntas frecuentes, una por video:** ¿necesito internet?, ¿es factura fiscal?, ¿y si pierdo el teléfono?, ¿tengo que comprar algo?, ¿puede usarla mi empleado?
- **E4, responder comentarios con video:** cuando alguien pregunte algo en los comentarios.

## 7. Calendario de las dos primeras semanas

| Día | Video |
| --- | --- |
| Miércoles 18 | **Reel "Cómo usar TuBodega" (sección 5)**, fijado |
| Jueves 19 | B1, fiados ("yo ya te pagué") |
| Viernes 20 | C1, 7 días gratis |
| Sábado 21 | B3, ¿cuánto ganaste hoy? |
| Domingo 22 | E3, ¿es factura fiscal? |
| Lunes 23 | T1, tu primera venta |
| Martes 24 | B2, subió la tasa |
| Miércoles 25 | D2, quién está detrás (tú a cámara) |
| Jueves 26 | T3, fiados y abonos |
| Viernes 27 | C2, precios |
| Sábado 28 | E1, día de visitas |
| Domingo 29 | B4, se fue el internet |
| Lunes 30 | T5, cierre de caja |
| Martes 1 | C4, referidos |

## 8. Lista de revisión antes de exportar

- [ ] 1080×1920, 30 fps, MP4 H.264.
- [ ] El gancho se entiende en los primeros 2 segundos sin sonido.
- [ ] Subtítulos en todo el video, grandes y dentro de la zona segura.
- [ ] Dice "nota de entrega", nunca "factura".
- [ ] Las marcas de productos no se destacan ni se nombran.
- [ ] Cierre con logo, "Pruébala 7 días gratis" y "Escríbenos por WhatsApp".
- [ ] Una versión sin música para TikTok, donde se pone el sonido en tendencia dentro de la app.
