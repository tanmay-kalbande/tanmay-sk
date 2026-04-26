import { INTENT_ORDER, type IntentLabel } from "./types.js";

const INTENT_KEYWORDS: Record<IntentLabel, string[]> = {
  projects: ["project", "projects", "built", "build", "demo", "github", "repo", "portfolio", "pustakam", "live link", "live links"],
  skills: ["skill", "tech", "stack", "language", "tool", "know", "use", "proficient"],
  resume: [
    "experience",
    "career",
    "role",
    "job",
    "worked",
    "history",
    "rubixe",
    "capgemini",
    "certification",
    "certifications",
    "certified",
  ],
  contact: ["contact", "hire", "reach", "email", "whatsapp", "linkedin", "connect"],
  general: ["who", "what", "tell me", "about", "hello", "hi", "intro", "introduce", "available"],
};

const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(text: string, keyword: string): boolean {
  const pattern = keyword
    .split(/\s+/)
    .map((part) => escapeRegex(part))
    .join("\\s+");

  return new RegExp(`\\b${pattern}\\b`, "i").test(text);
}

function uniqueIntents(intents: IntentLabel[]): IntentLabel[] {
  const seen = new Set<IntentLabel>();
  const ordered: IntentLabel[] = [];

  for (const intent of INTENT_ORDER) {
    if (intents.includes(intent) && !seen.has(intent)) {
      seen.add(intent);
      ordered.push(intent);
    }
  }

  return ordered;
}

function isStrongGeneralMatch(text: string): boolean {
  return (
    /\bwho is\b/.test(text) ||
    /\btell me about\b/.test(text) ||
    /\bintroduce\b/.test(text) ||
    /\bintroduction\b/.test(text) ||
    /\bavailable\b/.test(text) ||
    /\bavailability\b/.test(text) ||
    /\bwhere\b.*\bbased\b/.test(text) ||
    /\bcurrent role\b/.test(text) ||
    /^(hi|hello|hey)\b/.test(text)
  );
}

function classifyHeuristically(message: string): { intents: IntentLabel[]; confident: boolean } {
  const text = message.toLowerCase();
  const scores: Record<IntentLabel, number> = {
    projects: 0,
    skills: 0,
    resume: 0,
    contact: 0,
    general: 0,
  };

  for (const intent of INTENT_ORDER) {
    for (const keyword of INTENT_KEYWORDS[intent]) {
      if (matchesKeyword(text, keyword)) {
        scores[intent] += keyword.includes(" ") ? 2 : 1;
      }
    }
  }

  const isDirectContactRequest = /\b(contact|hire|reach(?:\s+out)?|email|whatsapp|linkedin)\b/.test(text);
  const isResumeContextRequest = /\b(experience|career|worked|work history|certification|certifications|certified|capgemini|rubixe|role|roles)\b/.test(text);
  if (isDirectContactRequest && scores.resume > 0 && !isResumeContextRequest) {
    scores.resume = 0;
  }

  const specificIntents = INTENT_ORDER.filter(
    (intent) => intent !== "general" && scores[intent] > 0,
  );

  const intents = [...specificIntents];
  if (specificIntents.length === 0) {
    if (scores.general > 0 || isStrongGeneralMatch(text)) intents.push("general");
  } else if (isStrongGeneralMatch(text)) {
    intents.push("general");
  }

  const orderedIntents = uniqueIntents(intents);
  const confident =
    specificIntents.length > 0 ||
    scores.general > 1 ||
    isStrongGeneralMatch(text);

  return {
    intents: orderedIntents.length > 0 ? orderedIntents : ["general"],
    confident,
  };
}

function resolveClassifierModel(primaryModel: string): string {
  const configured = process.env.GEMINI_CLASSIFIER_MODEL?.trim();
  if (configured && configured !== primaryModel) return configured;
  if (primaryModel !== "gemini-2.0-flash-lite") return "gemini-2.0-flash-lite";
  return "gemini-2.0-flash";
}

function extractText(payload: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part.text ?? "").join("").trim();
}

function sanitiseLabels(value: unknown): IntentLabel[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : value && typeof value === "object" && Array.isArray((value as { labels?: unknown }).labels)
        ? (value as { labels: unknown[] }).labels
        : [];

  return uniqueIntents(
    raw
      .map((label) => (typeof label === "string" ? label.trim().toLowerCase() : ""))
      .filter((label): label is IntentLabel => INTENT_ORDER.includes(label as IntentLabel)),
  );
}

async function classifyWithAi(
  message: string,
  apiKey: string,
  primaryModel: string,
): Promise<IntentLabel[]> {
  const model = resolveClassifierModel(primaryModel);
  const prompt = [
    "Classify this portfolio chat message into one or more labels.",
    "Allowed labels: projects, skills, resume, contact, general.",
    "Use resume for work history, employers, dates, achievements, or certifications.",
    'Return JSON only in this format: {"labels":["projects","contact"]}.',
    `Message: ${JSON.stringify(message)}`,
  ].join("\n");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      topP: 0.1,
      topK: 1,
      maxOutputTokens: 64,
      ...(model.startsWith("gemini-") ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (model.startsWith("gemini-")) {
    body.system_instruction = {
      parts: [{ text: "You are an intent router. Output JSON only." }],
    };
  }

  const response = await fetch(GEMINI_URL(model, apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Classifier HTTP ${response.status}`);
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = extractText(payload);
  if (!raw) return [];

  try {
    return sanitiseLabels(JSON.parse(raw));
  } catch {
    return sanitiseLabels(raw);
  }
}

export type ClassificationResult = {
  intents: IntentLabel[];
  confident: boolean;
};

export async function classifyIntents(
  message: string,
  apiKey: string,
  primaryModel: string,
): Promise<ClassificationResult> {
  const heuristic = classifyHeuristically(message);
  if (heuristic.confident) return { intents: heuristic.intents, confident: true };

  try {
    const aiLabels = await classifyWithAi(message, apiKey, primaryModel);
    if (aiLabels.length > 0) return { intents: aiLabels, confident: true };
  } catch (error) {
    console.warn(`[classifier] fallback failed: ${String(error)}`);
  }

  return {
    intents: heuristic.intents.length > 0 ? heuristic.intents : ["general"],
    confident: false,
  };
}
