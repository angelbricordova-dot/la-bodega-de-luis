import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateSettings } from '../../db'
import { Button, Card, Field, Input, toast } from '../../components/ui'
import { useSettings } from '../../lib/hooks'
import { parseNum } from '../../lib/money'

export default function Admin() {
  const s = useSettings()
  const nextSale = (useLiveQuery(() => db.sales.orderBy('number').last(), [])?.number ?? 0) + 1
  const nextQuote = (useLiveQuery(() => db.quotes.orderBy('number').last(), [])?.number ?? 0) + 1
  const [pin, setPin] = useState('')
  const [days, setDays] = useState(String(s.quoteValidityDays))
  const [support, setSupport] = useState(s.supportPhone)
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="font-bold">PIN de administrador</p>
        <p className="text-sm text-muted -mt-2">Protege Compras, Finanzas, Respaldo y Admin para que los empleados no vean las ganancias. {s.adminPin ? 'Hay un PIN activo.' : 'Sin PIN.'}</p>
        <Input type="password" inputMode="numeric" placeholder="Nuevo PIN (4 a 6 números)" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" disabled={!s.adminPin} onClick={async () => { await updateSettings({ adminPin: '' }); toast('PIN eliminado', { tone: 'info' }) }}>Quitar PIN</Button>
          <Button disabled={pin.length < 4} onClick={async () => { await updateSettings({ adminPin: pin }); setPin(''); toast('PIN guardado') }}>Guardar PIN</Button>
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <Field label="Días de validez de las cotizaciones"><Input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
        <Field label="WhatsApp de soporte técnico" hint="El número de quien instaló la app. Aparece en Ajustes → Soporte."><Input inputMode="tel" value={support} onChange={(e) => setSupport(e.target.value)} placeholder="0414-0000000" /></Field>
        <Button className="w-full" onClick={async () => { await updateSettings({ quoteValidityDays: Math.max(1, parseNum(days)), supportPhone: support }); toast('Guardado') }}>Guardar</Button>
      </Card>
      <p className="text-xs text-muted text-center">Próximo ticket #{String(nextSale).padStart(6, '0')} · Próxima cotización #{String(nextQuote).padStart(6, '0')}</p>
    </div>
  )
}
