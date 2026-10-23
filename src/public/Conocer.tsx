import type { ReactNode } from 'react'
import { BookUser, Check, MessageCircle, PackageSearch, Printer, ReceiptText, ScanBarcode, Smartphone, WifiOff, Wallet } from 'lucide-react'
import { usePublicInfo, waUrl } from '../lib/legal'
import { PublicFooter, PublicShell } from './PublicShell'

const FEATURES: { icon: typeof ScanBarcode; title: string; text: string; img: string }[] = [
  { icon: ScanBarcode, title: 'Cobra con la cámara', text: 'Apunta al código de barras y el producto entra solo. También vende por peso, por docena o por caja.', img: '02-venta-escaneado' },
  { icon: Wallet, title: 'Dólares y bolívares', text: 'Cada precio con su monto en Bs a tu tasa. Efectivo, Pago Móvil, punto, Zelle o mixto, y te calcula el vuelto.', img: '09-vuelto-efectivo' },
  { icon: BookUser, title: 'Cuaderno de fiados', text: 'Quién te debe, cuánto y desde cuándo. Registra abonos y recuérdale por WhatsApp con un toque.', img: '12-cuaderno-fiados' },
  { icon: PackageSearch, title: 'Inventario que avisa', text: 'Sabes qué se está acabando, qué está por vencer y cuánto tienes invertido en mercancía.', img: '18-avisos' },
  { icon: ReceiptText, title: 'La caja cuadra', text: 'Cuánto vendiste, cuánto ganaste y cómo te pagaron. Abre y cierra caja aunque atienda tu empleado.', img: '17-cuadre-del-dia' },
  { icon: Printer, title: 'Ticket al momento', text: 'Imprime en una impresora térmica Bluetooth o mándalo por WhatsApp. Es una nota de entrega.', img: '24-ticket-impreso' },
]

const PAINS = ['Anotas todo en un cuaderno', 'Se te olvida quién te debe', 'La caja no cuadra al final del día', 'Recalculas precios cada vez que sube la tasa']

const FAQ: [string, string][] = [
  ['¿Necesito internet?', 'No para vender. La app funciona sin señal y sin luz en el router; cuando vuelve el internet, se sincroniza y respalda sola.'],
  ['¿Tengo que comprar una computadora?', 'No. Funciona en el teléfono Android que ya tienes, con Chrome. La impresora es opcional.'],
  ['¿Es una factura fiscal?', 'No. El ticket es una nota de entrega sin valor fiscal, para tu control y el de tu cliente. Las facturas fiscales se siguen emitiendo por los medios que exige el SENIAT.'],
  ['¿Y si se me pierde el teléfono?', 'Tus datos están respaldados en la nube. Entras con tu usuario y clave en el teléfono nuevo y aparece todo.'],
  ['¿Puede usarla mi empleado?', 'Sí. En el plan Pro cada quien usa su teléfono y tú ves las ventas al momento desde tu casa.'],
  ['¿Cómo pago? ¿Hay contrato?', 'Pagas mes a mes por Pago Móvil, Zelle, Binance o efectivo. No hay contrato: si no te sirve, no renuevas.'],
]

