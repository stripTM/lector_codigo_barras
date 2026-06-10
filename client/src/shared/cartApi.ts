import type { CartItemDto } from '@checkout/shared';

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/** Cliente REST de la lista de la compra para la pantalla de caja. */
export const cartApi = {
  fetchCart(): Promise<{ items: CartItemDto[] }> {
    return requestJson('/api/cart');
  },

  addProduct(barcode: string): Promise<CartItemDto> {
    return requestJson('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode }),
    });
  },

  incrementUnits(barcode: string): Promise<CartItemDto> {
    return requestJson(`/api/cart/items/${encodeURIComponent(barcode)}/increment`, {
      method: 'POST',
    });
  },

  decrementUnits(barcode: string): Promise<CartItemDto | undefined> {
    return requestJson(`/api/cart/items/${encodeURIComponent(barcode)}/decrement`, {
      method: 'POST',
    });
  },

  removeProduct(barcode: string): Promise<void> {
    return requestJson(`/api/cart/items/${encodeURIComponent(barcode)}`, { method: 'DELETE' });
  },

  startNewCustomer(): Promise<void> {
    return requestJson('/api/cart', { method: 'DELETE' });
  },
};
