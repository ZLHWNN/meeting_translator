import { randomBytes, randomUUID } from "node:crypto";
import { SESSION_MAX_DURATION_SECONDS, type Direction, type MeetingMode } from "../../../shared/protocol/types";

export interface SessionRecord {
  readonly id: string;
  readonly token: string;
  readonly mode: MeetingMode;
  readonly direction: Direction;
  readonly createdAt: number;
  readonly expiresAt: number;
  consumed: boolean;
}

export class SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  create(mode: MeetingMode, direction: Direction, now = Date.now()): SessionRecord {
    const record: SessionRecord = {
      id: randomUUID(),
      token: randomBytes(24).toString("base64url"),
      mode,
      direction,
      createdAt: now,
      expiresAt: now + SESSION_MAX_DURATION_SECONDS * 1000,
      consumed: false,
    };
    this.sessions.set(record.id, record);
    return record;
  }

  consume(token: string, now = Date.now()): SessionRecord | undefined {
    const record = [...this.sessions.values()].find((candidate) => candidate.token === token);
    if (!record || record.consumed || record.expiresAt <= now) return undefined;
    record.consumed = true;
    return record;
  }

  get(id: string, now = Date.now()): SessionRecord | undefined {
    const record = this.sessions.get(id);
    return record && record.expiresAt > now ? record : undefined;
  }

  remove(id: string): void {
    this.sessions.delete(id);
  }

  expire(now = Date.now()): number {
    let removed = 0;
    for (const [id, record] of this.sessions) {
      if (record.expiresAt <= now) {
        this.sessions.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  size(): number {
    return this.sessions.size;
  }
}
