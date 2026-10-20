/**
 * Capturas y grabaciones de TuBodega para videos promocionales.
 *
 * Uso:
 *   1. En una terminal: npm run dev        (sin archivo .env la app abre en modo demo, sin cuenta)
 *   2. En otra:         node marketing/capture.mjs
 *
 * Variables opcionales:
 *   BASE_URL     dirección de la app (por defecto http://localhost:5173)
 *   TASA         tasa Bs/$ que se muestra en las pantallas (por defecto 36.50; pon la tasa BCV del día)
 *   NEGOCIO      nombre de la bodega de ejemplo (por defecto "Bodega La Esquina")
 *   CHROME_PATH  ruta de Chromium si playwright no lo encuentra solo
 *   OUT          carpeta de salida (por defecto marketing/assets)
 *
 * Resultado:
 *   OUT/screens/*.png   pantallas a 1170×2532 (iPhone 3×, sirven para videos 1080×1920)
 *   OUT/clips/*.mp4     grabaciones cortas de cada flujo a 1170×2532
 */
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE_URL || 'http://localhost:5173'
const TASA = process.env.TASA || '36.50'
const NEGOCIO = process.env.NEGOCIO || 'Bodega La Esquina'
const OUT = path.resolve(process.env.OUT || path.join(ROOT, 'assets'))
const SCREENS = path.join(OUT, 'screens')
const CLIPS = path.join(OUT, 'clips')
const TMP = path.join(OUT, '.tmp')
for (const d of [SCREENS, CLIPS, TMP]) fs.mkdirSync(d, { recursive: true })

const CHROME =
  process.env.CHROME_PATH ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p))
// Teléfono de 390×844 a 3× = 1170×2532 píxeles en pantallas y videos
const VIEW = { width: 390, height: 844 }
const SCALE = 3
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

async function launch(args = []) {
  return chromium.launch({ executablePath: CHROME, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...args] })
}

// ---------------------------------------------------------------------------
// 1. Código de barras real de un producto de ejemplo → video de cámara falsa
// ---------------------------------------------------------------------------
async function makeBarcodeCamera() {
  const b = await launch()
  const p = await b.newPage({ viewport: { width: 640, height: 480 } })
  await p.goto(BASE + '/')
  await p.waitForTimeout(1500)
  const code = await p.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('bodega')
        r.onsuccess = () => {
          const g = r.result.transaction('products').objectStore('products').getAll()
          g.onsuccess = () => res(g.result.find((x) => x.name === 'Pasta Primor 1kg')?.barcode)
        }
      }),
  )
  if (!code || !hasFfmpeg) {
    await b.close()
    return null
  }
  await p.setContent('<html><body style="margin:0;background:#f4efe6;display:grid;place-items:center;height:480px"><svg id="b"></svg></body></html>')
  await p.addScriptTag({ path: path.join(ROOT, '..', 'node_modules', 'jsbarcode', 'dist', 'JsBarcode.all.min.js') })
  await p.evaluate((c) => window.JsBarcode('#b', c, { format: 'EAN13', width: 3, height: 150, fontSize: 24, background: '#ffffff', margin: 18 }), code)
  const png = path.join(TMP, 'barcode.png')
  await p.screenshot({ path: png })
  await b.close()
  const y4m = path.join(TMP, 'barcode.y4m')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-i', png, '-t', '8', '-r', '15', '-pix_fmt', 'yuv420p', y4m])
  return y4m
}

// ---------------------------------------------------------------------------
// Ayudantes
// ---------------------------------------------------------------------------
let ctx
const shot = async (page, name) => {
  await page.waitForTimeout(350)
  await page.screenshot({ path: path.join(SCREENS, `${name}.png`) })
  console.log('  pantalla', name)
}

/**
 * Abre una pestaña y la graba como un clip MP4 a resolución completa.
 * Se usan los fotogramas de Chromium (screencast) con su hora real, y ffmpeg los une a 30 fps.
 */
