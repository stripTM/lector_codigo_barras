import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { ClientToServerMessage, ServerToClientMessage } from '@checkout/shared';
import { ShoppingCartService } from '../src/application/ShoppingCartService.js';
import type { ProductCatalog } from '../src/domain/ports/ProductCatalog.js';
import { InMemoryCartRepository } from '../src/infrastructure/persistence/InMemoryCartRepository.js';
import { CartWebSocketGateway } from '../src/infrastructure/ws/CartWebSocketGateway.js';

const catalogStub: ProductCatalog = {
  findNameByBarcode: async (barcode) => (barcode === '111' ? 'Galletas' : null),
};

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      resolve(typeof address === 'object' && address ? address.port : 0);
    });
  });
}

/**
 * Cliente WebSocket de prueba. Escucha y guarda los mensajes desde el momento
 * de la conexión, para no perder los que el servidor envía nada más conectar.
 */
class TestClient {
  private readonly receivedMessages: ServerToClientMessage[] = [];
  private readonly waiters: Array<{
    type: ServerToClientMessage['type'];
    resolve: (message: ServerToClientMessage) => void;
  }> = [];

  constructor(private readonly socket: WebSocket) {
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as ServerToClientMessage;
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.type === message.type);
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1);
        waiter!.resolve(message);
      } else {
        this.receivedMessages.push(message);
      }
    });
  }

  send(message: ClientToServerMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  sendRaw(rawMessage: string): void {
    this.socket.send(rawMessage);
  }

  nextMessageOfType<T extends ServerToClientMessage['type']>(
    type: T,
  ): Promise<Extract<ServerToClientMessage, { type: T }>> {
    const index = this.receivedMessages.findIndex((message) => message.type === type);
    if (index >= 0) {
      return Promise.resolve(
        this.receivedMessages.splice(index, 1)[0] as Extract<ServerToClientMessage, { type: T }>,
      );
    }
    return new Promise((resolve) =>
      this.waiters.push({
        type,
        resolve: resolve as (message: ServerToClientMessage) => void,
      }),
    );
  }

  close(): void {
    this.socket.close();
  }
}

function openTestClient(port: number): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${port}/ws`);
    const client = new TestClient(socket);
    socket.on('open', () => resolve(client));
    socket.on('error', reject);
  });
}

describe('CartWebSocketGateway', () => {
  let httpServer: Server;
  let gateway: CartWebSocketGateway;
  let port: number;
  const openClients: TestClient[] = [];

  beforeEach(async () => {
    httpServer = createServer();
    gateway = new CartWebSocketGateway(httpServer);
    const service = new ShoppingCartService(new InMemoryCartRepository(), catalogStub, gateway);
    gateway.bindCartService(service);
    port = await listen(httpServer);
  });

  afterEach(async () => {
    for (const client of openClients.splice(0)) {
      client.close();
    }
    gateway.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  async function openClient(): Promise<TestClient> {
    const client = await openTestClient(port);
    openClients.push(client);
    return client;
  }

  it('sends the current cart on connection', async () => {
    const client = await openClient();

    const message = await client.nextMessageOfType('cart.updated');

    expect(message.payload).toEqual({ items: [] });
  });

  it('accepts a scanner.scan event and replies with the product name', async () => {
    const client = await openClient();

    client.send({ type: 'scanner.scan', payload: { id: 'movil-1', barcode: '111' } });
    const reply = await client.nextMessageOfType('scanner.scan.accepted');

    expect(reply.payload).toEqual({ ok: true, barcode: '111', productName: 'Galletas' });
  });

  it('broadcasts cart.updated to other connected clients after a scan', async () => {
    const scannerClient = await openClient();
    const displayClient = await openClient();
    await displayClient.nextMessageOfType('cart.updated');

    const updatePromise = displayClient.nextMessageOfType('cart.updated');
    scannerClient.send({ type: 'scanner.scan', payload: { id: 'movil-1', barcode: '111' } });

    const update = await updatePromise;
    expect(update.payload).toEqual({
      items: [{ barcode: '111', name: 'Galletas', units: 1 }],
    });
  });

  it('rejects a scan with an empty barcode', async () => {
    const client = await openClient();

    client.send({ type: 'scanner.scan', payload: { id: 'movil-1', barcode: ' ' } });
    const reply = await client.nextMessageOfType('scanner.scan.rejected');

    expect(reply.payload.ok).toBe(false);
  });

  it('ignores malformed messages without crashing', async () => {
    const client = await openClient();

    client.sendRaw('this is not json');
    client.send({ type: 'scanner.scan', payload: { id: 'movil-1', barcode: '111' } });
    const reply = await client.nextMessageOfType('scanner.scan.accepted');

    expect(reply.payload.ok).toBe(true);
  });
});
