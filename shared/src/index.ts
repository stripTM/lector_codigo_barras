export const UNKNOWN_PRODUCT_NAME = 'indefinido';

export interface CartItemDto {
  barcode: string;
  name: string;
  units: number;
}

/** Mensaje enviado por un lector de códigos de barras (móvil o pistola). */
export interface ScannerScanMessage {
  type: 'scanner.scan';
  payload: {
    id: string;
    barcode: string;
  };
}

/** Respuesta del servidor al lector cuando el producto se ha añadido. */
export interface ScanAcceptedMessage {
  type: 'scanner.scan.accepted';
  payload: {
    ok: true;
    barcode: string;
    productName: string;
  };
}

/** Respuesta del servidor al lector cuando el escaneo no es válido. */
export interface ScanRejectedMessage {
  type: 'scanner.scan.rejected';
  payload: {
    ok: false;
    barcode: string;
    reason: string;
  };
}

/** Difusión del estado actual de la lista de la compra a todos los clientes. */
export interface CartUpdatedMessage {
  type: 'cart.updated';
  payload: {
    items: CartItemDto[];
  };
}

export type ClientToServerMessage = ScannerScanMessage;

export type ServerToClientMessage =
  | CartUpdatedMessage
  | ScanAcceptedMessage
  | ScanRejectedMessage;
