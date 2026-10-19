# Poner en marcha TuBodega con Supabase

Son 5 pasos y se hacen una sola vez. Toma unos 10 minutos.

## 1. Desactivar la confirmación por correo

Los bodegueros entran con un usuario corto (por ejemplo `bodegaluis`), no con un correo real.

Supabase → **Authentication → Sign In / Providers → Email** → apaga **Confirm email** → Save.

## 2. Crear tu usuario de administrador

Supabase → **Authentication → Users → Add user → Create new user**

- Email: `alejandrolamont77@gmail.com`
- Password: una clave fuerte (con esta entras al panel)
- Marca **Auto Confirm User**

## 3. Crear las tablas

Supabase → **SQL Editor → New query**. Pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y presiona **Run**.

Ese archivo crea:

- las bodegas, los usuarios, los pagos y tus datos de cobro;
- las reglas de seguridad, para que cada bodega vea solo lo suyo;
- la carpeta privada de respaldos;
- tu permiso de administrador.

Si en algún momento lo ejecutas antes del paso 2, crea el usuario y vuelve a ejecutarlo. Se puede correr las veces que quieras sin perder datos.

## 4. Variables en Vercel

El archivo `.env` del repositorio ya trae la URL y la clave **publishable**. Vercel las toma solas al construir.

La clave **secret** (`sb_secret_…`) **nunca** va en la app ni en el repositorio. Si alguna vez se compartió, cámbiala en **Project Settings → API Keys**.

## 5. Probar

1. Abre la app y entra con tu correo de administrador. Llegas a tu panel.
2. Ve a **Ajustes** y escribe tus datos de Pago Móvil, Zelle, Binance y tu WhatsApp.
3. Ve a **Bodegas → Nueva**. Crea una de prueba y copia el código de activación.
4. En otro teléfono (o en una ventana de incógnito) abre la app → **Activar bodega**. Pon el código, crea un usuario y una clave.
5. En esa bodega ve a **Ajustes → Mi plan → Reportar pago**. Luego apruébalo desde tu panel, en **Pagos**.

## Cómo funciona

| Situación | Qué ve la bodega |
| --- | --- |
| Días de prueba | Franja verde "Prueba gratis: quedan N días" |
| Faltan 3 días o menos | Aviso amarillo para reportar el pago |
| Venció hace 3 días o menos | Sigue vendiendo (gracia) con aviso |
| Venció hace más de 3 días o está suspendida | Solo lectura: ve y respalda sus datos, no puede vender |
| Más de 7 días sin internet | Pide conectarse para confirmar el plan |

- **Respaldo:** los datos viven en el teléfono y se respaldan comprimidos en la nube cada vez que hay cambios e internet. Se guarda el último respaldo y uno por cada día de la semana.
- **Teléfono nuevo:** si la bodega entra desde otro teléfono, la app ofrece traer su respaldo.
- **Referidos:** cuando una bodega creada con el código de otra paga su primer mes, la que la refirió recibe 30 días gratis automáticamente.
- **Demo:** desde tu panel, **Ajustes → Abrir demo de ventas** muestra la app con productos de ejemplo para tus visitas, sin tocar los datos de ningún cliente.
- **Clave olvidada:** en tu panel, abre la bodega → **Usuarios → Clave**.