async function clip(name, fn) {
  const page = await ctx.newPage()
  const dir = path.join(TMP, name)
  fs.mkdirSync(dir, { recursive: true })
  const cdp = await ctx.newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: metadata.timestamp })
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEW.width * SCALE, maxHeight: VIEW.height * SCALE })
  await fn(page)
  await page.waitForTimeout(900)
  await cdp.send('Page.stopScreencast').catch(() => {})
  await page.close()
  if (!hasFfmpeg || frames.length < 2) return console.log('  clip', name, '(omitido: falta ffmpeg)')
  // Cada fotograma dura hasta el siguiente; el último, 1 segundo
  const list = frames
    .map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? f.t + 1) - f.t).toFixed(3)}`)
    .join('\n')
  const concat = path.join(dir, 'list.txt')
  fs.writeFileSync(concat, `${list}\nfile '${frames[frames.length - 1].file}'\n`)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-vf', 'fps=30,scale=1170:2532:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart', path.join(CLIPS, `${name}.mp4`)])
  fs.rmSync(dir, { recursive: true, force: true })
  console.log('  clip', name)
}

async function addFromCatalog(page, name, times = 1) {
  for (let i = 0; i < times; i++) {
    await page.click(`button:has-text("${name}") >> nth=0`)
    await page.waitForTimeout(250)
  }
}

async function pay(page, method, extra) {
  await page.click(`button:has-text("${method}") >> nth=0`)
  await page.waitForTimeout(300)
  if (extra) await extra()
  await page.click('text=Confirmar venta y emitir ticket')
  await page.waitForTimeout(900)
}

// ---------------------------------------------------------------------------
// 2. Datos de la bodega de ejemplo (no se graba)
// ---------------------------------------------------------------------------
async function prepareStore() {
  const p = await ctx.newPage()
  await p.goto(BASE + '/ajustes/negocio')
  await p.waitForTimeout(800)
  await p.getByLabel('Nombre del negocio').fill(NEGOCIO)
  await p.getByLabel('RIF').fill('J-40123456-7')
  await p.getByLabel('Dirección').fill('Calle Bolívar, local 3')
  await p.getByLabel('Teléfono').fill('0414-1234567')
  await p.click('button:has-text("Guardar")')
  await p.goto(BASE + '/ajustes/pagos')
  await p.waitForTimeout(600)
  await p.locator('input[inputmode="decimal"]').first().fill(TASA)
  await p.click('button:has-text("Guardar") >> nth=0')
  // Al guardar la tasa el formulario se recarga; esperar antes de escribir el Pago Móvil
  await p.waitForTimeout(1500)
  await p.getByLabel('Banco').fill('0102 Banco de Venezuela')
  await p.getByLabel('Teléfono').fill('0414-1234567')
  await p.getByLabel('Cédula / RIF').fill('V-12345678')
  await p.click('button:has-text("Guardar") >> nth=1')
  await p.waitForTimeout(800)
  const pm = await p.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('bodega')
        r.onsuccess = () => {
          const g = r.result.transaction('settings').objectStore('settings').get('main')
          g.onsuccess = () => res(g.result?.pagoMovil?.phone)
        }
      }),
  )
  if (pm !== '0414-1234567') throw new Error('No se guardaron los datos de Pago Móvil de ejemplo')
  // Caja abierta
  await p.goto(BASE + '/catalogo')
  await p.waitForTimeout(500)
  await p.click('text=CAJA CERRADA')
  await p.fill('input[placeholder="0.00"]', '20')
  await p.click('button:text-is("Abrir caja")')
  await p.waitForTimeout(400)
  // Ventas del día para que historial, cuadre y finanzas tengan vida
  const sales = [
    { items: [['Harina PAN 1kg', 2], ['Malta Polar 250ml', 3]], method: 'Efectivo $' },
    { items: [['Arroz Mary 1kg', 1], ['Aceite Diana 1L', 1], ['Café molido 250g', 1]], method: 'Pago Móvil' },
    { items: [['Cerveza Polar Pilsen', 6]], method: 'Punto de venta' },
    { items: [['Pan canilla', 4], ['Mantequilla Mavesa 500g', 1]], method: 'Efectivo Bs' },
    { items: [['Coca-Cola 2L', 1], ['Doritos personal', 2]], method: 'Zelle' },
  ]
  for (const s of sales) {
    await p.goto(BASE + '/catalogo')
    await p.waitForTimeout(400)
    for (const [name, qty] of s.items) {
      await addFromCatalog(p, name, 1)
      const sheet = p.locator('button:has-text("Agregar —")')
      if (await sheet.count()) {
        for (let i = 1; i < qty; i++) await p.click('[aria-label="Más"] >> nth=-1')
        await sheet.click()
      } else for (let i = 1; i < qty; i++) await addFromCatalog(p, name, 1)
    }
    await p.click('text=Ir a pagar')
    await p.waitForTimeout(400)
    await pay(p, s.method)
    await p.goto(BASE + '/catalogo') // sin pasar por Venta: la cámara volvería a leer el código
  }
  // Un fiado de la Señora Carmen y una cotización
  await p.goto(BASE + '/catalogo')
  await p.waitForTimeout(400)
  await addFromCatalog(p, 'Atún Margarita 140g')
  await addFromCatalog(p, 'Galletas María Puig')
  await p.click('text=Ir a pagar')
  await p.waitForTimeout(400)
  await p.click('text=Crédito fiado')
  await p.click('text=José el taxista')
  await p.click('text=Crédito fiado')
  await p.click('text=Confirmar venta y emitir ticket')
  await p.waitForTimeout(800)
  await p.goto(BASE + '/catalogo')
  await p.close()
}

// ---------------------------------------------------------------------------
// 3. Grabaciones y pantallas
// ---------------------------------------------------------------------------
async function main() {
  console.log('Preparando cámara con código de barras…')
  const y4m = await makeBarcodeCamera()
  const browser = await launch(y4m ? [`--use-file-for-fake-video-capture=${y4m}`] : [])
  ctx = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    locale: 'es-VE',
    permissions: ['camera'],
  })
  console.log('Cargando datos de ejemplo…')
  await prepareStore()

  console.log('Grabando…')
  // Escanear con la cámara y cobrar en efectivo con vuelto
  await clip('01-escanear-y-cobrar', async (p) => {
    await p.goto(BASE + '/')
    await p.waitForTimeout(y4m ? 3500 : 1500)
    await shot(p, '02-venta-escaneado')
    await p.click('button:has-text("Venta libre") >> nth=0')
    await p.fill('input[placeholder="Ej: Recarga, chuchería suelta…"]', 'Hielo')
    await p.fill('input[placeholder="0.00"]', '1')
    await p.waitForTimeout(500)
    await p.click('button:has-text("Agregar —")')
    await p.waitForTimeout(700)
    await shot(p, '03-carrito')
    await p.click('text=Revisar orden')
    await p.waitForTimeout(900)
    await shot(p, '07-revisar-orden')
    await p.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }))
    await p.waitForTimeout(900)
    await p.click('button:has-text("$5") >> nth=0')
    await p.waitForTimeout(400)
    await p.evaluate(() => window.scrollTo({ top: 99999, behavior: 'smooth' }))
    await p.waitForTimeout(900)
    await shot(p, '09-vuelto-efectivo')
    await p.click('text=Confirmar venta y emitir ticket')
    await p.waitForTimeout(1300)
    await shot(p, '10-venta-registrada')
    await p.click('text=Nueva venta')
    // La cámara vuelve a leer el mismo código una vez; se vacía y ya no lo repite mientras siga enfocado
    await p.waitForTimeout(y4m ? 3000 : 800)
    const vaciar = p.locator('[aria-label="Vaciar carrito"]')
    if (await vaciar.count()) await vaciar.click()
    await p.waitForTimeout(700)
    await shot(p, '01-venta-inicio')
  })

  // Catálogo: por peso, por presentación y cobro con Pago Móvil
  await clip('02-catalogo-peso-y-pago-movil', async (p) => {
    await p.goto(BASE + '/catalogo')
    await p.waitForTimeout(1000)
    await shot(p, '04-catalogo')
    await p.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }))
    await p.waitForTimeout(1000)
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await p.waitForTimeout(800)
    await addFromCatalog(p, 'Queso blanco duro')
    await p.waitForTimeout(500)
    await p.click('button:has-text("250 g")')
    await p.waitForTimeout(600)
    await shot(p, '05-venta-por-peso')
    await p.click('button:text-is("Agregar")')
    await p.waitForTimeout(600)
    await addFromCatalog(p, 'Huevos')
    await p.waitForTimeout(500)
    await p.click('button:has-text("Cartón (x30)")')
    await p.waitForTimeout(600)
    await shot(p, '06-venta-por-presentacion')
    await p.click('button:has-text("Agregar —")')
    await p.waitForTimeout(600)
    await addFromCatalog(p, 'Harina PAN 1kg')
    await p.click('button:has-text("Agregar —")')
    await p.waitForTimeout(700)
    await shot(p, '04b-catalogo-con-carrito')
    await p.click('text=Ir a pagar')
    await p.waitForTimeout(900)
    await p.evaluate(() => window.scrollTo({ top: 900, behavior: 'smooth' }))
    await p.waitForTimeout(800)
    await p.click('button:has-text("Pago Móvil") >> nth=0')
    await p.waitForTimeout(500)
    await p.evaluate(() => window.scrollTo({ top: 1500, behavior: 'smooth' }))
    await p.waitForTimeout(900)
    await shot(p, '08-pago-movil')
    await p.click('text=Confirmar venta y emitir ticket')
    await p.waitForTimeout(1300)
    await p.goto(BASE + '/catalogo')
  })

  // Fiado: anotar en la cuenta y registrar un abono
  await clip('03-fiado-y-abono', async (p) => {
    await p.goto(BASE + '/catalogo')
    await p.waitForTimeout(800)
    await addFromCatalog(p, 'Cheese Tris')
    await p.click('button:has-text("Docena (x12)")')
    await p.click('button:has-text("Agregar —")')
    await p.waitForTimeout(400)
    await addFromCatalog(p, 'Pirulín', 2)
    await p.click('text=Ir a pagar')
    await p.waitForTimeout(800)
    await p.evaluate(() => window.scrollTo({ top: 1200, behavior: 'smooth' }))
    await p.waitForTimeout(700)
    await p.click('text=Crédito fiado')
    await p.waitForTimeout(500)
    await p.click('text=Señora Carmen')
    await p.waitForTimeout(400)
    await p.click('text=Crédito fiado')
    await p.waitForTimeout(500)
    await p.evaluate(() => window.scrollTo({ top: 99999, behavior: 'smooth' }))
    await p.waitForTimeout(900)
    await shot(p, '11-credito-fiado')
    await p.click('text=Confirmar venta y emitir ticket')
    await p.waitForTimeout(1200)
    await p.goto(BASE + '/catalogo')
    await p.goto(BASE + '/historial?tab=fiados')
    await p.waitForTimeout(1200)
    await shot(p, '12-cuaderno-fiados')
    await p.click('button:has-text("Registrar abono") >> nth=0')
    await p.waitForTimeout(500)
    await p.click('text=La mitad')
    await p.waitForTimeout(700)
    await shot(p, '13-registrar-abono')
    await p.click('button:has-text("Registrar abono de")')
    await p.waitForTimeout(1200)
  })

  // Inventario: producto nuevo con código generado y etiquetas
  await clip('04-inventario-y-etiquetas', async (p) => {
    await p.goto(BASE + '/inventario')
    await p.waitForTimeout(1000)
    await shot(p, '14-inventario')
    await p.click('text=Nuevo producto')
    await p.waitForTimeout(700)
    await p.click('[aria-label="Generar código"]')
    await p.waitForTimeout(500)
    await p.fill('input[placeholder="Ej: Harina PAN 1kg"]', 'Tequeños congelados (x12)')
    await p.fill('input[placeholder="0.00"] >> nth=0', '4.50')
    await p.fill('input[placeholder="0.00"] >> nth=1', '3.20')
    await p.fill('input[placeholder="0"] >> nth=0', '15')
    await p.waitForTimeout(2200) // que se vaya el aviso de "Código generado"
    await shot(p, '15-nuevo-producto-codigo')
    await p.click('text=Crear producto')
    await p.waitForTimeout(900)
    await p.click('[aria-label="Códigos de barras"]')
    await p.waitForTimeout(1000)
    await shot(p, '16-etiquetas')
    await p.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }))
    await p.waitForTimeout(1000)
  })

  // Cuadre del día, avisos y cierre de caja
  await clip('05-cuadre-y-cierre-de-caja', async (p) => {
    await p.goto(BASE + '/historial')
    await p.waitForTimeout(1200)
    await shot(p, '17-cuadre-del-dia')
    await p.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }))
    await p.waitForTimeout(1200)
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await p.waitForTimeout(700)
    await p.click('[aria-label="Avisos"]')
    await p.waitForTimeout(800)
    await shot(p, '18-avisos')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    await p.click('text=CAJA ABIERTA')
    await p.waitForTimeout(900)
    await shot(p, '19-cierre-de-caja')
  })

  // Pantallas sueltas (sin clip)
  const p = await ctx.newPage()
  await p.goto(BASE + '/ajustes/finanzas')
  await p.waitForTimeout(1200)
  await shot(p, '20-finanzas')
  await p.goto(BASE + '/ajustes/pagos')
  await p.waitForTimeout(800)
  await shot(p, '21-tasa-y-metodos-de-pago')
  await p.goto(BASE + '/ajustes')
  await p.waitForTimeout(800)
  await shot(p, '22-ajustes')
  await p.goto(BASE + '/historial?tab=cotizaciones')
  await p.waitForTimeout(900)
  await shot(p, '23-cotizaciones')

  // Ticket impreso como imagen suelta (fondo transparente)
  await p.goto(BASE + '/historial')
  await p.waitForTimeout(800)
  const html = await p.evaluate(async () => {
    const t = await import('/src/lib/ticket.ts')
    const { db, getSettings } = await import('/src/db.ts')
    const sale = (await db.sales.orderBy('createdAt').reverse().toArray()).find((s) => s.items.length >= 2)
    return t.buildHtml({ kind: 'sale', data: sale }, await getSettings())
  })
  const tp = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 3 })
  await tp.setContent(`<html><body style="margin:0;background:transparent;display:flex;justify-content:center;align-items:flex-start;padding:30px">
    <div id="t" style="width:58mm;background:#fff;padding:18px 14px 26px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#111;box-shadow:0 18px 40px rgba(0,0,0,.18);
      -webkit-mask:linear-gradient(#000 0 0) top/100% calc(100% - 8px) no-repeat, radial-gradient(circle at 5px 100%, transparent 5px, #000 5.5px) bottom/10px 8px repeat-x">
      <style>pre{white-space:pre-wrap;margin:6px 0;font:inherit}</style>${html}</div></body></html>`)
  await tp.locator('#t').screenshot({ path: path.join(SCREENS, '24-ticket-impreso.png'), omitBackground: true })
  console.log('  pantalla 24-ticket-impreso')
  await tp.close()
  await p.close()

  // Los clips de preparación no sirven
  await ctx.close()
  await browser.close()
  for (const f of fs.readdirSync(TMP)) if (f.endsWith('.webm')) fs.rmSync(path.join(TMP, f))
  fs.rmSync(TMP, { recursive: true, force: true })
  console.log(`Listo: ${SCREENS} y ${CLIPS}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
