import type { WebSocket } from "ws";

interface BusClient {
  socket: WebSocket;
  names: Set<string>;
}

export class Bus {
  private clients = new Set<BusClient>();

  add(socket: WebSocket, names: string[]): void {
    this.clients.add({ socket, names: new Set(names) });
  }

  remove(socket: WebSocket): void {
    for (const client of this.clients) {
      if (client.socket === socket) {
        this.clients.delete(client);
        return;
      }
    }
  }

  broadcastCapeUpdate(name: string, cape: unknown): void {
    const frame = JSON.stringify({ event: "cape:update", name, cape });
    for (const { socket } of this.clients) {
      if (socket.readyState === socket.OPEN) {
        socket.send(frame);
      }
    }
  }
}
