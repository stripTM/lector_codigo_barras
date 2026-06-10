import type { ProductCatalog } from '../../domain/ports/ProductCatalog.js';

interface OpenFoodFactsResponse {
  status?: number;
  product?: {
    product_name?: string;
  };
}

/**
 * Adaptador del catálogo de productos sobre la API pública y gratuita
 * de Open Food Facts (https://world.openfoodfacts.org).
 */
export class OpenFoodFactsProductCatalog implements ProductCatalog {
  constructor(private readonly baseUrl = 'https://world.openfoodfacts.org') {}

  async findNameByBarcode(barcode: string): Promise<string | null> {
    const url = `${this.baseUrl}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'supermarket-checkout-demo/1.0' },
      });
      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as OpenFoodFactsResponse;
      const productName = body.product?.product_name?.trim();
      return body.status === 1 && productName ? productName : null;
    } catch {
      // Sin red o respuesta inválida: el producto se tratará como no encontrado.
      return null;
    }
  }
}
