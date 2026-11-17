"""Videos verticales de TikTok (1080x1920) con los clips de la app: fondo con gancho + clip + marco de teléfono."""
import sys, pathlib, subprocess
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
src = (here / 'make.py').read_text()
exec(src[: src.index('ASSETS = {}')])  # CSS, BAG, brand(), page(), BASE

CLIPS = pathlib.Path(sys.argv[2])
OUT = BASE / 'tiktok'
OUT.mkdir(exist_ok=True)

# El clip va a 628x1360 en x=226, y=380. Zona segura: arriba y al centro (TikTok tapa abajo y la derecha).
VX, VY, VW, VH, BZ = 226, 380, 628, 1360, 18

VIDEOS = [
    ('01-cobrar-en-segundos', '01-escanear-y-cobrar', '¿Cuánto tarda en cobrar esta bodega?', 'Escanea, cobra y da el vuelto en $ y Bs'),
    ('02-peso-y-pago-movil', '02-catalogo-peso-y-pago-movil', 'Queso por peso y pago móvil', 'Sin calculadora y sin cuaderno'),
    ('03-el-fiado', '03-fiado-y-abono', 'Cuando el cliente dice “ya te pagué”…', 'El cuaderno de fiados no se borra ni se moja'),
    ('04-inventario', '04-inventario-y-etiquetas', '¿Productos sin código de barras?', 'La app te crea el código y lo imprimes'),
    ('05-cuadre-de-caja', '05-cuadre-y-cierre-de-caja', '¿Te cuadró la caja hoy?', 'Cuánto vendiste, cuánto ganaste y cómo te pagaron'),
]

def bg(hook, sub):
    return page(1080, 1920, 'deep', f'''
<div style="position:absolute;left:70px;right:70px;top:96px;text-align:center">
<h2 style="font-size:66px;line-height:1.08">{hook}</h2>
<p style="margin-top:16px;font-size:34px;font-weight:700;opacity:.85">{sub}</p></div>
<div style="position:absolute;left:0;right:0;top:1772px;display:flex;justify-content:center">{brand(True)}</div>''')

FRAME = f'''<!doctype html><html><head><style>html,body{{margin:0;background:transparent}}</style></head><body>
<div style="position:absolute;left:{VX - BZ}px;top:{VY - BZ}px;width:{VW}px;height:{VH}px;border:{BZ}px solid #17201c;border-radius:70px"></div></body></html>'''

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    (BASE / 'html' / 'tt-frame.html').write_text(FRAME)
    pg.goto((BASE / 'html' / 'tt-frame.html').as_uri())
    pg.screenshot(path=str(OUT / '_frame.png'), omit_background=True)
    for key, clip, hook, sub in VIDEOS:
        f = BASE / 'html' / f'tt-{key}.html'
        f.write_text(bg(hook, sub))
        pg.goto(f.as_uri()); pg.wait_for_load_state('networkidle'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f'_bg-{key}.png'))
    b.close()

for key, clip, hook, sub in VIDEOS:
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y',
        '-loop', '1', '-i', str(OUT / f'_bg-{key}.png'),
        '-i', str(CLIPS / f'{clip}.mp4'),
        '-i', str(OUT / '_frame.png'),
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-filter_complex',
        f'[1:v]scale={VW}:{VH}[v];[0:v][v]overlay={VX}:{VY}:shortest=1[a];[a][2:v]overlay=0:0,format=yuv420p[out]',
        '-map', '[out]', '-map', '3:a', '-shortest',
        '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', str(OUT / f'{key}.mp4'),
    ], check=True)
    print(key)
