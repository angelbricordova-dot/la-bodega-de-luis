import { useEffect, useRef, useState } from 'react'
import { Database, Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { buildBackup, restoreBackup } from '../../lib/backup'
import { Button, Card, confirmDialog, toast } from '../../components/ui'
import { loadDemoData, wipeAll } from '../../lib/seed'
import { useAccount } from '../../lib/account'

export async function exportBackup() {
  const blob = new Blob([JSON.stringify(await buildBackup())], { type: 'application/json' })
  const name = `respaldo-bodega-${new Date().toISOString().slice(0, 10)}.json`
  const file = new File([blob], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Respaldo de la bodega' })
      return
    } catch {
      /* cancelado: descarga normal */
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

async function importBackup(file: File) {
  await restoreBackup(JSON.parse(await file.text()))
}

export default function Avanzado() {
  const isStore = useAccount((a) => a.account?.mode === 'store')
  const file = useRef<HTMLInputElement>(null)
  const [usage, setUsage] = useState('')
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage(`${((e.usage ?? 0) / 1048576).toFixed(1)} MB usados`)).catch(() => {})
  }, [])
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="font-bold flex items-center gap-2"><Database size={18} /> Tus datos</p>
        <p className="text-sm text-muted mt-1">
          Todo se guarda en este teléfono y funciona sin internet. Haz un respaldo cada semana y guárdalo en WhatsApp o Drive por si se pierde o se daña el teléfono. {usage && `(${usage})`}
        </p>
        <div className="grid gap-2.5 mt-4">
          <Button onClick={() => exportBackup().then(() => toast('Respaldo creado'))}><Download size={17} /> Crear respaldo</Button>
          <Button variant="outline" onClick={() => file.current?.click()}><Upload size={17} /> Restaurar respaldo</Button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            if (!(await confirmDialog('¿Restaurar este respaldo?', { text: 'Se reemplazarán TODOS los datos actuales.', ok: 'Restaurar', danger: true }))) return
            try {
              await importBackup(f)
              toast('Respaldo restaurado')
            } catch (err) {
              toast((err as Error).message, { tone: 'error' })
            }
          }} />
        </div>
      </Card>
      <Card className="p-4">
        <p className="font-bold">Zona de peligro</p>
        <div className="grid gap-2.5 mt-3">
          {!isStore && <Button variant="outline" onClick={async () => {
            if (await confirmDialog('¿Cargar datos de ejemplo?', { text: 'Se borran los datos actuales y se cargan productos de muestra.', ok: 'Cargar', danger: true })) {
              await loadDemoData()
              toast('Datos de ejemplo cargados')
            }
          }}><RotateCcw size={17} /> Cargar datos de ejemplo</Button>}
          <Button variant="danger" onClick={async () => {
            if (!(await confirmDialog('¿Borrar todo y empezar de cero?', { text: 'Se eliminan productos, ventas, clientes y fiados. Haz un respaldo antes.', ok: 'Borrar todo', danger: true }))) return
            await wipeAll()
            toast('Datos borrados', { tone: 'info' })
          }}><Trash2 size={17} /> Borrar todo y empezar de cero</Button>
        </div>
      </Card>
    </div>
  )
}