export default function Conocer() {
  const info = usePublicInfo()
  const ref = new URLSearchParams(location.search).get('ref')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
  const msg = `Hola, quiero probar TuBodega 7 días gratis en mi negocio.${ref ? ` Me refirió el código ${ref}.` : ''}`
  const wa = info.whatsapp ? waUrl(info.whatsapp, msg) : null

  return (
    <PublicShell wide>
      {/* Portada */}
      <section className="grid md:grid-cols-[1.1fr_.9fr] gap-8 items-center pt-6 md:pt-12 print:pt-0 print:grid-cols-[1.2fr_.8fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1.5">
            Hecho para bodegas y abastos de Venezuela
          </span>
          <h1 className="text-[2.6rem] leading-[1.05] md:text-6xl font-extrabold tracking-tight mt-4">
            Tu bodega completa <span className="text-brand-500">en el teléfono.</span>
          </h1>
          <p className="text-lg text-muted mt-4 max-w-lg">Cobra con la cámara, lleva los fiados y cuadra la caja en dólares y bolívares. Funciona sin internet.</p>
          {ref && (
            <p className="mt-4 rounded-2xl bg-amber-50 text-amber-800 text-sm font-semibold px-4 py-3 max-w-lg">
              Vienes recomendado con el código <b className="tracking-widest">{ref}</b>: tu instalación sale a mitad de precio.
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-6 print:hidden">
            <Cta wa={wa} big />
            <a href="#precios" className="h-14 px-6 rounded-2xl border border-line bg-surface font-bold grid place-items-center">
              Ver precios
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm font-semibold text-muted">
            <li className="flex items-center gap-1.5"><Check size={16} className="text-brand-500" /> 7 días gratis</li>
            <li className="flex items-center gap-1.5"><Check size={16} className="text-brand-500" /> Sin contrato</li>
            <li className="flex items-center gap-1.5"><WifiOff size={16} className="text-brand-500" /> Funciona sin internet</li>
          </ul>
        </div>
        <Phone img="02-venta-escaneado" className="mx-auto w-[min(78vw,300px)] print:w-[220px]" />
      </section>

      {/* El problema */}
      <section className="mt-16 print:mt-8 rounded-[2rem] bg-ink text-white p-6 md:p-10 print:break-inside-avoid">
        <p className="text-brand-300 font-bold text-sm">¿Te suena?</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {PAINS.map((p) => (
            <p key={p} className="rounded-2xl bg-white/8 px-4 py-3.5 font-semibold">{p}</p>
          ))}
        </div>
        <p className="text-xl md:text-2xl font-extrabold mt-6">TuBodega lo lleva por ti, desde el mismo teléfono con el que cobras el Pago Móvil.</p>
      </section>

      {/* Funciones */}
      <section className="mt-16 print:mt-0 print:break-before-page">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Todo lo que pasa en el mostrador</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 print:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text, img }) => (
            <article key={title} className="rounded-[1.75rem] bg-surface border border-line p-5 flex flex-col print:break-inside-avoid">
              <span className="size-11 rounded-2xl bg-brand-50 text-brand-700 grid place-items-center">
                <Icon size={21} />
              </span>
              <h3 className="font-extrabold text-lg mt-3">{title}</h3>
              <p className="text-sm text-muted mt-1 flex-1">{text}</p>
              <div className="mt-4 h-56 overflow-hidden rounded-2xl bg-canvas print:hidden">
                <img src={`/conocer/${img}.webp`} alt="" loading="lazy" className="w-3/4 mx-auto mt-4 rounded-t-2xl shadow-[0_10px_30px_-12px_rgba(23,32,28,.35)]" />
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-[1.75rem] bg-brand-50 border border-brand-100 p-5 flex gap-4 items-center print:break-inside-avoid">
          <span className="size-11 rounded-2xl bg-white text-brand-700 grid place-items-center shrink-0">
            <Smartphone size={21} />
          </span>
          <p className="text-sm">
            <b>Plan Pro:</b> la caja y tú ven lo mismo al momento. Tu empleado vende en su teléfono y tú revisas las ventas desde la casa.
          </p>
        </div>
      </section>

      {/* Cómo empezar */}
      <section className="mt-16 print:mt-8 print:break-inside-avoid">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Empezar es fácil</h2>
        <ol className="grid md:grid-cols-3 gap-4 mt-6 print:grid-cols-3">
          {[
            ['Te visitamos', 'Te mostramos la app con productos de ejemplo. Si te gusta, te dejamos tu cuenta lista.'],
            ['7 días gratis', 'Vendes con TuBodega una semana completa. Te ayudamos a cargar tus productos.'],
            ['Pagas si te sirve', 'Desde $10 al mes por Pago Móvil o como prefieras. Sin contrato.'],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-[1.75rem] bg-surface border border-line p-5">
              <span className="size-9 rounded-full bg-brand-500 text-white font-extrabold grid place-items-center">{i + 1}</span>
              <p className="font-extrabold text-lg mt-3">{t}</p>
              <p className="text-sm text-muted mt-1">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Precios */}
      <section id="precios" className="mt-16 print:mt-8 scroll-mt-20 print:break-before-page">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Precios claros</h2>
        <p className="text-muted mt-2">Menos de lo que vale una malta al día. Puedes pagar en bolívares a la tasa del BCV.</p>
        <div className="grid md:grid-cols-2 gap-4 mt-6 print:grid-cols-2">
          <Plan
            name="Básico"
            price={10}
            items={['1 teléfono', 'Ventas, inventario y fiados', 'Caja, cuadre y finanzas', 'Respaldo automático en la nube', 'Soporte por WhatsApp']}
          />
          <Plan
            name="Pro"
            price={18}
            highlight
            items={['Todo lo del Básico', 'Varios teléfonos al mismo tiempo', 'Vendedores con su propio usuario', 'Ves las ventas desde tu casa', 'Ideal si tienes empleado']}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4 print:grid-cols-3">
          <Extra title="Instalación" price="$30" text="Te la instalamos, cargamos tus productos y te enseñamos." />
          <Extra title="Kit de impresión" price="$45" text="Impresora térmica de 58 mm, 5 rollos y configuración." />
          <Extra title="Rollos de papel" price="$6" text="Paquete de rollos de 58 mm cuando los necesites." />
        </div>
        <div className="mt-4 rounded-[1.75rem] bg-gradient-to-br from-brand-500 to-brand-700 text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4 print:break-inside-avoid">
          <div className="flex-1">
            <p className="text-white/80 text-sm font-bold">PAQUETE ARRANQUE</p>
            <p className="text-2xl font-extrabold mt-1">Instalación + kit de impresión + primer mes</p>
            <p className="text-white/85 text-sm mt-1">Todo listo para vender desde el primer día. Ahorras $10.</p>
          </div>
          <p className="text-5xl font-extrabold tabular">$75</p>
        </div>
      </section>

      {/* Preguntas */}
      <section className="mt-16 print:mt-8">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Preguntas frecuentes</h2>
        <div className="grid md:grid-cols-2 gap-3 mt-6 print:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-3xl bg-surface border border-line p-5 print:break-inside-avoid">
              <p className="font-extrabold">{q}</p>
              <p className="text-sm text-muted mt-1.5">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="mt-16 print:mt-8 rounded-[2rem] bg-surface border border-line p-6 md:p-10 text-center print:break-inside-avoid">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Pruébala 7 días gratis</h2>
        <p className="text-muted mt-2">Te la dejamos instalada en tu teléfono hoy mismo.</p>
        <div className="flex justify-center mt-6 print:hidden">
          <Cta wa={wa} big />
        </div>
        {info.whatsapp && <p className="hidden print:block text-2xl font-extrabold mt-4">WhatsApp {info.whatsapp}</p>}
        <p className="hidden print:block text-sm text-muted mt-1">{location.hostname === 'localhost' ? 'tubodega.vercel.app' : location.host}/conocer</p>
        <button onClick={() => window.print()} className="mt-4 text-sm font-semibold text-muted underline print:hidden">
          Guardar esta página en PDF o imprimirla
        </button>
      </section>

      <PublicFooter />
    </PublicShell>
  )
}

function Cta({ wa, big }: { wa: string | null; big?: boolean }) {
  const cls = `${big ? 'h-14 px-6 text-base' : 'h-11 px-4 text-sm'} rounded-2xl bg-[#25d366] text-white font-bold inline-flex items-center gap-2 shadow-[0_12px_28px_-14px_rgba(37,211,102,.9)]`
  if (!wa) {
    return (
      <a href="/" className={cls.replace('bg-[#25d366]', 'bg-brand-500')}>
        Entrar a TuBodega
      </a>
    )
  }
  return (
    <a href={wa} target="_blank" rel="noopener" className={cls}>
      <MessageCircle size={big ? 20 : 17} /> Probar 7 días gratis
    </a>
  )
}

function Phone({ img, className }: { img: string; className?: string }) {
  return (
    <div className={`rounded-[2.6rem] bg-ink p-2.5 shadow-[0_30px_60px_-25px_rgba(23,32,28,.55)] ${className}`}>
      <img src={`/conocer/${img}.webp`} alt="TuBodega en un teléfono" className="w-full rounded-[2.1rem]" />
    </div>
  )
}

function Plan({ name, price, items, highlight }: { name: string; price: number; items: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-[1.75rem] p-6 border print:break-inside-avoid ${highlight ? 'bg-ink text-white border-ink' : 'bg-surface border-line'}`}>
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-xl">{name}</p>
        {highlight && <span className="text-xs font-bold rounded-full bg-brand-500 px-2.5 py-1">Con empleado</span>}
      </div>
      <p className="mt-3">
        <span className="text-5xl font-extrabold tabular">${price}</span>
        <span className={highlight ? 'text-white/70' : 'text-muted'}> / mes</span>
      </p>
      <ul className="mt-5 space-y-2">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-[15px]">
            <Check size={18} className="text-brand-400 shrink-0 mt-0.5" /> {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Extra({ title, price, text }: { title: string; price: string; text: ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface border border-line p-4 print:break-inside-avoid">
      <div className="flex items-baseline justify-between">
        <p className="font-extrabold">{title}</p>
        <p className="font-extrabold text-lg tabular">{price}</p>
      </div>
      <p className="text-sm text-muted mt-1">{text}</p>
    </div>
  )
}
