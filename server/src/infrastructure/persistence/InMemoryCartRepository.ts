import type { CartItem } from '../../domain/CartItem.js';
import type { CartRepository } from '../../domain/ports/CartRepository.js';

/**
 * Adaptador de persistencia en memoria. Mantiene el orden de inserción,
 * que es el orden en el que se muestran los productos en pantalla.
 */
export class InMemoryCartRepository implements CartRepository {
  private readonly itemsByBarcode = new Map<string, CartItem>();

  async findAll(): Promise<CartItem[]> {
    return [...this.itemsByBarcode.values()];
  }

  async findByBarcode(barcode: string): Promise<CartItem | null> {
    return this.itemsByBarcode.get(barcode) ?? null;
  }

  async save(item: CartItem): Promise<void> {
    this.itemsByBarcode.set(item.barcode, item);
  }

  async remove(barcode: string): Promise<void> {
    this.itemsByBarcode.delete(barcode);
  }

  async clear(): Promise<void> {
    this.itemsByBarcode.clear();
  }
}
