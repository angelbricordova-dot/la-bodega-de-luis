import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CreditCard, X } from 'lucide-react'
import { Badge, Button, Card, Empty, Segmented, toast } from '../components/ui'
import { friendlyError, supabase } from '../lib/cloud'
import { bs, usd } from '../lib/money'
import { PROVIDER_METHODS } from '../pages/ajustes/MiPlan'
import { AdminPage } from './AdminApp'
import { fetchPayments, useLoad, type AdminPayment } from './data'

export function Pagos({ onChange }: { onChange: () => void }) {
  const [tab, setTab] = useState<'pendiente' | 'todos'>('pendiente')
  const { data, reload, loading } = useLoad(() => fetchPayments(tab === 'pendiente' ? { status: 'pendiente' } : {}), [tab])
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const cobradoMes = (data ?? []).filter((p) => p.status === 'aprobado' && new Date(p.reviewed_at ?? p.created_at) >= monthStart).reduce((a, p) => a + Number(p.amount_usd), 0)

  const review = async (p: AdminPayment, approve: boolean) => {
    const note = approve ? null : prompt('¿Por qué se rechaza? (lo verá el cliente)') || 'No se encontró el pago'
    const { error } = await supabase.rpc('admin_review_payment', { p_id: p.id, p_approve: approve, p_note: note })
    if (error) return toast(friendlyError(error), { tone: 'error' })
    toast(approve ? `Aprobado: ${p.stores?.name} +${p.months * 30} días` : 'Pago rechazado', { tone: approve ? 'ok' : 'info' })
    reload()
    onChange()
  }

  return (
    <AdminPage title="Pagos">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pendiente', label: 'Por revisar' },
          { value: 'todos', label: 'Historial' },
        ]}
      />
      {tab === 'todos' && (
        <Card className="p-4 mt-3">
          <p className="text-xs text-muted font-semibold">Cobrado este mes</p>
          <p className="text-2xl font-extrabold tabular">{usd(cobradoMes)}</p>
        </Card>
      )}
      <div className="space-y-2.5 mt-3">
        {!loading && data?.length === 0 && (
          <Empty icon={<CreditCard size={26} />} title={tab === 'pendiente' ? 'Nada por revisar' : 'Sin pagos'} text="Los pagos que reporten las bodegas aparecen aquí." />
        )}
        {data?.map((p) => (
          <PaymentCard key={p.id} p={p} onReview={tab === 'pendiente' ? review : undefined} />
        ))}
      </div>
    </AdminPage>
  )
}

function PaymentCard({ p, onReview }: { p: AdminPayment; onReview?: (p: AdminPayment, approve: boolean) => void }) {
  const nav = useNavigate()
  return (
    <Card className="p-4">
      <div className="flex justify-between gap-3">
        <button className="text-left min-w-0" onClick={() => nav(`/admin/bodegas/${p.store_id}`)}>
          <p className="font-bold truncate">{p.stores?.name ?? 'Bodega'}</p>
          <p className="text-xs text-muted">{new Date(p.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</p>
        </button>
        <div className="text-right shrink-0">
          <p className="text-xl font-extrabold tabular">{usd(p.amount_usd)}</p>
          {p.amount_bs != null && <p className="text-xs text-muted tabular">{bs(p.amount_bs)}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5 text-xs">
        <span className="px-2 py-1 rounded-lg bg-canvas font-semibold">{PROVIDER_METHODS[p.method] ?? p.method}</span>
        <span className="px-2 py-1 rounded-lg bg-canvas font-semibold">{p.months} mes(es)</span>
        {p.reference && <span className="px-2 py-1 rounded-lg bg-canvas font-semibold">Ref {p.reference}</span>}
        {!onReview && <Badge tone={p.status === 'aprobado' ? 'green' : p.status === 'rechazado' ? 'red' : 'amber'}>{p.status}</Badge>}
      </div>
      {p.note && <p className="text-sm text-muted mt-2">“{p.note}”</p>}
      {p.review_note && !onReview && <p className="text-xs text-muted mt-1">Nota: {p.review_note}</p>}
      {onReview && (
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <Button variant="danger" onClick={() => onReview(p, false)}>
            <X size={16} /> Rechazar
          </Button>
          <Button onClick={() => onReview(p, true)}>
            <Check size={16} /> Aprobar
          </Button>
        </div>
      )}
    </Card>
  )
}
