# TikTok de TuBodega

Todo para abrir la cuenta y publicar los primeros videos. Los videos están en [`videos/`](videos): verticales, a 1080×1920 y listos para subir.

## 1. Crear la cuenta

1. Regístrate con el Gmail nuevo de TuBodega.
2. **Usuario:** el mismo de Instagram (`tubodega.app` o el que conseguiste).
3. **Nombre:** `TuBodega · App para bodegas`
4. **Foto:** `foto-de-perfil.png`, del kit de Instagram.
5. **Biografía** (TikTok permite 80 caracteres):

   ```
   App para bodegas 🛒 Ventas, fiados e inventario en $ y Bs · 7 días gratis 👇
   ```

6. **Deja la cuenta personal.** Si TikTok te ofrece "Cuenta de empresa verificada", no la uses todavía: pide documentos legales y una dirección en países donde Venezuela no aparece. No pongas otro país ni datos falsos: TikTok puede cerrar la cuenta. La cuenta personal publica igual y además deja usar **todos** los sonidos en tendencia (las de empresa solo tienen música comercial).
7. **Contacto en la biografía:** el campo Sitio web aparece en las cuentas personales al llegar a 1.000 seguidores. Mientras tanto, cambia la biografía por:

   ```
   App para bodegas 🛒 $ y Bs · 7 días gratis
   Escríbenos por IG @tubodega.app 👇
   ```

   (cambia el usuario de Instagram por el que conseguiste). Cuando tengas el campo, pon el enlace de tu WhatsApp.

## 2. Los videos

Los clips no traen sonido a propósito: en TikTok rinde más un **sonido en tendencia** elegido dentro de la app. Al subir cada video:

1. Toca **Agregar sonido** y elige uno de los que salen como tendencia, con ritmo alegre.
2. Bájale el volumen al 20 o 30 % (en **Volumen**) si además vas a hablar.
3. Si quieres voz, usa **Voz en off** y lee el texto de la columna "Voz", o escríbelo y usa **Texto a voz**.

Publica uno por día, entre 6 y 8 de la noche. Empieza con el video promocional que ya tienes.

| Día | Video | Voz (opcional) | Descripción |
| --- | --- | --- | --- |
| 1 | Tu video promocional | (el que ya tiene) | ¿Todavía llevas tu bodega en un cuaderno? 📒 TuBodega cobra con la cámara y lleva tus fiados. Pruébala 7 días gratis 👉 link en el perfil #bodega #abasto #venezuela #emprendedoresvenezolanos |
| 2 | `01-cobrar-en-segundos.mp4` | Escaneas, agregas el hielo, cobras con un billete de cinco y te dice el vuelto en dólares y bolívares. Listo. | Así se cobra en una bodega en 2026 ⚡ Vuelto en $ y Bs sin calculadora #bodega #abasto #venezuela #puntodeventa |
| 3 | `03-el-fiado.mp4` | ¿Cuánto te debe la señora Carmen? Aquí está, con cada abono anotado. | El cuaderno de fiados que no se pierde 📒 #fiado #bodega #abasto #emprendedoresvenezolanos |
| 4 | `02-peso-y-pago-movil.mp4` | Medio kilo de queso, un cartón de huevos y lo paga por pago móvil. | Queso por peso, huevos por cartón y pago móvil 🧀🥚 #bodega #abasto #pagomovil #venezuela |
| 5 | `05-cuadre-de-caja.mp4` | Cerraste el día: esto vendiste, esto ganaste y así te pagaron. | ¿Te cuadró la caja hoy? 🤔 #bodega #emprendedor #venezuela #negocio |
| 6 | `04-inventario.mp4` | ¿El queso o el pan no traen código? La app te crea uno y le imprimes su etiqueta. | Productos sin código de barras, resuelto 🏷️ #inventario #bodega #abasto #venezuela |

## 3. Videos con tu cara (los que más funcionan)

Lo grabado con el teléfono en la mano, en una bodega de verdad, suele llegar a más gente que una grabación de pantalla. Ideas de 15 a 30 segundos:

- **"Día 1 ofreciendo mi app en las bodegas de mi zona":** cuentas qué te dijeron.
- **"Le instalé TuBodega a [nombre]":** solo con permiso del dueño, mostrando cómo escanea su primer producto.
- **"Lo que más me preguntan los bodegueros":** respondes una pregunta por video (internet, factura fiscal, precio).
- **Responder comentarios con video:** cuando alguien pregunte algo, toca "Responder con video".

## 4. Reglas

- Di "nota de entrega", nunca "factura". No inventes clientes, cifras ni testimonios.
- Responde los comentarios en la primera hora después de publicar.
- No borres los videos que tienen pocas vistas: a veces arrancan días después.
- Comparte cada video en tu estado de WhatsApp.

## Rehacer los videos

`generar.py` arma los videos con los clips de `marketing/assets/clips` y los estilos de `marketing/instagram/generar.py` (copiado como `make.py` en la misma carpeta, igual que el de WhatsApp):

```bash
python generar.py <carpeta> marketing/assets/clips
```
