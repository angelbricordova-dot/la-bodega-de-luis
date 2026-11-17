"""Genera el kit de WhatsApp Business de TuBodega: portada, catálogo y estados. Reusa los estilos de make.py."""
import sys, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
src = (here / 'make.py').read_text()
exec(src[: src.index('ASSETS = {}')])  # CSS, BAG, brand(), page(), phone(), BASE, OUT

OUT = BASE / 'wa'
OUT.mkdir(exist_ok=True)
A = {}

# ---- Portada del perfil (1920x1080). La foto de perfil tapa el centro de abajo: ahí no va nada.
A['portada'] = (1920, 1080, page(1920, 1080, 'deep', f'''
<div style="position:absolute;left:0;right:0;top:110px;text-align:center">
<div style="display:inline-block">{brand(True)}</div>
<h1 style="font-size:96px;margin-top:40px">Tu bodega completa en el teléfono.</h1>
<p class="sub" style="margin-top:26px;font-size:40px">Ventas · Fiados · Inventario · Caja · En dólares y bolívares</p>
<div class="pill" style="margin-top:44px;background:#fff;color:#1d6548;font-size:40px;padding:22px 44px">Pruébala 7 días gratis</div></div>
{phone('02-venta-escaneado', 90, 560, 330)}{phone('12-cuaderno-fiados', 1500, 560, 330)}'''))

# ---- Fotos del catálogo (1080x1080)
ITEMS = [
    ('01-plan-basico', 'Plan Básico', '$10', 'al mes', ['1 teléfono', 'Ventas, fiados, inventario y caja', 'Respaldo en la nube', 'Soporte por WhatsApp'], 'light'),
    ('02-plan-pro', 'Plan Pro', '$18', 'al mes', ['Varios teléfonos', 'Usuario para tu empleado', 'Ves las ventas desde tu casa', 'Todo lo del Básico'], 'ink'),
    ('03-instalacion', 'Instalación', '$30', 'una vez', ['Te la instalamos en tu teléfono', 'Cargamos tus productos', 'Te enseñamos a usarla'], 'light'),
    ('04-kit-impresion', 'Kit de impresión', '$45', 'una vez', ['Impresora térmica de 58 mm', '5 rollos de papel', 'Configurada y lista'], 'light'),
    ('05-paquete-arranque', 'Paquete Arranque', '$75', 'todo incluido', ['Instalación', 'Kit de impresión', 'Primer mes del Plan Básico', 'Ahorras $10'], 'green'),
    ('06-rollos', 'Rollos de papel', '$6', 'paquete', ['Rollos térmicos de 58 mm', 'Para tu impresora del kit'], 'light'),
]
for key, name, price, unit, bullets, tone in ITEMS:
    dark = tone in ('ink', 'green')
    check = '#c9f0dc' if dark else '#2f9e6e'
    lis = ''.join(f'<li style="display:flex;gap:18px;align-items:center;margin-top:22px"><span style="color:{check};font-weight:800">✓</span>{b}</li>' for b in bullets)
    A[f'catalogo-{key}'] = (1080, 1080, page(1080, 1080, tone if tone != 'green' else 'deep', f'''
<div style="padding:72px 80px 0">{brand(dark)}</div>
<div style="padding:56px 80px 0"><p style="font-size:72px;font-weight:800;letter-spacing:-1.5px">{name}</p>
<p style="margin-top:14px"><span style="font-size:200px;font-weight:800;letter-spacing:-7px;line-height:1">{price}</span><span style="font-size:44px;font-weight:700;opacity:.65"> {unit}</span></p>
<ul style="list-style:none;margin-top:30px;font-size:44px;font-weight:700">{lis}</ul></div>
<p style="position:absolute;left:80px;bottom:64px;font-size:30px;font-weight:700;opacity:.6">Pruébala 7 días gratis · tubodega-app.vercel.app</p>'''))

