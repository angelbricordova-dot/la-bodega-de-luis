import { useEffect, useState } from 'react'
import { LogOut, PlayCircle, Save } from 'lucide-react'
import { Button, Card, Field, Input, TextArea, toast } from '../components/ui'
import { enterDemo, setConfig, signOut, useAccount } from '../lib/account'
import { friendlyError, supabase } from '../lib/cloud'
import { AdminPage } from './AdminApp'

export function AdminAjustes() {
  const email = useAccount((s) => (s.account?.mode === 'admin' ? s.account.email : ''))
  const [f, setF] = useState({ pago_movil: '', zelle: '', binance: '', whatsapp: '' })
  useEffect(() => {
    supabase
      .from('app_config')
      .select('pago_movil, zelle, binance, whatsapp')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => data && setF({ pago_movil: data.pago_movil ?? '', zelle: data.zelle ?? '', binance: data.binance ?? '', whatsapp: data.whatsapp ?? '' }))
  }, [])
  const save = async () => {
    const { error } = await supabase.from('app_config').update({ ...f, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) return toast(friendlyError(error), { tone: 'error' })
    setConfig(f)
    toast('Datos de cobro guardados')
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
          <Button variant="danger" className="w-full" onClick={signOut}>
            <LogOut size={16} /> Cerrar sesión
          </Button>
        </Card>
      </div>
    </AdminPage>
  )
}
