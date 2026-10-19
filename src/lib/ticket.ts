import JsBarcode from 'jsbarcode'
import type { Quote, Sale, Settings } from '../db'
import { sendToPrinter } from './bluetooth'
import { EscPos, imageToCanvas, stripAccents } from './escpos'
import { PAYMENT_INFO, bs, usd } from './money'
import { barcodeFormat } from './barcode'

type Doc = { kind: 'sale'; data: Sale } | { kind: 'quote'; data: Quote }

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s + ' '.repeat(n - s.length))
const two = (l: string, r: string, w: number) => pad(l, w - r.length - 1) + ' ' + r
const dateStr = (t: number) =>
  new Date(t).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/[\u00a0\u202f]/g, ' ')
const qtyStr = (q: number, unit: string) => {
  if (unit === 'kg') return q < 1 ? `${Math.round(q * 1000)}g` : `${+q.toFixed(3)}kg`
  if (unit === 'm') return `${+q.toFixed(2)}m`
  return Number.isInteger(q) ? String(q) : String(+q.toFixed(3))
}
const unitPriceStr = (price: number, unit: string) =>
  unit === 'kg' || unit === 'm' ? `${usd(price)}/${unit}` : unit === 'c/u' ? `${usd(price)} c/u` : `${unit} a ${usd(price)}`

function title(doc: Doc) {
  return doc.kind === 'sale' ? (doc.data.status === 'anulada' ? 'NOTA ANULADA' : 'NOTA DE ENTREGA') : 'COTIZACIÓN'
}

/** Texto plano del ticket, usado para impresora y WhatsApp */
function lines(doc: Doc, w: number) {
  const d = doc.data
  const out: string[] = []
  const sep = '-'.repeat(w)
  out.push(two(`${title(doc)}`, `#${String(d.number).padStart(6, '0')}`, w))
  out.push(two('Fecha', dateStr(d.createdAt), w))
  if (doc.kind === 'sale' && doc.data.sellerName) out.push(two('Atendido por', doc.data.sellerName, w))
  if (d.customerName) out.push(two('Cliente', d.customerName, w))
  if (doc.kind === 'quote') out.push(two('Válida hasta', new Date(doc.data.validUntil).toLocaleDateString('es-VE'), w))
  out.push(sep)
  out.push(two('Cant Producto', 'Total', w))
  out.push(sep)
  for (const it of d.items) {
    out.push(two(`${qtyStr(it.qty, it.unitLabel)} ${it.name}`, usd(it.total), w))
    out.push(`   ${unitPriceStr(it.unitPrice, it.unitLabel)}`)
  }
  out.push(sep)
  out.push(two('Subtotal', usd(d.subtotal), w))
  if (d.discount) out.push(two(d.discount > 0 ? 'Descuento' : 'Recargo', usd(-d.discount), w))
  return { out, sep }
}

export async function buildEscPos(doc: Doc, s: Settings): Promise<Uint8Array> {
  const w = s.printing.paperWidth === 80 ? 48 : 32
  const d = doc.data
  const p = new EscPos()
  p.align('center')
  if (s.printing.printLogo && s.business.logo) {
    try {
      p.image(await imageToCanvas(s.business.logo, s.printing.paperWidth === 80 ? 320 : 256))
    } catch {
      /* logo inválido */
    }
  }
  p.bold(true).size(2, 2).line(s.business.name).size(1, 1).bold(false)
  if (s.business.rif) p.line(`RIF: ${s.business.rif}`)
  if (s.business.address) p.line(s.business.address)
  if (s.business.phone) p.line(`Tel: ${s.business.phone}`)
  p.align('left').line()
  const { out, sep } = lines(doc, w)
  out.forEach((l) => p.line(l))
  p.bold(true).size(1, 2).line(two('TOTAL', usd(d.total), w)).size(1, 1).bold(false)
  p.line(two(`Total Bs (tasa ${d.rate.toFixed(2)})`, bs(d.total * d.rate), w))
  if (doc.kind === 'sale') {
    const sale = doc.data
    p.line(sep)
    for (const pay of sale.payments) {
      const info = PAYMENT_INFO[pay.method]
      p.line(two(info.label, info.bs ? bs(pay.amount * sale.rate) : usd(pay.amount), w))
    }
    if (sale.change > 0) {
      p.line(two('Vuelto', `${usd(sale.change)} / ${bs(sale.change * sale.rate)}`, w))
    }
    if (sale.balance > 0) p.bold(true).line(two('Pendiente (fiado)', usd(sale.balance), w)).bold(false)
  }
  if (d.notes) p.line(sep).line(`Nota: ${d.notes}`)
  p.line(sep).align('center')
  if (s.business.footer) p.line(s.business.footer)
  p.line('Documento sin valor fiscal')
  p.line('Sistema: TuBodega')
  p.cut()
  return p.encode()
}

