# Voz, música y efectos (ElevenLabs)

## Voz en off

**Qué voz buscar en la Voice Library:** español latinoamericano, cálida y conversacional, de 30 a 45 años. Puedes filtrar por "Spanish" y "Latin American" o buscar "Venezuelan" y "Caribbean Spanish". Que suene a un vecino amable, no a un locutor de radio ni a un vendedor de televisión.
- **Promo, teaser y Pro:** una voz con energía, que sonría al hablar.
- **Tutoriales:** la misma voz, más pausada. Usa la misma en todos los videos para que la marca suene igual.

**Ajustes sugeridos:**

| Ajuste | Promo, teaser y Pro | Tutoriales |
| --- | --- | --- |
| Modelo | `eleven_multilingual_v2` (o `eleven_v3` si está disponible) | igual |
| Stability | 0.40 | 0.55 |
| Similarity | 0.80 | 0.80 |
| Style | 0.25 | 0.10 |
| Speaker boost | sí | sí |
| Velocidad | 1.0 a 1.05 | 0.95 |

**Cómo escribir el texto para que suene bien:**
- **"TuBodega"** se escribe "Tu Bodega", separado, para que lo diga como dos palabras.
- **Los montos van en letras:** "un dólar con treinta", "siete días", "diez dólares al mes". Nunca "$1.30" ni "Bs".
- **"Pago Móvil"** con tilde. **"Zelle"** se pronuncia "sel"; si lo dice raro, escríbelo "Sel".
- **"BCV"** se escribe "be ce ve".
- **Las pausas** se marcan con "…" o con un punto. Una frase por escena.
- **Si una palabra sale mal** (por ejemplo "Biopago"), genera esa frase sola y elige la mejor toma.

Genera una toma por escena de `GUIONES.md` para poder ajustar los tiempos.

## Música (ElevenLabs Music)

Toda la música va **sin voces**. Bajo la voz, déjala unos 18 dB más baja ("ducking") y súbela en el logo final.

**Promo (V1, V4 y estados):**
> Upbeat Latin pop instrumental with light Caribbean percussion, bright marimba, clean nylon guitar and soft claps, optimistic and friendly, 105 BPM, no vocals, modern and clean, builds slightly and ends with a short clean button. 30 seconds.

**Teaser (V2):**
> Minimal tense pulse with soft ticking for 4 seconds, then a warm positive Latin groove with marimba and light percussion kicks in, 100 BPM, no vocals, ends with a single hit. 15 seconds.

**Tutoriales (V3) y horizontal (V5):**
> Calm, light acoustic background music with soft guitar, gentle shaker and warm bass, friendly and unobtrusive, 90 BPM, no vocals, steady and loopable, perfect under a voice explaining an app. 60 seconds.

## Efectos de sonido (ElevenLabs Sound Effects)

| Uso | Prompt | Duración |
| --- | --- | --- |
| Escanear un producto | `Single short supermarket barcode scanner beep, clean and crisp` | 0.4 s |
| Total o venta lista | `Short cheerful cash register cha-ching with coins` | 1 s |
| Imprimir ticket | `Small thermal receipt printer printing a short ticket, fast whirring and paper tear` | 2 s |
| Toque en pantalla | `Soft subtle phone screen tap click` | 0.2 s |
| Aviso o agregado | `Soft friendly UI pop notification sound` | 0.4 s |
| Transición | `Quick airy whoosh transition, modern and light` | 0.6 s |
| Abono o pago | `A few coins dropping on a wooden counter` | 1 s |
| Texto que aparece | `Light keyboard typing ticks, three quick keystrokes` | 0.6 s |
| Golpe final | `Short punchy musical hit with a soft shimmer tail` | 1 s |

**Dónde va cada efecto en `clips/01-escanear-y-cobrar.mp4`:**

| Segundo del clip | Qué pasa | Efecto |
| --- | --- | --- |
| 0,6 | La cámara lee el código y entra "Pasta Primor 1kg" | pitido de escáner |
| 1 a 5 | Venta libre: se agrega "Hielo" | toques y pop |
| 7 | Revisar orden | whoosh |
| 9 a 10 | Toca $5 y aparece el vuelto | toque |
| 10,8 | "¡Venta registrada!" | caja registradora |

En los otros clips, los toques y los pop van cuando aparece el aviso verde "… agregado".

**Volumen:** voz a −14 LUFS integrado, efectos de −6 a −10 dB por debajo de la voz y música con ducking.
