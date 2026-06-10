import type { CartItem } from '../CartItem.js';

/**
 * Puerto de salida para notificar cambios en la lista de la compra
 * (p. ej. difusión por WebSocket a las pantallas de caja).
 */
export interface CartEventPublisher {
  publishCartUpdated(items: CartItem[]): void;
}