export function buildText(doc: Doc, s: Settings) {
  const d = doc.data
  const { out } = lines(doc, 34)
  const t = [`*${s.business.name}*`, s.business.rif ? `RIF: ${s.business.rif}` : '', '```', ...out]
  t.push(two('TOTAL', usd(d.total), 34))
  t.push(two('Total Bs', bs(d.total * d.rate), 34))
  if (doc.kind === 'sale') {
    for (const pay of doc.data.payments) t.push(two(PAYMENT_INFO[pay.method].label, usd(pay.amount), 34))
    if (doc.data.balance > 0) t.push(two('Pendiente', usd(doc.data.balance), 34))
  }
  t.push('```')
  if (doc.kind === 'sale' && doc.data.payments.some((p) => p.method === 'pago_movil')) {
    t.push(`Pago Móvil: ${s.pagoMovil.bank} · ${s.pagoMovil.phone} · ${s.pagoMovil.idNumber}`)
  }
  if (s.business.footer) t.push(s.business.footer)
  return t.filter(Boolean).join('\n')
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

export function buildHtml(doc: Doc, s: Settings) {
  const d = doc.data
  const w = s.printing.paperWidth === 80 ? 48 : 32
  const { out } = lines(doc, w)
  const extra: string[] = [two('TOTAL', usd(d.total), w), two(`Total Bs (tasa ${d.rate.toFixed(2)})`, bs(d.total * d.rate), w)]
  if (doc.kind === 'sale') {
    for (const pay of doc.data.payments) {
      const info = PAYMENT_INFO[pay.method]
      extra.push(two(info.label, info.bs ? bs(pay.amount * doc.data.rate) : usd(pay.amount), w))
    }
    if (doc.data.change > 0) extra.push(two('Vuelto', usd(doc.data.change), w))
    if (doc.data.balance > 0) extra.push(two('Pendiente (fiado)', usd(doc.data.balance), w))
  }
  if (d.notes) extra.push(`Nota: ${d.notes}`)
  return `<div style="text-align:center">
  ${s.printing.printLogo && s.business.logo ? `<img src="${s.business.logo}" style="max-width:60%;max-height:90px;filter:grayscale(1)">` : ''}
  <div style="font-size:18px;font-weight:800">${esc(s.business.name)}</div>
  ${s.business.rif ? `<div>RIF: ${esc(s.business.rif)}</div>` : ''}
  ${s.business.address ? `<div>${esc(s.business.address)}</div>` : ''}
  ${s.business.phone ? `<div>Tel: ${esc(s.business.phone)}</div>` : ''}
</div>
<pre>${esc([...out, ...extra].join('\n'))}</pre>
<div style="text-align:center">${esc(s.business.footer)}<br>Documento sin valor fiscal<br>Sistema: TuBodega</div>`
}

/** Imprime en una ventana de impresión del sistema (útil con RawBT o impresoras USB/WiFi) */
export function printHtml(body: string, widthMm: number) {
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  const doc = f.contentDocument!
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${widthMm}mm auto; margin: 2mm }
    body { margin:0; width:${widthMm - 4}mm; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: ${widthMm >= 80 ? 12 : 10}px; color:#000 }
    pre { white-space: pre-wrap; margin: 6px 0; font: inherit }
    .labels { display:flex; flex-wrap:wrap; gap:0 }
  </style></head><body>${body}</body></html>`)
  doc.close()
  setTimeout(() => {
    f.contentWindow!.focus()
    f.contentWindow!.print()
    setTimeout(() => f.remove(), 2000)
  }, 300)
}

/** Intenta Bluetooth y si no hay impresora, abre el diálogo de impresión */
export async function printDoc(doc: Doc, s: Settings): Promise<'bluetooth' | 'sistema'> {
  try {
    if (await sendToPrinter('ticket', await buildEscPos(doc, s))) return 'bluetooth'
  } catch (e) {
    console.warn('Bluetooth falló', e)
  }
  printHtml(buildHtml(doc, s), s.printing.paperWidth)
  return 'sistema'
}

export function shareWhatsApp(doc: Doc, s: Settings, phone?: string) {
  const text = buildText(doc, s)
  const num = phone ? phone.replace(/\D/g, '').replace(/^0/, '58') : ''
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
}

/* ---------------- Etiquetas de código de barras ---------------- */

export interface LabelJob {
  name: string
  price: string
  barcode: string
  copies: number
}

function tsplLabels(jobs: LabelJob[], wMm: number, hMm: number) {
  const dots = 8 // 203 dpi
  const W = wMm * dots
  let out = ''
  for (const j of jobs) {
    const name = stripAccents(j.name).slice(0, 22).replace(/"/g, "'")
    const type = barcodeFormat(j.barcode) === 'EAN13' ? 'EAN13' : '128'
    out += `SIZE ${wMm} mm,${hMm} mm\r\nGAP 2 mm,0 mm\r\nDIRECTION 1\r\nCLS\r\n`
    out += `TEXT 10,8,"2",0,1,1,"${name}"\r\n`
    out += `TEXT ${W - 10},8,"2",0,1,1,3,"${j.price}"\r\n`
    out += `BARCODE 24,36,"${type}",${Math.max(40, hMm * dots - 80)},1,0,2,2,"${j.barcode}"\r\n`
    out += `PRINT 1,${j.copies}\r\n`
  }
  return new TextEncoder().encode(out)
}

function cpclLabels(jobs: LabelJob[], wMm: number, hMm: number) {
  const dots = 8
  let out = ''
  for (const j of jobs) {
    const name = stripAccents(j.name).slice(0, 22)
    const type = barcodeFormat(j.barcode) === 'EAN13' ? 'EAN13' : '128'
    for (let c = 0; c < j.copies; c++) {
      out += `! 0 200 200 ${hMm * dots} 1\r\nPAGE-WIDTH ${wMm * dots}\r\n`
      out += `TEXT 7 0 10 6 ${name}\r\nTEXT 7 0 ${wMm * dots - 90} 6 ${j.price}\r\n`
      out += `BARCODE ${type} 1 1 ${Math.max(40, hMm * dots - 90)} 24 34 ${j.barcode}\r\n`
      out += `TEXT 7 0 60 ${hMm * dots - 30} ${j.barcode}\r\nFORM\r\nPRINT\r\n`
    }
  }
  return new TextEncoder().encode(out)
}

function escposLabels(jobs: LabelJob[]) {
  const p = new EscPos()
  for (const j of jobs) {
    for (let c = 0; c < j.copies; c++) {
      p.align('center').bold(true).line(j.name).bold(false).line(j.price).barcode(j.barcode).feed(2)
    }
  }
  return p.cut().encode()
}

export function labelsHtml(jobs: LabelJob[], wMm: number, hMm: number) {
  const parts: string[] = []
  for (const j of jobs) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, j.barcode, { format: barcodeFormat(j.barcode), height: 40, fontSize: 12, margin: 0, width: 1.6 })
    svg.setAttribute('style', 'width:100%;height:auto;max-height:70%')
    for (let c = 0; c < j.copies; c++) {
      parts.push(`<div style="width:${wMm}mm;height:${hMm}mm;box-sizing:border-box;padding:1.5mm;page-break-after:always;overflow:hidden">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:10px"><span>${esc(j.name.slice(0, 26))}</span><span>${esc(j.price)}</span></div>
        ${svg.outerHTML}</div>`)
    }
  }
  return `<div class="labels">${parts.join('')}</div>`
}

export async function printLabels(jobs: LabelJob[], s: Settings): Promise<'bluetooth' | 'sistema'> {
  const { labelMode, labelLang, labelWidth, labelHeight } = s.printing
  const data =
    labelMode === 'ticket'
      ? escposLabels(jobs)
      : labelLang === 'CPCL'
        ? cpclLabels(jobs, labelWidth, labelHeight)
        : tsplLabels(jobs, labelWidth, labelHeight)
  try {
    if (await sendToPrinter(labelMode === 'ticket' ? 'ticket' : 'label', data)) return 'bluetooth'
  } catch (e) {
    console.warn('Bluetooth falló', e)
  }
  printHtml(labelsHtml(jobs, labelWidth, labelHeight), labelMode === 'ticket' ? s.printing.paperWidth : labelWidth)
  return 'sistema'
}
