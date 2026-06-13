import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShoppingCartService } from './application/ShoppingCartService.js';
import { OpenFoodFactsProductCatalog } from './infrastructure/catalog/OpenFoodFactsProductCatalog.js';
import { createHttpApp } from './infrastructure/http/createHttpApp.js';
import { InMemoryCartRepository } from './infrastructure/persistence/InMemoryCartRepository.js';
import { CartWebSocketGateway } from './infrastructure/ws/CartWebSocketGateway.js';

const PORT = Number(process.env.PORT ?? 3000);

// Si existe el build del cliente (caso producción), lo servimos desde aquí.
const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const staticDir = existsSync(clientDist) ? clientDist : undefined;

// Raíz de composición: aquí se eligen los adaptadores concretos.
// Para usar otra base de datos basta con sustituir InMemoryCartRepository.
const repository = new InMemoryCartRepository();
const catalog = new OpenFoodFactsProductCatalog();

const httpServer = createServer();
const webSocketGateway = new CartWebSocketGateway(httpServer);
const cartService = new ShoppingCartService(repository, catalog, webSocketGateway);
webSocketGateway.bindCartService(cartService);

httpServer.on('request', createHttpApp(cartService, { staticDir }));
httpServer.listen(PORT, () => {
  console.log(`Checkout server listening on http://localhost:${PORT} (WebSocket on /ws)`);
  if (staticDir) {
    console.log(`Sirviendo frontend compilado desde ${staticDir}`);
  }
});
