import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, MapPin, MessageCircle, Phone, Plus, Search, Store, Target, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Chip, Empty, Field, Input, Sheet, TextArea, confirmDialog, toast } from '../components/ui'
import { friendlyError, supabase } from '../lib/cloud'
import { AdminPage } from './AdminApp'
import { LEAD_STATUS, fetchLeads, isDue, todayIso, useLoad, waLink, type Lead, type LeadStatus } from './data'

const OPEN: LeadStatus[] = ['nuevo', 'visitado', 'interesado', 'demo', 'prueba']

function statusOf(v: LeadStatus) {
  return LEAD_STATUS.find((s) => s.value === v) ?? LEAD_STATUS[0]
}

function dateLabel(iso: string) {
  const today = todayIso()
  if (iso === today) return 'Hoy'
  if (iso < today) return `Atrasado (${new Date(iso + 'T12:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })})`
  return new Date(iso + 'T12:00').toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Negocios que visitas para vender TuBodega: a quién ver, a quién volver a llamar y en qué quedaron */
export function Prospectos() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('f') as LeadStatus | 'abiertos' | 'todos') || 'abiertos'
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Partial<Lead> | null>(null)
  const { data, reload, loading } = useLoad(fetchLeads, [])
  const all = data ?? []
  const count = (s: LeadStatus) => all.filter((l) => l.status === s).length
  const due = all.filter(isDue)
  const showDue = due.length > 0 && filter === 'abiertos' && !q
  const list = all.filter(
    (l) =>
      !(showDue && isDue(l)) &&
      (filter === 'todos' || (filter === 'abiertos' ? OPEN.includes(l.status) : l.status === filter)) &&
      (!q || `${l.name} ${l.contact ?? ''} ${l.zone ?? ''} ${l.phone ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  )
  const won = count('cliente')
  const closed = won + count('perdido')

  return (
    <AdminPage
      title={`Prospectos (${all.length})`}
      right={
        <Button size="sm" onClick={() => setEditing({ status: 'nuevo' })}>
          <Plus size={16} /> Nuevo
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-2.5">
        <Kpi label="Para hoy" value={String(due.length)} tone={due.length ? 'amber' : undefined} />
        <Kpi label="En proceso" value={String(all.filter((l) => OPEN.includes(l.status)).length)} />
        <Kpi label="Cierre" value={closed ? `${Math.round((won / closed) * 100)} %` : '–'} />
      </div>

      {showDue && (
        <>
          <h2 className="font-bold mt-5 mb-2 flex items-center gap-2">
            <CalendarClock size={17} className="text-amber-600" /> Toca hoy
          </h2>
          <div className="space-y-2.5">
            {due.map((l) => (
              <LeadCard key={l.id} l={l} onOpen={() => setEditing(l)} />
            ))}
          </div>
        </>
      )}

      <div className="mt-5">
        <Input icon={<Search size={18} />} placeholder="Buscar por negocio, persona o zona" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4">
        <Chip active={filter === 'abiertos'} onClick={() => setParams({})}>
          En proceso
        </Chip>
        {LEAD_STATUS.map((s) => (
          <Chip key={s.value} active={filter === s.value} onClick={() => setParams({ f: s.value })}>
            {s.label} {count(s.value) > 0 && <span className="opacity-60">{count(s.value)}</span>}
          </Chip>
        ))}
        <Chip active={filter === 'todos'} onClick={() => setParams({ f: 'todos' })}>
          Todos
        </Chip>
      </div>
      <div className="space-y-2.5 mt-3">
        {!loading && list.length === 0 && !showDue && (
          <Empty icon={<Target size={26} />} title="Sin prospectos aquí" text="Anota cada negocio que visites: así sabes a quién volver y cuántos cierras.">
            <Button className="mt-3" onClick={() => setEditing({ status: 'nuevo' })}>
              <Plus size={16} /> Anotar el primero
            </Button>
          </Empty>
        )}
        {list.map((l) => (
          <LeadCard key={l.id} l={l} onOpen={() => setEditing(l)} />
        ))}
      </div>
      {editing && (
        <LeadSheet
          lead={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </AdminPage>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'amber' }) {
  return (
    <div className={`rounded-2xl border px-3.5 py-2.5 ${tone ? 'bg-amber-50 border-amber-100' : 'bg-surface border-line'}`}>
      <p className={`text-[11px] font-semibold ${tone ? 'text-amber-700' : 'text-muted'}`}>{label}</p>
      <p className="text-xl font-extrabold tabular">{value}</p>
    </div>
  )
}

function LeadCard({ l, onOpen }: { l: Lead; onOpen: () => void }) {
  const st = statusOf(l.status)
  return (
    <Card className="p-4" onClick={onOpen}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{l.name}</p>
          <p className="text-xs text-muted truncate">
            {[l.contact, l.zone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
          </p>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      {l.notes && <p className="text-sm text-muted mt-2 line-clamp-2">{l.notes}</p>}
      <div className="flex items-center gap-2 mt-3">
        {l.next_at && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${isDue(l) ? 'text-amber-700' : 'text-muted'}`}>
            <CalendarClock size={14} /> {dateLabel(l.next_at)}
          </span>
        )}
        <span className="flex-1" />
        {l.phone && (
          <>
            <a href={`tel:${l.phone}`} onClick={(e) => e.stopPropagation()} className="size-9 rounded-xl border border-line grid place-items-center" aria-label="Llamar">
              <Phone size={16} />
            </a>
            <a
              href={waLink(l.phone, `Hola${l.contact ? ' ' + l.contact : ''}, te escribo de TuBodega. Aquí puedes ver la app y los precios: ${location.origin}/conocer`)}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="size-9 rounded-xl border border-line grid place-items-center text-[#25d366]"
              aria-label="WhatsApp"
            >
              <MessageCircle size={16} />
            </a>
          </>
        )}
      </div>
    </Card>
  )
}

