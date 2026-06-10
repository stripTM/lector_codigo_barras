import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenFoodFactsProductCatalog } from '../src/infrastructure/catalog/OpenFoodFactsProductCatalog.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('OpenFoodFactsProductCatalog', () => {
  const catalog = new OpenFoodFactsProductCatalog('https://off.test');

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the product name when the barcode exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { status: 1, product: { product_name: 'Tomate frito' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const name = await catalog.findNameByBarcode('8410076472113');

    expect(name).toBe('Tomate frito');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://off.test/api/v2/product/8410076472113.json?fields=product_name',
      expect.anything(),
    );
  });

  it('returns null when the product is not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { status: 0 })));

    expect(await catalog.findNameByBarcode('0000000000000')).toBeNull();
  });

  it('returns null when the product has no name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { status: 1, product: {} })),
    );

    expect(await catalog.findNameByBarcode('123')).toBeNull();
  });

  it('returns null when the request fails (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    expect(await catalog.findNameByBarcode('123')).toBeNull();
  });

  it('URL-encodes the barcode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { status: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    await catalog.findNameByBarcode('a/b c');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://off.test/api/v2/product/a%2Fb%20c.json?fields=product_name',
      expect.anything(),
    );
  });
});
