# Terminal de cobro de supermercado

Aplicación cliente/servidor en TypeScript:

- **`server/`** — Node + Express + ws con **arquitectura hexagonal**. La lista de la compra se guarda en un repositorio en memoria ([InMemoryCartRepository](server/src/infrastructure/persistence/InMemoryCartRepository.ts)) que puede sustituirse por SQLite u otra base de datos implementando el puerto [CartRepository](server/src/domain/ports/CartRepository.ts). Las descripciones de producto se obtienen de la API pública de [Open Food Facts](https://world.openfoodfacts.org); si el código no existe, el producto se llama `indefinido`.
- **`client/`** — Vue 3 + Vite con dos páginas:
  - `/` (index.html): **pantalla de caja**. Botón "Nuevo cliente" (vacía la lista), input para teclear códigos de barras y lista de productos con botones **+**, **−** (al llegar a cero se elimina) y **Eliminar**. Escucha por WebSocket los cambios de la lista.
  - `/scanner.html`: **escáner móvil**. Abre la cámara, lee códigos de barras con `@zxing/browser` y envía al servidor el evento `scanner.scan` con `{ id, barcode }`; el servidor responde con el nombre del producto.
- **`shared/`** — Tipos compartidos del protocolo WebSocket.

## Arquitectura del servidor

```
src/
├── domain/                 # Núcleo: entidad CartItem, errores y puertos
│   └── ports/              # CartRepository, ProductCatalog, CartEventPublisher
├── application/            # Casos de uso (ShoppingCartService)
└── infrastructure/         # Adaptadores
    ├── persistence/        # InMemoryCartRepository (sustituible por SQLite…)
    ├── catalog/            # OpenFoodFactsProductCatalog
    ├── http/               # API REST (Express)
    └── ws/                 # Gateway WebSocket (entrada de escáneres + difusión)
```

## Protocolo WebSocket (`/ws`)

| Dirección         | Mensaje                 | Payload                                |
| ----------------- | ----------------------- | -------------------------------------- |
| lector → servidor | `scanner.scan`          | `{ id, barcode }`                      |
| servidor → lector | `scanner.scan.accepted` | `{ ok: true, barcode, productName }`   |
| servidor → lector | `scanner.scan.rejected` | `{ ok: false, barcode, reason }`       |
| servidor → todos  | `cart.updated`          | `{ items: [{ barcode, name, units }] }`|

## API REST

| Método  | Ruta                               | Acción                                   |
| ------- | ---------------------------------- | ---------------------------------------- |
| GET     | `/api/cart`                        | Lista de la compra actual                |
| POST    | `/api/cart/items`                  | Añadir producto `{ barcode }`            |
| POST    | `/api/cart/items/:barcode/increment` | Sumar una unidad                       |
| POST    | `/api/cart/items/:barcode/decrement` | Restar una unidad (a cero ⇒ se elimina) |
| DELETE  | `/api/cart/items/:barcode`         | Eliminar producto                        |
| DELETE  | `/api/cart`                        | Nuevo cliente (vaciar lista)             |

## Uso

```bash
pnpm install
pnpm dev          # servidor en :3000 y cliente en :5173 (proxy /api y /ws)
```

- Pantalla de caja: <https://localhost:5173/>
- Escáner móvil: `https://<ip-del-pc>:5173/scanner.html`

> **Nota sobre la cámara del móvil:** `getUserMedia` solo funciona en contextos
> seguros, por eso el dev server de Vite usa HTTPS con un certificado
> autofirmado (`@vitejs/plugin-basic-ssl`). El navegador del móvil mostrará un
> aviso de certificado no confiable la primera vez: acéptalo para continuar.

Un lector de pistola USB también puede integrarse conectándose al WebSocket y
enviando el mismo mensaje `scanner.scan`.

## Despliegue en Fly.io

En producción el **servidor sirve también el frontend compilado** (`client/dist`),
de modo que API, WebSocket y estáticos comparten origen: la caja queda en `/` y
el escáner en `/scanner.html`, sin configuración extra en el cliente. El proyecto
incluye `Dockerfile`, `.dockerignore` y `fly.toml` listos para usar.

```bash
# 1) Autentícate (interactivo)
fly auth login

# 2) Crea la app sin desplegar aún, reutilizando el fly.toml del repo.
#    Elige un nombre único; si está cogido, cámbialo en fly.toml.
fly launch --no-deploy --copy-config --name lector-codigo-barras --region mad

# 3) Despliega y abre
fly deploy
fly open            # caja en /
```

- **Escáner del móvil:** `https://<tu-app>.fly.dev/scanner.html`. `getUserMedia`
  exige HTTPS, que Fly proporciona automáticamente en `*.fly.dev`.
- **Coste cero:** con `auto_stop_machines` la VM se apaga sin tráfico y rearranca
  con la primera petición (a costa de un arranque en frío de unos segundos).
- **Estado en memoria:** el carrito se reinicia al apagarse o redesplegar. Para
  persistencia real, implementa el puerto [CartRepository](server/src/domain/ports/CartRepository.ts)
  con SQLite + un volumen Fly.
- **Una sola máquina:** el carrito y el WebSocket se comparten en un único
  proceso; no escales a varias instancias o el estado se dividiría.

## Tests

```bash
pnpm test         # todos los workspaces
pnpm --filter @checkout/server test
pnpm --filter @checkout/client test
```
