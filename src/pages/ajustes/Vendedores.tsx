import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Trash2 } from 'lucide-react'
import { db, updateSettings } from '../../db'
import { Button, Card, Field, Input, confirmDialog, cx, toast } from '../../components/ui'
import { useSettings } from '../../lib/hooks'

export default function Vendedores() {
  const s = useSettings()
  const [name, setName] = useState('')
  const sellers = useLiveQuery(() => db.sellers.toArray(), [])
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Quien esté vendiendo sale en el ticket como "Atendido por". Toca un nombre para elegirlo.</p>
      <div className="space-y-2">
        {sellers?.map((x) => (
          <Card key={x.id} className={cx('p-3.5 flex items-center gap-3', s.currentSeller === x.name && 'border-brand-400 ring-2 ring-brand-100')} onClick={() => { updateSettings({ currentSeller: x.name }); toast(`Vendiendo: ${x.name}`) }}>
            <span className="size-10 rounded-full bg-teal-50 text-teal-700 font-extrabold grid place-items-center">{x.name[0]?.toUpperCase()}</span>
            <span className="flex-1 font-bold">{x.name}</span>
            {s.currentSeller === x.name && <span className="text-brand-600 flex items-center gap-1 text-sm font-bold"><Check size={16} /> Activo</span>}
            <button onClick={async (e) => {
              e.stopPropagation()
              if (await confirmDialog(`¿Eliminar a ${x.name}?`, { ok: 'Eliminar', danger: true })) await db.sellers.delete(x.id!)
            }} className="p-2 text-muted" aria-label="Eliminar"><Trash2 size={16} /></button>
          </Card>
        ))}
      </div>
      <Card className="p-4 flex gap-2 items-end">
        <Field label="Nuevo vendedor" className="flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" /></Field>
        <Button className="h-12" disabled={!name.trim()} onClick={async () => { await db.sellers.add({ name: name.trim(), active: true }); setName(''); toast('Vendedor agregado') }}><Plus size={18} /></Button>
      </Card>
    </div>
  )
}
