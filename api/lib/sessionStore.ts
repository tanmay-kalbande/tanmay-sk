import { BASE_PROMPT } from "../prompts/base.js";
import type { ChatSession, ConversationTurn } from "./types.js";

const SESSION_COOKIE_NAME = "tanmay_ai_session";
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_NON_SYSTEM_TURNS = 20;

const sessionStore = new Map<string, ChatSession>();

function now(): number {
  return Date.now();
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseSessionId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[A-Za-z0-9_-]{8,120}$/.test(trimmed) ? trimmed : null;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [name, ...rest] = chunk.split("=");
    const key = name?.trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("=").trim());
    return acc;
  }, {});
}

function pruneExpiredSessions(): void {
  const cutoff = now() - SESSION_TTL_MS;

  for (const [sessionId, session] of sessionStore) {
    if (session.lastTouchedAt < cutoff) {
      sessionStore.delete(sessionId);
    }
  }
}

function ensureBasePrompt(session: ChatSession): void {
  if (session.basePromptInjected) return;

  session.messageHistory.unshift({
    role: "system",
    content: BASE_PROMPT,
  });
  session.basePromptInjected = true;
}

function trimSessionHistory(session: ChatSession): void {
  const nonSystemIndexes = session.messageHistory.reduce<number[]>((indexes, turn, index) => {
    if (turn.role !== "system") indexes.push(index);
    return indexes;
  }, []);

  const overflow = nonSystemIndexes.length - MAX_NON_SYSTEM_TURNS;
  if (overflow <= 0) return;

  const indexesToRemove = new Set(nonSystemIndexes.slice(0, overflow));
  session.messageHistory = session.messageHistory.filter((_, index) => !indexesToRemove.has(index));
}

function createSession(sessionId: string): ChatSession {
  return {
    id: sessionId,
    basePromptInjected: false,
    messageHistory: [],
    activeContexts: new Set(),
    lastTouchedAt: now(),
  };
}

export function resolveSessionAccess(
  providedSessionId: string | undefined,
  cookieHeader: string | undefined,
): { sessionId: string; setCookie: string | null } {
  const bodySessionId = normaliseSessionId(providedSessionId);
  if (bodySessionId) {
    return { sessionId: bodySessionId, setCookie: null };
  }

  const cookies = parseCookies(cookieHeader);
  const cookieSessionId = normaliseSessionId(cookies[SESSION_COOKIE_NAME]);
  if (cookieSessionId) {
    return { sessionId: cookieSessionId, setCookie: null };
  }

  const sessionId = createSessionId();
  return {
    sessionId,
    setCookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax`,
  };
}

export function getOrCreateSession(sessionId: string): ChatSession {
  pruneExpiredSessions();

  let session = sessionStore.get(sessionId);
  if (!session) {
    session = createSession(sessionId);
    sessionStore.set(sessionId, session);
  }

  ensureBasePrompt(session);
  session.lastTouchedAt = now();
  return session;
}

export function appendTurn(session: ChatSession, turn: ConversationTurn): void {
  session.messageHistory.push(turn);
  trimSessionHistory(session);
  session.lastTouchedAt = now();
}

export function rollbackPendingUserTurn(session: ChatSession): void {
  const lastTurn = session.messageHistory[session.messageHistory.length - 1];
  if (lastTurn?.role === "user") {
    session.messageHistory.pop();
    session.lastTouchedAt = now();
  }
}
