import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { ShoppingCartService } from '../src/application/ShoppingCartService.js';
import type { ProductCatalog } from '../src/domain/ports/ProductCatalog.js';
import { createHttpApp } from '../src/infrastructure/http/createHttpApp.js';
import { InMemoryCartRepository } from '../src/infrastructure/persistence/InMemoryCartRepository.js';

const catalogStub: ProductCatalog = {
  findNameByBarcode: async (barcode) => (barcode === '111' ? 'Galletas' : null),
};

describe('REST API', () => {
  let app: Express;

  beforeEach(() => {
    const service = new ShoppingCartService(new InMemoryCartRepository(), catalogStub, {
      publishCartUpdated: vi.fn(),
    });
    app = createHttpApp(service);
  });

  it('GET /api/cart returns the empty cart', async () => {
    const response = await request(app).get('/api/cart');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });

  it('POST /api/cart/items adds a product', async () => {
    const response = await request(app).post('/api/cart/items').send({ barcode: '111' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ barcode: '111', name: 'Galletas', units: 1 });
  });

  it('POST /api/cart/items rejects an empty barcode with 400', async () => {
    const response = await request(app).post('/api/cart/items').send({ barcode: '  ' });

    expect(response.status).toBe(400);
  });

  it('POST /api/cart/items/:barcode/increment adds one unit', async () => {
    await request(app).post('/api/cart/items').send({ barcode: '111' });

    const response = await request(app).post('/api/cart/items/111/increment');

    expect(response.status).toBe(200);
    expect(response.body.units).toBe(2);
  });

  it('POST /api/cart/items/:barcode/decrement removes the item at zero units', async () => {
    await request(app).post('/api/cart/items').send({ barcode: '111' });

    const decrementResponse = await request(app).post('/api/cart/items/111/decrement');
    const cartResponse = await request(app).get('/api/cart');

    expect(decrementResponse.status).toBe(204);
    expect(cartResponse.body.items).toEqual([]);
  });

  it('DELETE /api/cart/items/:barcode removes the product', async () => {
    await request(app).post('/api/cart/items').send({ barcode: '111' });

    const response = await request(app).delete('/api/cart/items/111');
    const cartResponse = await request(app).get('/api/cart');

    expect(response.status).toBe(204);
    expect(cartResponse.body.items).toEqual([]);
  });

  it('returns 404 when operating on a product not in the cart', async () => {
    const response = await request(app).post('/api/cart/items/999/increment');

    expect(response.status).toBe(404);
  });

  it('DELETE /api/cart empties the cart for a new customer', async () => {
    await request(app).post('/api/cart/items').send({ barcode: '111' });
    await request(app).post('/api/cart/items').send({ barcode: '222' });

    const response = await request(app).delete('/api/cart');
    const cartResponse = await request(app).get('/api/cart');

    expect(response.status).toBe(204);
    expect(cartResponse.body.items).toEqual([]);
  });
});
