import http from "node:http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";
import express from "express";
import { WATCHER_ROOM_NAME } from "@watcher/shared";
import { WatcherRoom } from "./rooms/WatcherRoom";

const port = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());

app.get("/", (_request, response) => {
  response.json({
    name: "Watcher authoritative server",
    room: WATCHER_ROOM_NAME,
    health: "/health"
  });
});

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});

gameServer.define(WATCHER_ROOM_NAME, WatcherRoom).filterBy(["mapId"]);
await gameServer.listen(port);

console.log(`Watcher server ready at ws://localhost:${port}`);
