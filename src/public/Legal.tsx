import type { ReactNode } from 'react'
import { ArrowLeft, Cookie, FileText, ShieldCheck } from 'lucide-react'
import { TERMS_UPDATED, usePublicInfo, type PublicInfo } from '../lib/legal'
import { PublicFooter, PublicShell } from './PublicShell'

type Doc = 'terminos' | 'privacidad' | 'cookies'

const DOCS: { key: Doc; title: string; text: string; icon: typeof FileText }[] = [
  { key: 'terminos', title: 'Términos y condiciones', text: 'Las reglas del servicio: planes, pagos, prueba gratis, nota de entrega y responsabilidades.', icon: FileText },
  { key: 'privacidad', title: 'Política de privacidad', text: 'Qué datos guardamos, para qué, dónde están y cómo pedir que se borren.', icon: ShieldCheck },
  { key: 'cookies', title: 'Cookies y almacenamiento', text: 'Qué guarda la app en tu teléfono para funcionar sin internet. Sin publicidad ni rastreo.', icon: Cookie },
]

export default function Legal({ doc }: { doc?: string }) {
  const info = usePublicInfo()
  const current = DOCS.find((d) => d.key === doc)
  if (!current) {
    return (
      <PublicShell>
        <h1 className="text-3xl font-extrabold tracking-tight mt-6">Legal</h1>
        <p className="text-muted mt-2">Todo lo que aceptas al usar TuBodega, escrito claro y sin letra pequeña.</p>
        <div className="space-y-3 mt-6">
          {DOCS.map(({ key, title, text, icon: Icon }) => (
            <a key={key} href={`/legal/${key}`} className="flex gap-3 rounded-3xl bg-surface border border-line p-4 active:scale-[.99] transition">
              <span className="size-11 rounded-2xl bg-brand-50 text-brand-700 grid place-items-center shrink-0">
                <Icon size={20} />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
            </a>
          ))}
        </div>
        <PublicFooter />
      </PublicShell>
    )
  }
  return (
    <PublicShell>
      <a href="/legal" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted mt-4">
        <ArrowLeft size={16} /> Legal
      </a>
      <h1 className="text-3xl font-extrabold tracking-tight mt-3">{current.title}</h1>
      <p className="text-sm text-muted mt-1">Última actualización: {TERMS_UPDATED}</p>
      <article className="legal mt-6 space-y-6">
        {doc === 'terminos' && <Terminos info={info} />}
        {doc === 'privacidad' && <Privacidad info={info} />}
        {doc === 'cookies' && <Cookies />}
      </article>
      <PublicFooter />
    </PublicShell>
  )
}

function S({ n, title, children }: { n?: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-extrabold text-lg mb-2">
        {n != null && <span className="text-brand-600">{n}. </span>}
        {title}
      </h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-ink/90">{children}</div>
    </section>
  )
}

