export interface CartItem {
  readonly barcode: string;
  readonly name: string;
  readonly units: number;
}

export function createCartItem(barcode: string, name: string): CartItem {
  return { barcode, name, units: 1 };
}

export function withUnits(item: CartItem, units: number): CartItem {
  return { ...item, units };
}
