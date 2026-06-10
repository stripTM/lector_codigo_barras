import type { Server as HttpServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  CartItemDto,
  ClientToServerMessage,
  ServerToClientMessage,
} from '@checkout/shared';
import type { ShoppingCartService } from '../../application/ShoppingCartService.js';
import type { CartItem } from '../../domain/CartItem.js';
import type { CartEventPublisher } from '../../domain/ports/CartEventPublisher.js';

function toDto(item: CartItem): CartItemDto {
  return { barcode: item.barcode, name: item.name, units: item.units };
}

/**
 * Adaptador WebSocket. Hace dos papeles:
 *  - Entrada: recibe eventos 'scanner.scan' de los lectores de códigos de barras.
 *  - Salida (CartEventPublisher): difunde 'cart.updated' a todas las pantallas conectadas.
 */
export class CartWebSocketGateway implements CartEventPublisher {
  private readonly webSocketServer: WebSocketServer;
  private cartService: ShoppingCartService | null = null;

  constructor(httpServer: HttpServer, path = '/ws') {
    this.webSocketServer = new WebSocketServer({ server: httpServer, path });
    this.webSocketServer.on('connection', (socket) => this.handleConnection(socket));
  }

  /** El servicio se inyecta tras construirlo porque él, a su vez, publica a través de este gateway. */
  bindCartService(cartService: ShoppingCartService): void {
    this.cartService = cartService;
  }

  publishCartUpdated(items: CartItem[]): void {
    this.broadcast({ type: 'cart.updated', payload: { items: items.map(toDto) } });
  }

  close(): void {
    this.webSocketServer.close();
  }

  private async handleConnection(socket: WebSocket): Promise<void> {
    socket.on('message', (rawMessage) => this.handleMessage(socket, rawMessage.toString()));

    if (this.cartService) {
      const items = await this.cartService.listItems();
      this.send(socket, { type: 'cart.updated', payload: { items: items.map(toDto) } });
    }
  }

  private async handleMessage(socket: WebSocket, rawMessage: string): Promise<void> {
    const message = this.parseMessage(rawMessage);
    if (!message || message.type !== 'scanner.scan' || !this.cartService) {
      return;
    }

    const { id: scannerId, barcode } = message.payload;
    try {
      const item = await this.cartService.addProduct(barcode);
      console.log(`Scan from reader "${scannerId}": ${barcode} -> ${item.name}`);
      this.send(socket, {
        type: 'scanner.scan.accepted',
        payload: { ok: true, barcode: item.barcode, productName: item.name },
      });
    } catch (error) {
      this.send(socket, {
        type: 'scanner.scan.rejected',
        payload: {
          ok: false,
          barcode: String(barcode ?? ''),
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private parseMessage(rawMessage: string): ClientToServerMessage | null {
    try {
      const parsed = JSON.parse(rawMessage) as ClientToServerMessage;
      return parsed && typeof parsed === 'object' && 'type' in parsed ? parsed : null;
    } catch {
      return null;
    }
  }

  private send(socket: WebSocket, message: ServerToClientMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerToClientMessage): void {
    const serializedMessage = JSON.stringify(message);
    for (const client of this.webSocketServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serializedMessage);
      }
    }
  }
}
