import { db, DEFAULT_SETTINGS, type Product } from '../db'
import { ean13Check } from './barcode'

const CATEGORIES = [
  { name: 'Víveres', emoji: '🌾' },
  { name: 'Bebidas', emoji: '🥤' },
  { name: 'Charcutería', emoji: '🧀' },
  { name: 'Chucherías', emoji: '🍬' },
  { name: 'Limpieza', emoji: '🧼' },
  { name: 'Cuidado personal', emoji: '🧴' },
  { name: 'Panadería', emoji: '🥖' },
  { name: 'Cigarros', emoji: '🚬' },
]

type SeedProduct = [
  name: string,
  cat: number,
  unit: Product['unit'],
  price: number,
  cost: number,
  stock: number,
  minStock: number,
  presentations?: Product['presentations'],
]

const PRODUCTS: SeedProduct[] = [
  ['Harina PAN 1kg', 0, 'unidad', 1.3, 1.0, 48, 12, [{ name: 'Bulto (x20)', qty: 20, price: 24 }]],
  ['Arroz Mary 1kg', 0, 'unidad', 1.6, 1.2, 30, 10],
  ['Pasta Primor 1kg', 0, 'unidad', 1.9, 1.4, 22, 8],
  ['Aceite Diana 1L', 0, 'unidad', 3.2, 2.5, 14, 6],
  ['Azúcar a granel', 0, 'kg', 1.4, 1.0, 25, 5],
  ['Caraotas negras', 0, 'kg', 2.2, 1.6, 12, 4],
  ['Café molido 250g', 0, 'unidad', 2.8, 2.1, 3, 6],
  ['Huevos', 0, 'unidad', 0.25, 0.18, 150, 30, [
    { name: '1/2 cartón (x15)', qty: 15, price: 3.5 },
    { name: 'Cartón (x30)', qty: 30, price: 6.8 },
  ]],
  ['Atún Margarita 140g', 0, 'unidad', 1.8, 1.35, 20, 6],
  ['Malta Polar 250ml', 1, 'unidad', 0.8, 0.55, 48, 12, [{ name: 'Caja (x24)', qty: 24, price: 17 }]],
  ['Coca-Cola 2L', 1, 'unidad', 2.5, 1.9, 12, 6],
  ['Cerveza Polar Pilsen', 1, 'unidad', 1.0, 0.7, 72, 24, [{ name: 'Caja (x36)', qty: 36, price: 32 }]],
  ['Agua Minalba 1.5L', 1, 'unidad', 1.0, 0.65, 0, 6],
  ['Queso blanco duro', 2, 'kg', 6.5, 4.8, 3.2, 1],
  ['Jamón de pierna', 2, 'kg', 9.0, 6.8, 2.5, 1],
  ['Mantequilla Mavesa 500g', 2, 'unidad', 3.9, 3.0, 9, 4],
  ['Doritos personal', 3, 'unidad', 1.2, 0.85, 4, 6],
  ['Cheese Tris', 3, 'unidad', 0.9, 0.6, 30, 10, [
    { name: '1/2 Docena (x6)', qty: 6, price: 5 },
    { name: 'Docena (x12)', qty: 12, price: 9.6 },
  ]],
  ['Pirulín', 3, 'unidad', 1.1, 0.75, 18, 6],
  ['Chocolate Savoy', 3, 'unidad', 0.7, 0.45, 40, 12],
  ['Galletas María Puig', 3, 'unidad', 1.5, 1.05, 16, 6],
  ['Jabón Las Llaves', 4, 'unidad', 1.2, 0.85, 24, 8],
  ['Cloro 1L', 4, 'unidad', 1.0, 0.6, 10, 4],
  ['Detergente en polvo', 4, 'kg', 3.0, 2.1, 6, 2],
  ['Papel higiénico (x4)', 5, 'unidad', 2.6, 1.9, 15, 6],
  ['Crema dental Colgate', 5, 'unidad', 2.2, 1.6, 2, 4],
  ['Pan canilla', 6, 'unidad', 0.6, 0.38, 25, 10],
  ['Pan dulce', 6, 'unidad', 1.5, 1.0, 10, 4],
  ['Cigarro Belmont', 7, 'unidad', 0.25, 0.17, 200, 40, [{ name: 'Cajetilla (x20)', qty: 20, price: 4.5 }]],
  ['Mecate', 0, 'm', 0.3, 0.15, 50, 10],
]

function seedCode(i: number) {
  const d = '20' + String(5500000000 + i * 7919).padStart(10, '0')
  return d + ean13Check(d)
}

export async function seedIfEmpty() {
  if (await db.settings.get('main')) return
  await loadDemoData()
}

export async function loadDemoData() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    await db.settings.put({ ...DEFAULT_SETTINGS })
    const catIds = (await db.categories.bulkAdd(CATEGORIES, { allKeys: true })) as number[]
    const now = Date.now()
    await db.products.bulkAdd(
      PRODUCTS.map(([name, cat, unit, price, cost, stock, minStock, presentations], i) => ({
        name,
        barcode: seedCode(i),
        categoryId: catIds[cat],
        unit,
        price,
        cost,
        stock,
        minStock,
        presentations: presentations ?? [],
        expiry: name.startsWith('Queso') ? new Date(now + 4 * 864e5).toISOString().slice(0, 10) : undefined,
        createdAt: now,
        updatedAt: now,
      })),
    )
    await db.customers.bulkAdd([
      { name: 'Señora Carmen', phone: '0414-1234567', idNumber: 'V-12345678', createdAt: now },
      { name: 'José el taxista', phone: '0424-7654321', createdAt: now },
    ])
    await db.sellers.add({ name: 'Luis', active: true })
    await db.settings.update('main', { currentSeller: 'Luis' })
  })
}

export async function wipeAll() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    await db.settings.put({ ...DEFAULT_SETTINGS })
  })
}
