# La Bodega de Luis — Punto de venta

App de punto de venta e inventario para bodegas en Venezuela. Funciona en el teléfono como una app instalada (PWA), **sin internet**, y guarda todo en el propio teléfono.

## Qué hace

- **Venta con escáner:** la cámara del teléfono lee códigos de barras (EAN-13, UPC, Code128…). También acepta lectores USB o Bluetooth.
- **Venta libre:** para cobrar algo que no está en el inventario.
- **Catálogo:** cuadrícula con fotos, categorías y buscador.
  - Productos por peso o por metro, con pesos rápidos (100 g, 250 g, 500 g, 1 kg) o por monto ("dame $1 de queso").
  - Presentaciones: unidad, docena, caja, bulto o cartón de huevos, cada una con su precio.
- **Precios en dólares y bolívares:**
  - Los precios se guardan en $ y se muestran en Bs con la tasa del día.
  - Botón para consultar la tasa BCV.
  - El vuelto se muestra en $ y en Bs.
- **Métodos de pago:** Efectivo $, Efectivo Bs, Pago Móvil (muestra tus datos al cliente), Punto de venta, Zelle, Biopago, Transferencia, Pago mixto y Crédito fiado.
- **Revisar orden:**
  - Descuento en $ o %, y "precio final" para dejar la cuenta en un monto redondo.
  - Notas, cliente y referencia del pago.
  - Cotizaciones.
- **Tickets:**
  - Impresora térmica Bluetooth de 58 u 80 mm (ESC/POS) con logo.
  - O el diálogo de impresión del sistema.
  - O envío por WhatsApp.
- **Inventario:**
  - Total invertido y productos por reponer.
  - Filtros de stock bajo, agotados y por vencer.
  - Ajustes de stock con motivo y el historial de movimientos de cada producto.
- **Productos sin código:** la app genera un código EAN-13 interno. Se imprime en etiquetas sticker (TSPL o CPCL) o en papel de ticket.
- **Historial:**
  - Cuadre del día, semana o mes con ticket promedio, ganancia y desglose por método de pago.
  - Anular tickets (el stock vuelve al inventario), reimprimir y repetir una venta.
- **Fiados:** cuaderno de deudores con abonos y recordatorio por WhatsApp.
- **Caja:** apertura con fondo en $ y Bs, y cierre con el conteo y la diferencia contra lo esperado.
- **Ajustes:** negocio y logo, pagos, impresión, clientes, vendedores, categorías, compras a proveedores, finanzas (ganancia neta, gastos, lo más vendido), respaldo y restauración, y PIN de administrador.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/
npm run preview   # sirve dist/ en http://localhost:4173
```

Tecnologías: Vite, React 18, TypeScript, Tailwind CSS 4, Dexie (IndexedDB), Zustand, ZXing/BarcodeDetector, JsBarcode y vite-plugin-pwa.

## Publicar en Vercel

1. Entra en [vercel.com/new](https://vercel.com/new) e importa el repositorio `la-bodega-de-luis`.
2. Vercel detecta Vite solo; `vercel.json` ya trae el comando de build, la carpeta `dist` y las reglas de rutas. Presiona **Deploy**.
3. Abre el enlace `https://…vercel.app` en el teléfono del cliente **con Chrome**.
4. Toca ⋮ → **Instalar app** (o "Agregar a pantalla principal"). Queda con su ícono y funciona sin internet.

> La cámara y el Bluetooth solo funcionan con HTTPS, y Vercel ya lo da.

## Impresora térmica

- **Tickets:** cualquier impresora Bluetooth ESC/POS de 58 u 80 mm (RedPOS, Xprinter, GOOJPRT…). Ve a Ajustes → Impresión → Conectar. Requiere Chrome en Android.
- **Etiquetas sticker:** impresoras TSPL o CPCL. Configura el ancho y el alto del sticker en milímetros.
- Si el navegador no tiene Bluetooth, la app abre el diálogo de impresión del sistema. Con la app **RawBT** de Android se puede imprimir así en cualquier térmica.

## Datos

Todo queda en el navegador del teléfono (IndexedDB). En Ajustes → Respaldo se crea un archivo `.json` que se puede mandar por WhatsApp o guardar en Drive, y restaurar en otro teléfono.
