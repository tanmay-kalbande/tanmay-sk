import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  assistantSuggestions,
  assistantWelcomeMessage,
  assistantQuickActions,
} from "../data/siteData";
import { renderMarkdown } from "../lib/markdown";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Exchange = {
  id: string;
  query: string;
  answer: string;
  isStreaming: boolean;
  canRetry: boolean;
  cardType: CardType;
  matchedProject: string | null;
  loadingLabel: string;
  loadingTitle: string;
  loadingSubtitle: string;
  loadingStageIndex: number;
  loadingStageCount: number;
};

export type AssistantChatProps = {
  variant: "page" | "modal";
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge base
// ─────────────────────────────────────────────────────────────────────────────

const SKILLS = [
  "Python", "SQL", "R", "Pandas", "NumPy", "Scikit-learn",
  "Random Forest", "K-Means Clustering", "NLP",
  "Tableau", "Power BI", "Matplotlib", "Seaborn",
  "Flask", "Supabase", "Git", "REST APIs", "Jupyter",
];

type ProjectEntry = {
  name: string;
  desc: string;
  live?: string;
  gh?: string;
  tags?: string[];
};

const PROJECTS: ProjectEntry[] = [
  { name: "Lead Quality Prediction",     desc: "Predictive lead scoring model — **85% accuracy** — for sales prioritization.", tags: ["rubixe","lead","scoring","prediction","ml","model"] },
  { name: "K-Means Customer Segmentation", desc: "K-Means segmentation from transaction data; drove marketing strategy decisions.", tags: ["rubixe","segmentation","clustering","k-means","customer"] },
  { name: "Pustakam AI",                  desc: "Production AI book platform using multi-model LLM routing. Accepted into Z.ai Startup Program.", live: "https://pustakamai.tanmaysk.in", tags: ["pustakam","ai","book","llm","startup","z.ai"] },
  { name: "AI Data Structurer",           desc: "Converts raw unstructured data into clean formats using Gemma + Flask.", tags: ["ai data structurer","structurer","unstructured","gemma"] },
  { name: "Expense Tracker",              desc: "Personal finance web app — CSV I/O, data visualisation, responsive UI.", live: "https://expense-tail.vercel.app/", gh: "https://github.com/tanmay-kalbande/Expense-Tracker", tags: ["expense","tracker","finance","csv"] },
  { name: "Bias & Fairness Checker",      desc: "AI-powered text bias detector built with Flask + Gemma. Structured report output.", live: "https://bias-checker.onrender.com/", gh: "https://github.com/tanmay-kalbande/bias-fairness-checker", tags: ["bias","fairness","checker","ai","gemma"] },
  { name: "Table Extractor",              desc: "Flask app that scrapes and exports HTML tables from any URL via BeautifulSoup.", live: "https://table-extractor.onrender.com/", gh: "https://github.com/tanmay-kalbande/table-extractor-app", tags: ["table","extractor","scraper","beautifulsoup","flask"] },
  { name: "Enhanced macOS Notes",         desc: "macOS-inspired note-taking PWA — dark mode, rich text, local storage.", live: "https://enhanced-mac-os-notes.vercel.app/", gh: "https://github.com/tanmay-kalbande/Enhanced-macOS-Notes", tags: ["notes","macos","pwa","note"] },
  { name: "Life Loops",                   desc: "Gamified habit-tracking app with retro point system.", live: "https://life-loops-game-edition.vercel.app/", gh: "https://github.com/tanmay-kalbande/Life-Loops---Game-Edition", tags: ["life loops","habit","game","gamified"] },
  { name: "Goal Tracker",                 desc: "Daily goal tracking with progress visualisation and shareable progress.", live: "https://tanmay-kalbande.github.io/Goal-Tracker/", gh: "https://github.com/tanmay-kalbande/Goal-Tracker", tags: ["goal","tracker","goals"] },
  { name: "Incident Tracker",             desc: "Company incident management — search, filter, paginate, CSV export.", live: "https://tanmay-kalbande.github.io/Incident-Tracker/", gh: "https://github.com/tanmay-kalbande/Incident-Tracker", tags: ["incident","tracker","itsm"] },
  { name: "Mindfulness App",              desc: "Yoga & meditation guides. Minimalist PWA with offline support.", live: "https://breathewell.vercel.app/", gh: "https://github.com/tanmay-kalbande/Mindfulness-App", tags: ["mindfulness","yoga","meditation","breathe"] },
  { name: "Jawala Vyapar",                desc: "Local business phone directory — category filter, search, multi-language.", tags: ["jawala","vyapar","directory","local","business"] },
  { name: "The Scam Master Podcast",      desc: "Website for a podcast exposing fraud and scams.", live: "https://the-scam-master.vercel.app/", gh: "https://github.com/the-scam-master/podcast_webpage", tags: ["scam","master","podcast"] },
  { name: "AI Data Assistant",            desc: "Conversational analytics system — interrogate datasets in plain English.", tags: ["ai data assistant","assistant","analytics","conversational"] },
];

// Best 4 projects to feature in the ProjectsCard — flagship first
const FEATURED_PROJECTS: ProjectEntry[] = [
  PROJECTS.find((p) => p.name === "Pustakam AI")!,
  PROJECTS.find((p) => p.name === "Bias & Fairness Checker")!,
  PROJECTS.find((p) => p.name === "Expense Tracker")!,
  PROJECTS.find((p) => p.name === "Table Extractor")!,
].filter(Boolean) as ProjectEntry[];

const PROJECT_ALIASES: Record<string, string[]> = {
  "Lead Quality Prediction": ["lead quality prediction", "lead scoring"],
  "K-Means Customer Segmentation": ["k-means customer segmentation", "k-means segmentation", "customer segmentation"],
  "Pustakam AI": ["pustakam ai", "pustakam", "pustakam injin"],
  "AI Data Structurer": ["ai data structurer"],
  "Expense Tracker": ["expense tracker"],
  "Bias & Fairness Checker": ["bias and fairness checker", "bias fairness checker"],
  "Table Extractor": ["table extractor"],
  "Enhanced macOS Notes": ["enhanced macos notes", "macos notes"],
  "Life Loops": ["life loops", "life loops game edition"],
  "Goal Tracker": ["goal tracker"],
  "Incident Tracker": ["incident tracker"],
  "Mindfulness App": ["mindfulness app", "breathewell"],
  "Jawala Vyapar": ["jawala vyapar"],
  "The Scam Master Podcast": ["the scam master podcast", "scam master podcast"],
  "AI Data Assistant": ["ai data assistant"],
};

const CONTACTS = [
  { label: "Email",    icon: "✉",  href: "mailto:tanmaykalbande@gmail.com",                                                                  display: "tanmaykalbande@gmail.com" },
  { label: "LinkedIn", icon: "in", href: "https://www.linkedin.com/in/tanmay-kalbande",                                                      display: "linkedin.com/in/tanmay-kalbande" },
  { label: "GitHub",   icon: "gh", href: "https://github.com/tanmay-kalbande",                                                               display: "github.com/tanmay-kalbande" },
  { label: "WhatsApp", icon: "wa", href: "https://wa.me/7378381494?text=Hi%20Tanmay,%20I%20came%20across%20your%20portfolio%20and%20I%20", display: "+91 7378381494" },
  { label: "Resume",   icon: "↗",  href: "https://tanmay-eqdav6wyd-tanmays-projects-17b5602c.vercel.app/assets/tanmay-resume-DXrIQ_Zv.pdf", display: "View Resume PDF" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Smart card detection
// ─────────────────────────────────────────────────────────────────────────────

type CardType = "none" | "skills" | "projects" | "contact" | "single-project";
type QueryIntent = "general" | "skills" | "projects" | "contact" | "resume" | "single-project";

type LoaderFrame = {
  label: string;
  title: string;
  subtitle: string;
};

type QueryIntentResult = {
  intents: QueryIntent[];
  primaryIntent: QueryIntent;
  matchedProject: string | null;
};

const ROUTING_STAGE_MS = 240;
const CONTACT_QUERY_RE = /\b(contact|hire|reach(?:\s+out)?|email|mail|whatsapp|linkedin|connect|get in touch|collaborat(?:e|ion)|work with)\b/i;
const SKILLS_QUERY_RE = /\b(skill|skills|tech stack|stack|tool|tools|language|languages|framework|frameworks|library|libraries|technology|technologies|proficient|expertise)\b/i;
const RESUME_QUERY_RE = /\b(experience|work history|career|role|roles|job|jobs|worked|employment|employer|timeline|resume|cv|certification|certifications|certified|capgemini|rubixe)\b/i;
const PROJECT_QUERY_RE = /\b(project|projects|built|build|building|demo|demos|github|repo|repositories|portfolio|showcase|case study|case studies|live link|live links|app|apps)\b/i;
const INTENT_PRIORITY: QueryIntent[] = ["single-project", "contact", "skills", "resume", "projects", "general"];

function findMentionedProject(query: string): ProjectEntry | null {
  const q = query.toLowerCase();

  const matchesAlias = (alias: string) => {
    const pattern = alias
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");

    return new RegExp(`\\b${pattern}\\b`, "i").test(q);
  };

  for (const p of PROJECTS) {
    if (matchesAlias(p.name.toLowerCase())) return p;

    const aliases = PROJECT_ALIASES[p.name] ?? [];
    if (aliases.some((alias) => matchesAlias(alias.toLowerCase()))) return p;
  }
  return null;
}

function detectQueryIntent(userQuery: string): QueryIntentResult {
  const matches = new Set<QueryIntent>();
  const mentionedProject = findMentionedProject(userQuery);

  if (CONTACT_QUERY_RE.test(userQuery)) matches.add("contact");
  if (SKILLS_QUERY_RE.test(userQuery)) matches.add("skills");
  if (RESUME_QUERY_RE.test(userQuery)) matches.add("resume");
  if (mentionedProject) matches.add("single-project");
  if (PROJECT_QUERY_RE.test(userQuery)) matches.add("projects");

  if (mentionedProject && matches.size === 2 && matches.has("single-project") && matches.has("projects")) {
    matches.delete("projects");
  }

  if (matches.size === 0) matches.add("general");

  const intents = INTENT_PRIORITY.filter((intent) => matches.has(intent));

  return {
    intents,
    primaryIntent: intents[0] ?? "general",
    matchedProject: mentionedProject?.name ?? null,
  };
}

function detectCard(
  intentResult: QueryIntentResult,
): { cardType: CardType; matchedProject: string | null } {
  const nonGeneralIntents = intentResult.intents.filter((intent) => intent !== "general");
  if (nonGeneralIntents.length > 1) {
    return { cardType: "none", matchedProject: null };
  }

  if (intentResult.matchedProject) {
    return { cardType: "single-project", matchedProject: intentResult.matchedProject };
  }

  const cardIntents = intentResult.intents.filter(
    (intent) => intent === "contact" || intent === "skills" || intent === "projects",
  );

  if (cardIntents.length !== 1) {
    return { cardType: "none", matchedProject: null };
  }

  if (cardIntents[0] === "contact") return { cardType: "contact", matchedProject: null };
  if (cardIntents[0] === "skills") return { cardType: "skills", matchedProject: null };
  if (cardIntents[0] === "projects") return { cardType: "projects", matchedProject: null };

  return { cardType: "none", matchedProject: null };
}

function findProjectMentionName(text: string): string | null {
  return findMentionedProject(text)?.name ?? null;
}

function findRecentProjectMention(exchanges: Pick<Exchange, "query" | "answer">[]): string | null {
  for (let index = exchanges.length - 1; index >= 0; index -= 1) {
    const exchange = exchanges[index];
    const match = findProjectMentionName(`${exchange.query}\n${exchange.answer}`);
    if (match) return match;
  }

  return null;
}

function resolveProjectCard(
  query: string,
  answer: string,
  priorExchanges: Pick<Exchange, "query" | "answer">[],
  matchedProject: string | null,
): { cardType: CardType; matchedProject: string | null } {
  const projectName =
    matchedProject ??
    findProjectMentionName(query) ??
    findProjectMentionName(answer) ??
    findRecentProjectMention(priorExchanges);

  if (!projectName) {
    return { cardType: "none", matchedProject: null };
  }

  return { cardType: "single-project", matchedProject: projectName };
}

function resolveExchangeCard(
  intentResult: QueryIntentResult,
  query: string,
  answer: string,
  priorExchanges: Pick<Exchange, "query" | "answer">[],
): { cardType: CardType; matchedProject: string | null } {
  const baseCard = detectCard(intentResult);

  if (baseCard.cardType === "projects" || baseCard.cardType === "single-project") {
    return resolveProjectCard(query, answer, priorExchanges, baseCard.matchedProject);
  }

  return baseCard;
}

function needsSpecializedRouting(intentResult: QueryIntentResult): boolean {
  return intentResult.intents.some((intent) => intent !== "general");
}

function getLoaderFrames(intentResult: QueryIntentResult): LoaderFrame[] {
  const projectName = intentResult.matchedProject;

  if (intentResult.intents.length > 1) {
    return [
      { label: "Combined", title: "Reading your request", subtitle: "Sorting the parts you asked about" },
      { label: "Combined", title: "Loading the right context", subtitle: "Pulling together the relevant profile details" },
      { label: "Combined", title: "Shaping one clean answer", subtitle: "Keeping the response focused and clear" },
      { label: "Combined", title: "Generating reply", subtitle: "Answer is about to stream" },
    ];
  }

  switch (intentResult.primaryIntent) {
    case "contact":
      return [
        { label: "Contact", title: "Reading contact request", subtitle: "Checking the best way to reach Tanmay" },
        { label: "Contact", title: "Loading contact details", subtitle: "Pulling email, LinkedIn, WhatsApp, and resume links" },
        { label: "Contact", title: "Preparing contact reply", subtitle: "Keeping the answer direct and useful" },
        { label: "Contact", title: "Generating reply", subtitle: "Answer is about to stream" },
      ];
    case "skills":
      return [
        { label: "Skills", title: "Reading skills request", subtitle: "Checking whether you want stack, tools, or experience depth" },
        { label: "Skills", title: "Loading skill profile", subtitle: "Pulling languages, libraries, BI tools, and AI stack" },
        { label: "Skills", title: "Preparing stack summary", subtitle: "Ordering the strongest technical details first" },
        { label: "Skills", title: "Generating reply", subtitle: "Answer is about to stream" },
      ];
    case "resume":
      return [
        { label: "Experience", title: "Reading experience request", subtitle: "Looking for roles, employers, dates, and certifications" },
        { label: "Experience", title: "Loading work history", subtitle: "Pulling the relevant career timeline into context" },
        { label: "Experience", title: "Preparing timeline summary", subtitle: "Keeping the answer clean and chronological" },
        { label: "Experience", title: "Generating reply", subtitle: "Answer is about to stream" },
      ];
    case "single-project":
      return [
        { label: "Project", title: "Reading project request", subtitle: `Matching the request to ${projectName ?? "the right project"}` },
        { label: "Project", title: "Loading project details", subtitle: "Pulling the build, stack, and live context" },
        { label: "Project", title: "Preparing project summary", subtitle: "Focusing the reply on the selected project" },
        { label: "Project", title: "Generating reply", subtitle: "Answer is about to stream" },
      ];
    case "projects":
      return [
        { label: "Projects", title: "Reading project request", subtitle: "Checking whether you want builds, demos, or GitHub links" },
        { label: "Projects", title: "Loading project list", subtitle: "Pulling the most relevant work into context" },
        { label: "Projects", title: "Preparing showcase", subtitle: "Ordering the projects for a cleaner answer" },
        { label: "Projects", title: "Generating reply", subtitle: "Answer is about to stream" },
      ];
    default:
      return [
        { label: "General", title: "Reading query", subtitle: "Understanding the request" },
        { label: "General", title: "Drafting reply", subtitle: "Preparing a focused portfolio answer" },
      ];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────────

function normaliseInstructionLine(line: string): string {
  return line
    .trim()
    .replace(/^(?:[-*•]+\s*)+/, "")
    .replace(/^(?:\d+\.\s*)+/, "")
    .replace(/^(?:[*_`]+\s*)+/, "")
    .trim();
}

function tidyVisibleAnswer(text: string): string {
  let cleaned = text.replace(/[ \t]+$/gm, "").trim();

  cleaned = cleaned.replace(/\s*\((?:violates|breaks)\s+"[^"]+"\)\.?$/i, "").trim();

  const quoteCount = (cleaned.match(/"/g) ?? []).length;
  if (quoteCount % 2 === 1) {
    cleaned = cleaned.replace(/"+$/, "").trim();
  }

  return cleaned;
}

function isInstructionLeakLine(line: string): boolean {
  const cleaned = normaliseInstructionLine(line);

  return (
    /^system role:/i.test(cleaned) ||
    /^role:/i.test(cleaned) ||
    /^my role:/i.test(cleaned) ||
    /^persona:/i.test(cleaned) ||
    /^voice:/i.test(cleaned) ||
    /^core rules:/i.test(cleaned) ||
    /^boundaries:/i.test(cleaned) ||
    /^constraint:/i.test(cleaned) ||
    /^constraints:/i.test(cleaned) ||
    /^identity:/i.test(cleaned) ||
    /^behavior:/i.test(cleaned) ||
    /^profile:/i.test(cleaned) ||
    /^projects:/i.test(cleaned) ||
    /^skills:/i.test(cleaned) ||
    /^certifications:/i.test(cleaned) ||
    /^experience details:/i.test(cleaned) ||
    /^default length:/i.test(cleaned) ||
    /^draft \d+:/i.test(cleaned) ||
    /^(constraint check:|out-of-scope response:|tone\/style:|response should be:)/i.test(cleaned) ||
    /^(the user is asking|the user just said|the system instructions state:|i must briefly state|the question .+ is outside the scope)/i.test(cleaned) ||
    /^(the assistant needs to|avoid:|align with:)/i.test(cleaned) ||
    /^(context:|reference profile:|scope:|style:)/i.test(cleaned) ||
    /^(direct and natural\?|2-5 sentences\?|no filler\?|no role restatement\?|scope adhered to\?|let'?s try:)/i.test(cleaned) ||
    /^(acknowledge the user|identify who i am|offer help)/i.test(cleaned) ||
    /^(greeting|introduction of who i am|offering help regarding)/i.test(cleaned) ||
    /^(you are tanmay'?s ai assistant|tone:|keep most answers|answer only about|never repeat|never output|do not use filler|if a fact is not in the profile|for off-topic requests|portfolio:|github:|linkedin:|email:|whatsapp:|resume:|medium:)/i.test(cleaned)
  );
}

function findEmbeddedAnswerStart(line: string): number {
  const candidates = [
    line.lastIndexOf("Hello!"),
    line.lastIndexOf("Hi!"),
    line.lastIndexOf("Hey!"),
  ].filter((index) => index >= 0);

  const introPattern = /(?:I am|I'm)\s+Tanmay(?: Kalbande)?'s AI (?:portfolio )?assistant/gi;
  let introMatch: RegExpExecArray | null;
  while ((introMatch = introPattern.exec(line)) !== null) {
    candidates.push(introMatch.index);
  }

  return candidates.length > 0 ? Math.max(...candidates) : -1;
}

function scrubInstructionLeak(raw: string): string {
  let text = raw;

  text = text.replace(/<\|channel\>thought[\s\S]*?<channel\|>/gi, "");
  text = text.replace(/<\|channel\>thought[\s\S]*$/gi, "");
  text = text.replace(/<\|turn\>(?:system|user|model)\s*/gi, "");
  text = text.replace(/<turn\|>/gi, "");
  text = text.replace(/<bos>|<eos>/gi, "");

  // Strip Gemma's draft/reasoning output and internal monologue
  const draftMarker = text.search(/^\*\s*(?:Draft \d|Rule|The user|I should|Constraint|Scope|Tone|Style|Response should|Let'?s try|Goal:)/im);
  if (draftMarker > 0) {
    const beforeDrafts = text.slice(0, draftMarker).trim();
    if (beforeDrafts.length >= 15) {
      text = beforeDrafts;
    }
  }

  const finalQuoteMatch = text.match(/"([^"]+)"\s*$/);
  if (finalQuoteMatch && finalQuoteMatch[1].length > 10) {
    if (text.includes('*')) {
       return finalQuoteMatch[1].trim();
    }
  }

  if (/^\s*\*/.test(text)) {
      const quotes = text.match(/"([^"]+)"/g);
      if (quotes && quotes.length > 0) {
          const lastQuote = quotes[quotes.length - 1].replace(/"/g, '').trim();
          if (lastQuote.length > 15) {
              return lastQuote;
          }
      }
  }

  const lines = text.split(/\r?\n/);
  const firstMarker = lines.findIndex((line) => isInstructionLeakLine(line));

  if (firstMarker === -1) return text.trim();

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
      return tidyVisibleAnswer([normalised.slice(answerStart), ...lines.slice(end + 1)].join("\n").trim());
    }

    if (
      !trimmed ||
      isInstructionLeakLine(trimmed) ||
      /^(?:[-*•]|\d+\.)\s/.test(trimmed) ||
      /^[A-Z][A-Z /&-]{5,}$/.test(trimmed)
    ) {
      end += 1;
      continue;
    }

    break;
  }

  const remainder = lines.slice(end).join("\n").trim();

  if (!remainder) return prefix;
  if (!prefix || /^(hello|hi|hey)\b[\s!.]*$/i.test(prefix)) return tidyVisibleAnswer(remainder);

  return prefix;
}

type AssistantStreamPayload = {
  text?: string;
  error?: string;
  model?: string;
};

function readApiError(raw: string): string {
  try {
    const payload = JSON.parse(raw) as { error?: string; text?: string };
    return (payload.error ?? payload.text ?? raw.slice(0, 200)) || "Unexpected response";
  } catch {
    return raw.slice(0, 200) || "Unexpected response";
  }
}

function parseStreamBlock(block: string): { event: string; payload: AssistantStreamPayload } | null {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }

  if (dataLines.length === 0) return null;

  const raw = dataLines.join("\n");
  try {
    return { event, payload: JSON.parse(raw) as AssistantStreamPayload };
  } catch {
    return { event, payload: { text: raw } };
  }
}

function findSseBoundary(buffer: string): { index: number; length: number } | null {
  const match = /\r\n\r\n|\n\n|\r\r/.exec(buffer);
  if (!match || typeof match.index !== "number") return null;
  return { index: match.index, length: match[0].length };
}

async function consumeAssistantStream(
  response: Response,
  onEvent: (event: string, payload: AssistantStreamPayload) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming response body was not available.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let boundary = findSseBoundary(buffer);
    while (boundary) {
      const parsed = parseStreamBlock(buffer.slice(0, boundary.index));
      if (parsed) onEvent(parsed.event, parsed.payload);
      buffer = buffer.slice(boundary.index + boundary.length);
      boundary = findSseBoundary(buffer);
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const parsed = parseStreamBlock(buffer);
    if (parsed) onEvent(parsed.event, parsed.payload);
  }
}

function applyInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
      const url = href.trim();
      const safe = url.startsWith("http") || url.startsWith("mailto:") || url.startsWith("tel:") ? url : "#";
      let display = text.replace(/^mailto:/, "");
      if (/^https?:\/\//.test(display)) {
        try { display = new URL(display).hostname.replace(/^www\./, ""); }
        catch { display = display.slice(0, 30) + "…"; }
      }
      return `<a href='${safe}' target='_blank' rel='noopener noreferrer'>${display}</a>`;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rich Cards
// ─────────────────────────────────────────────────────────────────────────────

function SkillsCard() {
  const [shown, setShown] = useState(9);
  const visible = SKILLS.slice(0, shown);
  const remaining = SKILLS.length - shown;
  return (
    <div className="rc rc--skills">
      <p className="rc__title">TECH STACK</p>
      <div className="rc__chips">
        {visible.map((s) => <span key={s} className="rc__chip">{s}</span>)}
        {remaining > 0 && (
          <button
            className="rc__chip rc__chip--more"
            onClick={() => setShown((n: number) => Math.min(n + 4, SKILLS.length))}
          >
            +{Math.min(4, remaining)} more
          </button>
        )}
      </div>
    </div>
  );
}

function ProjectsCard() {
  return (
    <div className="rc rc--projects">
      <p className="rc__title">SELECTED PROJECTS</p>
      <div className="rc__project-list">
        {FEATURED_PROJECTS.map((p) => (
          <div key={p.name} className="rc__project">
            <div className="rc__project-top">
              <span className="rc__project-name">{p.name}</span>
              <div className="rc__project-btns">
                {p.live && <a href={p.live} target="_blank" rel="noopener noreferrer" className="rc__btn rc__btn--live">Live ↗</a>}
                {p.gh && <a href={p.gh} target="_blank" rel="noopener noreferrer" className="rc__btn rc__btn--gh">GitHub</a>}
              </div>
            </div>
            <p className="rc__project-desc" dangerouslySetInnerHTML={{ __html: applyInline(p.desc) }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SingleProjectCard({ projectName }: { projectName: string }) {
  const project = PROJECTS.find((p) => p.name === projectName);
  if (!project) return null;
  return (
    <div className="rc rc--single-project">
      <p className="rc__title">PROJECT</p>
      <div className="rc__project rc__project--solo">
        <div className="rc__project-top">
          <span className="rc__project-name rc__project-name--solo">{project.name}</span>
        </div>
        <p className="rc__project-desc rc__project-desc--solo" dangerouslySetInnerHTML={{ __html: applyInline(project.desc) }} />
        {(project.live || project.gh) && (
          <div className="rc__project-btns rc__project-btns--solo">
            {project.live && <a href={project.live} target="_blank" rel="noopener noreferrer" className="rc__btn rc__btn--live">Live demo ↗</a>}
            {project.gh && <a href={project.gh} target="_blank" rel="noopener noreferrer" className="rc__btn rc__btn--gh">GitHub</a>}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard() {
  return (
    <div className="rc rc--contact">
      <p className="rc__title">GET IN TOUCH</p>
      {CONTACTS.map((c) => (
        <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" className="rc__contact">
          <span className="rc__contact-icon">{c.icon}</span>
          <span className="rc__contact-body">
            <span className="rc__contact-name">{c.label}</span>
            <span className="rc__contact-val">{c.display}</span>
          </span>
          <span className="rc__contact-arrow">↗</span>
        </a>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Indicator
// ─────────────────────────────────────────────────────────────────────────────

function LoadingIndicator({
  title,
}: LoaderFrame & { stageIndex: number; stageCount: number }) {
  return (
    <div className="qx__loading-v3" aria-label="AI is thinking">
      <span className="qx__loading-avatar" aria-hidden="true">
        <AssistantConstellationMark
          className="qx__loading-mark"
          animated
          showShell={false}
        />
      </span>
      <span className="qx__loading-copy">
        <span className="qx__loading-title qx__loading-title--shimmer">
          {title}
        </span>
      </span>
    </div>
  );
}

function AssistantConstellationMark({
  className,
  animated = false,
  showShell = true,
}: {
  className?: string;
  animated?: boolean;
  showShell?: boolean;
}) {
  return (
    <svg
      className={[
        "qx__ai-mark",
        animated ? "qx__ai-mark--animated" : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {showShell && (
        <rect className="qx__ai-mark-shell" width="64" height="64" rx="13" fill="#111110" />
      )}
      <line
        className="qx__ai-mark-edge qx__ai-mark-edge--1"
        x1="32"
        y1="20"
        x2="17"
        y2="45"
        stroke="#c8451a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity=".45"
      />
      <line
        className="qx__ai-mark-edge qx__ai-mark-edge--2"
        x1="32"
        y1="20"
        x2="47"
        y2="45"
        stroke="#c8451a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity=".45"
      />
      <line
        className="qx__ai-mark-edge qx__ai-mark-edge--3"
        x1="17"
        y1="45"
        x2="47"
        y2="45"
        stroke="#c8451a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity=".35"
      />
      {animated && (
        <>
          <circle
            className="qx__ai-mark-core-halo"
            cx="32"
            cy="20"
            r="9"
            fill="#c8451a"
            fillOpacity="0.12"
          />
          <line
            className="qx__ai-mark-signal qx__ai-mark-signal--1"
            x1="32"
            y1="20"
            x2="17"
            y2="45"
            stroke="#ffb18f"
            strokeWidth="2.15"
            pathLength="100"
          />
          <line
            className="qx__ai-mark-signal qx__ai-mark-signal--2"
            x1="32"
            y1="20"
            x2="47"
            y2="45"
            stroke="#ffb18f"
            strokeWidth="2.15"
            pathLength="100"
          />
          <line
            className="qx__ai-mark-signal qx__ai-mark-signal--3"
            x1="17"
            y1="45"
            x2="47"
            y2="45"
            stroke="#ffb18f"
            strokeWidth="1.55"
            pathLength="100"
          />
          <circle className="qx__ai-mark-packet qx__ai-mark-packet--1" cx="32" cy="20" r="1.15" fill="#ffe6d8">
            <animate attributeName="cx" values="32;17" dur="1.72s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="cy" values="20;45" dur="1.72s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.98;0" keyTimes="0;0.18;1" dur="1.72s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="r" values="0.75;1.5;0.85" keyTimes="0;0.28;1" dur="1.72s" begin="0s" repeatCount="indefinite" />
          </circle>
          <circle className="qx__ai-mark-packet qx__ai-mark-packet--2" cx="32" cy="20" r="1.15" fill="#ffe6d8">
            <animate attributeName="cx" values="32;47" dur="2.08s" begin="0.34s" repeatCount="indefinite" />
            <animate attributeName="cy" values="20;45" dur="2.08s" begin="0.34s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.94;0" keyTimes="0;0.16;1" dur="2.08s" begin="0.34s" repeatCount="indefinite" />
            <animate attributeName="r" values="0.72;1.42;0.82" keyTimes="0;0.24;1" dur="2.08s" begin="0.34s" repeatCount="indefinite" />
          </circle>
          <circle className="qx__ai-mark-packet qx__ai-mark-packet--3" cx="17" cy="45" r="0.95" fill="#ffe6d8">
            <animate attributeName="cx" values="17;47" dur="1.86s" begin="0.92s" repeatCount="indefinite" />
            <animate attributeName="cy" values="45;45" dur="1.86s" begin="0.92s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.82;0" keyTimes="0;0.18;1" dur="1.86s" begin="0.92s" repeatCount="indefinite" />
            <animate attributeName="r" values="0.62;1.18;0.72" keyTimes="0;0.26;1" dur="1.86s" begin="0.92s" repeatCount="indefinite" />
          </circle>
          <circle className="qx__ai-mark-packet qx__ai-mark-packet--4" cx="47" cy="45" r="0.82" fill="#fff0e7">
            <animate attributeName="cx" values="47;32" dur="2.34s" begin="1.18s" repeatCount="indefinite" />
            <animate attributeName="cy" values="45;20" dur="2.34s" begin="1.18s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.6;0" keyTimes="0;0.2;1" dur="2.34s" begin="1.18s" repeatCount="indefinite" />
            <animate attributeName="r" values="0.56;1;0.62" keyTimes="0;0.3;1" dur="2.34s" begin="1.18s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      <circle className="qx__ai-mark-node qx__ai-mark-node--1" cx="17" cy="45" r="4.5" fill="#c8451a" fillOpacity="0.7" />
      <circle className="qx__ai-mark-node qx__ai-mark-node--2" cx="47" cy="45" r="4.5" fill="#c8451a" fillOpacity="0.7" />
      <circle className="qx__ai-mark-node qx__ai-mark-node--core" cx="32" cy="20" r="6.5" fill="#c8451a" />
      {animated && (
        <>
          <circle className="qx__ai-mark-node-glint qx__ai-mark-node-glint--core" cx="29.8" cy="17.8" r="1.1" fill="#fff5ee" fillOpacity="0.6" />
          <circle className="qx__ai-mark-node-glint qx__ai-mark-node-glint--1" cx="15.8" cy="43.8" r="0.75" fill="#fff5ee" fillOpacity="0.42" />
          <circle className="qx__ai-mark-node-glint qx__ai-mark-node-glint--2" cx="45.9" cy="43.8" r="0.75" fill="#fff5ee" fillOpacity="0.42" />
        </>
      )}
      <circle className="qx__ai-mark-speck qx__ai-mark-speck--1" cx="52" cy="14" r="1.2" fill="#f0f0ee" fillOpacity="0.35" />
      <circle className="qx__ai-mark-speck qx__ai-mark-speck--2" cx="12" cy="30" r="1" fill="#f0f0ee" fillOpacity="0.2" />
      {showShell && (
        <rect
          className="qx__ai-mark-shell-border"
          x="0.5"
          y="0.5"
          width="63"
          height="63"
          rx="12.5"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.07"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exchange block
// ─────────────────────────────────────────────────────────────────────────────

const exchangeVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, transition: { duration: 0.15 } },
};

const answerStateTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };

function appendStreamingCursor(html: string): string {
  const cursor = '<span class="qx__stream-cursor" aria-hidden="true"></span>';
  const trailingClosers = html.match(/(?:<\/[^>]+>\s*)+$/);
  if (!trailingClosers) return `${html}${cursor}`;

  return `${html.slice(0, html.length - trailingClosers[0].length)}${cursor}${trailingClosers[0]}`;
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const root = node.closest(".qt__body");
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: root instanceof Element ? root : null,
        threshold: 0.15,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function ExchangeBlock({ ex, onRetry }: { ex: Exchange; onRetry: () => void }) {
  const isWaiting = ex.answer === "" && ex.isStreaming;
  const { ref, isVisible } = useScrollReveal();
  const html = useMemo(() => {
    try {
      const rendered = renderMarkdown(ex.answer);
      return ex.isStreaming ? appendStreamingCursor(rendered) : rendered;
    } catch {
      // Prevent markdown errors from crashing the entire UI
      const fallback = ex.answer
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return ex.isStreaming ? appendStreamingCursor(`<p>${fallback}</p>`) : `<p>${fallback}</p>`;
    }
  }, [ex.answer, ex.isStreaming]);

  const handleAnswerClick = useCallback(async (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const copyButton = target.closest<HTMLButtonElement>(".qx__code-copy");
    if (!copyButton) return;

    const encoded = copyButton.dataset.copyCode;
    if (!encoded) return;

    try {
      await navigator.clipboard.writeText(decodeURIComponent(encoded));
      copyButton.dataset.copied = "true";
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.dataset.copied = "false";
        copyButton.textContent = "Copy";
      }, 1400);
    } catch {
      copyButton.dataset.copied = "false";
      copyButton.textContent = "Copy failed";
      window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1400);
    }
  }, []);

  return (
    <motion.div
      ref={ref}
      className={`qx${isVisible ? " qx--revealed" : ""}`}
      variants={exchangeVariants}
      initial="hidden"
      animate={isVisible ? "show" : "hidden"}
      exit="exit"
    >
      <div className="qx__query">
        <span className="qx__prompt">›</span>
        <span className="qx__q-text">{ex.query}</span>
      </div>

      <div className="qx__answer" onClick={handleAnswerClick}>
        <AnimatePresence initial={false} mode="wait">
          {isWaiting ? (
            <motion.div
              key="loading"
              className="qx__answer-state"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: answerStateTransition }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] } }}
            >
              <LoadingIndicator
                label={ex.loadingLabel}
                title={ex.loadingTitle}
                subtitle={ex.loadingSubtitle}
                stageIndex={ex.loadingStageIndex}
                stageCount={ex.loadingStageCount}
              />
            </motion.div>
          ) : (
            <motion.div
              key="answer"
              className={`qx__answer-state${ex.canRetry ? " qx__answer-state--retryable" : ""}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0, transition: answerStateTransition }}
            >
              <div
                className={`qx__prose${ex.isStreaming ? " qx__prose--streaming" : ""}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {/* Cards appear only after streaming finishes */}
              {!ex.isStreaming && ex.cardType !== "none" && (
                <div className="qx__card-slot">
                  {ex.cardType === "skills"        && <SkillsCard />}
                  {ex.cardType === "projects"       && <ProjectsCard />}
                  {ex.cardType === "contact"        && <ContactCard />}
                  {ex.cardType === "single-project" && ex.matchedProject && (
                    <SingleProjectCard projectName={ex.matchedProject} />
                  )}
                </div>
              )}

              {ex.canRetry && (
                <button
                  className="qx__retry"
                  type="button"
                  onClick={onRetry}
                  aria-label="Retry last message"
                  title="Retry last message"
                >
                  ↻
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="qx__rule" />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome screen
// ─────────────────────────────────────────────────────────────────────────────

const welcomeStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};
const welcomeFade = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function WelcomeScreen({ isProcessing, onSend }: { isProcessing: boolean; onSend: (q: string) => void }) {
  return (
    <motion.div className="qt-welcome" variants={welcomeStagger} initial="hidden" animate="show">
      <motion.div variants={welcomeFade} className="qt-welcome__head">
        <span className="qt-welcome__status">
          <span className="qt-welcome__dot" />
          ONLINE
        </span>
        <h2 className="qt-welcome__title">Query anything about Tanmay.</h2>
        <p className="qt-welcome__sub">{assistantWelcomeMessage}</p>
      </motion.div>

      <motion.div variants={welcomeFade} className="qt-welcome__grid">
        {assistantQuickActions.map((a) => (
          <button key={a.label} className="qt-card" onClick={() => onSend(a.query)} disabled={isProcessing}>
            <span className="qt-card__icon">{a.icon}</span>
            <span className="qt-card__body">
              <span className="qt-card__label">{a.label}</span>
              <span className="qt-card__desc">{a.description}</span>
            </span>
            <span className="qt-card__arrow">→</span>
          </button>
        ))}
      </motion.div>

      <motion.div variants={welcomeFade} className="qt-welcome__tags">
        {assistantSuggestions.map((s) => (
          <button key={s.label} className="qt-tag" onClick={() => onSend(s.query)} disabled={isProcessing}>
            <span className="qt-tag__icon">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AssistantChat({ variant }: AssistantChatProps) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setProcessing] = useState(false);
  const [suppressInputFocusStyle, setSuppressInputFocusStyle] = useState(true);
  const sessionIdRef = useRef(uid());
  const narrationTimerRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const taRef  = useRef<HTMLTextAreaElement>(null);
  const programmaticFocusRef = useRef(false);
  const restoreFocusAfterReplyRef = useRef(false);
  const scrollStateRef = useRef<{ count: number; lastId: string | null }>({ count: 0, lastId: null });
  const pendingStreamRef = useRef<{ id: string; target: string; visible: string; isStreaming: boolean } | null>(null);
  const streamFrameRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const focusTextarea = useCallback((suppressStyle: boolean) => {
    const textarea = taRef.current;
    if (!textarea) return;

    programmaticFocusRef.current = suppressStyle;
    setSuppressInputFocusStyle(suppressStyle);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  useEffect(() => { focusTextarea(true); }, [focusTextarea]);
  useEffect(() => {
    if (isProcessing || !restoreFocusAfterReplyRef.current) return;

    restoreFocusAfterReplyRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      focusTextarea(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [focusTextarea, isProcessing]);
  useEffect(() => {
    const last = exchanges[exchanges.length - 1];
    if (!last) return;

    const previous = scrollStateRef.current;
    const isNewExchange = previous.count !== exchanges.length || previous.lastId !== last.id;
    endRef.current?.scrollIntoView({ behavior: isNewExchange ? "smooth" : "auto", block: "end" });
    scrollStateRef.current = { count: exchanges.length, lastId: last.id };
  }, [exchanges]);
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "24px";
    ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`;
  }, [input]);
  useEffect(
    () => () => {
      if (narrationTimerRef.current !== null) {
        window.clearInterval(narrationTimerRef.current);
      }
      if (streamFrameRef.current !== null) {
        window.cancelAnimationFrame(streamFrameRef.current);
      }
    },
    [],
  );

  const stopNarration = useCallback(() => {
    if (narrationTimerRef.current !== null) {
      window.clearInterval(narrationTimerRef.current);
      narrationTimerRef.current = null;
    }
  }, []);

  const startNarration = useCallback((exchangeId: string, frames: LoaderFrame[]) => {
    stopNarration();
    if (frames.length <= 1) return;

    let frameIndex = 0;
    narrationTimerRef.current = window.setInterval(() => {
      if (frameIndex >= frames.length - 1) {
        stopNarration();
        return;
      }

      frameIndex += 1;
      const frame = frames[frameIndex];
      setExchanges((prev) =>
        prev.map((exchange) =>
          exchange.id === exchangeId
            ? {
                ...exchange,
                loadingLabel: frame.label,
                loadingTitle: frame.title,
                loadingSubtitle: frame.subtitle,
                loadingStageIndex: frameIndex,
                loadingStageCount: frames.length,
              }
            : exchange,
        ),
      );
    }, ROUTING_STAGE_MS);
  }, [stopNarration]);

  const waitForRoutingAnimation = useCallback(async (intentResult: QueryIntentResult, frames: LoaderFrame[]) => {
    if (!needsSpecializedRouting(intentResult)) return;

    await new Promise<void>((resolve) => {
      window.setTimeout(
        resolve,
        Math.min(320, Math.max(120, Math.round((frames.length - 1) * ROUTING_STAGE_MS * 0.35))),
      );
    });
  }, []);

  const triggerSendButtonHaptic = useCallback(() => {
    const button = sendButtonRef.current;
    if (!button || button.disabled) return;

    button.classList.remove("qt__go--press");
    void button.offsetWidth;
    button.classList.add("qt__go--press");

    const handleAnimationEnd = () => {
      button.classList.remove("qt__go--press");
      button.removeEventListener("animationend", handleAnimationEnd);
    };

    button.addEventListener("animationend", handleAnimationEnd);
  }, []);

  const abortCurrentStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const send = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || isProcessing) return;
    const exId = uid();
    setProcessing(true);
    setInput("");

    // Build client-side history for Vercel serverless persistence
    const clientHistory = exchanges.flatMap((ex) => {
      const turns: Array<{ role: string; content: string }> = [
        { role: "user", content: ex.query },
      ];
      if (ex.answer && !ex.isStreaming) {
        turns.push({ role: "assistant", content: ex.answer });
      }
      return turns;
    });

    const intentResult = detectQueryIntent(clean);
    const { cardType, matchedProject } = resolveExchangeCard(intentResult, clean, "", exchanges);
    const loaderFrames = getLoaderFrames(intentResult);

    setExchanges((prev) => [
      ...prev.map((exchange) => ({ ...exchange, canRetry: false })),
      {
        id: exId,
        query: clean,
        answer: "",
        isStreaming: true,
        canRetry: false,
        cardType,
        matchedProject,
        loadingLabel: loaderFrames[0]?.label ?? "GENERAL ROUTE",
        loadingTitle: loaderFrames[0]?.title ?? "Thinking",
        loadingSubtitle: loaderFrames[0]?.subtitle ?? "Preparing a response",
        loadingStageIndex: 0,
        loadingStageCount: loaderFrames.length,
      },
    ]);

    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      startNarration(exId, loaderFrames);
      await waitForRoutingAnimation(intentResult, loaderFrames);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          sessionId: sessionIdRef.current,
          clientHistory,
          stream: true,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(readApiError(await res.text()));
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        let latestAnswer = "";
        let streamError: string | null = null;

        const flushStreamState = () => {
          const pending = pendingStreamRef.current;
          if (!pending || pending.id !== exId) {
            streamFrameRef.current = null;
            return;
          }

          const remaining = pending.target.length - pending.visible.length;
          if (remaining > 0) {
            pending.visible = pending.target;
          }

          const shouldKeepStreaming = pending.isStreaming || pending.visible.length < pending.target.length;
          setExchanges((prev) =>
            prev.map((e) =>
              e.id === exId
                ? { ...e, answer: pending.visible, isStreaming: shouldKeepStreaming }
                : e,
            ),
          );

          if (pending.visible.length < pending.target.length || pending.isStreaming) {
            streamFrameRef.current = window.requestAnimationFrame(flushStreamState);
            return;
          }

          pendingStreamRef.current = null;
          streamFrameRef.current = null;
        };

        const queueStreamState = (answer: string, isStreaming: boolean) => {
          const previousVisible = pendingStreamRef.current?.id === exId
            ? pendingStreamRef.current.visible
            : "";

          pendingStreamRef.current = {
            id: exId,
            target: answer,
            visible: previousVisible,
            isStreaming,
          };

          if (streamFrameRef.current !== null) return;
          streamFrameRef.current = window.requestAnimationFrame(flushStreamState);
        };

        await consumeAssistantStream(res, (event, payload) => {
          if (event === "error") {
            streamError = payload.error ?? "The stream failed.";
            return;
          }

          if (event !== "chunk" && event !== "done") return;

          stopNarration();
          latestAnswer = scrubInstructionLeak(payload.text ?? latestAnswer);
          queueStreamState(latestAnswer, event !== "done");
        });

        if (pendingStreamRef.current?.id === exId) {
          pendingStreamRef.current = {
            ...pendingStreamRef.current,
            target: latestAnswer,
            isStreaming: false,
          };
          if (streamFrameRef.current === null) {
            streamFrameRef.current = window.requestAnimationFrame(flushStreamState);
          }
        }

        if (streamError) throw new Error(streamError);
        if (!latestAnswer) throw new Error("No response");

        const finalCard = resolveExchangeCard(intentResult, clean, latestAnswer, exchanges);
        setExchanges((prev) =>
          prev.map((e) =>
            e.id === exId
              ? {
                  ...e,
                  canRetry: true,
                  cardType: finalCard.cardType,
                  matchedProject: finalCard.matchedProject,
                }
              : e,
          ),
        );
      } else {
        const raw = await res.text();
        let payload: { text?: string; error?: string };
        try { payload = JSON.parse(raw) as { text?: string; error?: string }; }
        catch { throw new Error(raw.slice(0, 200) || "Non-JSON response"); }
        if (!payload.text) throw new Error(payload.error ?? "No response");
        stopNarration();
        const answer = scrubInstructionLeak(payload.text);
        const finalCard = resolveExchangeCard(intentResult, clean, answer, exchanges);

        setExchanges((prev) =>
          prev.map((e) =>
            e.id === exId
              ? {
                  ...e,
                  answer,
                  isStreaming: false,
                  canRetry: true,
                  cardType: finalCard.cardType,
                  matchedProject: finalCard.matchedProject,
                }
              : e,
          ),
        );
      }

    } catch (err) {
      const isAborted = err instanceof DOMException && err.name === "AbortError";
      stopNarration();
      if (pendingStreamRef.current?.id === exId) {
        pendingStreamRef.current = null;
      }
      if (streamFrameRef.current !== null) {
        window.cancelAnimationFrame(streamFrameRef.current);
        streamFrameRef.current = null;
      }

      if (isAborted) {
        // User cancelled — keep whatever partial answer we had, or remove the exchange
        setExchanges((prev) =>
          prev.map((e) =>
            e.id === exId
              ? {
                  ...e,
                  answer: e.answer || "Response stopped.",
                  isStreaming: false,
                  canRetry: true,
                }
              : e,
          ),
        );
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setExchanges((prev) =>
          prev.map((e) =>
            e.id === exId ? { ...e, answer: msg, isStreaming: false, canRetry: true } : e,
          ),
        );
      }
    } finally {
      abortControllerRef.current = null;
      restoreFocusAfterReplyRef.current = true;
      setProcessing(false);
    }
  }, [exchanges, isProcessing, startNarration, stopNarration, waitForRoutingAnimation, abortCurrentStream]);

  const retry = useCallback(() => {
    const last = [...exchanges].reverse().find((e) => e.canRetry);
    if (last) {
      setExchanges((prev) => prev.filter((e) => e.id !== last.id));
      void send(last.query);
    }
  }, [exchanges, send]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(input); };
  const onKey    = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
  };

  return (
    <div className={`qt qt--${variant}`}>
      <div className="qt__body">
        <div className="qt__inner">
          {exchanges.length === 0 ? (
            <WelcomeScreen isProcessing={isProcessing} onSend={send} />
          ) : (
            <div className="qt__thread">
              <AnimatePresence initial={false}>
                {exchanges.map((ex) => (
                  <ExchangeBlock key={ex.id} ex={ex} onRetry={retry} />
                ))}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      <div className="qt__bar">
        <form className="qt__form" onSubmit={onSubmit}>
          <div
            className={[
              "qt__input-row",
              isProcessing ? "qt__input-row--busy" : "",
              suppressInputFocusStyle ? "qt__input-row--suppress-focus" : "",
            ].filter(Boolean).join(" ")}
            onPointerDownCapture={() => {
              programmaticFocusRef.current = false;
              setSuppressInputFocusStyle(false);
            }}
          >
            <span className={`qt__input-prompt${input ? " qt__input-prompt--active" : ""}`} aria-hidden>›</span>
            <textarea
              ref={taRef}
              value={input}
              rows={1}
              disabled={isProcessing}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => {
                if (programmaticFocusRef.current) {
                  programmaticFocusRef.current = false;
                  return;
                }

                setSuppressInputFocusStyle(false);
              }}
              onBlur={() => {
                programmaticFocusRef.current = false;
              }}
              onKeyDown={onKey}
              placeholder="Ask about projects, skills, experience…"
              className="qt__ta"
            />
            {isProcessing ? (
              <button
                type="button"
                className="qt__go qt__go--stop"
                aria-label="Stop generating"
                onClick={abortCurrentStream}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                ref={sendButtonRef}
                type="submit"
                disabled={!input.trim()}
                className="qt__go"
                aria-label="Send"
                onPointerDown={triggerSendButtonHaptic}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
