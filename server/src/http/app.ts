import Fastify, { type FastifyInstance } from "fastify";
import {
  SESSION_MAX_DURATION_SECONDS,
  type CreateSessionRequest,
  type Direction,
  type MeetingMode,
} from "../../../shared/protocol/types";
import { SessionStore } from "../session/sessionStore";

function isCreateSessionRequest(value: unknown): value is CreateSessionRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  return (request.mode === "in-person" || request.mode === "online") &&
    (request.direction === "en-to-zh" || request.direction === "zh-to-en");
}

export function buildApp(store: SessionStore): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ status: "ok", protocolVersion: "1" }));

  app.post<{ Body: CreateSessionRequest }>("/v1/sessions", async (request, reply) => {
    if (!isCreateSessionRequest(request.body)) {
      return reply.code(400).send({ error: "invalid_session_request" });
    }

    const record = store.create(request.body.mode as MeetingMode, request.body.direction as Direction);
    const response = {
      sessionId: record.id,
      sessionToken: record.token,
      websocketUrl: `/v1/sessions/${record.id}/stream`,
      expiresAt: new Date(record.expiresAt).toISOString(),
      maxDurationSeconds: SESSION_MAX_DURATION_SECONDS,
    };
    return reply.code(201).send(response);
  });

  return app;
}
