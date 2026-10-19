/**
 * Conexión a impresoras térmicas Bluetooth (BLE) con Web Bluetooth.
 * Funciona en Chrome para Android. Se guardan dos impresoras: tickets y etiquetas.
 */

export type PrinterRole = 'ticket' | 'label'

const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
]

/* eslint-disable @typescript-eslint/no-explicit-any */
type BtDevice = any
type BtChar = any

interface Conn {
  device: BtDevice
  char: BtChar
}

const conns: Partial<Record<PrinterRole, Conn>> = {}
const listeners = new Set<() => void>()
const NAME_KEY = (r: PrinterRole) => `bt-printer-${r}`

export const bluetoothSupported = () => typeof navigator !== 'undefined' && !!(navigator as any).bluetooth

export function onPrinterChange(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emit = () => listeners.forEach((f) => f())

export function printerStatus(role: PrinterRole) {
  const c = conns[role]
  return {
    connected: !!c?.device?.gatt?.connected,
    name: c?.device?.name || localStorageGet(NAME_KEY(role)) || '',
  }
}

function localStorageGet(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}

async function findWritable(device: BtDevice): Promise<BtChar> {
  const server = await device.gatt.connect()
  const services = await server.getPrimaryServices()
  for (const s of services) {
    const chars = await s.getCharacteristics()
    for (const c of chars) {
      if (c.properties.writeWithoutResponse || c.properties.write) return c
    }
  }
  throw new Error('La impresora no tiene un canal de escritura compatible')
}

async function attach(role: PrinterRole, device: BtDevice) {
  const char = await findWritable(device)
  conns[role] = { device, char }
  try {
    localStorage.setItem(NAME_KEY(role), device.name || 'Impresora')
    localStorage.setItem(`${NAME_KEY(role)}-id`, device.id)
  } catch {
    /* sin almacenamiento */
  }
  device.addEventListener('gattserverdisconnected', emit)
  emit()
}

export async function connectPrinter(role: PrinterRole) {
  if (!bluetoothSupported()) throw new Error('Este navegador no soporta Bluetooth. Usa Chrome en Android.')
  const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES })
  await attach(role, device)
}

/** Reconecta sin preguntar si el navegador recuerda el permiso */
async function reconnect(role: PrinterRole): Promise<boolean> {
  const c = conns[role]
  if (c?.device?.gatt?.connected) return true
  if (c?.device) {
    try {
      await attach(role, c.device)
      return true
    } catch {
      /* sigue */
    }
  }
  const bt = (navigator as any).bluetooth
  if (!bt?.getDevices) return false
  const id = localStorageGet(`${NAME_KEY(role)}-id`)
  const devices: BtDevice[] = await bt.getDevices()
  const d = devices.find((x) => x.id === id)
  if (!d) return false
  try {
    await attach(role, d)
    return true
  } catch {
    return false
  }
}

export function disconnectPrinter(role: PrinterRole) {
  conns[role]?.device?.gatt?.disconnect()
  delete conns[role]
  try {
    localStorage.removeItem(NAME_KEY(role))
    localStorage.removeItem(`${NAME_KEY(role)}-id`)
  } catch {
    /* nada */
  }
  emit()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Envía bytes a la impresora. Devuelve false si no hay impresora conectada. */
export async function sendToPrinter(role: PrinterRole, data: Uint8Array): Promise<boolean> {
  if (!bluetoothSupported()) return false
  if (!(await reconnect(role))) return false
  const { char } = conns[role]!
  const chunk = 180
  for (let i = 0; i < data.length; i += chunk) {
    const part = data.slice(i, i + chunk)
    if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) {
      await char.writeValueWithoutResponse(part)
      await sleep(12)
    } else {
      await char.writeValue(part)
    }
  }
  return true
}
