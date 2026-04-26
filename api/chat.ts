import { classifyIntents } from "./lib/classifier.js";
import { injectContextIfNeeded, injectAllContexts } from "./lib/contextRegistry.js";
import {
  appendTurn,
  getOrCreateSession,
  resolveSessionAccess,
  rollbackPendingUserTurn,
} from "./lib/sessionStore.js";
import type { ChatRole, ConversationTurn } from "./lib/types.js";

type VercelLikeRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
  write?: (chunk: string) => void;
  end?: (chunk?: string) => void;
  flushHeaders?: () => void;
};

type GeminiPart = { text: string };
type GeminiTurn = { role: "user" | "model"; parts: GeminiPart[] };
type GeminiResponsePart = { text?: string; thought?: boolean };
type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: GeminiResponsePart[] };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
  error?: { code?: number; message?: string; status?: string };
};

interface ModelResult {
  ok: boolean;
  text: string;
  status: number;
  errorMsg: string;
  streamStarted?: boolean;
}

const MODEL_PRIMARY = process.env.GEMINI_MODEL ?? "gemma-4-31b-it";
const MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK ?? "";

const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const GEMINI_STREAM_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

const rateLimitStore = new Map<string, number[]>();

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;

  const direct = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  if (typeof direct === "string") return direct;
  if (Array.isArray(direct)) return direct[0];

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  const matched = matchedKey ? headers[matchedKey] : undefined;
  if (typeof matched === "string") return matched;
  if (Array.isArray(matched)) return matched[0];
  return undefined;
}