const NEXT_QUICK: [string, number][] = [
  ['Mañana', 1],
  ['En 3 días', 3],
  ['En 1 semana', 7],
]

function plusDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function LeadSheet({ lead, onClose, onSaved }: { lead: Partial<Lead>; onClose: () => void; onSaved: () => void }) {
  const nav = useNavigate()
  const [f, setF] = useState({
    name: lead.name ?? '',
    contact: lead.contact ?? '',
    phone: lead.phone ?? '',
    zone: lead.zone ?? '',
    status: (lead.status ?? 'nuevo') as LeadStatus,
    next_at: lead.next_at ?? '',
    notes: lead.notes ?? '',
  })
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v })

  const save = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_save_lead', { p: { ...f, id: lead.id ?? null } })
    setBusy(false)
    if (error) {
      toast(friendlyError(error), { tone: 'error' })
      return null
    }
    return data as Lead
  }

  return (
    <Sheet open onClose={onClose} title={lead.id ? f.name || 'Prospecto' : 'Nuevo prospecto'} tall>
      <div className="space-y-4">
        <Field label="Negocio">
          <Input autoFocus={!lead.id} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Abasto La Fe" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Persona">
            <Input value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Sr. José" />
          </Field>
          <Field label="WhatsApp">
            <Input inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0414-0000000" />
          </Field>
        </div>
        <Field label="Zona o dirección">
          <Input icon={<MapPin size={16} />} value={f.zone} onChange={(e) => set('zone', e.target.value)} placeholder="Calle 5, frente a la plaza" />
        </Field>
        <div>
          <p className="text-[13px] font-semibold text-muted mb-1.5">¿En qué quedó?</p>
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUS.map((s) => (
              <Chip key={s.value} active={f.status === s.value} onClick={() => set('status', s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-muted mb-1.5">Volver a contactar</p>
          <div className="flex flex-wrap gap-2">
            {NEXT_QUICK.map(([label, n]) => (
              <Chip key={label} active={f.next_at === plusDays(n)} onClick={() => set('next_at', plusDays(n))}>
                {label}
              </Chip>
            ))}
            <Chip active={!f.next_at} onClick={() => set('next_at', '')}>
              Sin fecha
            </Chip>
          </div>
          <Input type="date" className="mt-2" value={f.next_at} onChange={(e) => set('next_at', e.target.value)} />
        </div>
        <Field label="Notas">
          <TextArea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Qué le interesó, qué objeción puso, cuántos empleados tiene…" />
        </Field>
        <Button
          size="lg"
          className="w-full"
          disabled={busy || f.name.trim().length < 2}
          onClick={async () => {
            if (await save()) {
              toast('Prospecto guardado')
              onSaved()
            }
          }}
        >
          Guardar
        </Button>
        {!lead.store_id && f.status !== 'perdido' && (
          <Button
            variant="soft"
            className="w-full"
            disabled={busy || f.name.trim().length < 2}
            onClick={async () => {
              const saved = await save()
              if (!saved) return
              const p = new URLSearchParams({ nueva: '1', nombre: saved.name, dueno: saved.contact ?? '', tel: saved.phone ?? '', lead: saved.id })
              nav(`/admin/bodegas?${p}`)
            }}
          >
            <Store size={16} /> Darle la prueba de 7 días (crear bodega)
          </Button>
        )}
        {lead.store_id && (
          <Button variant="outline" className="w-full" onClick={() => nav(`/admin/bodegas/${lead.store_id}`)}>
            <Store size={16} /> Ver su bodega
          </Button>
        )}
        {lead.id && (
          <Button
            variant="ghost"
            className="w-full text-red-500"
            onClick={async () => {
              if (!(await confirmDialog(`¿Borrar ${lead.name}?`, { ok: 'Borrar', danger: true }))) return
              const { error } = await supabase.rpc('admin_delete_lead', { p_id: lead.id })
              if (error) return toast(friendlyError(error), { tone: 'error' })
              toast('Prospecto borrado')
              onSaved()
            }}
          >
            <Trash2 size={16} /> Borrar prospecto
          </Button>
        )}
      </div>
    </Sheet>
  )
}
