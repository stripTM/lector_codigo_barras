export class InvalidBarcodeError extends Error {
  constructor(barcode: string) {
    super(`Invalid barcode: "${barcode}"`);
    this.name = 'InvalidBarcodeError';
  }
}

export class ProductNotInCartError extends Error {
  constructor(barcode: string) {
    super(`Product with barcode "${barcode}" is not in the cart`);
    this.name = 'ProductNotInCartError';
  }
}
