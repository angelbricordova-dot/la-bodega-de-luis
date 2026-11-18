"""Portada de X (1500x500). La foto de perfil tapa la esquina inferior izquierda: el texto va a la derecha."""
import sys, pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).parent
src = (here / 'make.py').read_text()
exec(src[: src.index('ASSETS = {}')])
OUT = BASE / 'x'; OUT.mkdir(exist_ok=True)
html = page(1500, 500, 'deep', f'''
<div style="position:absolute;left:470px;right:300px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">
{brand(True)}
<h2 style="font-size:58px;margin-top:22px">Tu bodega completa en el teléfono.</h2>
<p style="margin-top:14px;font-size:26px;font-weight:700;opacity:.85">Ventas · Fiados · Inventario · Caja · en $ y Bs · 7 días gratis</p></div>
{phone('02-venta-escaneado', 1230, 60, 230)}''')
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': 1500, 'height': 500})
    f = BASE / 'html' / 'x-portada.html'; f.write_text(html)
    pg.goto(f.as_uri()); pg.wait_for_load_state('networkidle'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / 'portada-x.png')); b.close()
print('ok')
