export type IntentLabel = "projects" | "skills" | "resume" | "contact" | "general";

export type ChatRole = "system" | "user" | "assistant";

export type ConversationTurn = {
  role: ChatRole;
  content: string;
};

export type ChatSession = {
  id: string;
  basePromptInjected: boolean;
  messageHistory: ConversationTurn[];
  activeContexts: Set<IntentLabel>;
  lastTouchedAt: number;
};

export const INTENT_ORDER: IntentLabel[] = [
  "projects",
  "skills",
  "resume",
  "contact",
  "general",
];
