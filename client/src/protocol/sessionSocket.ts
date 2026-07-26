import {
  PROTOCOL_SUBPROTOCOL,
  TOKEN_SUBPROTOCOL_PREFIX,
  type ClientCommand,
} from "./messages";

export function websocketProtocols(sessionToken: string): string[] {
  if (!sessionToken) throw new Error("A session token is required");
  return [PROTOCOL_SUBPROTOCOL, `${TOKEN_SUBPROTOCOL_PREFIX}${sessionToken}`];
}

export function encodeCommand(command: ClientCommand): string {
  return JSON.stringify(command);
}
