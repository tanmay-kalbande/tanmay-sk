import { CONTACT_PROMPT } from "../prompts/contact.js";
import { GENERAL_PROMPT } from "../prompts/general.js";
import { PROJECTS_PROMPT } from "../prompts/projects.js";
import { RESUME_PROMPT } from "../prompts/resume.js";
import { SKILLS_PROMPT } from "../prompts/skills.js";
import type { ChatSession, IntentLabel } from "./types.js";

export const PROMPT_MODULES: Record<IntentLabel, string> = {
  projects: PROJECTS_PROMPT,
  skills: SKILLS_PROMPT,
  resume: RESUME_PROMPT,
  contact: CONTACT_PROMPT,
  general: GENERAL_PROMPT,
};

const ALL_INTENTS: IntentLabel[] = ["projects", "skills", "resume", "contact", "general"];

export function injectContextIfNeeded(session: ChatSession, intents: IntentLabel[]): void {
  for (const intent of intents) {
    if (!session.activeContexts.has(intent)) {
      session.messageHistory.push({
        role: "system",
        content: PROMPT_MODULES[intent],
      });
      session.activeContexts.add(intent);
    }
  }
}

/**
 * Inject ALL context modules into the session.
 * Used as a fallback when the classifier cannot confidently determine intent.
 */
export function injectAllContexts(session: ChatSession): void {
  injectContextIfNeeded(session, ALL_INTENTS);
}
