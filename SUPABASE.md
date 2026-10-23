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

**Cada vez que actualice la app con cambios en la base de datos, vuelve a pegar y ejecutar `schema.sql` completo.** No borra nada: solo agrega lo nuevo.

## 4. Variables en Vercel

La URL y la clave de Supabase no están en el repositorio: se configuran en Vercel.

1. Entra a [vercel.com](https://vercel.com) → tu proyecto → **Settings → Environment Variables**.
2. Agrega estas dos, marcando **Production**, **Preview** y **Development**:

   | Key | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | la Project URL de Supabase (`https://….supabase.co`) |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | la clave que empieza con `sb_publishable_` |

3. Ve a **Deployments**, abre el último, toca **⋯ → Redeploy**. Las variables solo se aplican en una publicación nueva.

Si al abrir la app no aparece la pantalla de TuBodega para entrar con usuario y clave, faltan las variables o no se volvió a publicar.

**Nunca** pongas la clave secreta (`sb_secret_…`) en Vercel ni en el repositorio: todo lo que empieza con `VITE_` queda dentro de la app y cualquiera lo puede ver.

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
- **Referidos:** cuando una bodega creada con el código de otra paga su primer mes, la que la refirió recibe 30 días gratis automáticamente.
- **Demo:** desde tu panel, **Ajustes → Abrir demo de ventas** muestra la app con productos de ejemplo para tus visitas, sin tocar los datos de ningún cliente.
- **Clave olvidada:** en tu panel, abre la bodega → **Usuarios → Clave**.
- **Cerrar sesión:** cada usuario tiene el botón al final de **Ajustes**. Desde tu panel también puedes cerrar la sesión de cualquier usuario a distancia (bodega → **Usuarios** → botón de salida). Se cierra en sus teléfonos en máximo 10 minutos si tienen internet.
- **Varios teléfonos:** todos los teléfonos de una bodega comparten productos, ventas, fiados, clientes y caja al momento. El stock se calcula con los movimientos de todos los teléfonos, así que cuadra aunque dos vendan a la vez. Cada teléfono conserva su propia configuración de impresora.
- **Sin internet:** cada teléfono sigue vendiendo y sube sus cambios cuando vuelve la conexión. El encabezado muestra "Sincronizado", "N por subir" o "Sin internet".
- **Plan Básico = 1 teléfono:** si se abre en un segundo teléfono, ese queda en solo lectura. Desde **Mi plan → Usar TuBodega en este teléfono** se cambia cuál vende. En tu panel ves los teléfonos de cada bodega y puedes quitarlos. El plan Pro permite todos los que quieran.
- **Teléfono nuevo:** al entrar, baja solo todos los datos de la bodega.
- **Borrar una bodega:** primero suspéndela o dala de baja. Luego, en su ficha, aparece **Borrar para siempre**: pide escribir el nombre exacto y borra sus usuarios, teléfonos, pagos, respaldos y datos. Deja de contar en tus totales. Las suspendidas o dadas de baja ya no suman en "Vendido este mes".
- **Prospectos:** en el panel, la pestaña **Prospectos** es tu libreta de visitas: negocio, persona, WhatsApp, en qué quedó y cuándo volver. Los de hoy salen en el Resumen. Con **Darle la prueba de 7 días** se crea la bodega con esos datos.
- **Página de presentación:** `/conocer` (por ejemplo tubodega.vercel.app/conocer) muestra la app, los precios y un botón a tu WhatsApp. Al final tiene **Guardar en PDF** para imprimirla. Si alguien llega con `?ref=CODIGO`, el mensaje de WhatsApp incluye el código de quien lo refirió.
- **Legal:** `/legal` tiene los Términos, la Política de privacidad y la de Cookies. Escribe tu nombre o razón social, RIF o cédula, ciudad y correo en **Ajustes → Datos legales** del panel: salen ahí como responsable. Al activar una bodega hay que aceptar los Términos, y a los usuarios que ya existían se les pide aceptarlos una vez. Si cambias los Términos, sube `TERMS_VERSION` en `src/lib/legal.ts` y se volverán a pedir.
- **Número de ticket:** si dos teléfonos venden al mismo tiempo sin internet, los dos pueden darle el mismo número al ticket. No se pierde ninguna venta; solo coincide el número.
