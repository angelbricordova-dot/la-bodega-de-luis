import { db } from '../db'

export function ean13Check(d12: string) {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += +d12[i] * (i % 2 ? 3 : 1)
  return String((10 - (sum % 10)) % 10)
}

export function isEan13(code: string) {
  return /^\d{13}$/.test(code) && ean13Check(code.slice(0, 12)) === code[12]
}

/** Código EAN-13 interno (prefijo 20, reservado para uso en tienda) que no exista ya */
export async function generateBarcode(): Promise<string> {
  for (;;) {
    let d = '20'
    for (let i = 0; i < 10; i++) d += Math.floor(Math.random() * 10)
    const code = d + ean13Check(d)
    if (!(await db.products.where('barcode').equals(code).count())) return code
  }
}

export function barcodeFormat(code: string): 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' {
  if (isEan13(code)) return 'EAN13'
  if (/^\d{8}$/.test(code)) return 'EAN8'
  if (/^\d{12}$/.test(code)) return 'UPC'
  return 'CODE128'
}
