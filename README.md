# NODO · Ecosistema de Marketing y Operaciones Híbridas para Comercios Locales

Demo ejecutable de un ecosistema modular para comercios locales de retail y
gastronomía. Cuatro motores conectados sobre una misma infraestructura:

| # | Módulo | Ruta | Qué hace |
|---|--------|------|----------|
| 01 | Escaparate cinemático | `/` | Landing inmersiva con dirección de arte editorial y selector de acceso cliente / operaciones. |
| 02 | Tarjeta Club (fidelización) | `/tarjeta` | Tarjeta digital de sellos con premios, pase listo para Apple / Google Wallet y geocerca del local. |
| 03 | Carta Viva | `/carta` | Carta digital interactiva con filtros dietéticos y analítica de consumo anónima por sesión. |
| 04 | Salón OS (comandas) | `/comandas` | Consola operativa de salón: mesas, comandas, estados de cocina, precuenta y división de cuenta. |

## Stack

- **Next.js 16.4.6** (App Router) · **React 19** · **TypeScript** estricto
- **Tailwind CSS 3** con sistema de diseño propio (`app/globals.css`)
- **Inter** + **JetBrains Mono** vía `next/font`
- Sin base de datos: persistencia en memoria para la demo (ver
  [Persistencia](#persistencia-y-camino-a-producción))

> Nota sobre la versión: el proyecto se generó inicialmente sobre Next.js 14.
> `npm audit` reportó una vulnerabilidad **critical** en la serie 14, así que
> se actualizó a la 16.4.6 (0 vulnerabilidades actualmente). Sigue cumpliendo el
> requisito "Next.js 14+" con App Router.

## Puesta en marcha

Requisitos: Node.js 20.9+ (recomendado 22 LTS) y npm.

```bash
npm install
npm run dev          # desarrollo en http://localhost:3000
```

Producción:

```bash
npm run build
npm run start
```

Otros comandos:

```bash
npm run typecheck    # tsc --noEmit
npm audit            # 0 vulnerabilidades
```

### Variables de entorno

Copia `.env.example` a `.env.local` y cambia los peppers antes de exponer la
demo más allá de tu máquina:

| Variable | Uso |
|----------|-----|
| `PIN_PEPPER` | Pepper mezclado en el derivado scrypt de cada PIN. |
| `SESSION_PEPPER` | Pepper del HMAC con el que se guardan los tokens de sesión y pases. |
| `DEMO_PIN_ANA` | PIN de demo de Ana Torres (por defecto `2468`). |
| `DEMO_PIN_LEO` | PIN de demo de Leo Márquez (por defecto `1357`). |

## Credenciales de demo

El personal de sala se crea al arrancar el servidor (PIN en claro solo existe
como variable de entorno; en memoria se guarda su derivado scrypt):

| Persona | Rol | PIN |
|---------|-----|-----|
| Ana Torres | `mozo` | `2468` |
| Leo Márquez | `supervisor` | `1357` |

Diferencia de permisos: un `mozo` solo puede mutar las comandas que él abrió;
un `supervisor` puede operar cualquiera. Puedes comprobar el bloqueo anti-IDOR
abriendo una comanda con Leo en la mesa M01 e intentando mutarla con Ana:
la API responde `403 No tienes permisos sobre esta comanda.`

## APIs seguras

Todas las mutaciones validan el cuerpo con funciones puras de `lib/seguridad.ts`
y devuelven `Cache-Control: no-store`. No existe ninguna ruta con ID secuencial:
mesas, comandas, líneas, tarjetas, recompensas y sesiones usan UUID v4 o tokens
opacos de `base64url`.

### `POST /api/fidelizacion` — acciones

| Acción | Cuerpo | Resultado |
|--------|--------|-----------|
| `registrar` | `nombre, email, telefono?, consentimientoMarketing` | `201` con tarjeta hidratada + `pase` opaco de un solo titular. |
| `sellar` | `tarjetaId, pase, origen?, idempotencia?` | Suma **un** sello calculado en servidor; al llegar a 8 desbloquea premio con código de un solo uso. |
| `canjear` | `tarjetaId, pase, recompensaId` | Consume la recompensa (segundo intento → `409`). |
| `wallet` | `tarjetaId, pase` | Devuelve el payload del pase Wallet (`_meta.estado: listo_para_firma`). |

`GET /api/fidelizacion?tarjetaId=<uuid>` consulta la tarjeta; exige la
cabecera `x-pase-cliente: <pase>`.

### `/api/comandas` — sistema operativo de salón

`GET` sin cabecera devuelve el listado público de personal (id, nombre,
iniciales, rol — nunca PINs). Con la cabecera `x-sesion-operativa: <token>`
devuelve el snapshot del salón (mesas, comandas, carta y métricas).

| Método | Acción | Notas |
|--------|--------|-------|
| POST | `login` | `mozoId + pin`. Bloqueo temporal tras 5 fallos por mozo y por IP. |
| POST | `logout` | Revoca el token en servidor. |
| POST | `crear-comanda` | `mesaId + items[]`. Solo si la mesa está libre; la ocupa y asigna mozo. |
| POST | `agregar-items` | Añade líneas a una comanda abierta, como `pendiente`. |
| PATCH | `actualizar-item` | Transiciones `pendiente → cocina → listo → entregado` (fuera de orden → `409`). |
| PATCH | `cerrar-comanda` | Exige todos los platos entregados; calcula total con propina y pasa la mesa a `por_limpiar`. |
| PATCH | `actualizar-mesa` | `libre / por_limpiar / reservada` (nunca `ocupada` a mano). |

### `POST /api/menu` — carta y analítica

| Acción | Cuerpo | Resultado |
|--------|--------|-----------|
| `evento` | `sesionId (uuid de dispositivo), evento, productoId?, categoriaId?, valor?` | Registra la señal anónima y devuelve el resumen de sesión. |
| `pedido` | `sesionId, items[]` | `201` con la selección compartida; los precios se resuelven contra el catálogo del servidor. |

`GET /api/menu` devuelve la carta (solo productos disponibles).

## Modelo de seguridad (backend first)

1. **IDs no adivinables.** Ninguna URL expone `/mesa/4`. Todo identificador es
   UUID v4 o token opaco.
2. **PIN nunca en claro.** `scrypt` con sal aleatoria de 16 bytes y pepper de
   entorno; comparación con `timingSafeEqual`.
3. **Sesiones opacas y revocables.** Del login sale un token `base64url` de
   32 bytes; en servidor solo se guarda su HMAC-SHA256. Caducan a las 8 h.
4. **El rol no viaja del cliente.** `rol` y `mozoId` se leen de la sesión
   firmada en servidor; incluirlos en el body no tiene efecto.
5. **Anti-IDOR.** Cada mutación de comanda cruza `sesion.mozoId` con
   `comanda.mozoId` (los supervisores pasan). Un ID filtrado no basta.
6. **Dinero y sellos calculados en servidor.** El cliente nunca envía precios,
   saldos ni premios: se resuelven contra `lib/carta-data.ts` y
   `lib/wallet-engine.ts`.
7. **Rate limiting y bloqueo.** Cuotas por tarjeta/sesión/IP en fidelización,
   carta y login; bloqueo de 5 minutos tras 5 PINs fallidos.
8. **Defensas de transporte.** `origenPermitido` (CSRF same-origin) en toda
   mutación, `no-store` + `nosniff` en las respuestas, y cuerpo JSON limitado
   y saneado (control de longitud, sin caracteres de control).

## Persistencia y camino a producción

La demo persiste en `lib/server/store.ts` (un `Map` global en el proceso).
Consecuencias:

- Al reiniciar el servidor, el salón vuelve al estado inicial (útil para
  limpiar datos de prueba: mesas M04 ocupada, M06 reservada, M07 por limpiar).
- Las sesiones y tarjetas creadas desaparecen con el proceso.
- En la demo en línea (Vercel) el proceso se reinicia solo y puede haber varias
  instancias: los datos se borran cada cierto tiempo y una comanda recién creada
  puede no aparecer al recargar. Es esperado, no un error.

Para producción, la capa ya está aislada: sustituye las funciones de
`lib/server/store.ts` por Prisma/Drizzle + Redis sin tocar las rutas ni los
motores puros (`lib/seguridad.ts`, `lib/wallet-engine.ts`,
`lib/comandas-engine.ts`).

### Firma real del pase Wallet

La acción `wallet` devuelve el JSON con la estructura estándar del pase
(storeCard, barcode QR, locations, maxDistance) marcado como
`listo_para_firma`. Para emitir pases reales:

- **Apple Wallet:** firmar el paquete `.pkpass` con el certificado Pass Type
  ID del comercio (WWDR + clave privada, `manifest.json` + `signature`).
- **Google Wallet:** convertir el payload a un JWT firmado con la cuenta de
  servicio del proyecto del comercio (`object` + `class` de `loyaltyObject`).

Ninguna credencial de comercio está incluida, por diseño.

## Estructura

```
app/
  layout.tsx            # Inter + JetBrains Mono, metadatos, viewport oscuro
  page.tsx              # Módulo 01 · landing cinemática + selector de acceso
  globals.css           # Sistema de diseño (colores, componentes, utilidades)
  tarjeta/page.tsx      # Módulo 02
  carta/page.tsx        # Módulo 03
  comandas/page.tsx     # Módulo 04
  api/fidelizacion/route.ts
  api/comandas/route.ts
  api/menu/route.ts
components/
  logo-nodo.tsx
  tarjeta/tarjeta-cliente.tsx
  carta/carta-cliente.tsx
  comandas/comandas-app.tsx
lib/
  seguridad.ts          # Validadores, hashes, tokens, autorización anti-IDOR
  wallet-engine.ts      # Sellos, premios, geocerca, payload Wallet
  comandas-engine.ts    # Totales, precuenta, división, transiciones, métricas
  carta-data.ts         # Catálogo de productos (fuente de precios)
  server/store.ts       # Persistencia en memoria + repositorios + sesiones
types/
  fidelizacion.ts
  menu.ts
  comandas.ts
```
