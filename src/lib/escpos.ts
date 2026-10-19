/** Codificador ESC/POS mínimo para impresoras térmicas de 58 y 80 mm */

const CP850: Record<string, number> = {
  á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, ü: 0x81, Ü: 0x9a,
  Á: 0xb5, É: 0x90, Í: 0xd6, Ó: 0xe0, Ú: 0xe9, '¿': 0xa8, '¡': 0xad, '°': 0xf8,
}

export function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿¡]/g, '')
}

export class EscPos {
  private bytes: number[] = []

  constructor() {
    this.raw(0x1b, 0x40) // init
    this.raw(0x1b, 0x74, 2) // tabla PC850
  }

  raw(...b: number[]) {
    this.bytes.push(...b)
    return this
  }

  text(s: string) {
    for (const ch of s.replace(/[\u00a0\u202f\u2009]/g, ' ')) {
      const code = ch.charCodeAt(0)
      if (code < 128) this.bytes.push(code)
      else if (CP850[ch]) this.bytes.push(CP850[ch])
      else this.bytes.push(...[...stripAccents(ch)].map((c) => (c.charCodeAt(0) < 128 ? c.charCodeAt(0) : 0x3f)))
    }
    return this
  }

  line(s = '') {
    return this.text(s).raw(0x0a)
  }

  align(a: 'left' | 'center' | 'right') {
    return this.raw(0x1b, 0x61, a === 'left' ? 0 : a === 'center' ? 1 : 2)
  }

  bold(on: boolean) {
    return this.raw(0x1b, 0x45, on ? 1 : 0)
  }

  size(w: 1 | 2, h: 1 | 2) {
    return this.raw(0x1d, 0x21, ((w - 1) << 4) | (h - 1))
  }

  feed(n = 1) {
    return this.raw(0x1b, 0x64, n)
  }

  cut() {
    return this.feed(3).raw(0x1d, 0x56, 0x42, 0)
  }

  /** Código de barras CODE128 o EAN13 */
  barcode(code: string, height = 60) {
    const ean = /^\d{13}$/.test(code)
    this.raw(0x1d, 0x68, height) // alto
    this.raw(0x1d, 0x77, 2) // ancho de barra
    this.raw(0x1d, 0x48, 2) // texto debajo
    if (ean) {
      this.raw(0x1d, 0x6b, 67, 12, ...[...code.slice(0, 12)].map((c) => c.charCodeAt(0)))
    } else {
      const data = [0x7b, 0x42, ...[...code].map((c) => c.charCodeAt(0))]
      this.raw(0x1d, 0x6b, 73, data.length, ...data)
    }
    return this.raw(0x0a)
  }

  /** Imagen en blanco y negro (GS v 0) a partir de un canvas ya escalado */
  image(canvas: HTMLCanvasElement) {
    const w = canvas.width
    const h = canvas.height
    const ctx = canvas.getContext('2d')!
    const px = ctx.getImageData(0, 0, w, h).data
    const bw = Math.ceil(w / 8)
    this.raw(0x1d, 0x76, 0x30, 0, bw & 0xff, bw >> 8, h & 0xff, h >> 8)
    for (let y = 0; y < h; y++) {
      for (let xb = 0; xb < bw; xb++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = xb * 8 + bit
          if (x >= w) continue
          const i = (y * w + x) * 4
          const lum = px[i + 3] < 128 ? 255 : 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
          if (lum < 140) byte |= 0x80 >> bit
        }
        this.bytes.push(byte)
      }
    }
    return this.raw(0x0a)
  }

  encode() {
    return new Uint8Array(this.bytes)
  }
}

/** Convierte una imagen (dataURL) a un canvas en blanco y negro con dithering */
export function imageToCanvas(src: string, maxWidth: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.floor((img.width * scale) / 8) * 8
      const h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      const d = ctx.getImageData(0, 0, w, h)
      const g = new Float32Array(w * h)
      for (let i = 0; i < w * h; i++) g[i] = 0.299 * d.data[i * 4] + 0.587 * d.data[i * 4 + 1] + 0.114 * d.data[i * 4 + 2]
      // Floyd–Steinberg
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x
          const v = g[i] < 128 ? 0 : 255
          const err = g[i] - v
          g[i] = v
          if (x + 1 < w) g[i + 1] += (err * 7) / 16
          if (y + 1 < h) {
            if (x > 0) g[i + w - 1] += (err * 3) / 16
            g[i + w] += (err * 5) / 16
            if (x + 1 < w) g[i + w + 1] += err / 16
          }
        }
      }
      for (let i = 0; i < w * h; i++) {
        d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = g[i]
        d.data[i * 4 + 3] = 255
      }
      ctx.putImageData(d, 0, 0)
      resolve(c)
    }
    img.onerror = reject
    img.src = src
  })
}
