import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Phone, Plus, Search, Trash2 } from 'lucide-react'
import { db, type Customer } from '../../db'
import { Button, Card, Empty, Field, Input, Sheet, TextArea, confirmDialog, toast } from '../../components/ui'
import { usd } from '../../lib/money'

export default function Clientes() {
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Partial<Customer> | null>(null)
  const data = useLiveQuery(async () => {
    const cs = await db.customers.orderBy('name').toArray()
    const sales = await db.sales.toArray()
    return cs.map((c) => {
      const mine = sales.filter((x) => x.customerId === c.id && x.status !== 'anulada')
      return { c, bought: mine.reduce((a, x) => a + x.total, 0), debt: mine.reduce((a, x) => a + x.balance, 0), visits: mine.length }
    })
  }, [])
  const list = (data ?? []).filter((d) => !q || d.c.name.toLowerCase().includes(q.toLowerCase()) || d.c.phone?.includes(q))
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input className="flex-1" icon={<Search size={18} />} placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button className="h-12" onClick={() => setEdit({})}><Plus size={18} /> Nuevo</Button>
      </div>
      {list.length === 0 && <Empty icon={<Search size={24} />} title="Sin clientes" />}
      {list.map(({ c, bought, debt, visits }) => (
        <Card key={c.id} className="p-4 flex items-center gap-3" onClick={() => setEdit(c)}>
          <span className="size-11 rounded-full bg-brand-50 text-brand-700 font-extrabold grid place-items-center">{c.name[0]?.toUpperCase()}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{c.name}</p>
            <p className="text-xs text-muted flex items-center gap-1">{c.phone && <><Phone size={11} /> {c.phone} · </>}{visits} compras · {usd(bought)}</p>
          </div>
          {debt > 0 && <span className="text-sm font-bold text-fiado tabular">Debe {usd(debt)}</span>}
        </Card>
      ))}
      {edit && <CustomerSheet customer={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function CustomerSheet({ customer, onClose }: { customer: Partial<Customer>; onClose: () => void }) {
  const [c, setC] = useState(customer)
  const save = async () => {
    if (!c.name?.trim()) return
    if (c.id) await db.customers.update(c.id, c)
    else await db.customers.add({ ...c, name: c.name.trim(), createdAt: Date.now() } as Customer)
    toast('Cliente guardado')
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={c.id ? 'Editar cliente' : 'Nuevo cliente'}>
      <div className="space-y-4">
        <Field label="Nombre"><Input value={c.name ?? ''} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
        <Field label="Teléfono"><Input inputMode="tel" value={c.phone ?? ''} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="0414-0000000" /></Field>
        <Field label="Cédula"><Input value={c.idNumber ?? ''} onChange={(e) => setC({ ...c, idNumber: e.target.value })} placeholder="V-00000000" /></Field>
        <Field label="Dirección"><Input value={c.address ?? ''} onChange={(e) => setC({ ...c, address: e.target.value })} /></Field>
        <Field label="Notas"><TextArea value={c.notes ?? ''} onChange={(e) => setC({ ...c, notes: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          {c.id ? (
            <Button variant="danger" onClick={async () => {
              if (await confirmDialog('¿Eliminar cliente?', { text: 'Sus ventas quedan en el historial.', ok: 'Eliminar', danger: true })) {
                await db.customers.delete(c.id!)
                onClose()
              }
            }}><Trash2 size={16} /> Eliminar</Button>
          ) : <Button variant="outline" onClick={onClose}>Cancelar</Button>}
          <Button onClick={save} disabled={!c.name?.trim()}>Guardar</Button>
        </div>
      </div>
    </Sheet>
  )
}
