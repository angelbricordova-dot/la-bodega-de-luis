"""Genera el kit de Instagram de TuBodega como PNG (perfil, destacadas y publicaciones)."""
import sys, pathlib
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(sys.argv[1])
SRC = (BASE / 'src').as_uri()
OUT = BASE / 'out'

ICON = (BASE / 'src' / 'icon.svg').read_text()
# Bolsa blanca sin el cuadrado verde, para ponerla sobre cualquier fondo
BAG = ICON.replace('<rect width="512" height="512" rx="112" fill="#2f9e6e"/>', '')

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }
.c { position: relative; overflow: hidden; display: flex; flex-direction: column; }
.green { background: #2f9e6e; color: #fff; }
.deep { background: linear-gradient(160deg, #2f9e6e 0%, #1d6548 100%); color: #fff; }
.light { background: #f4f7f5; color: #17201c; }
.ink { background: #17201c; color: #fff; }
.brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 800; letter-spacing: -0.5px; }
.brand .ic { width: 64px; height: 64px; border-radius: 18px; background: #2f9e6e; display: grid; place-items: center; }
.brand .ic svg { width: 64px; height: 64px; }
.on-green .ic { background: rgba(255,255,255,.16); }
.tu { color: inherit; } .bo { color: #2f9e6e; } .on-green .bo { color: #c9f0dc; }
h1 { font-size: 104px; line-height: 1.0; font-weight: 800; letter-spacing: -3px; }
h2 { font-size: 78px; line-height: 1.04; font-weight: 800; letter-spacing: -2px; }
.sub { font-size: 38px; line-height: 1.35; font-weight: 600; opacity: .85; }
.pill { display: inline-block; padding: 16px 30px; border-radius: 999px; font-size: 32px; font-weight: 700; }
.num { width: 76px; height: 76px; border-radius: 50%; background: #2f9e6e; color: #fff; display: grid; place-items: center; font-size: 38px; font-weight: 800; }
.phone { position: absolute; border-radius: 64px; background: #17201c; padding: 18px; box-shadow: 0 40px 80px -30px rgba(23,32,28,.55); }
.phone img { display: block; width: 100%; border-radius: 48px; }
.foot { position: absolute; left: 80px; right: 80px; bottom: 64px; display: flex; justify-content: space-between; align-items: center; font-size: 28px; font-weight: 700; opacity: .7; }
.card { background: #fff; border: 2px solid #e5ebe8; border-radius: 44px; padding: 48px; }
"""


def brand(on_green=False):
    return f'<div class="brand {"on-green" if on_green else ""}"><span class="ic">{BAG}</span><span><span class="tu">Tu</span><span class="bo">Bodega</span></span></div>'


def page(w, h, cls, body):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="c {cls}" style="width:{w}px;height:{h}px">{body}</div></body></html>'


def phone(img, left, top, width):
    return f'<div class="phone" style="left:{left}px;top:{top}px;width:{width}px"><img src="{SRC}/{img}.png"></div>'


ASSETS = {}

# ---- Foto de perfil (Instagram la recorta en círculo)
ASSETS['00-foto-de-perfil'] = (1080, 1080, page(1080, 1080, 'green', f'<div style="position:absolute;inset:0;display:grid;place-items:center"><div style="width:640px;height:640px">{BAG}</div></div>'))

# ---- Portadas de destacadas (historias 1080x1920; se ve el círculo del centro)
for key, glyph, label in [('precios', '$', 'Precios'), ('como-usar', '▶', 'Cómo usar'), ('preguntas', '?', 'Preguntas'), ('prueba-gratis', '7', 'Prueba gratis')]:
    size = 380 if glyph != '▶' else 300
    ASSETS[f'destacada-{key}'] = (1080, 1920, page(1080, 1920, 'green', f'<div style="position:absolute;inset:0;display:grid;place-items:center"><div style="font-size:{size}px;font-weight:800;line-height:1;transform:translateY({"-10px" if glyph != "▶" else "0"})">{glyph}</div></div>'))

# ---- Publicación 1: carrusel "Conoce TuBodega" (1080x1350)
W, H = 1080, 1350
ASSETS['post1-01-portada'] = (W, H, page(W, H, 'deep', f'''
<div style="padding:80px">{brand(True)}</div>
<div style="padding:0 80px;margin-top:70px"><h1>Tu bodega completa en el teléfono.</h1>
<p class="sub" style="margin-top:36px;max-width:820px">Cobra con la cámara, lleva los fiados y cuadra la caja en dólares y bolívares.</p>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:48px">
<span class="pill" style="background:rgba(255,255,255,.16)">Ventas</span><span class="pill" style="background:rgba(255,255,255,.16)">Fiados</span><span class="pill" style="background:rgba(255,255,255,.16)">Inventario</span><span class="pill" style="background:rgba(255,255,255,.16)">Caja</span></div></div>
{phone('02-venta-escaneado', 600, 930, 400)}
<div class="foot" style="right:auto"><span>Desliza →</span></div>'''))

slides = [
    ('02', '02-venta-escaneado', 'Escanea y cobra en segundos', 'Apunta la cámara al código de barras y el producto entra solo al carrito.'),
    ('03', '09-vuelto-efectivo', 'Dólares y bolívares, con el vuelto', 'Cada precio a tu tasa del día. Toca el billete y te dice el vuelto en $ y Bs.'),
    ('04', '12-cuaderno-fiados', 'El cuaderno de fiados, sin cuaderno', 'Quién te debe y cuánto. Registra abonos y recuérdale por WhatsApp.'),
    ('05', '17-cuadre-del-dia', 'Sabes cuánto vendiste y ganaste', 'El cuadre del día y el cierre de caja, sin sacar cuentas.'),
]
for i, (n, img, title, text) in enumerate(slides, start=1):
    ASSETS[f'post1-{n}'] = (W, H, page(W, H, 'light', f'''
<div style="padding:80px 80px 0;display:flex;align-items:center;gap:24px"><span class="num">{i}</span><span style="font-size:30px;font-weight:700;color:#6b7a73">de 4</span></div>
<div style="padding:28px 80px 0;width:640px"><h2 style="font-size:70px">{title}</h2><p class="sub" style="margin-top:28px;font-size:34px;color:#45524c;opacity:1">{text}</p></div>
{phone(img, 610, 250, 420)}
<div class="foot" style="right:auto">{brand()}</div>'''))

ASSETS['post1-06-final'] = (W, H, page(W, H, 'green', f'''
<div style="padding:80px">{brand(True)}</div>
<div style="padding:0 80px;margin-top:90px"><h1 style="font-size:120px">Pruébala<br>7 días gratis.</h1>
<p class="sub" style="margin-top:40px">Te la dejamos instalada en tu teléfono. Funciona sin internet. Sin contrato.</p>
<div class="pill" style="margin-top:56px;background:#fff;color:#1d6548;font-size:38px;padding:24px 40px">Escríbenos por WhatsApp</div>
<p style="margin-top:24px;font-size:30px;font-weight:700;opacity:.8">El enlace está en el perfil</p></div>'''))

# ---- Publicación 2: precios
ASSETS['post2-precios'] = (W, H, page(W, H, 'light', f'''
<div style="padding:80px 80px 0">{brand()}</div>
<div style="padding:50px 80px 0"><h2>Precios claros, sin contrato.</h2></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:50px 80px 0">
<div class="card"><p style="font-size:38px;font-weight:800">Básico</p><p style="margin-top:14px"><span style="font-size:112px;font-weight:800;letter-spacing:-3px">$10</span><span style="font-size:32px;color:#6b7a73;font-weight:600"> /mes</span></p><p style="margin-top:20px;font-size:28px;line-height:1.45;color:#45524c;font-weight:600">1 teléfono<br>Ventas, fiados, inventario y caja<br>Respaldo en la nube</p></div>
<div class="card" style="background:#17201c;border-color:#17201c;color:#fff"><p style="font-size:38px;font-weight:800">Pro</p><p style="margin-top:14px"><span style="font-size:112px;font-weight:800;letter-spacing:-3px">$18</span><span style="font-size:32px;opacity:.7;font-weight:600"> /mes</span></p><p style="margin-top:20px;font-size:28px;line-height:1.45;opacity:.85;font-weight:600">Varios teléfonos<br>Usuario para tu empleado<br>Ves las ventas desde tu casa</p></div>
</div>
<div style="margin:28px 80px 0;border-radius:44px;background:#2f9e6e;color:#fff;padding:40px 48px;display:flex;justify-content:space-between;align-items:center">
<div><p style="font-size:44px;font-weight:800">7 días gratis</p><p style="font-size:28px;font-weight:600;opacity:.85;margin-top:6px">Pruébala con tus productos antes de pagar</p></div></div>
<p style="padding:30px 80px 0;font-size:27px;color:#6b7a73;font-weight:600">Pagas en $ o en Bs a tasa BCV. Instalación y kit de impresora opcionales.</p>
<p style="position:absolute;left:80px;bottom:72px;font-size:36px;font-weight:800">Escríbenos por WhatsApp · <span style="color:#2f9e6e">enlace en el perfil</span></p>'''))

# ---- Publicación 3: preguntas frecuentes
faq = [
    ('¿Necesito internet?', 'No para vender. Funciona sin señal y cuando vuelve el internet se respalda sola.'),
    ('¿Es factura fiscal?', 'No. El ticket es una nota de entrega para tu control. Las facturas las sigues haciendo como siempre.'),
    ('¿Y si se me pierde el teléfono?', 'Tus datos están en la nube. Entras con tu usuario en otro teléfono y aparece todo.'),
    ('¿Tengo que comprar algo?', 'No. Funciona en el Android que ya tienes. La impresora es opcional.'),
]
ASSETS['post3-01-portada'] = (W, H, page(W, H, 'ink', f'''
<div style="padding:80px">{brand(True)}</div>
<div style="padding:0 80px;margin-top:60px"><h1 style="font-size:96px">4 preguntas que nos hacen los bodegueros</h1>
<p class="sub" style="margin-top:36px">Y las respuestas, claritas.</p></div>
<div style="position:absolute;right:40px;bottom:-120px;font-size:720px;font-weight:800;line-height:1;color:#2f9e6e">?</div>
<div class="foot" style="right:auto"><span>Desliza →</span></div>'''))
for i, (q, a) in enumerate(faq, start=2):
    ASSETS[f'post3-0{i}'] = (W, H, page(W, H, 'light', f'''
<div style="padding:80px 80px 0;display:flex;align-items:center;gap:24px"><span class="num">{i - 1}</span><span style="font-size:30px;font-weight:700;color:#6b7a73">de 4</span></div>
<div style="position:absolute;left:80px;right:80px;top:50%;transform:translateY(-55%)"><h2 style="font-size:104px">{q}</h2>
<div class="card" style="margin-top:60px;padding:56px"><p style="font-size:54px;line-height:1.28;font-weight:700">{a}</p></div></div>
<div class="foot" style="right:auto">{brand()}</div>'''))
ASSETS['post3-06-final'] = ASSETS['post1-06-final']

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for name, (w, h, html) in ASSETS.items():
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
        f = BASE / 'html' / f'{name}.html'
        f.parent.mkdir(exist_ok=True)
        f.write_text(html)
        pg.goto(f.as_uri())
        pg.wait_for_load_state('networkidle')
        pg.evaluate('document.fonts.ready')
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f'{name}.png'))
        fam = pg.evaluate("getComputedStyle(document.body).fontFamily + ' loaded=' + document.fonts.check('800 40px \"Plus Jakarta Sans\"')")
        print(name, fam)
        pg.close()
    b.close()
