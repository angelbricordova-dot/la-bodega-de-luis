import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, UserPlus } from 'lucide-react'
import { db } from '../db'
import { Button, Field, Input, Sheet, toast } from './ui'

export function CustomerPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: number | undefined) => void }) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), [])
  const list = (customers ?? []).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone?.includes(q))

  const create = async () => {
    if (!name.trim()) return
    const id = await db.customers.add({ name: name.trim(), phone: phone.trim() || undefined, createdAt: Date.now() })
    toast('Cliente creado')
    setCreating(false)
    setName('')
    setPhone('')
    onPick(id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'Nuevo cliente' : 'Elegir cliente'} tall={!creating}>
      {creating ? (
        <div className="space-y-4">
          <Field label="Nombre">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Señora María" />
          </Field>
          <Field label="Teléfono (para enviar tickets por WhatsApp)">
            <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0414-0000000" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setCreating(false)}>
              Volver
            </Button>
            <Button onClick={create} disabled={!name.trim()}>
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 sticky top-0 bg-surface pb-3">
            <Input className="flex-1" icon={<Search size={18} />} placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="soft" className="h-12" onClick={() => setCreating(true)}>
              <UserPlus size={18} /> Nuevo
            </Button>
          </div>
          <button
            onClick={() => {
              onPick(undefined)
              onClose()
            }}
            className="w-full text-left px-4 py-3 rounded-2xl text-muted font-semibold hover:bg-canvas"
          >
            Sin cliente
          </button>
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onPick(c.id)
                onClose()
              }}
              className="w-full text-left px-4 py-3 rounded-2xl hover:bg-canvas flex items-center gap-3"
            >
              <span className="size-10 rounded-full bg-brand-50 text-brand-700 font-bold grid place-items-center">{c.name[0]?.toUpperCase()}</span>
              <span>
                <span className="block font-semibold">{c.name}</span>
                {c.phone && <span className="block text-xs text-muted">{c.phone}</span>}
              </span>
            </button>
          ))}
        </>
      )}
    </Sheet>
  )
}
