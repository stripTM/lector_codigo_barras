import type { ClientToServerMessage, ServerToClientMessage } from '@checkout/shared';

const RECONNECT_DELAY_MS = 2000;

export interface ServerSocket {
  send(message: ClientToServerMessage): void;
  close(): void;
}

/**
 * Conexión WebSocket con el servidor con reconexión automática.
 * Usa el mismo origen de la página; en desarrollo Vite hace de proxy hacia el servidor.
 */
export function connectToServer(
  onMessage: (message: ServerToClientMessage) => void,
  onConnectionChange?: (connected: boolean) => void,
): ServerSocket {
  let socket: WebSocket | null = null;
  let closedByClient = false;

  function open(): void {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${location.host}/ws`);

    socket.onopen = () => onConnectionChange?.(true);

    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data) as ServerToClientMessage);
      } catch {
        // Mensaje no reconocido: se ignora.
      }
    };

    socket.onclose = () => {
      onConnectionChange?.(false);
      if (!closedByClient) {
        setTimeout(open, RECONNECT_DELAY_MS);
      }
    };
  }

  open();

  return {
    send(message: ClientToServerMessage): void {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    close(): void {
      closedByClient = true;
      socket?.close();
    },
  };
}
