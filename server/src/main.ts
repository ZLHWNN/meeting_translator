import { createServer } from "node:http";
import { buildApp } from "./http/app";
import { SessionStore } from "./session/sessionStore";
import { MeetingWebSocketServer } from "./session/websocketServer";
import { createMeetingProviders } from "./providers/providerFactory";

async function main(): Promise<void> {
  const store = new SessionStore();
  const app = buildApp(store);
  const websocket = new MeetingWebSocketServer(store, createMeetingProviders());
  const server = createServer((request, response) => {
    void app.routing(request, response);
  });
  server.on("upgrade", (request, socket, head) => websocket.handleUpgrade(request, socket, head));
  await app.ready();
  server.listen(Number(process.env.PORT ?? 3000), "127.0.0.1", () => {
    console.log("Meeting Translator server listening");
  });
}

void main();
