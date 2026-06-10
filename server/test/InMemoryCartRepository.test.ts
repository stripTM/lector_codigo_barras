import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCartRepository } from '../src/infrastructure/persistence/InMemoryCartRepository.js';

describe('InMemoryCartRepository', () => {
  let repository: InMemoryCartRepository;

  beforeEach(() => {
    repository = new InMemoryCartRepository();
  });

  it('starts empty', async () => {
    expect(await repository.findAll()).toEqual([]);
  });

  it('saves and finds an item by barcode', async () => {
    await repository.save({ barcode: '123', name: 'Pan', units: 1 });

    expect(await repository.findByBarcode('123')).toEqual({ barcode: '123', name: 'Pan', units: 1 });
  });

  it('returns null for an unknown barcode', async () => {
    expect(await repository.findByBarcode('999')).toBeNull();
  });

  it('overwrites the item when saving the same barcode', async () => {
    await repository.save({ barcode: '123', name: 'Pan', units: 1 });
    await repository.save({ barcode: '123', name: 'Pan', units: 3 });

    expect(await repository.findAll()).toHaveLength(1);
    expect((await repository.findByBarcode('123'))?.units).toBe(3);
  });

  it('preserves insertion order when listing items', async () => {
    await repository.save({ barcode: 'b', name: 'Pan', units: 1 });
    await repository.save({ barcode: 'a', name: 'Leche', units: 1 });

    const barcodes = (await repository.findAll()).map((item) => item.barcode);
    expect(barcodes).toEqual(['b', 'a']);
  });

  it('removes an item', async () => {
    await repository.save({ barcode: '123', name: 'Pan', units: 1 });

    await repository.remove('123');

    expect(await repository.findByBarcode('123')).toBeNull();
  });

  it('clears all items', async () => {
    await repository.save({ barcode: '123', name: 'Pan', units: 1 });
    await repository.save({ barcode: '456', name: 'Leche', units: 2 });

    await repository.clear();

    expect(await repository.findAll()).toEqual([]);
  });
});
