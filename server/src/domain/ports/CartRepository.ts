import type { CartItem } from '../CartItem.js';

/**
 * Puerto de persistencia de la lista de la compra.
 * La implementación actual es en memoria, pero puede sustituirse por
 * SQLite o cualquier otra base de datos sin tocar dominio ni aplicación.
 */
export interface CartRepository {
  findAll(): Promise<CartItem[]>;
  findByBarcode(barcode: string): Promise<CartItem | null>;
  save(item: CartItem): Promise<void>;
  remove(barcode: string): Promise<void>;
  clear(): Promise<void>;
}
