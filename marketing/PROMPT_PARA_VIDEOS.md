# Prompt para la sesión que hace los videos

Copia todo lo que está dentro del recuadro y pégalo en la sesión de videos.

```text
Vas a hacer los videos de lanzamiento de TuBodega, una app de punto de venta para bodegas y abastos de Venezuela.

Contexto completo en el repositorio angelbricordova-dot/la-bodega-de-luis, rama claude/sweet-cannon-j86icu, carpeta marketing/:
- marketing/VIDEO_BRIEF.md: qué es la app, para quién, tono, precios, marca (colores, letra, logo) y lo que NO se puede decir. Léelo completo primero.
- marketing/GUIONES.md: guiones escena por escena de cada video, con tiempos, imagen, texto en pantalla, voz y sonido.
- marketing/ELEVENLABS.md: voz, música y efectos con prompts listos para ElevenLabs.
- marketing/assets/screens/: 27 pantallas reales de la app (1170×2532).
- marketing/assets/clips/: 5 grabaciones reales de la app (MP4 1170×2532, 30 fps).
- marketing/assets/brand/: logo en SVG y PNG.
- marketing/capture.mjs: vuelve a capturar pantallas y clips desde la app real (instrucciones en VIDEO_BRIEF.md → "Cómo abrir la app").

Haz estos videos, en este orden:
1. V1 Promo 30 s vertical ("Deja el cuaderno")
2. V2 Teaser 15 s vertical ("¿Cuánto te deben?")
3. V3 Serie de 5 tutoriales para clientes, verticales de 30 a 45 s
4. V4 Plan Pro 20 s vertical
5. V5 "Cómo funciona" 60 s horizontal
6. Tres cortes de 10 s para estados de WhatsApp

Reglas:
- Usa solo pantallas y clips reales de la app; no inventes pantallas ni funciones.
- Subtítulos quemados en todos los videos y zonas seguras de TikTok/Reels (detalles en GUIONES.md).
- Voz, música y efectos con ElevenLabs según ELEVENLABS.md. Usa la misma voz en todos los videos.
- Nunca digas "factura" ni "SENIAT"; el ticket es una nota de entrega. No inventes testimonios ni cifras.
- No destaques las marcas de los productos de ejemplo (Harina PAN, Polar…) ni las nombres en la voz.
- El número de WhatsApp es [TU WHATSAPP]: pregúntamelo antes de exportar.
- La tasa de las capturas (36,50 Bs/$) es de ejemplo: pregúntame la tasa BCV de hoy y vuelve a capturar con
  TASA=<tasa> node marketing/capture.mjs (con npm run dev corriendo) antes de exportar las versiones finales.
- Confírmame los precios antes de exportar.

Antes de producir todo, hazme una muestra de la V1 (o un storyboard con las primeras 3 escenas y la voz elegida) para aprobar el estilo.
Entrega los MP4 con los nombres de "Entregables" de GUIONES.md, más una portada JPG por video vertical.
```

## Si la sesión de videos no tiene el repositorio

Tienes dos opciones:
- **Agregarle el repositorio** `angelbricordova-dot/la-bodega-de-luis` en la configuración de esa sesión.
- **Subirle el archivo** `tubodega-videos.zip`, que trae esta misma carpeta completa.

Si usas el zip, en el prompt cambia "en el repositorio… carpeta marketing/" por "en el zip adjunto".
