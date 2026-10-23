import { ChevronRight, Cookie, Download, FileText, ShieldCheck, Trash2 } from 'lucide-react'
import { Button, Card, confirmDialog, toast } from '../../components/ui'
import { useSettings } from '../../lib/hooks'
import { useAccount } from '../../lib/account'
import { emailToLogin } from '../../lib/cloud'
import { TERMS_UPDATED, TERMS_VERSION, waUrl } from '../../lib/legal'
import { exportBackup } from './Avanzado'

const LINKS = [
  { href: '/legal/terminos', label: 'Términos y condiciones', icon: FileText },
  { href: '/legal/privacidad', label: 'Política de privacidad', icon: ShieldCheck },
  { href: '/legal/cookies', label: 'Cookies y almacenamiento', icon: Cookie },
]

export default function LegalPrivacidad() {
  const s = useSettings()
  const { account, license, config } = useAccount()
  const phone = config?.whatsapp || s.supportPhone
  const accepted = license?.termsVersion === TERMS_VERSION
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} target="_blank" className="flex items-center gap-3 px-4 py-3.5 border-t border-line first:border-0">
            <Icon size={19} className="text-brand-600" />
            <span className="flex-1 font-semibold">{label}</span>
            <ChevronRight size={18} className="text-muted" />
          </a>
        ))}
      </Card>
      {accepted && <p className="text-xs text-muted px-1">Aceptaste los Términos vigentes, del {TERMS_UPDATED}.</p>}

      <Card className="p-4">
        <p className="font-bold">Tus datos son tuyos</p>
        <p className="text-sm text-muted mt-1">Descarga una copia completa: productos, ventas, clientes, fiados y caja. Sirve también como respaldo.</p>
        <Button className="w-full mt-3" onClick={() => exportBackup().then(() => toast('Copia descargada'))}>
          <Download size={17} /> Descargar mis datos
        </Button>
      </Card>

      <Card className="p-4">
        <p className="font-bold">Borrar mi cuenta</p>
        <p className="text-sm text-muted mt-1">
          Le pides a TuBodega que borre tu bodega y todos sus datos de la nube. Se hace en un máximo de 15 días hábiles. Descarga tus datos antes: no se pueden recuperar.
        </p>
        <Button
          variant="danger"
          className="w-full mt-3"
          disabled={!phone}
          onClick={async () => {
            const ok = await confirmDialog('¿Pedir que borren tu cuenta?', { text: 'Se abrirá WhatsApp con el mensaje listo para enviar a soporte.', ok: 'Abrir WhatsApp', danger: true })
            if (!ok) return
            const who = account?.mode === 'store' ? emailToLogin(account.email) : ''
            window.open(waUrl(phone, `Hola, soy ${who} de ${license?.store?.name ?? s.business.name}. Quiero que borren mi cuenta de TuBodega y todos sus datos.`), '_blank')
          }}
        >
          <Trash2 size={17} /> Pedir que borren mi cuenta
        </Button>
        {!phone && <p className="text-xs text-muted mt-2">Escríbele a quien te instaló la app.</p>}
      </Card>
    </div>
  )
}