function getIp(req: VercelLikeRequest): string {
  const forwarded = getHeaderValue(req.headers, "x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (rateLimitStore.get(ip) ?? []).filter((timestamp) => timestamp > windowStart);

  if (hits.length >= 20) {
    rateLimitStore.set(ip, hits);
    return true;
  }

  hits.push(now);
  rateLimitStore.set(ip, hits);
  return false;
}

function parseBody(raw: unknown): {
  message?: string;
  sessionId?: string;
  history?: unknown;
  clientHistory?: Array<{ role: string; content: string }>;
  stream?: boolean;
} {
  if (!raw) return {};
  if (typeof raw === "string") {
    return JSON.parse(raw) as {
      message?: string;
      sessionId?: string;
      history?: unknown;
      clientHistory?: Array<{ role: string; content: string }>;
      stream?: boolean;
    };
  }

  return raw as {
    message?: string;
    sessionId?: string;
    history?: unknown;
    clientHistory?: Array<{ role: string; content: string }>;
    stream?: boolean;
  };
}

function extractTextParts(payload: GeminiPayload): string {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  // Gemma 4 marks thinking parts with thought:true — filter them out
  const visibleParts = parts.filter((part) => !part.thought && typeof part.text === "string");
  if (visibleParts.length > 0) {
    return visibleParts.map((part) => part.text ?? "").join("");
  }
  // Fallback: if no non-thought parts, use all text parts
  return parts.map((part) => part.text ?? "").join("");
}

function extractText(payload: GeminiPayload): string {
  return extractTextParts(payload).trim();
}

function extractFinishReason(payload: GeminiPayload): string {
  return payload.candidates?.[0]?.finishReason ?? "";
}

function describeEmptyPayload(payload: GeminiPayload): string {
  const finishReason = extractFinishReason(payload);
  const blockReason = payload.promptFeedback?.blockReason ?? "";
  const blockMessage = payload.promptFeedback?.blockReasonMessage ?? "";

  if (finishReason && blockReason && blockMessage) return `${finishReason}; ${blockReason}: ${blockMessage}`;
  if (finishReason && blockReason) return `${finishReason}; ${blockReason}`;
  if (finishReason) return finishReason;
  if (blockReason && blockMessage) return `${blockReason}: ${blockMessage}`;
  if (blockReason) return blockReason;
  return "unknown";
}

function normaliseInstructionLine(line: string): string {
  return line
    .trim()
    .replace(/^(?:[-*]+[ \t]*)+/, "")
    .replace(/^(?:\d+\.[ \t]*)+/, "")
    .replace(/^(?:[*_`]+[ \t]*)+/, "")
    .trim();
}

function tidyVisibleAnswer(text: string): string {
  let cleaned = text.replace(/[ \t]+$/gm, "").trim();
  cleaned = cleaned.replace(/\s*\((?:violates|breaks)\s+"[^"]+"\)\.?$/i, "").trim();
  const quoteCount = (cleaned.match(/"/g) ?? []).length;
  if (quoteCount % 2 === 1) cleaned = cleaned.replace(/"+$/, "").trim();
  return cleaned;
}

function isInstructionLeakLine(line: string): boolean {
  const cleaned = normaliseInstructionLine(line);
  return (
    /^role:/i.test(cleaned) ||
    /^my role:/i.test(cleaned) ||
    /^persona:/i.test(cleaned) ||
    /^constraint[s]?:/i.test(cleaned) ||
    /^identity:/i.test(cleaned) ||
    /^behavior:/i.test(cleaned) ||
    /^profile:/i.test(cleaned) ||
    /^projects:/i.test(cleaned) ||
    /^skills:/i.test(cleaned) ||
    /^certifications:/i.test(cleaned) ||
    /^experience details:/i.test(cleaned) ||
    /^default length:/i.test(cleaned) ||
    /^never output role labels/i.test(cleaned) ||
    /^draft \d+:/i.test(cleaned) ||
    /^(constraint check:|out-of-scope response:|tone\/style:|response should be:)/i.test(cleaned) ||
    /^(the user is asking|the system instructions state:|i must briefly state)/i.test(cleaned) ||
    /^(context:|reference profile:|scope:|style:)/i.test(cleaned) ||
    /^(direct and natural\?|2-5 sentences\?|no filler\?|scope adhered to\?|let'?s try:)/i.test(cleaned) ||
    /^(acknowledge the user|identify who i am|offer help)/i.test(cleaned) ||
    /^(you are tanmay'?s (ai|portfolio)|tone:|keep most answers|answer only about)/i.test(cleaned) ||
    /^(never repeat|never output|do not use filler|if a detail is missing from context)/i.test(cleaned) ||
    /^(for outside-scope requests|portfolio:|github:|linkedin:|email:|whatsapp:|resume:|medium:)/i.test(cleaned) ||
    /^system context\./i.test(cleaned)
  );
}

function findEmbeddedAnswerStart(line: string): number {
  const candidates = [
    line.lastIndexOf("Hello!"),
    line.lastIndexOf("Hi!"),
    line.lastIndexOf("Hey!"),
  ].filter((index) => index >= 0);

  const introPattern = /(?:I am|I'm)\s+Tanmay(?: Kalbande)?'s (?:AI|portfolio) assistant/gi;
  let match: RegExpExecArray | null;
  while ((match = introPattern.exec(line)) !== null) {
    candidates.push(match.index);
  }

  return candidates.length > 0 ? Math.max(...candidates) : -1;
}

function stripInstructionLeak(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const firstMarker = lines.findIndex((line) => isInstructionLeakLine(line.trim()));
  if (firstMarker === -1) return raw;

  const prefix = tidyVisibleAnswer(lines.slice(0, firstMarker).join("\n").trim());
  if (prefix && prefix.length >= 20 && !/^(hello|hi|hey)\b[\s!.]*$/i.test(prefix)) {
    return prefix;
  }

  let end = firstMarker;
  while (end < lines.length) {
    const trimmed = lines[end].trim();
    const normalised = normaliseInstructionLine(trimmed);
    const answerStart = findEmbeddedAnswerStart(normalised);

    if (answerStart > 0) {
      const remainder = [normalised.slice(answerStart), ...lines.slice(end + 1)].join("\n").trim();
      if (remainder.length >= 10) return tidyVisibleAnswer(remainder);
    }

    if (
      !trimmed ||
      isInstructionLeakLine(trimmed) ||
      /^(?:[-*]|\d+\.)\s/.test(trimmed) ||
      /^[A-Z][A-Z /&-]{5,}$/.test(trimmed)
    ) {
      end += 1;
      continue;
    }

    break;
  }

  const remainder = lines.slice(end).join("\n").trim();
  if (remainder.length < 10) return raw;
  if (!prefix || prefix.length < 20 || /^(hello|hi|hey)\b[\s!.]*$/i.test(prefix)) {
    return tidyVisibleAnswer(remainder);
  }

  return prefix;
}

function cleanText(raw: string): string {
  let text = raw;

  // Strip all known thinking/reasoning tag formats (Gemma 4, DeepSeek, etc.)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  text = text.replace(/<reflection>[\s\S]*?<\/reflection>/gi, "");
  text = text.replace(/<internal>[\s\S]*?<\/internal>/gi, "");

  // Strip Gemma's draft/reasoning output: "* Draft 2 (Too filler): ..."
  // and rule-checking lines: "* Rule 1: No filler"
  // Keep only the text before the first draft/rule marker.
  const draftMarker = text.search(/^\*\s*(?:Draft \d|Rule \d|Constraint|Scope|Tone|Style|Response should|Let'?s try)/im);
  if (draftMarker > 0) {
    const beforeDrafts = text.slice(0, draftMarker).trim();
    if (beforeDrafts.length >= 15) {
      text = beforeDrafts;
    }
  }

  if (/^\*\s/.test(text.trimStart())) {
    const stripped = text.replace(/^(?:\*[^\n]*\n)+\n*/m, "");
    if (stripped.length > 20) text = stripped;
  }

  const preamble = text.match(/^(?:\*\s[^\n]+\n)+\n*([\s\S]+)/);
  if (preamble?.[1] && preamble[1].length > 20) text = preamble[1];

  text = stripInstructionLeak(text);
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function isModelUnavailable(status: number, errMsg: string): boolean {
  if (status === 404) return true;
  if (status === 400) {
    const message = errMsg.toLowerCase();
    return message.includes("not found") || message.includes("not supported for generatecontent");
  }
  return false;
}

function buildFallbackReply(userMessage: string): string | null {
  const question = userMessage.toLowerCase().trim();

  if (/^(hi|hello|hey|sup|yo|howdy|greetings)[.!?]*$/.test(question)) {
    return "Hi! Ask me anything about Tanmay's work, projects, or experience.";
  }
  if (/^(thanks|thank you|thx)[.!?]*$/.test(question)) {
    return "Happy to help. Anything else you'd like to know about Tanmay?";
  }
  if (/^(ok|okay|cool|nice|great|awesome)[.!?]*$/.test(question)) {
    return "Let me know if you have any other questions about Tanmay's work.";
  }

  return null;
}

function pushGeminiTurn(contents: GeminiTurn[], role: "user" | "model", text: string): void {
  if (!text) return;

  const previous = contents[contents.length - 1];
  if (previous?.role === role && previous.parts[0]) {
    previous.parts[0].text = `${previous.parts[0].text}\n\n${text}`;
    return;
  }

  contents.push({ role, parts: [{ text }] });
}

function buildBody(history: ConversationTurn[], model: string): object {
  const contents: GeminiTurn[] = [];
  const systemContext: string[] = [];

  for (const turn of history) {
    const text = turn.content.trim();
    if (!text) continue;

    if (turn.role === "assistant") {
      pushGeminiTurn(contents, "model", text);
      continue;
    }

    if (turn.role === "system") {
      systemContext.push(text);
      continue;
    }

    pushGeminiTurn(contents, "user", text);
  }

  const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ];

  const generationConfig: Record<string, unknown> = {
    temperature: 0.4,
    topP: 0.85,
    maxOutputTokens: 1200,
  };

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
    safetySettings,
  };

  const combinedSystemContext = systemContext.join("\n\n").trim();
  if (combinedSystemContext) {
    // Gemma models (all versions) do NOT reliably support system_instruction
    // via the Gemini API. Use system_instruction only for Gemini-branded models.
    const lower = model.toLowerCase();
    const supportsSystemInstruction = lower.startsWith("gemini-");

    if (supportsSystemInstruction) {
      body.system_instruction = {
        parts: [{ text: combinedSystemContext }],
      };
    } else {
      contents.unshift({
        role: "user",
        parts: [{
          text: `[SYSTEM INSTRUCTION]\n${combinedSystemContext}\n\n[USER REQUEST FOLLOWS]`,
        }],
      });
    }
  }

  return body;
}

function readApiError(raw: string, status: number): string {
  try {
    const payload = JSON.parse(raw) as GeminiPayload;
    return payload.error?.message ?? raw.trim() ?? `HTTP ${status}`;
  } catch {
    return raw.trim() || `HTTP ${status}`;
  }
}

function writeStreamEvent(
  response: VercelLikeResponse,
  event: string,
  payload: Record<string, unknown>,
): void {
  response.write?.(`event: ${event}\n`);
  response.write?.(`data: ${JSON.stringify(payload)}\n\n`);
}

function findSseBoundary(buffer: string): { index: number; length: number } | null {
  const match = /\r\n\r\n|\n\n|\r\r/.exec(buffer);
  if (!match || typeof match.index !== "number") return null;
  return { index: match.index, length: match[0].length };
}

function extractSseData(block: string): string | null {
  const dataLines = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) return null;
  return dataLines.join("\n");
}

function mergeChunkText(existing: string, incoming: string): string {
  if (!incoming) return existing;
  if (!existing) return incoming;
  if (incoming.startsWith(existing)) return incoming;
  if (existing.endsWith(incoming)) return existing;
  return existing + incoming;
}

async function tryModel(
  apiKey: string,
  model: string,
  history: ConversationTurn[],
  userMessage: string,
): Promise<ModelResult> {
  const body = buildBody(history, model);

  let response: Response;
  try {
    response = await fetch(GEMINI_URL(model, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return { ok: false, text: "", status: 0, errorMsg: `Network error: ${String(error)}` };
  }

  let payload: GeminiPayload;
  try {
    payload = await response.json() as GeminiPayload;
  } catch {
    return { ok: false, text: "", status: response.status, errorMsg: "Failed to parse API response" };
  }

  if (!response.ok) {
    return {
      ok: false,
      text: "",
      status: response.status,
      errorMsg: payload.error?.message ?? `HTTP ${response.status}`,
    };
  }

  const raw = extractText(payload);
  if (!raw) {
    const reason = describeEmptyPayload(payload);
    console.warn(`[chat] ${model} empty. finishReason=${reason || "unknown"}`);

    const fallback = buildFallbackReply(userMessage);
    if (fallback) return { ok: true, text: fallback, status: response.status, errorMsg: "" };

    return {
      ok: false,
      text: "",
      status: 500,
      errorMsg: `No content from model (finishReason=${reason || "unknown"})`,
    };
  }

  const cleaned = cleanText(raw);
  return {
    ok: true,
    text: cleaned || raw.slice(0, 400).trim(),
    status: response.status,
    errorMsg: "",
  };
}

async function tryModelStream(
  apiKey: string,
  model: string,
  history: ConversationTurn[],
  userMessage: string,
  response: VercelLikeResponse,
): Promise<ModelResult> {
  if (!response.write || !response.end) {
    return { ok: false, text: "", status: 500, errorMsg: "Streaming not supported.", streamStarted: false };
  }

  const body = buildBody(history, model);

  let upstream: Response;
  try {
    upstream = await fetch(GEMINI_STREAM_URL(model, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return {
      ok: false,
      text: "",
      status: 0,
      errorMsg: `Network error: ${String(error)}`,
      streamStarted: false,
    };
  }

  if (!upstream.ok) {
    const rawError = await upstream.text();
    return {
      ok: false,
      text: "",
      status: upstream.status,
      errorMsg: readApiError(rawError, upstream.status),
      streamStarted: false,
    };
  }

  if (!upstream.body) {
    return { ok: false, text: "", status: upstream.status, errorMsg: "Empty stream body.", streamStarted: false };
  }

  response.status(200);
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();
  writeStreamEvent(response, "meta", { model });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let rawText = "";
  let visibleText = "";
  let lastFinishReason = "";

  const processBlock = (block: string) => {
    const data = extractSseData(block);
    if (!data || data === "[DONE]") return;

    let parsed: GeminiPayload | GeminiPayload[];
    try {
      parsed = JSON.parse(data) as GeminiPayload | GeminiPayload[];
    } catch {
      return;
    }

    const payloads = Array.isArray(parsed) ? parsed : [parsed];
    for (const payload of payloads) {
      const reason = extractFinishReason(payload);
      if (reason) lastFinishReason = reason;

      const chunkText = extractTextParts(payload);
      if (chunkText === "") continue;

      rawText = mergeChunkText(rawText, chunkText);
      const next = cleanText(rawText) || rawText.trim();
      if (next && next !== visibleText) {
        visibleText = next;
        writeStreamEvent(response, "chunk", { text: visibleText, model });
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      let boundary = findSseBoundary(buffer);
      while (boundary) {
        processBlock(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary.length);
        boundary = findSseBoundary(buffer);
      }

      if (done) break;
    }

    if (buffer.trim()) processBlock(buffer);
  } catch (error) {
    writeStreamEvent(response, "error", { error: `Stream interrupted: ${String(error)}`, model });
    response.end();
    return {
      ok: false,
      text: visibleText,
      status: 500,
      errorMsg: String(error),
      streamStarted: true,
    };
  }

  if (!rawText) {
    console.warn(`[chat] ${model} stream empty. finishReason=${lastFinishReason || "unknown"}`);

    const recovered = await tryModel(apiKey, model, history, userMessage);
    if (recovered.ok && recovered.text) {
      writeStreamEvent(response, "chunk", { text: recovered.text, model, recovered: "generateContent" });
      writeStreamEvent(response, "done", { text: recovered.text, model, recovered: "generateContent" });
      response.end();
      return { ok: true, text: recovered.text, status: 200, errorMsg: "", streamStarted: true };
    }

    const fallback = buildFallbackReply(userMessage);
    if (!fallback) {
      const recoveryHint = recovered.errorMsg ? `; fallback=${recovered.errorMsg}` : "";
      writeStreamEvent(
        response,
        "error",
        { error: `No content from model (finishReason=${lastFinishReason || "unknown"}${recoveryHint})`, model },
      );
      response.end();
      return {
        ok: false,
        text: "",
        status: 500,
        errorMsg: `No content from model${recoveryHint}`,
        streamStarted: true,
      };
    }

    writeStreamEvent(response, "chunk", { text: fallback, model });
    writeStreamEvent(response, "done", { text: fallback, model });
    response.end();
    return { ok: true, text: fallback, status: 200, errorMsg: "", streamStarted: true };
  }

  const finalText = cleanText(rawText) || visibleText.trim() || rawText.slice(0, 400).trim();
  writeStreamEvent(response, "done", { text: finalText, model });
  response.end();
  return { ok: true, text: finalText, status: 200, errorMsg: "", streamStarted: true };
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== "POST") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    return;
  }

  let body: { message?: string; sessionId?: string; history?: unknown; stream?: boolean };
  try {
    body = parseBody(req.body);
  } catch {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(400).json({ error: "Invalid JSON." });
    return;
  }

  const message = body.message?.trim() ?? "";
  const shouldStream = body.stream === true;

  if (!message) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(400).json({ error: "Message is required." });
    return;
  }
  if (message.length > 400) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(400).json({ error: "Message too long. Max 400 characters." });
    return;
  }
  if (isRateLimited(getIp(req))) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(429).json({ error: "Too many requests. Please wait a moment." });
    return;
  }

  const { sessionId, setCookie } = resolveSessionAccess(
    body.sessionId,
    getHeaderValue(req.headers, "cookie"),
  );
  if (setCookie) {
    res.setHeader("Set-Cookie", setCookie);
  }

  const session = getOrCreateSession(sessionId);

  // Sync client-side history into session for Vercel serverless persistence
  const clientHistory = Array.isArray(body.clientHistory) ? body.clientHistory : [];
  if (clientHistory.length > 0) {
    const systemTurns = session.messageHistory.filter((t) => t.role === "system");
    const clientTurns: ConversationTurn[] = clientHistory
      .filter((t) => t.role === "user" || t.role === "assistant")
      .filter((t) => typeof t.content === "string" && t.content.trim())
      .map((t) => ({ role: t.role as ChatRole, content: t.content.trim() }));
    session.messageHistory = [...systemTurns, ...clientTurns];
  }

  const classification = await classifyIntents(message, apiKey, MODEL_PRIMARY);

  // If classifier is confident, inject only matched contexts.
  // If not confident, inject ALL contexts as fallback (unified prompt approach).
  if (classification.confident) {
    injectContextIfNeeded(session, classification.intents);
  } else {
    console.log(`[chat] classifier not confident — injecting all contexts`);
    injectAllContexts(session);
  }

  appendTurn(session, { role: "user", content: message });

  const queue = [MODEL_PRIMARY, MODEL_FALLBACK].filter(
    (model, index, models) => Boolean(model) && models.indexOf(model) === index,
  );

  if (shouldStream) {
    for (const model of queue) {
      console.log(`[chat] -> streaming ${model}`);
      const result = await tryModelStream(apiKey, model, session.messageHistory, message, res);
      if (result.ok) {
        appendTurn(session, { role: "assistant", content: result.text });
        console.log(`[chat] ok ${model}`);
        return;
      }

      console.warn(`[chat] x ${model} [${result.status}]: ${result.errorMsg}`);
      if (isModelUnavailable(result.status, result.errorMsg)) continue;

      rollbackPendingUserTurn(session);
      if (result.streamStarted) return;

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(500).json({ error: result.errorMsg || "The assistant encountered an error." });
      return;
    }

    rollbackPendingUserTurn(session);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(500).json({ error: "AI model currently unavailable. Please try again." });
    return;
  }

  for (const model of queue) {
    console.log(`[chat] -> ${model}`);
    const result = await tryModel(apiKey, model, session.messageHistory, message);
    if (result.ok) {
      appendTurn(session, { role: "assistant", content: result.text });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).json({ text: result.text });
      return;
    }

    console.warn(`[chat] x ${model} [${result.status}]: ${result.errorMsg}`);
    if (isModelUnavailable(result.status, result.errorMsg)) continue;

    rollbackPendingUserTurn(session);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(500).json({ error: result.errorMsg || "The assistant encountered an error." });
    return;
  }

  rollbackPendingUserTurn(session);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(500).json({ error: "AI model currently unavailable. Please try again." });
}
