# Instagram de TuBodega

Todo lo necesario para abrir la cuenta y dejarla lista con sus primeras publicaciones. Las imágenes están en [`imagenes/`](imagenes).

## 1. Crear la cuenta

1. Crea la cuenta con el número de WhatsApp Business de TuBodega o con un correo nuevo, no con tu cuenta personal.
2. **Usuario:** prueba en este orden hasta encontrar uno libre: `tubodega.app`, `tubodega.ve`, `tubodegaapp`, `tubodega_ve`. Usa el mismo en TikTok.
3. **Nombre:** `TuBodega · App para bodegas`. Instagram busca por este nombre, por eso lleva "app para bodegas".
4. **Cuenta profesional:** Configuración → Tipo de cuenta y herramientas → Cambiar a cuenta profesional → Empresa. Categoría: **Software**.
5. **Foto de perfil:** `00-foto-de-perfil.png`.
6. **Biografía:**

   ```
   Ventas, fiados e inventario de tu bodega en el teléfono 📱
   Cobra con la cámara · $ y Bs · Funciona sin internet
   7 días gratis 👇
   ```

7. **Enlace:** `https://tubodega-app.vercel.app/conocer`
8. **Botón de WhatsApp:** Editar perfil → Opciones de contacto (o Botones de acción) → WhatsApp, con el número de WhatsApp Business.
9. Ya existe la cuenta de TikTok o la de Facebook: enlázalas desde Centro de cuentas, para compartir los videos en las dos.

## 2. Publicar en este orden

Instagram muestra primero lo último que publicas. En este orden, el carrusel "Conoce TuBodega" queda arriba a la izquierda.

| Orden | Qué | Imágenes |
| --- | --- | --- |
| 1 | Precios | `post2-precios.png` |
| 2 | Preguntas frecuentes (carrusel) | `post3-01` a `post3-06` |
| 3 | El video promocional que ya tienes (Reel) | tu video |
| 4 | Conoce TuBodega (carrusel) | `post1-01` a `post1-06` |

Después fija tres publicaciones (⋯ → Fijar en tu perfil): Conoce TuBodega, el Reel y Precios.

### Texto: Precios

```
Precios claros, sin contrato 💚

Básico: $10 al mes. Un teléfono, con ventas, fiados, inventario, caja y respaldo en la nube.
Pro: $18 al mes. Varios teléfonos, un usuario para tu empleado y las ventas a la vista desde tu casa.

Primero la pruebas 7 días gratis con tus productos. Pagas en dólares o en bolívares a tasa BCV.

👉 Escríbenos por WhatsApp: el enlace está en el perfil.

#bodega #abasto #bodegasvenezuela #emprendedoresvenezolanos #negociosvenezuela #puntodeventa
```

### Texto: Preguntas frecuentes

```
Las 4 preguntas que más nos hacen los bodegueros 👇

1. ¿Necesito internet? No para vender.
2. ¿Es factura fiscal? No. Es una nota de entrega para tu control.
3. ¿Y si se me pierde el teléfono? Tus datos están en la nube.
4. ¿Tengo que comprar algo? No. Funciona en el Android que ya tienes.

¿Tienes otra duda? Escríbela en los comentarios y te respondemos.

#bodega #abasto #bodegasvenezuela #emprendedoresvenezolanos #inventario #fiado
```

### Texto: Reel promocional

```
¿Todavía llevas tu bodega en un cuaderno? 📒
TuBodega cobra con la cámara, te da el vuelto en dólares y bolívares y lleva tus fiados sola. Funciona sin internet.
Pruébala 7 días gratis 👉 enlace en el perfil

#bodega #abasto #venezuela #emprendedoresvenezolanos #puntodeventa
```

### Texto: Conoce TuBodega

```
Tu bodega completa en el teléfono 📱

✅ Cobras con la cámara del teléfono
✅ Precios y vuelto en dólares y bolívares
✅ Cuaderno de fiados, con recordatorio por WhatsApp
✅ Inventario que te avisa qué se está acabando
✅ Cuadre del día y cierre de caja

No necesitas computadora y funciona sin internet.

👉 Pruébala 7 días gratis. Escríbenos por WhatsApp: el enlace está en el perfil.

#bodega #abasto #bodegasvenezuela #emprendedoresvenezolanos #negociosvenezuela #puntodeventa #inventario
```

Agrega a cada texto el hashtag de tu ciudad (por ejemplo `#valencia` o `#caracas`) y la ubicación en "Agregar ubicación".

## 3. Destacadas

Una destacada se arma con historias. Sube estas historias (en orden) y después, en el perfil, toca **Nueva** (el círculo con +), elige las de cada grupo, ponle el nombre y en **Editar portada** usa su portada.

| Destacada | Historias, en orden | Portada |
| --- | --- | --- |
| Precios | `historias/precios-1-planes`, `precios-2-extras`, `precios-3-como-pagar` | `destacada-precios.png` |
| Cómo usar | Los 5 videos de `marketing/tiktok/videos`: 01, 02, 03, 05 y 04 | `destacada-como-usar.png` |
| Preguntas | `historias/preguntas-1` a `preguntas-5` | `destacada-preguntas.png` |
| Prueba gratis | `historias/prueba-1-como-funciona`, `prueba-2-que-incluye`, `prueba-3-escribeme` | `destacada-prueba-gratis.png` |

**Enlace a tu WhatsApp:** en la última historia de "Precios" y en `prueba-3-escribeme`, antes de publicar toca el ícono de stickers → **Enlace** → pega tu enlace de WhatsApp (`https://wa.me/58…`) → escribe "Escríbeme" como texto del enlace. Ponlo en el espacio vacío de abajo.

**Preguntas nuevas:** de vez en cuando sube una historia con el sticker **Preguntas** ("¿Qué te gustaría saber de TuBodega?"). Responde las mejores y agrégalas a la destacada.

## 4. Las primeras 48 horas

- Comparte cada publicación en tu estado de WhatsApp y en tus historias personales.
- Pide a 10 amigos o familiares que sigan la cuenta y comenten algo. Las primeras interacciones ayudan a que Instagram la muestre.
- Sigue a 30 bodegas, abastos y negocios de tu zona, y dales "me gusta" a 2 o 3 de sus publicaciones.
- Responde cada mensaje y comentario en menos de una hora.
- No compres seguidores: Instagram muestra menos tus publicaciones y a un bodeguero no le dan confianza.

## Rehacer las imágenes

`generar.py` crea las imágenes con Playwright. Necesita una carpeta con `src/` (las capturas de `marketing/assets/screens` y `public/icon.svg`) y `out/`:

```bash
python generar.py <carpeta>
```
