"""Historias (1080x1920) para las destacadas de Instagram: Precios, Preguntas y Prueba gratis. Reusa make.py."""
import sys, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
src = (here / 'make.py').read_text()
exec(src[: src.index('ASSETS = {}')])  # CSS, BAG, brand(), page(), phone(), BASE

OUT = BASE / 'historias'
OUT.mkdir(exist_ok=True)
A = {}
W, H = 1080, 1920
# Instagram tapa unos 250 px arriba (barra de progreso y nombre) y unos 300 abajo (responder): el contenido va en el medio.
TOP = 260


def head(title, kicker, dark=True):
    return f'''<div style="padding:0 80px"><p style="font-size:38px;font-weight:800;letter-spacing:2px;opacity:.7">{kicker}</p>
<h1 style="font-size:108px;margin-top:14px">{title}</h1></div>'''


def story(tone, dark, inner):
    """Marca arriba y el contenido centrado en la zona visible de la historia"""
    return page(W, H, tone, f'''<div style="padding:{TOP}px 80px 0">{brand(dark)}</div>
<div style="position:absolute;left:0;right:0;top:52%;transform:translateY(-50%)">{inner}</div>''')


def row(left, right, sub='', style=''):
    return f'''<div class="card" style="padding:44px 48px;display:flex;justify-content:space-between;align-items:center;{style}">
<div><p style="font-size:46px;font-weight:800">{left}</p>{f'<p style="font-size:30px;font-weight:600;opacity:.65;margin-top:6px">{sub}</p>' if sub else ''}</div>
<p style="font-size:76px;font-weight:800;letter-spacing:-2px">{right}</p></div>'''


# ---- PRECIOS
A['precios-1-planes'] = story('light', False, head('Desde $10 al mes.', 'PRECIOS', False) + f'''
<div style="padding:70px 80px 0;display:grid;gap:32px">
{row('Básico', '$10', '1 teléfono · todo incluido')}
{row('Pro', '$18', 'Varios teléfonos y tu empleado', 'background:#17201c;border-color:#17201c;color:#fff')}
{row('Prueba', 'Gratis', '7 días con tus productos', 'background:#2f9e6e;border-color:#2f9e6e;color:#fff')}</div>''')

A['precios-2-extras'] = story('light', False, head('Si lo necesitas', 'EXTRAS, UNA SOLA VEZ', False) + f'''
<div style="padding:70px 80px 0;display:grid;gap:28px">
{row('Instalación', '$30', 'Cargamos tus productos y te enseñamos')}
{row('Kit de impresora', '$45', 'Impresora de 58 mm + 5 rollos')}
{row('Rollos de papel', '$6', 'Paquete de 58 mm')}
{row('Paquete Arranque', '$75', 'Instalación + kit + primer mes', 'background:#2f9e6e;border-color:#2f9e6e;color:#fff')}</div>''')

pay = ''.join(f'<span class="pill" style="background:rgba(255,255,255,.16);font-size:40px;padding:20px 36px">{m}</span>' for m in ['Pago Móvil', 'Zelle', 'Binance', 'Efectivo'])
A['precios-3-como-pagar'] = story('deep', True, head('¿Cómo pago?', 'PAGOS') + f'''
<div style="padding:60px 80px 0;display:flex;flex-wrap:wrap;gap:20px">{pay}</div>
<div style="padding:70px 80px 0;font-size:46px;font-weight:700;line-height:1.4">
<p>✓ En dólares o en bolívares a tasa BCV</p><p style="margin-top:18px">✓ Mes a mes, sin contrato</p><p style="margin-top:18px">✓ Lo reportas desde la app y listo</p></div>''')

# ---- PREGUNTAS
FAQ = [
    ('¿Necesito internet?', 'No para vender. La app funciona sin señal y, cuando vuelve el internet, se respalda sola.'),
    ('¿Es factura fiscal?', 'No. El ticket es una nota de entrega para tu control. Las facturas las sigues haciendo como siempre.'),
    ('¿Y si se me pierde el teléfono?', 'Tus datos están en la nube. Entras con tu usuario en otro teléfono y aparece todo.'),
    ('¿Tengo que comprar algo?', 'No. Funciona en el Android que ya tienes. La impresora es opcional.'),
    ('¿Puede usarla mi empleado?', 'Sí. Con el plan Pro cada uno vende en su teléfono y tú ves todo desde tu casa.'),
]
for i, (q, a) in enumerate(FAQ, start=1):
    A[f'preguntas-{i}'] = page(W, H, 'light', f'''
<div style="padding:{TOP}px 80px 0">{brand()}</div>
<div style="position:absolute;left:80px;right:80px;top:50%;transform:translateY(-50%)">
<p style="font-size:34px;font-weight:800;letter-spacing:2px;color:#2f9e6e">PREGUNTA {i} DE {len(FAQ)}</p>
<h1 style="font-size:104px;margin-top:20px">{q}</h1>
<div class="card" style="margin-top:56px;padding:56px"><p style="font-size:54px;line-height:1.3;font-weight:700">{a}</p></div></div>''')

# ---- PRUEBA GRATIS
steps = [('Te visito', 'Te muestro la app con productos de tu bodega.'), ('7 días gratis', 'Te la instalo y vendes con ella toda la semana.'), ('Pagas si te sirve', 'Desde $10 al mes. Si no, no pagas nada.')]
st = ''.join(f'''<div style="display:flex;gap:32px;margin-top:56px"><span class="num" style="width:96px;height:96px;font-size:46px;background:#fff;color:#1d6548;flex-shrink:0">{n}</span>
<div><p style="font-size:56px;font-weight:800">{t}</p><p style="font-size:38px;font-weight:600;opacity:.85;margin-top:8px">{d}</p></div></div>''' for n, (t, d) in enumerate(steps, start=1))
A['prueba-1-como-funciona'] = story('deep', True, head('Así funciona la prueba', '7 DÍAS GRATIS') + f'<div style="padding:10px 80px 0">{st}</div>')

inc = ''.join(f'<p style="margin-top:30px">✓ {x}</p>' for x in ['Te la instalo en tu teléfono', 'Cargamos tus productos juntos', 'Te enseño a cobrar y a fiar', 'Soporte por WhatsApp toda la semana'])
A['prueba-2-que-incluye'] = story('light', False, head('Qué incluye', 'SIN COMPROMISO', False) + f'<div style="padding:30px 80px 0;font-size:52px;font-weight:700">{inc}</div>')

A['prueba-3-escribeme'] = page(W, H, 'green', f'''
<div style="padding:{TOP}px 80px 0">{brand(True)}</div>
<div style="position:absolute;left:80px;right:80px;top:48%;transform:translateY(-50%);text-align:center">
<h1 style="font-size:124px">¿La probamos en tu bodega?</h1>
<p class="sub" style="margin-top:36px;font-size:46px">Escríbeme y paso a mostrártela.</p>
<p style="margin-top:90px;font-size:40px;font-weight:800">👇 Toca el enlace</p></div>''')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': W, 'height': H})
    for name, html in A.items():
        f = BASE / 'html' / f'hl-{name}.html'
        f.write_text(html)
        pg.goto(f.as_uri()); pg.wait_for_load_state('networkidle'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f'{name}.png'))
        print(name)
    b.close()