# ---- Estados (1080x1920)
A['estado-01-cuaderno'] = (1080, 1920, page(1080, 1920, 'deep', f'''
<div style="padding:110px 80px 0">{brand(True)}</div>
<div style="padding:60px 80px 0"><h1 style="font-size:112px">¿Todavía con el cuaderno?</h1>
<p class="sub" style="margin-top:30px;font-size:44px">Cobra con la cámara y lleva los fiados en tu teléfono.</p></div>
{phone('09-vuelto-efectivo', 290, 640, 500)}
<div style="position:absolute;left:80px;right:80px;bottom:110px;text-align:center"><div class="pill" style="background:#fff;color:#1d6548;font-size:44px;padding:26px 48px">Escríbeme: 7 días gratis</div></div>'''))

A['estado-02-precios'] = (1080, 1920, page(1080, 1920, 'light', f'''
<div style="padding:110px 80px 0">{brand()}</div>
<div style="padding:70px 80px 0"><h1 style="font-size:104px">Desde $10 al mes.</h1>
<p class="sub" style="margin-top:28px;font-size:44px;color:#45524c;opacity:1">Menos que una malta al día.</p></div>
<div style="padding:90px 80px 0;display:grid;gap:40px">
<div class="card" style="padding:64px 56px;display:flex;justify-content:space-between;align-items:center"><div><p style="font-size:48px;font-weight:800">Básico</p><p style="font-size:32px;color:#6b7a73;font-weight:600;margin-top:6px">1 teléfono</p></div><p style="font-size:96px;font-weight:800">$10</p></div>
<div class="card" style="padding:64px 56px;display:flex;justify-content:space-between;align-items:center;background:#17201c;border-color:#17201c;color:#fff"><div><p style="font-size:48px;font-weight:800">Pro</p><p style="font-size:32px;opacity:.7;font-weight:600;margin-top:6px">Con tu empleado</p></div><p style="font-size:96px;font-weight:800">$18</p></div>
<div class="card" style="padding:64px 56px;display:flex;justify-content:space-between;align-items:center;background:#2f9e6e;border-color:#2f9e6e;color:#fff"><p style="font-size:48px;font-weight:800">Prueba</p><p style="font-size:64px;font-weight:800">7 días gratis</p></div></div>
<p style="position:absolute;left:80px;right:80px;bottom:120px;font-size:38px;font-weight:700;text-align:center;color:#45524c">Pagas en $ o en Bs a tasa BCV. Sin contrato.</p>'''))

checks = ['Funciona sin internet', 'Precios y vuelto en $ y Bs', 'Cuaderno de fiados', 'Te avisa qué se está acabando', 'Cuadre del día y de la caja']
lis = ''.join(f'<li style="display:flex;gap:28px;align-items:center;margin-top:56px"><span class="num" style="width:76px;height:76px;font-size:38px;background:#fff;color:#1d6548">✓</span>{c}</li>' for c in checks)
A['estado-03-que-hace'] = (1080, 1920, page(1080, 1920, 'green', f'''
<div style="padding:110px 80px 0">{brand(True)}</div>
<div style="padding:70px 80px 0"><h1 style="font-size:104px">Lo que hace por tu bodega</h1>
<ul style="list-style:none;margin-top:50px;font-size:56px;font-weight:700">{lis}</ul></div>
<div style="position:absolute;left:80px;right:80px;bottom:110px;text-align:center"><div class="pill" style="background:#17201c;color:#fff;font-size:44px;padding:26px 48px">Te la muestro sin compromiso</div></div>'''))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for name, (w, h, html) in A.items():
        pg = b.new_page(viewport={'width': w, 'height': h})
        f = BASE / 'html' / f'wa-{name}.html'
        f.write_text(html)
        pg.goto(f.as_uri()); pg.wait_for_load_state('networkidle'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f'{name}.png'))
        print(name)
        pg.close()
    b.close()
