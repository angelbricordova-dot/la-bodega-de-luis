import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { db } from '../../db'
import { Button, Card, confirmDialog } from '../../components/ui'
import { NewCategorySheet } from '../ProductForm'

export default function Categorias() {
  const [open, setOpen] = useState(false)
  const data = useLiveQuery(async () => {
    const cats = await db.categories.toArray()
    const products = await db.products.toArray()
    return cats.map((c) => ({ c, n: products.filter((p) => p.categoryId === c.id).length }))
  }, [])
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => setOpen(true)}><Plus size={18} /> Nueva categoría</Button>
      {data?.map(({ c, n }) => (
        <Card key={c.id} className="p-3.5 flex items-center gap-3">
          <span className="size-11 rounded-2xl bg-canvas grid place-items-center text-2xl">{c.emoji}</span>
          <span className="flex-1">
            <span className="block font-bold">{c.name}</span>
            <span className="block text-xs text-muted">{n} productos</span>
          </span>
          <button className="p-2 text-muted" aria-label="Eliminar" onClick={async () => {
            if (!(await confirmDialog(`¿Eliminar "${c.name}"?`, { text: 'Los productos quedan sin categoría.', ok: 'Eliminar', danger: true }))) return
            await db.products.where('categoryId').equals(c.id!).modify({ categoryId: undefined })
            await db.categories.delete(c.id!)
          }}><Trash2 size={17} /></button>
        </Card>
      ))}
      <NewCategorySheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