function Ul({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}

/** Quién presta el servicio, con los datos que el admin cargó */
function Responsable({ info }: { info: PublicInfo }) {
  const parts = [info.legal_name || 'el titular de la marca TuBodega', info.legal_id && `(${info.legal_id})`, info.legal_city && `con domicilio en ${info.legal_city}`].filter(Boolean)
  return <>{parts.join(' ')}</>
}

function Contacto({ info }: { info: PublicInfo }) {
  const ways = [info.whatsapp && `WhatsApp ${info.whatsapp}`, info.legal_email && `correo ${info.legal_email}`].filter(Boolean)
  return <>{ways.length ? ways.join(' o ') : 'el WhatsApp de soporte que aparece en la app, en Ajustes → Soporte'}</>
}

function Terminos({ info }: { info: PublicInfo }) {
  return (
    <>
      <S n={1} title="Quién presta el servicio">
        <p>
          TuBodega es un servicio prestado por <Responsable info={info} /> (en adelante, "TuBodega", "nosotros"). Puedes escribirnos por <Contacto info={info} />.
        </p>
        <p>Al activar una bodega o entrar a la app aceptas estos términos. Si no estás de acuerdo, no uses el servicio.</p>
      </S>
      <S n={2} title="Qué es TuBodega">
        <p>
          Es una aplicación web para llevar las ventas, el inventario, los fiados, la caja y las finanzas de un comercio desde el teléfono. Se paga como una suscripción mensual: no compras el programa, pagas por usarlo mientras tu plan esté al día.
        </p>
      </S>
      <S n={3} title="Tu cuenta">
        <Ul
          items={[
            'Cada bodega se activa con un código que te damos. Con él creas tu usuario y tu clave.',
            'Tu clave es personal. Eres responsable de lo que se haga con tu usuario y de los usuarios vendedores que agregues.',
            'Si pierdes el teléfono o sospechas que alguien conoce tu clave, avísanos para cerrar la sesión y cambiarla.',
            'Debes ser mayor de edad y tener permiso para representar al negocio.',
          ]}
        />
      </S>
      <S n={4} title="Prueba gratis, planes y pagos">
        <Ul
          items={[
            'Cada bodega nueva tiene 7 días de prueba gratis, sin compromiso.',
            <>Los precios están en dólares y se publican en la app y en <a className="font-semibold text-brand-700 underline" href="/conocer">la página de TuBodega</a>. Puedes pagar en bolívares a la tasa oficial del BCV del día del pago.</>,
            'El pago es por adelantado, por mes, trimestre, semestre o año. No hay cobros automáticos: tú reportas cada pago desde Ajustes → Mi plan y nosotros lo confirmamos.',
            'Los servicios de instalación, el kit de impresión y los rollos se cobran aparte y una sola vez.',
            'Podemos cambiar los precios avisándote con al menos 30 días. El cambio aplica desde tu siguiente pago.',
            'Lo pagado cubre el periodo contratado. No se devuelve dinero por periodos usados en parte, salvo que el servicio haya fallado por causa nuestra y no lo hayamos podido arreglar.',
          ]}
        />
      </S>
      <S n={5} title="Si el pago se atrasa">
        <Ul
          items={[
            'La app te avisa 3 días antes del vencimiento.',
            'Después del vencimiento tienes 3 días de gracia en los que puedes seguir vendiendo.',
            'Luego la app pasa a modo solo lectura: puedes ver y exportar tus datos, pero no registrar ventas nuevas, hasta que reportes el pago.',
            'Si la cuenta pasa más de 90 días vencida o dada de baja, podemos borrar sus datos de la nube, avisándote antes por WhatsApp.',
          ]}
        />
      </S>
      <S n={6} title="El ticket es una nota de entrega, no una factura fiscal">
        <p>
          Los tickets, notas y cotizaciones que genera TuBodega son <b>documentos sin valor fiscal</b>. TuBodega no es una máquina fiscal ni un sistema de facturación homologado por el SENIAT, y no sustituye la factura cuando la ley la exige.
        </p>
        <p>
          El comerciante es el único responsable de cumplir sus obligaciones tributarias: emitir facturas por los medios autorizados, declarar y pagar sus impuestos. Las cifras de la app son una ayuda para tu control interno.
        </p>
      </S>
      <S n={7} title="Tus datos son tuyos">
        <p>
          Los productos, ventas, clientes y demás información que cargas pertenecen a tu negocio. Nosotros solo los guardamos y procesamos para prestarte el servicio, como explica la <a className="font-semibold text-brand-700 underline" href="/legal/privacidad">Política de privacidad</a>. Puedes descargar un respaldo completo cuando quieras desde Ajustes → Respaldo.
        </p>
        <p>
          Si guardas datos de tus clientes (por ejemplo, nombre y teléfono para los fiados), eres responsable de tener su permiso y de usarlos solo para tu negocio.
        </p>
      </S>
      <S n={8} title="Uso correcto">
        <p>No puedes usar TuBodega para actividades ilegales, intentar entrar a cuentas de otras bodegas, copiar o revender la app, ni interferir con su funcionamiento. Si lo haces, podemos suspender la cuenta.</p>
      </S>
      <S n={9} title="Funcionamiento y respaldos">
        <Ul
          items={[
            'La app funciona sin internet y sincroniza cuando vuelve la conexión. Algunas funciones (respaldo en la nube, varios teléfonos, confirmar pagos) necesitan internet.',
            'Hacemos lo razonable para que el servicio esté disponible y sin errores, pero no podemos garantizar que funcione siempre ni que nunca falle: depende también de tu teléfono, tu navegador y tu conexión.',
            'La app hace respaldos automáticos en la nube cuando hay internet. Te recomendamos además descargar un respaldo cada semana.',
            'La tasa de cambio la escribes tú. Revisa que sea la correcta: los montos en bolívares se calculan con ella.',
          ]}
        />
      </S>
      <S n={10} title="Responsabilidad">
        <p>
          TuBodega es una herramienta de apoyo. No respondemos por pérdidas causadas por mal uso, datos mal cargados, una tasa equivocada, pérdida o daño del teléfono sin respaldo, cortes de internet o luz, ni por decisiones de negocio tomadas con la información de la app.
        </p>
        <p>En cualquier caso, nuestra responsabilidad máxima frente a ti será el monto que nos hayas pagado por el servicio en los últimos 3 meses.</p>
      </S>
      <S n={11} title="Equipos">
        <p>
          Si nos compras la impresora térmica u otros equipos, tienen la garantía de su fabricante. Te ayudamos a tramitarla. La configuración inicial está incluida en el kit.
        </p>
      </S>
      <S n={12} title="Baja del servicio">
        <p>
          Puedes dejar de usar TuBodega cuando quieras: basta con no renovar o escribirnos. Antes de irte, descarga tu respaldo. Podemos suspender o dar de baja una cuenta por falta de pago o por incumplir estos términos.
        </p>
      </S>
      <S n={13} title="Cambios a estos términos">
        <p>Si cambiamos estos términos te lo diremos en la app y te pediremos aceptarlos de nuevo. La fecha de arriba indica la última versión.</p>
      </S>
      <S n={14} title="Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier diferencia intentaremos resolverla primero conversando. Si no es posible, se someterá a los tribunales competentes{info.legal_city ? ` de ${info.legal_city}` : ''}.
        </p>
      </S>
    </>
  )
}

function Privacidad({ info }: { info: PublicInfo }) {
  return (
    <>
      <S n={1} title="Responsable">
        <p>
          El responsable de los datos de las cuentas es <Responsable info={info} />. Contacto: <Contacto info={info} />.
        </p>
        <p>
          Esta política explica qué datos trata TuBodega y cómo ejerces tus derechos, en línea con el artículo 28 de la Constitución de la República Bolivariana de Venezuela (derecho de acceso y protección de los datos personales, habeas data) y el artículo 60 (protección de la vida privada).
        </p>
      </S>
      <S n={2} title="Qué datos guardamos">
        <Ul
          items={[
            <><b>De tu cuenta:</b> tu usuario y tu clave. La clave se guarda cifrada: nadie, ni nosotros, puede leerla.</>,
            <><b>De tu negocio:</b> nombre, nombre del dueño, teléfono o WhatsApp, RIF y dirección, si los das.</>,
            <><b>De la operación de la bodega:</b> productos, precios, inventario, ventas, cotizaciones, compras, gastos, caja, vendedores y clientes con sus fiados (nombre, teléfono y lo que deben, si los cargas).</>,
            <><b>Técnicos:</b> un identificador del teléfono, su modelo, la fecha de la última conexión y un resumen de ventas del día y del mes (cantidad y total) para el control del plan y el soporte.</>,
            <><b>De pagos:</b> monto, método, referencia y fecha de los pagos que reportas. No guardamos datos de tarjetas ni claves bancarias.</>,
          ]}
        />
      </S>
      <S n={3} title="Para qué los usamos">
        <Ul
          items={[
            'Para que la app funcione: guardar tus datos, sincronizar tus teléfonos y hacer respaldos.',
            'Para controlar tu plan: prueba gratis, vencimientos, pagos y número de teléfonos.',
            'Para darte soporte cuando lo pidas y avisarte de vencimientos o cambios importantes por WhatsApp.',
          ]}
        />
        <p>
          <b>No vendemos ni alquilamos tus datos, no los usamos para publicidad y no hacemos perfiles de tus clientes.</b> Solo los compartimos si una autoridad competente lo exige conforme a la ley.
        </p>
      </S>
      <S n={4} title="Dónde se guardan y quién los ve">
        <Ul
          items={[
            'En tu teléfono, para que la app funcione sin internet.',
            'En la nube de Supabase, nuestro proveedor de base de datos y almacenamiento, cuyos servidores pueden estar fuera de Venezuela. La página se sirve desde Vercel.',
            'Toda la comunicación viaja cifrada (HTTPS). Cada bodega solo puede ver sus propios datos.',
            'En el panel de administración vemos los datos de tu cuenta, tus pagos y el resumen de ventas. Tus respaldos solo los abrimos para recuperar tu información o resolver un problema que nos pidas.',
          ]}
        />
      </S>
      <S n={5} title="Datos de tus clientes">
        <p>
          Cuando cargas clientes para fiados o envíos por WhatsApp, tú eres el responsable de esos datos y nosotros solo los guardamos por cuenta tuya. Pide permiso a tus clientes, guarda solo lo necesario y bórralos cuando ya no los necesites.
        </p>
      </S>
      <S n={6} title="Cuánto tiempo">
        <p>
          Mientras tu cuenta esté activa. Si das de baja la cuenta o pasa más de 90 días vencida, borramos sus datos de la nube, avisándote antes. Los datos que quedan en tu teléfono los borras tú cerrando sesión o borrando los datos del navegador.
        </p>
      </S>
      <S n={7} title="Tus derechos">
        <p>Puedes pedir en cualquier momento:</p>
        <Ul
          items={[
            <><b>Acceso y copia:</b> descarga todo desde Ajustes → Respaldo, o pídenoslo.</>,
            <><b>Corrección:</b> cambia tus datos en Ajustes → Negocio, o pídenoslo.</>,
            <><b>Eliminación:</b> desde Ajustes → Legal y privacidad → "Pedir que borren mi cuenta". La borramos en un máximo de 15 días hábiles y te confirmamos.</>,
          ]}
        />
        <p>
          Escríbenos por <Contacto info={info} />. Te responderemos en un máximo de 15 días hábiles.
        </p>
      </S>
      <S n={8} title="Seguridad">
        <p>
          Usamos claves cifradas, conexiones seguras, permisos por bodega y respaldos. Ningún sistema es 100 % seguro: si detectamos un problema que afecte tus datos, te avisaremos lo antes posible.
        </p>
      </S>
      <S n={9} title="Menores de edad">
        <p>TuBodega es para comercios. No está dirigida a menores de edad ni recogemos sus datos a sabiendas.</p>
      </S>
      <S n={10} title="Cambios">
        <p>Si cambiamos esta política te lo diremos en la app. La fecha de arriba indica la última versión.</p>
      </S>
    </>
  )
}

function Cookies() {
  const rows: [string, string, string][] = [
    ['Sesión', 'Mantiene tu cuenta abierta para que no tengas que escribir la clave cada vez.', 'Hasta que cierres sesión'],
    ['Datos de la bodega', 'Productos, ventas, fiados y demás, guardados en el teléfono para vender sin internet.', 'Hasta que cierres sesión o borres los datos'],
    ['Licencia y ajustes', 'Estado de tu plan, impresora conectada, vendedor actual y preferencias de este teléfono.', 'Hasta que cierres sesión'],
    ['Carrito', 'La venta en curso, para que no se pierda si se cierra la app.', 'Hasta terminar la venta'],
    ['Archivos de la app', 'Copia de la app para que abra sin internet y se actualice sola.', 'Hasta la siguiente versión'],
  ]
  return (
    <>
      <S title="Resumen">
        <p>
          <b>TuBodega no usa cookies de publicidad, de analítica ni de redes sociales, y no te rastrea.</b> Solo guarda en tu teléfono lo estrictamente necesario para funcionar, usando el almacenamiento del navegador (localStorage, IndexedDB y la caché de la app). Por eso no necesitas aceptar nada aparte: sin esto la app no podría funcionar.
        </p>
      </S>
      <S title="Qué se guarda en tu teléfono">
        <div className="rounded-2xl border border-line overflow-hidden bg-surface">
          {rows.map(([a, b, c]) => (
            <div key={a} className="p-3.5 border-t border-line first:border-0">
              <p className="font-bold text-[15px]">{a}</p>
              <p className="text-sm text-muted">{b}</p>
              <p className="text-xs text-muted mt-0.5">Dura: {c}</p>
            </div>
          ))}
        </div>
      </S>
      <S title="Servicios de terceros">
        <p>
          La app se conecta solo a Supabase (base de datos y respaldos) y a Vercel (donde está publicada). Los botones de WhatsApp abren WhatsApp únicamente cuando los tocas; desde ese momento aplica la política de WhatsApp.
        </p>
      </S>
      <S title="Cómo borrarlo">
        <p>
          Cierra sesión desde Ajustes, o borra los datos del sitio en tu navegador (en Chrome: ⋮ → Configuración → Configuración de sitios → Todos los sitios → TuBodega → Borrar datos). Si lo haces sin respaldo y sin internet, perderás lo que no se haya sincronizado.
        </p>
      </S>
    </>
  )
}
