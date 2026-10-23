import { useEffect, useState } from 'react'
import { Download, ExternalLink, LogOut, PlayCircle, Save } from 'lucide-react'
import { Button, Card, Field, Input, TextArea, toast } from '../components/ui'
import { enterDemo, setConfig, signOut, useAccount } from '../lib/account'
import { BUILD, friendlyError, supabase } from '../lib/cloud'
import { AdminPage } from './AdminApp'
import { downloadCsv, fetchPayments, fetchStores, storeMode, MODE_LABEL } from './data'

export function AdminAjustes() {
  const email = useAccount((s) => (s.account?.mode === 'admin' ? s.account.email : ''))
  const [f, setF] = useState({ pago_movil: '', zelle: '', binance: '', whatsapp: '' })
  const [legal, setLegal] = useState({ legal_name: '', legal_id: '', legal_email: '', legal_city: '' })
  useEffect(() => {
    supabase
      .from('app_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setF({ pago_movil: data.pago_movil ?? '', zelle: data.zelle ?? '', binance: data.binance ?? '', whatsapp: data.whatsapp ?? '' })
        setLegal({ legal_name: data.legal_name ?? '', legal_id: data.legal_id ?? '', legal_email: data.legal_email ?? '', legal_city: data.legal_city ?? '' })
      })
  }, [])
  const save = async () => {
    const { error } = await supabase.from('app_config').update({ ...f, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) return toast(friendlyError(error), { tone: 'error' })
    setConfig(f)
    toast('Datos de cobro guardados')
  }
  const saveLegal = async () => {
    const { error } = await supabase.from('app_config').update({ ...legal, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) return toast(friendlyError(error.message.includes('legal_') ? 'Vuelve a ejecutar supabase/schema.sql en Supabase para guardar estos datos.' : error), { tone: 'error' })
    toast('Datos legales guardados')
  }
  const exportCsv = async () => {
    try {
      const [stores, payments] = await Promise.all([fetchStores(), fetchPayments()])
      const day = new Date().toISOString().slice(0, 10)
      downloadCsv(
        `tubodega-bodegas-${day}.csv`,
        ['Bodega', 'Dueño', 'WhatsApp', 'RIF', 'Plan', 'Precio $', 'Estado', 'Pagado hasta', 'Ventas del mes $', 'Creada'],
        stores.map((s) => [s.name, s.owner_name, s.phone, s.rif, s.plan, s.monthly_price, MODE_LABEL[storeMode(s).mode], s.paid_until.slice(0, 10), s.stats?.total_mes ?? 0, s.created_at?.slice(0, 10)]),
      )
      downloadCsv(
        `tubodega-pagos-${day}.csv`,
        ['Fecha', 'Bodega', 'Monto $', 'Monto Bs', 'Método', 'Referencia', 'Meses', 'Estado', 'Revisado'],
        payments.map((p) => [p.created_at.slice(0, 10), p.stores?.name, p.amount_usd, p.amount_bs, p.method, p.reference, p.months, p.status, p.reviewed_at?.slice(0, 10)]),
      )
    } catch (e) {
      toast(friendlyError(e), { tone: 'error' })
    }
  }
  return (
    <AdminPage title="Ajustes">
      <div className="space-y-3">
        <Card className="p-4 space-y-3">
          <p className="font-bold">Tus datos de cobro</p>
          <p className="text-sm text-muted -mt-2">Las bodegas los ven en Ajustes → Mi plan, con un toque los copian.</p>
          <Field label="Pago Móvil (banco, teléfono, cédula)">
            <TextArea value={f.pago_movil} onChange={(e) => setF({ ...f, pago_movil: e.target.value })} placeholder={'0102 Banco de Venezuela\n0414-0000000\nV-00000000'} />
          </Field>
          <Field label="Zelle">
            <Input value={f.zelle} onChange={(e) => setF({ ...f, zelle: e.target.value })} placeholder="correo@zelle.com · Nombre" />
          </Field>
          <Field label="Binance Pay">
            <Input value={f.binance} onChange={(e) => setF({ ...f, binance: e.target.value })} placeholder="Pay ID o correo" />
          </Field>
          <Field label="Tu WhatsApp de soporte" hint="Las bodegas lo usan desde Ajustes → Soporte.">
            <Input inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="0414-0000000" />
          </Field>
          <Button className="w-full" onClick={save}>
            <Save size={16} /> Guardar
          </Button>
        </Card>
        <Card className="p-4 space-y-3">
          <p className="font-bold">Datos legales</p>
          <p className="text-sm text-muted -mt-2">Salen en los Términos y la Política de privacidad como responsable del servicio. Usa tus datos reales o los de tu firma personal.</p>
          <Field label="Nombre o razón social">
            <Input value={legal.legal_name} onChange={(e) => setLegal({ ...legal, legal_name: e.target.value })} placeholder="Ej: Inversiones TuBodega, F.P. o tu nombre" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RIF o cédula">
              <Input value={legal.legal_id} onChange={(e) => setLegal({ ...legal, legal_id: e.target.value })} placeholder="V-00000000-0" />
            </Field>
            <Field label="Ciudad">
              <Input value={legal.legal_city} onChange={(e) => setLegal({ ...legal, legal_city: e.target.value })} placeholder="Caracas" />
            </Field>
          </div>
          <Field label="Correo de contacto">
            <Input type="email" value={legal.legal_email} onChange={(e) => setLegal({ ...legal, legal_email: e.target.value })} placeholder="soporte@…" />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" onClick={() => window.open('/legal', '_blank')}>
              <ExternalLink size={16} /> Ver páginas
            </Button>
            <Button onClick={saveLegal}>
              <Save size={16} /> Guardar
            </Button>
          </div>
        </Card>
        <Card className="p-4 space-y-3">
          <p className="font-bold">Para vender</p>
          <p className="text-sm text-muted -mt-2">Tu página de presentación: muéstrala en las visitas, mándala por WhatsApp o guárdala en PDF para imprimir.</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" onClick={() => window.open('/conocer', '_blank')}>
              <ExternalLink size={16} /> Abrir
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard?.writeText(`${location.origin}/conocer`).then(() => toast('Enlace copiado', { tone: 'info' }))}>
              Copiar enlace
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={exportCsv}>
            <Download size={16} /> Descargar bodegas y pagos (Excel)
          </Button>
        </Card>
        <Card className="p-4 space-y-3">
          <p className="font-bold">Demo para tus visitas</p>
          <p className="text-sm text-muted -mt-2">Abre la app con productos venezolanos de ejemplo para mostrarla en las bodegas. No toca los datos de ningún cliente.</p>
          <Button variant="dark" className="w-full" onClick={enterDemo}>
            <PlayCircle size={17} /> Abrir demo de ventas
          </Button>
        </Card>
        <Card className="p-4 space-y-3">
          <p className="text-sm">
            Sesión: <b>{email}</b>
          </p>
          <p className="text-xs text-muted">Versión publicada: {BUILD}</p>
          <Button variant="danger" className="w-full" onClick={signOut}>
            <LogOut size={16} /> Cerrar sesión
          </Button>
        </Card>
      </div>
    </AdminPage>
  )
}
