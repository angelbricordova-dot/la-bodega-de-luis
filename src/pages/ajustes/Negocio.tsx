import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { updateSettings, type Settings } from '../../db'
import { Button, Card, Field, Input, toast } from '../../components/ui'
import { useSettings } from '../../lib/hooks'
import { fileToThumb } from '../../lib/image'

export default function Negocio() {
  const s = useSettings()
  const [b, setB] = useState<Settings['business']>(s.business)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => setB(s.business), [s.business])
  const set = (k: keyof Settings['business'], v: string | undefined) => setB({ ...b, [k]: v })
  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center gap-4">
        <button onClick={() => file.current?.click()} className="relative size-20 rounded-2xl border-2 border-dashed border-line grid place-items-center overflow-hidden bg-canvas shrink-0">
          {b.logo ? <img src={b.logo} alt="" className="w-full h-full object-contain" /> : <ImagePlus size={24} className="text-muted" />}
        </button>
        <div className="flex-1">
          <p className="font-bold">Logo del negocio</p>
          <p className="text-xs text-muted">Sale impreso arriba del ticket. Mejor en blanco y negro.</p>
          {b.logo && (
            <button onClick={() => set('logo', undefined)} className="text-xs font-semibold text-red-500 mt-1 flex items-center gap-1">
              <X size={12} /> Quitar logo
            </button>
          )}
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) set('logo', await fileToThumb(f, 400, 0.9))
          e.target.value = ''
        }} />
      </Card>
      <Card className="p-4 space-y-4">
        <Field label="Nombre del negocio"><Input value={b.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="RIF"><Input value={b.rif} onChange={(e) => set('rif', e.target.value)} placeholder="J-12345678-9" /></Field>
        <Field label="Dirección"><Input value={b.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Teléfono"><Input inputMode="tel" value={b.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Mensaje al final del ticket"><Input value={b.footer} onChange={(e) => set('footer', e.target.value)} /></Field>
      </Card>
      <Button size="lg" className="w-full" onClick={async () => { await updateSettings({ business: b }); toast('Datos guardados') }}>Guardar</Button>
    </div>
  )
}
