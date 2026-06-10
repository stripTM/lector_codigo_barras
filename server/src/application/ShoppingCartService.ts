import { UNKNOWN_PRODUCT_NAME } from '@checkout/shared';
import { createCartItem, withUnits, type CartItem } from '../domain/CartItem.js';
import { InvalidBarcodeError, ProductNotInCartError } from '../domain/errors.js';
import type { CartEventPublisher } from '../domain/ports/CartEventPublisher.js';
import type { CartRepository } from '../domain/ports/CartRepository.js';
import type { ProductCatalog } from '../domain/ports/ProductCatalog.js';

/**
 * Casos de uso del terminal de cobro: añadir producto, cambiar unidades,
 * eliminar producto y comenzar con un nuevo cliente.
 */
export class ShoppingCartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly catalog: ProductCatalog,
    private readonly eventPublisher: CartEventPublisher,
  ) {}

  async addProduct(rawBarcode: string): Promise<CartItem> {
    const barcode = this.normalizeBarcode(rawBarcode);
    const existingItem = await this.repository.findByBarcode(barcode);

    const item = existingItem
      ? withUnits(existingItem, existingItem.units + 1)
      : createCartItem(barcode, await this.resolveProductName(barcode));

    await this.repository.save(item);
    await this.publishCartUpdated();
    return item;
  }

  async incrementUnits(rawBarcode: string): Promise<CartItem> {
    const item = await this.requireItem(rawBarcode);
    const updatedItem = withUnits(item, item.units + 1);

    await this.repository.save(updatedItem);
    await this.publishCartUpdated();
    return updatedItem;
  }

  /** Resta una unidad; si llega a cero, el producto se elimina de la lista. */
  async decrementUnits(rawBarcode: string): Promise<CartItem | null> {
    const item = await this.requireItem(rawBarcode);
    const remainingUnits = item.units - 1;

    if (remainingUnits <= 0) {
      await this.repository.remove(item.barcode);
      await this.publishCartUpdated();
      return null;
    }

    const updatedItem = withUnits(item, remainingUnits);
    await this.repository.save(updatedItem);
    await this.publishCartUpdated();
    return updatedItem;
  }

  async removeProduct(rawBarcode: string): Promise<void> {
    const item = await this.requireItem(rawBarcode);
    await this.repository.remove(item.barcode);
    await this.publishCartUpdated();
  }

  /** Vacía la lista para empezar a cobrar a un nuevo cliente. */
  async startNewCustomer(): Promise<void> {
    await this.repository.clear();
    await this.publishCartUpdated();
  }

  async listItems(): Promise<CartItem[]> {
    return this.repository.findAll();
  }

  private async resolveProductName(barcode: string): Promise<string> {
    const name = await this.catalog.findNameByBarcode(barcode);
    return name ?? UNKNOWN_PRODUCT_NAME;
  }

  private async requireItem(rawBarcode: string): Promise<CartItem> {
    const barcode = this.normalizeBarcode(rawBarcode);
    const item = await this.repository.findByBarcode(barcode);
    if (!item) {
      throw new ProductNotInCartError(barcode);
    }
    return item;
  }

  private normalizeBarcode(rawBarcode: string): string {
    const barcode = rawBarcode?.trim();
    if (!barcode) {
      throw new InvalidBarcodeError(rawBarcode);
    }
    return barcode;
  }

  private async publishCartUpdated(): Promise<void> {
    this.eventPublisher.publishCartUpdated(await this.repository.findAll());
  }
}
