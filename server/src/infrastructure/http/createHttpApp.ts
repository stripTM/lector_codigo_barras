import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { ShoppingCartService } from '../../application/ShoppingCartService.js';
import { InvalidBarcodeError, ProductNotInCartError } from '../../domain/errors.js';

export interface HttpAppOptions {
  /**
   * Carpeta con el frontend compilado (`client/dist`). Si se indica, el mismo
   * servidor sirve la pantalla de caja (`/`) y el escáner (`/scanner.html`),
   * de modo que API, WebSocket y estáticos comparten origen (útil en producción).
   */
  staticDir?: string;
}

/**
 * Adaptador de entrada HTTP: expone los casos de uso como API REST
 * para la pantalla de caja.
 */
export function createHttpApp(cartService: ShoppingCartService, options: HttpAppOptions = {}): Express {
  const app = express();
  app.use(express.json());

  app.get('/api/cart', async (_request, response) => {
    response.json({ items: await cartService.listItems() });
  });

  app.post('/api/cart/items', async (request, response) => {
    const { barcode } = request.body ?? {};
    const item = await cartService.addProduct(String(barcode ?? ''));
    response.status(201).json(item);
  });

  app.post('/api/cart/items/:barcode/increment', async (request, response) => {
    response.json(await cartService.incrementUnits(request.params.barcode));
  });

  app.post('/api/cart/items/:barcode/decrement', async (request, response) => {
    const item = await cartService.decrementUnits(request.params.barcode);
    if (item === null) {
      response.status(204).end();
      return;
    }
    response.json(item);
  });

  app.delete('/api/cart/items/:barcode', async (request, response) => {
    await cartService.removeProduct(request.params.barcode);
    response.status(204).end();
  });

  app.delete('/api/cart', async (_request, response) => {
    await cartService.startNewCustomer();
    response.status(204).end();
  });

  // En producción servimos el frontend compilado desde el mismo origen.
  // Va después de la API para que `/api/*` nunca quede ensombrecido por un estático.
  if (options.staticDir) {
    app.use(express.static(options.staticDir));
  }

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof InvalidBarcodeError) {
      response.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof ProductNotInCartError) {
      response.status(404).json({ error: error.message });
      return;
    }
    console.error('Unexpected error handling request', error);
    response.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
