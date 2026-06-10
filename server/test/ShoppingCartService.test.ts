import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UNKNOWN_PRODUCT_NAME } from '@checkout/shared';
import { ShoppingCartService } from '../src/application/ShoppingCartService.js';
import { InvalidBarcodeError, ProductNotInCartError } from '../src/domain/errors.js';
import type { CartEventPublisher } from '../src/domain/ports/CartEventPublisher.js';
import type { ProductCatalog } from '../src/domain/ports/ProductCatalog.js';
import { InMemoryCartRepository } from '../src/infrastructure/persistence/InMemoryCartRepository.js';

class FakeProductCatalog implements ProductCatalog {
  private readonly namesByBarcode = new Map<string, string>([
    ['8480000123456', 'Leche entera 1L'],
    ['5449000000996', 'Coca-Cola 33cl'],
  ]);

  async findNameByBarcode(barcode: string): Promise<string | null> {
    return this.namesByBarcode.get(barcode) ?? null;
  }
}

describe('ShoppingCartService', () => {
  let repository: InMemoryCartRepository;
  let eventPublisher: CartEventPublisher;
  let service: ShoppingCartService;

  beforeEach(() => {
    repository = new InMemoryCartRepository();
    eventPublisher = { publishCartUpdated: vi.fn() };
    service = new ShoppingCartService(repository, new FakeProductCatalog(), eventPublisher);
  });

  describe('addProduct', () => {
    it('adds a new product with one unit and its catalog name', async () => {
      const item = await service.addProduct('8480000123456');

      expect(item).toEqual({ barcode: '8480000123456', name: 'Leche entera 1L', units: 1 });
      expect(await service.listItems()).toHaveLength(1);
    });

    it('increments units when the product is already in the cart', async () => {
      await service.addProduct('8480000123456');
      const item = await service.addProduct('8480000123456');

      expect(item.units).toBe(2);
      expect(await service.listItems()).toHaveLength(1);
    });

    it(`names the product "${UNKNOWN_PRODUCT_NAME}" when the barcode is not in the catalog`, async () => {
      const item = await service.addProduct('0000000000000');

      expect(item.name).toBe(UNKNOWN_PRODUCT_NAME);
    });

    it('trims surrounding whitespace from the barcode', async () => {
      const item = await service.addProduct('  8480000123456  ');

      expect(item.barcode).toBe('8480000123456');
    });

    it('rejects an empty barcode', async () => {
      await expect(service.addProduct('   ')).rejects.toBeInstanceOf(InvalidBarcodeError);
    });

    it('publishes the updated cart', async () => {
      await service.addProduct('8480000123456');

      expect(eventPublisher.publishCartUpdated).toHaveBeenCalledWith([
        { barcode: '8480000123456', name: 'Leche entera 1L', units: 1 },
      ]);
    });
  });

  describe('incrementUnits', () => {
    it('adds one unit to an existing product', async () => {
      await service.addProduct('8480000123456');
      const item = await service.incrementUnits('8480000123456');

      expect(item.units).toBe(2);
    });

    it('fails when the product is not in the cart', async () => {
      await expect(service.incrementUnits('999')).rejects.toBeInstanceOf(ProductNotInCartError);
    });
  });

  describe('decrementUnits', () => {
    it('subtracts one unit from an existing product', async () => {
      await service.addProduct('8480000123456');
      await service.addProduct('8480000123456');

      const item = await service.decrementUnits('8480000123456');

      expect(item?.units).toBe(1);
    });

    it('removes the product when units reach zero', async () => {
      await service.addProduct('8480000123456');

      const item = await service.decrementUnits('8480000123456');

      expect(item).toBeNull();
      expect(await service.listItems()).toHaveLength(0);
    });

    it('fails when the product is not in the cart', async () => {
      await expect(service.decrementUnits('999')).rejects.toBeInstanceOf(ProductNotInCartError);
    });
  });

  describe('removeProduct', () => {
    it('removes the product regardless of its units', async () => {
      await service.addProduct('8480000123456');
      await service.addProduct('8480000123456');

      await service.removeProduct('8480000123456');

      expect(await service.listItems()).toHaveLength(0);
    });

    it('fails when the product is not in the cart', async () => {
      await expect(service.removeProduct('999')).rejects.toBeInstanceOf(ProductNotInCartError);
    });
  });

  describe('startNewCustomer', () => {
    it('empties the cart and publishes the empty list', async () => {
      await service.addProduct('8480000123456');
      await service.addProduct('5449000000996');

      await service.startNewCustomer();

      expect(await service.listItems()).toHaveLength(0);
      expect(eventPublisher.publishCartUpdated).toHaveBeenLastCalledWith([]);
    });
  });
});
