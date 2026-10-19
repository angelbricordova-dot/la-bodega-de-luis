import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Flashlight, FlashlightOff } from 'lucide-react'
import { cx } from './ui'

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar']

let audioCtx: AudioContext | null = null
export function beep() {
  try {
    audioCtx ??= new AudioContext()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.frequency.value = 1650
    g.gain.setValueAtTime(0.15, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12)
    o.connect(g).connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + 0.12)
  } catch {
    /* sin audio */
  }
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false) navigator.vibrate?.(60)
}

/** Escáner de códigos con la cámara trasera. Usa BarcodeDetector nativo y ZXing como respaldo. */
export function Scanner({ onDetect, compact }: { onDetect: (code: string) => void; compact?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [torch, setTorch] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  /** Último código visto: no se repite mientras siga frente a la cámara */
  const last = useRef({ code: '', seen: 0 })
  const cb = useRef(onDetect)
  cb.current = onDetect

  const handle = useCallback((code: string) => {
    const now = Date.now()
    const repeated = code === last.current.code && now - last.current.seen < 1500
    last.current = { code, seen: now }
    if (repeated) return
    beep()
    cb.current(code)
  }, [])

  useEffect(() => {
    if (!active) return
    let stream: MediaStream | null = null
    let stopped = false
    let timer = 0
    let zxingControls: { stop: () => void } | null = null
    setReady(false)
    setError('')

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Cámara no disponible en este navegador')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (stopped) return stream.getTracks().forEach((t) => t.stop())
        const v = video.current!
        v.srcObject = stream
        await v.play()
        const track = stream.getVideoTracks()[0]
        const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean }
        setTorchAvailable(!!caps.torch)
        setReady(true)

        const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
        if (Native) {
          const det = new Native({ formats: FORMATS })
          const loop = async () => {
            if (stopped) return
            try {
              if (v.readyState >= 2) {
                const r = await det.detect(v)
                if (r[0]?.rawValue) handle(r[0].rawValue)
              }
            } catch {
              /* frame inválido */
            }
            timer = window.setTimeout(loop, 160)
          }
          loop()
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 150 })
          if (stopped) return
          zxingControls = await reader.decodeFromStream(stream, v, (res) => {
            if (res) handle(res.getText())
          })
        }
      } catch (e) {
        const msg = (e as Error).name === 'NotAllowedError' ? 'Permiso de cámara denegado. Actívalo en el navegador.' : (e as Error).message || 'No se pudo abrir la cámara'
        setError(msg)
      }
    })()

    return () => {
      stopped = true
      clearTimeout(timer)
      zxingControls?.stop()
      stream?.getTracks().forEach((t) => t.stop())
      setTorch(false)
    }
  }, [active, handle])

  const toggleTorch = async () => {
    const track = (video.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] })
      setTorch(!torch)
    } catch {
      /* sin linterna */
    }
  }

  return (
    <div className={cx('relative rounded-3xl overflow-hidden bg-[#e9efec]', compact ? 'h-40' : 'h-52')}>
      {active && !error && <video ref={video} playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
      {active && !error && (
        <>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="relative w-[72%] h-[58%]">
              {['top-0 left-0 border-t-4 border-l-4 rounded-tl-xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'].map((c) => (
                <span key={c} className={cx('absolute size-7 border-brand-300', c)} />
              ))}
              {ready && <span className="absolute left-3 right-3 top-1/2 h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,.9)] animate-scan" />}
            </div>
          </div>
          <span className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
            <span className={cx('size-2 rounded-full', ready ? 'bg-brand-400' : 'bg-amber-400')} />
            {ready ? 'Cámara lista para escanear' : 'Abriendo cámara…'}
          </span>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 text-white text-[11px] font-medium whitespace-nowrap">
            Alinea el código de barras en el marco
          </span>
        </>
      )}
      {(!active || error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <CameraOff size={34} className="text-muted/60 mb-2" />
          <p className="font-bold text-ink/70">{error ? 'Cámara no disponible' : 'Cámara en pausa'}</p>
          <p className="text-sm text-muted">{error || 'Presiona el botón para reactivar'}</p>
        </div>
      )}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        {active && torchAvailable && (
          <button onClick={toggleTorch} className="size-9 rounded-full bg-black/55 text-white grid place-items-center" aria-label="Linterna">
            {torch ? <Flashlight size={17} /> : <FlashlightOff size={17} />}
          </button>
        )}
        <button
          onClick={() => setActive(!active)}
          className={cx('size-9 rounded-full grid place-items-center', active ? 'bg-black/55 text-white' : 'bg-brand-400 text-white')}
          aria-label={active ? 'Pausar cámara' : 'Activar cámara'}
        >
          {active ? <CameraOff size={17} /> : <Camera size={17} />}
        </button>
      </div>
    </div>
  )
}

/** Lector USB/Bluetooth tipo teclado: captura tecleo rápido terminado en Enter */
export function useWedgeScanner(onCode: (code: string) => void) {
  const cb = useRef(onCode)
  cb.current = onCode
  useEffect(() => {
    let buf = ''
    let lastAt = 0
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const now = Date.now()
      if (now - lastAt > 80) buf = ''
      lastAt = now
      if (e.key === 'Enter') {
        if (buf.length >= 4) {
          beep()
          cb.current(buf)
        }
        buf = ''
      } else if (e.key.length === 1) buf += e.key
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
