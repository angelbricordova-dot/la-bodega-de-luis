import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Ban, CalendarPlus, Copy, KeyRound, LogOut, MessageCircle, Phone, Plus, RotateCcw, Save, Search, Store, Trash2, UserX } from 'lucide-react'
import { Badge, Button, Card, Chip, Empty, Field, Input, Segmented, Sheet, TextArea, confirmDialog, cx, toast } from '../components/ui'
import { friendlyError, emailToLogin, supabase } from '../lib/cloud'
import type { LicenseMode } from '../lib/license'
import { parseNum, usd } from '../lib/money'
import { PROVIDER_METHODS } from '../pages/ajustes/MiPlan'
import { AdminPage } from './AdminApp'
import { MODE_LABEL, MODE_TONE, activationMessage, fetchPayments, fetchStores, lastSeenText, storeMode, useLoad, waLink, type AdminStore } from './data'

const FILTERS: { value: LicenseMode | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'prueba', label: 'En prueba' },
  { value: 'activa', label: 'Al día' },
  { value: 'aviso', label: 'Por vencer' },
  { value: 'vencida', label: 'Vencidas' },
  { value: 'suspendida', label: 'Suspendidas' },
]

export function Bodegas() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const filter = (params.get('f') as LicenseMode | 'todas') || 'todas'
  const [q, setQ] = useState('')
  const { data, reload, loading } = useLoad(fetchStores, [])
  const list = (data ?? [])
    .map((s) => ({ s, l: storeMode(s) }))
    .filter(({ s, l }) => (filter === 'todas' || l.mode === filter || (filter === 'aviso' && l.mode === 'gracia')) && (!q || `${s.name} ${s.owner_name ?? ''} ${s.phone ?? ''}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <AdminPage
      title={`Bodegas (${data?.length ?? 0})`}
      right={
        <Button size="sm" onClick={() => setParams({ nueva: '1' })}>
          <Plus size={16} /> Nueva
        </Button>
      }
    >
      <Input icon={<Search size={18} />} placeholder="Buscar por nombre, dueño o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4">
        {FILTERS.map((f) => (
          <Chip key={f.value} active={filter === f.value} onClick={() => setParams(f.value === 'todas' ? {} : { f: f.value })}>
            {f.label}
          </Chip>
        ))}
      </div>
      <div className="space-y-2.5 mt-3">
        {!loading && list.length === 0 && <Empty icon={<Store size={26} />} title="Sin bodegas aquí" text="Crea la primera con el botón Nueva." />}
        {list.map(({ s, l }) => (
          <Card key={s.id} className="p-4" onClick={() => nav(`/admin/bodegas/${s.id}`)}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{s.name}</p>
                <p className="text-xs text-muted truncate">
                  {s.owner_name ?? 'Sin dueño'} · {s.plan === 'pro' ? 'Pro' : 'Básico'} {usd(s.monthly_price)}
                </p>
              </div>
              <Badge tone={MODE_TONE[l.mode]}>{MODE_LABEL[l.mode]}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <Mini label="Vence" value={new Date(s.paid_until).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })} />
              <Mini label="Ventas mes" value={usd(s.stats?.total_mes ?? 0)} />
              <Mini label="Actividad" value={lastSeenText(s.last_seen_at).replace('Sin conexión hace ', 'hace ').replace('Conectada ', '')} />
            </div>
          </Card>
        ))}
      </div>
      {params.get('nueva') && (
        <NuevaBodega
          onClose={() => setParams({})}
          onCreated={(id) => {
            reload()
            nav(`/admin/bodegas/${id}?nueva=1`)
          }}
        />
      )}
    </AdminPage>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas px-2.5 py-1.5 min-w-0">
      <p className="text-[10px] text-muted font-semibold">{label}</p>
      <p className="font-bold truncate tabular">{value}</p>
    </div>
  )
}

function NuevaBodega({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')
  const [phone, setPhone] = useState('')
  const [plan, setPlan] = useState<'basico' | 'pro'>('basico')
  const [price, setPrice] = useState('10')
  const [trial, setTrial] = useState('15')
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)
  const create = async () => {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('admin_create_store', {
        p_name: name,
        p_owner: owner || null,
        p_phone: phone || null,
        p_plan: plan,
        p_price: parseNum(price),
        p_trial_days: Math.round(parseNum(trial)),
        p_referred_code: ref || null,
      })
      if (error) throw error
      toast('Bodega creada')
      onCreated((data as AdminStore).id)
    } catch (e) {
      toast(friendlyError(e), { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open onClose={onClose} title="Nueva bodega">
      <div className="space-y-4">
        <Field label="Nombre del negocio">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Abasto Don Pedro" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dueño">
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0414-0000000" />
          </Field>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-muted mb-1.5">Plan</p>
          <Segmented
            value={plan}
            onChange={(p) => {
              setPlan(p)
              setPrice(p === 'pro' ? '18' : '10')
            }}
            options={[
              { value: 'basico', label: 'Básico' },
              { value: 'pro', label: 'Pro' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio al mes ($)">
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Días de prueba">
            <Input inputMode="numeric" value={trial} onChange={(e) => setTrial(e.target.value)} />
          </Field>
        </div>
        <Field label="Código de quien la refirió (opcional)" hint="Esa bodega gana 1 mes gratis cuando esta pague su primer mes.">
          <Input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="ABCDE" maxLength={5} />
        </Field>
        <Button size="lg" className="w-full" disabled={busy || name.trim().length < 2} onClick={create}>
          Crear bodega y código de activación
        </Button>
      </div>
    </Sheet>
  )
}

export function BodegaDetalle({ onChange }: { onChange: () => void }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { data: stores, reload } = useLoad(fetchStores, [])
  const payments = useLoad(() => fetchPayments({ storeId: id }), [id])
  const members = useLoad(async () => {
    const { data, error } = await supabase.rpc('admin_store_members', { p_id: id })
    if (error) throw error
    return data as { user_id: string; email: string; role: string; last_sign_in_at: string | null }[]
  }, [id])
  const [recording, setRecording] = useState(false)
  const store = stores?.find((s) => s.id === id)
  if (!stores) return <AdminPage title="Cargando…">{null}</AdminPage>
  if (!store) return <AdminPage title="No encontrada">{null}</AdminPage>
  const l = storeMode(store)
  const referrer = stores.find((s) => s.id === store.referred_by)
  const referred = stores.filter((s) => s.referred_by === store.id)

  const call = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    const { error } = await fn()
    if (error) return toast(friendlyError(error), { tone: 'error' })
    toast(ok)
    reload()
    payments.reload()
    members.reload()
    onChange()
  }

  const newCode = () => call(() => supabase.rpc('admin_new_activation_code', { p_id: store.id }), 'Código nuevo generado')

  return (
    <AdminPage
      title={store.name}
      right={
        <button onClick={() => nav('/admin/bodegas')} className="size-10 grid place-items-center rounded-xl text-muted" aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
      }
    >
      <div className="space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Badge tone={MODE_TONE[l.mode]}>{MODE_LABEL[l.mode]}</Badge>
            <span className="text-xs text-muted">{lastSeenText(store.last_seen_at)}</span>
          </div>
          <p className="text-sm font-semibold mt-3">{l.message}</p>
          <p className="text-xs text-muted mt-1">
            Pagado hasta {new Date(store.paid_until).toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <Button onClick={() => setRecording(true)}>
              <CalendarPlus size={16} /> Registrar pago
            </Button>
            <Button variant="outline" onClick={async () => (await confirmDialog('¿Regalar 1 mes sin pago?', { ok: 'Extender' })) && call(() => supabase.rpc('admin_extend', { p_id: store.id, p_months: 1 }), '+1 mes')}>
              +1 mes cortesía
            </Button>
            {store.status === 'suspended' || store.status === 'cancelled' ? (
              <Button variant="soft" onClick={() => call(() => supabase.rpc('admin_update_store', { p_id: store.id, p_patch: { status: 'active' } }), 'Bodega reactivada')}>
                <RotateCcw size={16} /> Reactivar
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={async () =>
                  (await confirmDialog(`¿Suspender ${store.name}?`, { text: 'Quedará en modo solo lectura hasta que la reactives. No se borra nada.', ok: 'Suspender', danger: true })) &&
                  call(() => supabase.rpc('admin_update_store', { p_id: store.id, p_patch: { status: 'suspended' } }), 'Bodega suspendida')
                }
              >
                <Ban size={16} /> Suspender
              </Button>
            )}
            <Button variant="outline" onClick={() => window.open(waLink(store.phone, `Hola ${store.owner_name ?? ''}, te escribo de TuBodega. ${l.message}`), '_blank')}>
              <MessageCircle size={16} className="text-[#25d366]" /> WhatsApp
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Ventas hoy" value={`${store.stats?.ventas_hoy ?? 0} · ${usd(store.stats?.total_hoy ?? 0)}`} />
          <Stat label="Ventas del mes" value={`${store.stats?.ventas_mes ?? 0} · ${usd(store.stats?.total_mes ?? 0)}`} />
          <Stat label="Productos" value={String(store.stats?.productos ?? 0)} />
          <Stat label="Último respaldo" value={store.last_backup_at ? new Date(store.last_backup_at).toLocaleDateString('es-VE') : 'Nunca'} />
        </div>

        <Card className={cx('p-4', params.get('nueva') && 'ring-2 ring-brand-300')}>
          <p className="font-bold flex items-center gap-2">
            <KeyRound size={17} /> Código de activación
          </p>
          {store.activation_code ? (
            <>
              <p className="text-sm text-muted mt-1">Con este código el dueño crea su usuario y queda vinculado a esta bodega. Se puede usar una sola vez.</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="flex-1 text-center text-2xl font-extrabold tracking-[.35em] rounded-2xl bg-brand-50 text-brand-700 py-3">{store.activation_code}</span>
                <Button variant="outline" className="h-14" onClick={() => navigator.clipboard?.writeText(store.activation_code!).then(() => toast('Copiado', { tone: 'info' }))} aria-label="Copiar">
                  <Copy size={18} />
                </Button>
              </div>
              <Button variant="outline" className="w-full mt-2.5" onClick={() => window.open(waLink(store.phone, activationMessage(store, store.activation_code!)), '_blank')}>
                <MessageCircle size={16} className="text-[#25d366]" /> Enviar instrucciones por WhatsApp
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted mt-1">Ya se usó. Genera uno nuevo para vincular otro teléfono o usuario (plan Pro) o si el dueño creó una cuenta nueva.</p>
              <Button variant="outline" className="w-full mt-3" onClick={newCode}>
                Generar código nuevo
              </Button>
            </>
          )}
        </Card>

        <Card className="p-4">
          <p className="font-bold mb-2">Usuarios</p>
          {members.data?.length === 0 && <p className="text-sm text-muted">Nadie ha activado esta bodega todavía.</p>}
          {members.data?.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2 py-2 border-t border-line first:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{emailToLogin(m.email)}</p>
                <p className="text-xs text-muted">
                  {m.role === 'owner' ? 'Dueño' : 'Vendedor'} · {m.last_sign_in_at ? `entró ${new Date(m.last_sign_in_at).toLocaleDateString('es-VE')}` : 'sin entrar'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const pw = prompt(`Nueva clave para ${emailToLogin(m.email)} (mínimo 6 caracteres):`)
                  if (pw) call(() => supabase.rpc('admin_reset_password', { p_user: m.user_id, p_password: pw }), 'Clave cambiada')
                }}
              >
                <KeyRound size={14} /> Clave
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Cerrar sesión"
                onClick={async () =>
                  (await confirmDialog(`¿Cerrar la sesión de ${emailToLogin(m.email)}?`, { text: 'Se cerrará en todos sus teléfonos la próxima vez que abran la app (máximo 10 minutos con internet). Podrá volver a entrar con su usuario y clave.', ok: 'Cerrar sesión', danger: true })) &&
                  call(() => supabase.rpc('admin_force_logout', { p_user: m.user_id }), 'Sesión cerrada')
                }
              >
                <LogOut size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500"
                aria-label="Desvincular"
                onClick={async () =>
                  (await confirmDialog(`¿Desvincular a ${emailToLogin(m.email)}?`, { text: 'Ese usuario ya no podrá entrar a esta bodega. Los datos no se borran.', ok: 'Desvincular', danger: true })) &&
                  call(() => supabase.rpc('admin_remove_member', { p_user: m.user_id }), 'Usuario desvinculado')
                }
              >
                <UserX size={16} />
              </Button>
            </div>
          ))}
        </Card>

        <EditStore store={store} onSaved={() => { reload(); onChange() }} />

        <Card className="p-4">
          <p className="font-bold">Referidos</p>
          <p className="text-sm text-muted mt-1">
            Su código: <b className="text-ink tracking-widest">{store.referral_code}</b> · Meses ganados: <b className="text-ink">{store.free_months ?? 0}</b>
          </p>
          {referrer && <p className="text-sm mt-1">La refirió: <button className="font-semibold text-brand-700 underline" onClick={() => nav(`/admin/bodegas/${referrer.id}`)}>{referrer.name}</button></p>}
          {referred.length > 0 && <p className="text-sm mt-1">Ha referido: {referred.map((r) => r.name).join(', ')}</p>}
        </Card>

        <Card className="p-4">
          <p className="font-bold mb-2">Pagos</p>
          {payments.data?.length === 0 && <p className="text-sm text-muted">Sin pagos todavía.</p>}
          {payments.data?.map((p) => (
            <div key={p.id} className="flex justify-between py-2 border-t border-line first:border-0 text-sm gap-2">
              <span className="min-w-0">
                <span className="font-semibold">{usd(p.amount_usd)}</span> · {PROVIDER_METHODS[p.method] ?? p.method} · {p.months} mes(es)
                <span className="block text-xs text-muted">
                  {new Date(p.created_at).toLocaleDateString('es-VE')} {p.reference && `· ref ${p.reference}`}
                </span>
              </span>
              <Badge tone={p.status === 'aprobado' ? 'green' : p.status === 'rechazado' ? 'red' : 'amber'}>{p.status}</Badge>
            </div>
          ))}
        </Card>

        {store.status !== 'cancelled' && (
          <Button
            variant="ghost"
            className="w-full text-red-500"
            onClick={async () =>
              (await confirmDialog(`¿Dar de baja ${store.name}?`, { text: 'Queda cancelada y en solo lectura. Sus datos se conservan; puedes reactivarla luego.', ok: 'Dar de baja', danger: true })) &&
              call(() => supabase.rpc('admin_update_store', { p_id: store.id, p_patch: { status: 'cancelled' } }), 'Bodega dada de baja')
            }
          >
            <Trash2 size={16} /> Dar de baja
          </Button>
        )}
      </div>
      {recording && (
        <RecordPayment
          store={store}
          onClose={() => setRecording(false)}
          onDone={() => {
            setRecording(false)
            reload()
            payments.reload()
            onChange()
          }}
        />
      )}
    </AdminPage>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-line px-3.5 py-2.5">
      <p className="text-[11px] text-muted font-semibold">{label}</p>
      <p className="font-bold tabular truncate">{value}</p>
    </div>
  )
}

function EditStore({ store, onSaved }: { store: AdminStore; onSaved: () => void }) {
  const [f, setF] = useState({
    name: store.name,
    owner_name: store.owner_name ?? '',
    phone: store.phone ?? '',
    rif: store.rif ?? '',
    address: store.address ?? '',
    notes: store.notes ?? '',
    plan: store.plan,
    monthly_price: String(store.monthly_price),
  })
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v })
  const save = async () => {
    const { error } = await supabase.rpc('admin_update_store', { p_id: store.id, p_patch: { ...f, monthly_price: parseNum(f.monthly_price) } })
    if (error) return toast(friendlyError(error), { tone: 'error' })
    toast('Datos guardados')
    onSaved()
  }
  return (
    <Card className="p-4 space-y-3">
      <p className="font-bold">Datos de la bodega</p>
      <Field label="Nombre">
        <Input value={f.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dueño">
          <Input value={f.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input icon={<Phone size={16} />} inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="RIF">
          <Input value={f.rif} onChange={(e) => set('rif', e.target.value)} />
        </Field>
        <Field label="Precio al mes ($)">
          <Input inputMode="decimal" value={f.monthly_price} onChange={(e) => set('monthly_price', e.target.value)} />
        </Field>
      </div>
      <Field label="Dirección">
        <Input value={f.address} onChange={(e) => set('address', e.target.value)} />
      </Field>
      <Segmented value={f.plan} onChange={(p) => set('plan', p)} options={[{ value: 'basico', label: 'Básico' }, { value: 'pro', label: 'Pro' }]} />
      <Field label="Notas privadas">
        <TextArea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ej: paga los 15, prefiere Zelle" />
      </Field>
      <Button variant="outline" className="w-full" onClick={save}>
        <Save size={16} /> Guardar datos
      </Button>
    </Card>
  )
}

function RecordPayment({ store, onClose, onDone }: { store: AdminStore; onClose: () => void; onDone: () => void }) {
  const [months, setMonths] = useState(1)
  const [amount, setAmount] = useState(String(store.monthly_price))
  const [method, setMethod] = useState('pago_movil')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Sheet open onClose={onClose} title="Registrar pago recibido">
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 3, 6, 12].map((m) => (
            <Chip
              key={m}
              active={months === m}
              className="flex-1"
              onClick={() => {
                setMonths(m)
                setAmount(String(m === 12 ? store.monthly_price * 10 : store.monthly_price * m))
              }}
            >
              {m === 12 ? '1 año' : `${m} mes${m > 1 ? 'es' : ''}`}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROVIDER_METHODS).map(([k, v]) => (
            <Chip key={k} active={method === k} onClick={() => setMethod(k)}>
              {v}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto en $">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Referencia">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
        <Button
          size="lg"
          className="w-full"
          disabled={busy || parseNum(amount) <= 0}
          onClick={async () => {
            setBusy(true)
            const { error } = await supabase.rpc('admin_record_payment', {
              p_store: store.id,
              p_amount_usd: parseNum(amount),
              p_method: method,
              p_reference: reference || null,
              p_months: months,
            })
            setBusy(false)
            if (error) return toast(friendlyError(error), { tone: 'error' })
            toast(`Pago registrado: +${months * 30} días`)
            onDone()
          }}
        >
          Registrar y extender {months * 30} días
        </Button>
      </div>
    </Sheet>
  )
}
