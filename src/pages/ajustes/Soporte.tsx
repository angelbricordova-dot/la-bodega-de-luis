import { Bluetooth, Download, MessageCircle, ScanBarcode, Smartphone } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { useSettings } from '../../lib/hooks'

const TIPS = [
  { icon: Download, t: 'Instalar en el teléfono', d: 'Abre la app en Chrome, toca ⋮ y luego "Agregar a pantalla principal" o "Instalar app". Queda como una app normal y funciona sin internet.' },
  { icon: Bluetooth, t: 'Conectar la impresora', d: 'Enciende la impresora térmica, ve a Ajustes → Impresión → Conectar y elígela en la lista. Usa Chrome en Android.' },
  { icon: ScanBarcode, t: 'Escanear productos', d: 'En Venta apunta la cámara al código. También sirve un lector de códigos USB o Bluetooth.' },
  { icon: Smartphone, t: 'Productos sin código', d: 'Al crear el producto toca la varita para generar un código, luego imprímelo en Inventario → Códigos de barras y pégalo.' },
]

export default function Soporte() {
  const s = useSettings()
  return (
    <div className="space-y-3">
      {TIPS.map(({ icon: Icon, t, d }) => (
        <Card key={t} className="p-4 flex gap-3">
          <span className="size-10 rounded-xl bg-cyan-50 text-cyan-600 grid place-items-center shrink-0"><Icon size={19} /></span>
          <span><span className="block font-bold">{t}</span><span className="block text-sm text-muted">{d}</span></span>
        </Card>
      ))}
      {s.supportPhone && (
        <Button size="lg" className="w-full !bg-[#25d366]" onClick={() => window.open(`https://wa.me/${s.supportPhone.replace(/\D/g, '').replace(/^0/, '58')}?text=${encodeURIComponent(`Hola, necesito ayuda con la app de ${s.business.name}`)}`, '_blank')}>
          <MessageCircle size={19} /> Escribir a soporte por WhatsApp
        </Button>
      )}
    </div>
  )
}
