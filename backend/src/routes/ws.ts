import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { NICK_RE } from "./auth.js";
import { Bus } from "../services/bus.js";

const MAX_NAMES = 32;

function parseNames(raw: unknown): string[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter((n) => NICK_RE.test(n))
    .slice(0, MAX_NAMES);
}

export function wsRoutes(app: FastifyInstance): void {
  app.get("/ws", { websocket: true }, (socket: WebSocket, req) => {
    const names = parseNames(req.query);
    app.bus.add(socket, names);
    socket.send(JSON.stringify({ event: "hello", serverTime: new Date().toISOString() }));

    socket.on("message", (raw: Buffer) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (typeof msg !== "object" || msg === null) return;
      const event = (msg as { event?: unknown }).event;
      if (event === "ping") {
        socket.send(JSON.stringify({ event: "pong", serverTime: new Date().toISOString() }));
      }
      // "sub" принимается, но v1 шлёт все события всем (простая шина)
    });

    socket.on("close", () => app.bus.remove(socket));
    socket.on("error", () => app.bus.remove(socket));
  });
}

export function createBus(): Bus {
  return new Bus();
}
