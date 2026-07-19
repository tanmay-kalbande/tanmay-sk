/**
 * Pustakam Library Generator — Full-Fledged Pipeline (File-Based)
 * ─────────────────────────────────────────────────────────────────
 * Generates books locally as JSON files using the same pipeline
 * as the Pustakam app: dynamic module count, AI-generated
 * introduction/summary/glossary, deep chapter continuity via
 * glossary-term extraction, and post-processing.
 *
 * Output structure:
 *   public/library/
 *     catalog.json            ← all book metadata (for directory page)
 *     sitemap.xml             ← submit this to Google Search Console
 *     books/
 *       learn-python.json     ← individual book (content + metadata)
 *       stock-market.json
 *       ...
 *
 * Run:  npx tsx scripts/generate-library.ts
 * Env:  ZAI_API_KEY       (required)
 *       ZAI_MODEL         (optional, default: glm-5.1)
 *       SITE_URL          (optional, default: https://pustakam.app)
 *
 * After running:
 *   git add public/library
 *   git push
 *   → Vercel auto-deploys, Google indexes via sitemap
 * ─────────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ─────────────────────────────────────────────────────────────────────

const EDITION = (process.env.EDITION || 'stellar') as 'stellar' | 'street' | 'desi';
const STREET_LANG = (process.env.STREET_LANG || (EDITION === 'desi' ? 'hinglish' : 'english')) as 'english' | 'hinglish';

const SELECTED_PROVIDER = process.env.PROVIDER || 'zai';

const SELECTED_MODEL = process.env.MODEL || process.env.MODEL_NAME || '';

let primaryModel = SELECTED_MODEL || process.env.ZAI_MODEL || 'glm-5.2';
let primaryApiUrl = 'https://api.z.ai/api/paas/v4/chat/completions';
let primaryApiKey = process.env.ZAI_API_KEY || '';
let primaryProviderName = 'zai';

if (SELECTED_PROVIDER === 'mistral') {
  primaryModel = SELECTED_MODEL || process.env.MISTRAL_MODEL || 'mistral-large-latest';
  primaryApiUrl = 'https://api.mistral.ai/v1/chat/completions';
  primaryApiKey = process.env.MISTRAL_API_KEY || '';
  primaryProviderName = 'mistral';
} else if (SELECTED_PROVIDER === 'cerebras') {
  primaryModel = SELECTED_MODEL || process.env.CEREBRAS_MODEL || 'gemma-4-31b';
  primaryApiUrl = 'https://api.cerebras.ai/v1/chat/completions';
  primaryApiKey = process.env.CEREBRAS_API_KEY || '';
  primaryProviderName = 'cerebras';
}

const CONFIG = {
  // Sequential execution: one book at a time to avoid rate-limit storms
  CONCURRENCY:           Number(process.env.CONCURRENCY || 1),
  MAX_BOOKS:             Number(process.env.MAX_BOOKS   || 0), // 0 = no limit

  TOKENS_PER_MIN_LIMIT:  450_000,

  // Match Pustakam's word targets (1800-3200 per module)
  MODULE_WORD_TARGET:    '1800-3200',
  MIN_MODULE_WORD_COUNT: 800,

  // Match Pustakam's max_tokens (8192 for full chapters)
  MAX_TOKENS:            8192,

  PRIMARY_MODEL:         primaryModel,
  PRIMARY_API_URL:       primaryApiUrl,
  PRIMARY_API_KEY:       primaryApiKey,
  PRIMARY_PROVIDER:      primaryProviderName,

  // Keep a separate provider available if Z.ai is temporarily unavailable.
  FALLBACK_MODEL:        process.env.MISTRAL_FALLBACK_MODEL || 'mistral-small-2506',
  FALLBACK_API_URL:      'https://api.mistral.ai/v1/chat/completions',
  FALLBACK_API_KEY:      process.env.MISTRAL_API_KEY || '',
  FALLBACK_PROVIDER:     'mistral',

  // Cooldown between sequential module generations (ms)
  MODULE_COOLDOWN:       primaryProviderName === 'mistral' ? 3000 : 1000,

  OUTPUT_DIR:            path.resolve(__dirname, '../public/library'),
  CHECKPOINT_FILE:       path.resolve(__dirname, '.library-checkpoint.json'),
  SITE_URL:              process.env.SITE_URL || 'https://tanmaysk.in',
  RETRY_MAX:             5,
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookMeta {
  slug: string;
  title: string;
  goal: string;
  category: string;
  tags: string[];
  language: string;
  wordCount: number;
  moduleCount: number;
  readingTimeMins: number;
  metaDescription: string;
  modelUsed: string;
  generatedAt: string;
  complexity: string;
  edition: 'stellar' | 'street' | 'desi';
}

interface BookFile extends BookMeta {
  roadmap: any;
  modules: Array<{ title: string; content: string; wordCount: number }>;
  finalBook: string;
}

interface TopicSeed {
  goal: string;
  category: string;
  tags: string[];
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
}

interface Checkpoint {
  completedSlugs: string[];
  failedSlugs: string[];
  startedAt: string;
  lastUpdated: string;
}

// ── File system helpers ────────────────────────────────────────────────────────

function ensureDirs() {
  fs.mkdirSync(path.join(CONFIG.OUTPUT_DIR, 'books'), { recursive: true });
  fs.mkdirSync(path.dirname(CONFIG.CHECKPOINT_FILE), { recursive: true });
}

function saveBook(book: BookFile): void {
  const filePath = path.join(CONFIG.OUTPUT_DIR, 'books', `${book.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(book, null, 2), 'utf8');
}

function getExistingSlugs(): string[] {
  const booksDir = path.join(CONFIG.OUTPUT_DIR, 'books');
  if (!fs.existsSync(booksDir)) return [];
  return fs.readdirSync(booksDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.basename(file, '.json'));
}

function rebuildIndex(): void {
  // Read all book JSON files and extract metadata only (keeps index.json small)
  const booksDir = path.join(CONFIG.OUTPUT_DIR, 'books');
  const files = fs.readdirSync(booksDir).filter(f => f.endsWith('.json'));
  
  const index: BookMeta[] = files.map(file => {
    const data: BookFile = JSON.parse(fs.readFileSync(path.join(booksDir, file), 'utf8'));
    // Return only metadata (strip content to keep index.json small)
    const { roadmap: _r, modules: _m, finalBook: _f, ...meta } = data;
    return meta;
  });

  // Sort by generatedAt descending (newest first)
  index.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'catalog.json'),
    JSON.stringify({ books: index, total: index.length, generatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );

  console.log(`\n📑 catalog.json rebuilt: ${index.length} books`);
}

function generateSitemap(books: BookMeta[]): void {
  const urls = [
    // Library home
    `  <url>
    <loc>${CONFIG.SITE_URL}/library</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    // Each book
    ...books.map(book => `  <url>
    <loc>${CONFIG.SITE_URL}/library/book/${book.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${book.generatedAt.split('T')[0]}</lastmod>
  </url>`),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, 'sitemap.xml'), xml, 'utf8');
  console.log(`🗺️  sitemap.xml written: ${books.length + 1} URLs`);
  console.log(`   → Submit to: https://search.google.com/search-console`);
  console.log(`   → URL: ${CONFIG.SITE_URL}/library/sitemap.xml`);
}

// ── Checkpoint ─────────────────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint {
  try {
    if (fs.existsSync(CONFIG.CHECKPOINT_FILE)) {
      const data: Checkpoint = JSON.parse(fs.readFileSync(CONFIG.CHECKPOINT_FILE, 'utf8'));
      console.log(`📂 Resuming: ${data.completedSlugs.length} done, ${data.failedSlugs.length} failed`);
      return data;
    }
  } catch {}
  return { completedSlugs: [], failedSlugs: [], startedAt: new Date().toISOString(), lastUpdated: '' };
}

function saveCheckpoint(cp: Checkpoint) {
  cp.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CONFIG.CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf8');
}

// ── Rate limiter ───────────────────────────────────────────────────────────────

class TokenBudget {
  private window: { tokens: number; ts: number }[] = [];
  constructor(private readonly limitPerMin: number) {}

  private sweep() {
    const cutoff = Date.now() - 60_000;
    this.window = this.window.filter(e => e.ts > cutoff);
  }

  used(): number { this.sweep(); return this.window.reduce((s, e) => s + e.tokens, 0); }

  async acquire(tokens: number) {
    while (this.used() + tokens > this.limitPerMin) {
      const oldest = this.window[0];
      const waitMs = oldest ? oldest.ts + 60_000 - Date.now() + 200 : 2000;
      console.log(`  ⏳ Rate limit: waiting ${Math.ceil(waitMs / 1000)}s (${this.used().toLocaleString()} tokens used this minute)`);
      await sleep(Math.max(waitMs, 500));
      this.sweep();
    }
  }

  record(tokens: number) { this.window.push({ tokens, ts: Date.now() }); }
}

const tokenBudget = new TokenBudget(CONFIG.TOKENS_PER_MIN_LIMIT);

// ── Worker pool ────────────────────────────────────────────────────────────────

function pLimit(concurrency: number) {
  let running = 0;
  const queue: Array<() => void> = [];
  const next = () => { if (running < concurrency && queue.length > 0) { running++; queue.shift()!(); } };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => fn().then(resolve).catch(reject).finally(() => { running--; next(); }));
      next();
    });
}

// ── Retry ──────────────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [5000, 15000, 30000, 60000, 120000];
  for (let attempt = 1; attempt <= CONFIG.RETRY_MAX; attempt++) {
    try { return await fn(); } catch (e: any) {
      if (attempt === CONFIG.RETRY_MAX) throw e;
      const delay = delays[attempt - 1] || 120000;
      console.warn(`  ⚠️  ${label} retry ${attempt}/${CONFIG.RETRY_MAX} in ${Math.ceil(delay/1000)}s`);
      await sleep(delay);
    }
  }
  throw new Error(`${label} failed all retries`);
}

// ── AI caller (Z.ai primary, Mistral fallback) ───────────────────────────────
type RequestKind = 'roadmap' | 'chapter' | 'assemble' | 'glossary' | 'seeds-generator';
type Completion = { text: string; model: string };

let primaryConsecutiveFailures = 0;
const FALLBACK_THRESHOLD = 3;

async function callAI(
  prompt: string,
  estInputTokens = 500,
  kind: RequestKind = 'chapter',
  forceFallback = false,
  systemPrompt?: string
): Promise<Completion> {
  const useFallback = forceFallback || (!CONFIG.PRIMARY_API_KEY && Boolean(CONFIG.FALLBACK_API_KEY)) ||
    (primaryConsecutiveFailures >= FALLBACK_THRESHOLD && CONFIG.FALLBACK_API_KEY);

  const model   = useFallback ? CONFIG.FALLBACK_MODEL   : CONFIG.PRIMARY_MODEL;
  const apiUrl  = useFallback ? CONFIG.FALLBACK_API_URL  : CONFIG.PRIMARY_API_URL;
  const apiKey  = useFallback ? CONFIG.FALLBACK_API_KEY  : CONFIG.PRIMARY_API_KEY;
  const provider = useFallback ? CONFIG.FALLBACK_PROVIDER : CONFIG.PRIMARY_PROVIDER;

  if (!apiKey) throw new Error(`No API key configured for ${useFallback ? 'Mistral fallback' : CONFIG.PRIMARY_PROVIDER}`);

  const estTotal = estInputTokens + 2000;
  await tokenBudget.acquire(estTotal);

  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: CONFIG.MAX_TOKENS,
      ...(provider === 'zai' ? { thinking: { type: kind === 'roadmap' ? 'enabled' : 'disabled' } } : {}),
    }),
  });

  if (res.status === 429) {
    const e: any = new Error(`429 rate limited (${provider})`);
    e.status = 429;
    if (!useFallback) primaryConsecutiveFailures++;
    throw e;
  }

  if (!res.ok) {
    if (!useFallback) primaryConsecutiveFailures++;
    throw new Error(`${provider} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  // Success — reset failure counter
  if (!useFallback) primaryConsecutiveFailures = 0;

  const data = await res.json() as any;
  tokenBudget.record(data.usage?.total_tokens || estTotal);
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new Error(`${provider} returned no content`);
  return { text, model };
}

// Convenience wrapper — always tries primary first
async function callWriter(
  prompt: string,
  estInputTokens = 500,
  kind: RequestKind = 'chapter',
  systemPrompt?: string
): Promise<Completion> {
  return callAI(prompt, estInputTokens, kind, false, systemPrompt);
}

// ── Prompts ────────────────────────────────────────────────────────────────────

/** Concrete, content-shaping definition of what each complexity level means.
 *  Ported from Pustakam bookService.ts getComplexityGuide() */
function getComplexityGuide(level?: string): string {
  const guides: Record<string, string> = {
    beginner:     'Assume no prior background - build up from first principles and define jargon the first time it appears.',
    intermediate: 'Assume basic familiarity with the topic - move briskly through fundamentals and spend more time on application.',
    advanced:     'Assume a strong foundation already exists - skip basics and focus on nuance, trade-offs, and edge cases.',
  };
  return guides[level || 'intermediate'] || guides.intermediate;
}

function buildRoadmapPrompt(seed: TopicSeed): string {
  const complexity = seed.complexity || 'beginner';
  // Treat 'desi + hinglish' and 'street + hinglish' both as desi/Hindi path
  const isMarathi = seed.language === 'mr';

  if (EDITION === 'desi') {
    // ── Ported from pustakam-main/src/services/desiPromptService.ts ──
    const languageInstruction = isMarathi
      ? `LANGUAGE: Primarily "Marthienglish" (Marathi + English mix) with natural urban slang. Allow light Hinglish if it flows better in explanations (e.g., "Kya bolta hai" okay if context fits, but prioritize Marathi like "Kay bolto bhava"). Keywords: "Bhava", "Rao", "Vishay hard aahe", "Dokyat ghal". Use Marathi slang sparingly and naturally. Mix English words seamlessly. Avoid over-repetition - vary slang for freshness.`
      : `LANGUAGE: Raw conversational Hinglish (Hindi + English mix). "Bhai", "Boss", "Sahi hai". Vary phrases to keep it fresh - no repeating the same slang every sentence.`;
    const languageLabel = isMarathi ? 'Marathi (Tapori-style)' : 'Hindi (Tapori-style)';

    return `Abe sun Boss, tere liye ek number blackhole roadmap bana raha hoon: "${seed.goal}"

PERSONA:
Main Mumbai/Pune ka asli street smart bhai hoon. Main corporate chamcha nahi hoon. Main "Boss" ya "Bhai" hoon. Meri bhasha raw aur uncensored hai, par main zabardasti gaali nahi deta - sirf natural flow mein 10-20% emphasis ke liye (like punctuation). Overdo mat kar.

CRITICAL INSTRUCTION:
Tera main kaam KNOWLEDGE delivery hai. Persona sirf ek wrapper hai. Agar koi concept complex hai, toh persona thoda side mein rakh aur concept clear samjha. Slang ko fresh rakh - same words bar bar mat repeat (e.g., vary "bhava" with "rao" or "boss").

${languageInstruction}

BOOK LANGUAGE RULES:
- Titles: Short, punchy, and intriguing. Gaali only if naturally fits, no force (e.g., "Quantum Entanglement: Jadoo ya Science?" better than forced abuse).
- Objectives: Clear hone chahiye, confusion nahi mangta. Slang light rakh for readability.

CONTEXT:
- Target Audience: ${complexity} learners
- Complexity: ${complexity}

REQUIREMENTS FOR THE ROADMAP:
- Jitne modules topic ko theek se cover karne ke liye chahiye utne bana - usually 6 se 14 ke beech. Filler chapters thok ke count mat badha, aur do alag cheezein ek module mein thoons mat.
- Har module ek hi cheez cover kare aur pichle module pe build kare - order matter karta hai.
- Har module ke saath ek line ka "focus" bhi de jo bataye ye module EXACTLY kya cover karega.
- Har module detailed hona chahiye.
- Titles aur objectives mein "Tapori" feel aani chahiye par educational value kam nahi honi chahiye. Vary slang patterns for freshness - no copy-paste vibes.

ROADMAP OUTPUT (JSON ONLY):
{
  "title": "SEO-friendly book title (max 60 chars, what a user would Google, e.g. 'Python Programming for Beginners' — NOT creative/poetic titles)",
  "modules": [
    {
      "title": "Module ka title (Style: ${languageLabel}, Punchy, Light Slang)",
      "focus": "One line jo exactly bataye ye module kya cover karega",
      "objectives": ["Objective 1 in ${languageLabel}", "Objective 2 in ${languageLabel}"],
      "estimatedTime": "X hours (Practical estimate)"
    }
  ],
  "estimatedReadingTime": "Total time estimate",
  "difficultyLevel": "${complexity}"
}`;
  }

  if (EDITION === 'street') {
    // ── Ported from pustakam-main/src/services/streetPromptService.ts ──
    return `Boss, we're building a blackhole roadmap for: "${seed.goal}". No hand-holding. No shortcuts. Just raw strategy.

PERSONA:
You're the unhinged street oracle - zero filters, all grit. A battle-scarred hustler who's clawed through hell and back, now mapping out the war plan for someone who's hungry but clueless. Call 'em "bro," "chief," "dreamer" - whatever wakes 'em up. Roast their excuses, hype their potential, and hand 'em a roadmap that slaps.

STYLE WARFARE:
- Titles that hit like headlines: Punchy, provocative, impossible to ignore.
- Objectives that corner 'em: Clear, actionable, no wiggle room for slackers.
- Time estimates like a grinder: Realistic, no corporate fantasy numbers.
- Adapt to the audience - make objectives relatable with street-level comparisons.
- Energy on max: This roadmap should feel like a war briefing, not a PowerPoint snooze.

CONTEXT LOCK:
- Target Audience: ${complexity} learners who need a reality check
- Complexity Level: ${complexity} - stick to it, no rogue moves.

MISSION SPECS:
- Break this into as many modules as the topic actually needs to be covered right - usually 6 to 14. Don't pad with filler chapters just to hit a number, and don't jam two different fights into one chapter either.
- Each module builds on the last - order matters. No two modules covering the same ground.
- Each module: Savage title + a one-line "focus" (exactly what this module covers, nothing more - keeps the chapter writer from wandering) + 3-5 real objectives that matter + time estimate.
- Match the energy: Titles should make 'em curious, scared, or hyped - never bored.

Return ONLY valid JSON:
{
  "title": "SEO-friendly book title (max 60 chars, what a real person would Google — NOT hype/creative titles like 'BLACKHOLE ROADMAP'. Example: 'Stock Market Trading for Beginners')",
  "modules": [
    {
      "title": "Module Title That Slaps Hard",
      "focus": "One line, exactly what this module covers and nothing more",
      "objectives": ["Real Objective 1", "Objective 2 That Actually Moves the Needle"],
      "estimatedTime": "X hours of focused grind"
    }
  ],
  "estimatedReadingTime": "Total hours of hardcore learning",
  "difficultyLevel": "${complexity}"
}`;
  }

  // ── Stellar edition — ported from pustakam-main/src/services/bookService.ts buildRoadmapPrompt() ──
  const complexityGuide = getComplexityGuide(seed.complexity);
  return `Create a comprehensive learning roadmap for: "${seed.goal}"

Requirements:
- Break the topic into as many modules as it genuinely needs to be covered well - usually somewhere between 6 and 14. Do not pad with filler modules just to hit a number, and do not cram unrelated ideas into one module just to keep the count low.
- Order modules so each one builds on the ones before it. Objectives should not overlap between modules - if two modules would teach the same thing, merge or split them differently.
- Each module needs: a clear title, a one-sentence "focus" describing exactly what it covers and nothing more (this keeps the chapter writer on-topic later), and 3-5 specific learning objectives.
- Estimate a realistic reading/study time per module based on how much it actually covers - don't just repeat the same estimate for every module.
- Target audience: ${complexity} learners
- Complexity: ${complexity}. ${complexityGuide}

IMPORTANT: Respond with ONLY valid JSON. No markdown, no code fences, no explanation.
Start your response with { and end with }.

{"title": "SEO-friendly book title (max 60 chars, what a user would actually search for on Google)", "modules": [{"title": "Module Title", "focus": "One sentence describing exactly what this module covers", "objectives": ["Objective 1", "Objective 2"], "estimatedTime": "2-3 hours"}], "estimatedReadingTime": "20-25 hours", "difficultyLevel": "${complexity}"}`;
}

function buildModulePrompt(
  seed: TopicSeed,
  roadmap: { title?: string; modules: Array<{ title: string; description: string; objectives: string[]; focus?: string }> },
  mod: { title: string; description: string; objectives: string[]; focus?: string },
  index: number,
  total: number,
  previousModules: Array<{ title: string; content: string; wordCount: number }>
): { systemPrompt: string; userPrompt: string } {
  const complexity = seed.complexity || 'beginner';
  // ── Positional outline — ported from pustakam-main bookService.ts buildModulePrompt() ──
  // Each module gets a positional marker so the AI knows what's before/after the current chapter.
  const bookOutline = roadmap.modules.map((item, i) => {
    const position = i + 1 === index + 1
      ? '  <- writing this chapter now'
      : i < index ? ' (already written)' : ' (comes later - do not cover it yet)';
    return `${i + 1}. ${item.title}${position}`;
  }).join('\n');

  // Deep continuity: extract glossary terms from all previous chapters
  const coveredConcepts = previousModules.length > 0
    ? extractGlossaryTerms(previousModules).slice(0, 25)
    : [];

  const coveredBlock = coveredConcepts.length > 0
    ? `\n\nALREADY INTRODUCED (reference these by name where relevant - don't redefine them from scratch):\n${coveredConcepts.join(', ')}`
    : '';

  const continuityBlock = bookOutline
    ? `\n\nBOOK OUTLINE (where this chapter sits in the whole book):\n${bookOutline}`
    : '';

  const focusLine = mod.focus ? `\n- Chapter focus: ${mod.focus}` : '';
  const isFirstModule = index === 0;

  // ── Desi / Hinglish edition ──
  // Ported from pustakam-main/src/services/desiPromptService.ts buildModulePrompt()
  if (EDITION === 'desi' || (EDITION === 'street' && STREET_LANG === 'hinglish')) {
    const isMarathi = seed.language === 'mr';
    const languageInstruction = isMarathi
      ? `LANGUAGE: Primarily "Marthienglish" (Marathi + English mix) with natural flow. Light Hinglish allowed if it helps clarity. Use Marathi slang sparingly: "Bhava", "Rao", "Vishay", "Dokyat", "Yedzhavya" (only for light roast). Sentence structure flexible - prioritize readability. English tech terms intact. Vary slang to keep fresh.`
      : `LANGUAGE: Raw conversational Hinglish (Hindi + English mix). Vary slang for freshness - no overusing "bhai" or "boss" in every line.`;
    const languageLabel = isMarathi ? 'Marathi (Tapori-style)' : 'Hindi (Tapori-style)';

    const bookOutlineBlock = bookOutline
      ? `\n\nPUURA ROADMAP (yeh dekh ke samajh kahan khada hai tu):\n${bookOutline}`
      : '';
    const coveredDesiBlock = !isFirstModule && coveredConcepts.length > 0
      ? `\n\nPEHLE HI COVER HO CHUKA (dobara se explain mat kar, seedha naam le ke reference kar):\n${coveredConcepts.join(', ')}`
      : '';

    const prompt = `Abe oy Boss! Is chapter ko likhne ka time aa gaya hai: "${mod.title}"

PERSONA:
Tu ek raw, unfiltered knowledge engine hai jo street language bolta hai. Tera style aggressive aur direct hai. Tu mazaak udata hai, par end goal hamesha *concept clear karna* hai. Slang ko fresh aur varied rakh - same patterns mat repeat.

IMPORTANT - SWEARING & TONE:
- Gaaliyan (swearing) natural aur limited (10-20% max, only for emphasis). No force - har sentence mein nahi.
- Titles mein gaali bilkul mat daal. Make them curious and spicy without abuse.
- Keep headers and motivational punches playful and roast-y, but NEVER use crude/sexual gaali (like "randi", "gaand", "sucking gaand", "virgin" shaming) or overly harsh insults. Make them fun, street-smart, and motivational. Tone: Tough-love from a bhai, uplifting not mean.
- Agar tu zyada slang fenk raha hai aur content kam de raha hai, toh tu fail hai. Content King hai. Vary roasts for freshness.

${languageInstruction}

STYLE GUIDELINES:
- Chapter start seedha point se kar. No "Welcome to this chapter" bakchodi.
- Make every hook and ending fresh and varied, in "playful roast" zone: funny, direct, street-energy motivation — no crude references, no extreme shaming.
- End har section ka ek 'Takeaway' ya 'Punchline' se kar — but vary wording/style to avoid repetition.
- Paragraphs short rakh.
- RHETORICAL QUESTIONS use kar: "Samjha kya?" "Are you getting this?" — vary them too.
- EXAMPLES: Desi life ke examples use kar (Traffic, Vada pav, Local train, Gali cricket, Dating apps). Vary examples for freshness.
- Agar kisi fact ya number ka pakka nahi pata, toh bana mat - seedha bol "pakka confirm kar lena" ya usko chhod de. Fake stats maar ke smart mat ban.

STRUCTURE:
(Seedha content se shuru kar - chapter ka title dobara mat likh, woh already upar add ho chuka hai)
- Use ## for main section headers, and ### for any sub-headers beneath them.
## [Concept 1 Header in ${languageLabel}]
(Explanation + Real life Example)
## [Concept 2 Header in ${languageLabel}]
(Explanation + Analogy)
## [Practical/Conclusion Header]
(Final warning/advice)
## Victory Lap (Kya Seekha? Hammer karo!)

CONTEXT:
- Goal: ${seed.goal}
- Module ${index + 1} of ${total}
- Objectives: ${mod.objectives.join(', ')}${focusLine}
- Audience: ${complexity} learners${bookOutlineBlock}${coveredDesiBlock}

REQUIREMENTS:
- Length: Comprehensive, but let the topic decide - most chapters will land naturally somewhere around 1800-3200 words. Quality > quantity, always.
- Format: Markdown strict.
- Tone: Raw, Intelligent, Unfiltered.
- Baad ke chapters mein aane wala material abhi mat cover kar (upar ROADMAP dekh).`;

    return { systemPrompt: '', userPrompt: prompt };
  }

  // ── Street / English edition ──
  // Ported from pustakam-main/src/services/streetPromptService.ts buildModulePrompt()
  if (EDITION === 'street') {
    const exampleInstruction = ['programming', 'data-science', 'ai'].includes(seed.category)
      ? 'Examples? Real-life war stories only - make \'em sweat the application.'
      : 'Include a concrete, realistic scenario when it helps.';

    const streetOutlineBlock = bookOutline
      ? `\n\nTHE WHOLE WAR MAP (so you know exactly where this fight sits):\n${bookOutline}`
      : '';
    const streetCoveredBlock = !isFirstModule && coveredConcepts.length > 0
      ? `\n\nALREADY SMASHED (reference these by name, don't re-explain 'em from scratch):\n${coveredConcepts.join(', ')}`
      : '';

    const prompt = `Boss, drop the hammer on Chapter ${index + 1} of ${total}: "${mod.title}". No mercy.

PERSONA:
You're the unhinged street oracle - zero filters, all grit. Picture a battle-scarred hustler who's clawed through hell and back, now dragging your lazy ass along for the win. Call 'em "bro," "chief," "you fool" - whatever snaps 'em awake. Brutal truth serum: Roast their half-assed efforts like a comedian eviscerating a bad date. Sarcasm on steroids, humor that stings, but damn if it doesn't light a fire. You love 'em too much to let 'em flop.

STYLE WARFARE:
- Hook 'em like a gut punch: First line? Make 'em gasp, laugh, or nod in terrified agreement. Vary the hook every chapter - a scenario, a blunt question, a war story - never the same opener twice in a row.
- Raw street dialect on blast: Bro, straight fire, you slacking?, vibes check failed, highkey delusional.
- Sentences? Short as a bar fight. Bam. Wham. Repeat for the kill shot.
- Questions that corner 'em: "Still with me, or you zoning out already?" "Ready to level up, or nah?"
- Real-world gut-checks: Break down brain-melting theory like it's a bar tab after a bender - simple, savage, unforgettable.
- Sarcasm as your sidekick: "Oh, sure, skip the basics - because mediocrity's a great look on you."
- Tough love anthems: "Excuses? Cute. But winners bleed sweat, not stories. Your move."
- Facts? Ironclad, deep-dive accurate. Unhinged is the ride; wisdom's the destination. No corporate zombies allowed. If you're not sure about a stat or a fact, don't invent one to sound tougher - flag it or cut it. Made-up numbers get you clowned in an interview, not hired.

CONTEXT LOCK:
- Big Picture Grind: ${seed.goal}
- Objectives (Nail These or Bust): ${mod.objectives.join(', ')}${focusLine}
- Who's This For: ${seed.complexity || 'beginner'} learners${streetOutlineBlock}${streetCoveredBlock}

MISSION SPECS:
- Word count: let the fight decide, not a number - most chapters land naturally somewhere around 1800-3200 words. A tight, complete chapter beats a padded one every time.
- Don't repeat the chapter title as your own heading - it's already been slapped on above. Go straight into ## section headers.
- Markdown muscle: Use ## for main section headers, and ### for any sub-headers beneath them.
- Don't rehash ground already covered in earlier chapters (see ALREADY SMASHED above) and don't steal material that belongs to a later chapter (see THE WHOLE WAR MAP above).
- ${exampleInstruction}

LAYOUT BLUEPRINT:
(Explode straight into the hook - no warm-ups, no title restated, straight to the throat.)

## Core Carnage (Rip Apart the Essentials - Make 'Em Bleed Understanding)
## Street Smarts (How to Wield This in the Wild - Action or Agony)
## Fight Club (Drills - Put Up or Shut Up)
## Victory Lap (What Sticks - Hammer It Home, No Escape)`;

    return { systemPrompt: '', userPrompt: prompt };
  }

  // ── Stellar edition ──
  // Ported from pustakam-main/src/services/bookService.ts buildModulePrompt() stellar path
  const complexityGuide = getComplexityGuide(seed.complexity);
  const exampleInstruction = ['programming', 'data-science', 'ai'].includes(seed.category)
    ? '- Include 2-3 practical, real-world examples specific to this chapter\'s topic, not generic filler'
    : '- Include a concrete, realistic scenario when it helps.';

  const prompt = `Generate a comprehensive chapter for: "${mod.title}"

CONTEXT:
- Learning Goal: ${seed.goal}
- Module ${index + 1} of ${total}
- Objectives: ${mod.objectives.join(', ')}${focusLine}
- Audience: ${seed.complexity || 'beginner'} learners
- Complexity: ${seed.complexity || 'beginner'}. ${complexityGuide}${continuityBlock}${coveredBlock}

REQUIREMENTS:
- Cover the objectives thoroughly rather than chasing a fixed word count. Most chapters land naturally somewhere in the 1800-3200 word range - let the actual content need decide that, not a target.
- ${isFirstModule ? 'Provide a strong introduction to the topic' : "Build naturally on the chapters already written - don't redefine concepts covered there, reference them instead"}
- Open with whatever pulls the reader in fastest for THIS topic - a concrete scenario, a question, a surprising fact, a short case study. Vary the opening style from chapter to chapter rather than reusing the same pattern every time.
- Do NOT include a top-level title for the chapter itself (no heading repeating "${mod.title}") - the chapter title is added automatically. Start directly with your first section heading.
- Use ## for this chapter's main section headers, and ### for any sub-headers beneath those.
- Include bullet points, numbered lists, and bold key terms where they genuinely aid scanability, not as decoration.
${exampleInstruction}
- If you're not confident about a specific fact, figure, or citation, say so plainly or leave it out - don't invent statistics, studies, or quotes to sound authoritative.

DO NOT:
- Start with "In this chapter" or "In this module" — dive straight into the content
- Use filler phrases like "In conclusion", "As we have seen", "It is worth noting"
- Redefine or re-explain concepts already covered in earlier chapters (see ALREADY INTRODUCED above)
- Pad the chapter with repetition or restated points just to add length
- Cover material that belongs to a later chapter (see BOOK OUTLINE above)

Close with a "## Key Takeaways" section.`;

  return { systemPrompt: '', userPrompt: prompt };
}

// ── Pustakam pipeline functions (ported from bookService.ts) ──────────────────

/**
 * Extracts key concepts/terms from completed modules by scanning
 * bold text, headings, and titles. Used to build the ALREADY INTRODUCED
 * block so the AI doesn't re-explain concepts.
 * Ported from Pustakam bookService.ts extractGlossaryTerms()
 */
function extractGlossaryTerms(
  modules: Array<{ title: string; content: string }>,
  signalLines: string[] = []
): string[] {
  const stopTerms = new Set([
    'introduction', 'summary', 'conclusion', 'key takeaways', 'next steps',
    'overview', 'example', 'examples', 'exercise', 'exercises', 'quiz',
    'table of contents', 'chapter summary', 'final thoughts',
    'core carnage', 'street smarts', 'practice', 'pro tip', 'common mistake',
    'key insight', 'real talk',
  ]);

  const candidates = [
    ...modules.map(module => module.title),
    ...signalLines,
    ...modules.flatMap(module =>
      Array.from(module.content.matchAll(/\*\*([^*\n]{2,80})\*\*/g)).map(match => match[1])
    ),
  ];

  return Array.from(new Set(
    candidates
      .map(candidate => candidate
        .replace(/^[-#*\s:]+/, '')
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      )
      .filter(candidate =>
        candidate.length >= 3 &&
        candidate.length <= 60 &&
        candidate.split(' ').length <= 6 &&
        !/^\d+$/.test(candidate) &&
        !stopTerms.has(candidate.toLowerCase())
      )
  ));
}

/**
 * Strips the leading heading from module content if it duplicates the module title.
 * Prevents doubled headings like "# Variables" when we already add "# Module 1: Variables".
 * Ported from Pustakam bookService.ts stripLeadingDuplicateHeading()
 */
function stripLeadingDuplicateHeading(content: string, moduleTitle: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) return content;

  const firstLine = lines[i].trim();
  const headingMatch = firstLine.match(/^#{1,2}\s+(.+)$/);
  if (!headingMatch) return content;

  const headingText = headingMatch[1].trim().toLowerCase();
  const titleText = moduleTitle.trim().toLowerCase();
  const overlaps = titleText.length > 0 && (
    headingText.includes(titleText.slice(0, 20)) || titleText.includes(headingText.slice(0, 20))
  );
  if (!overlaps) return content;

  lines.splice(i, 1);
  return lines.join('\n').replace(/^\n+/, '');
}

/**
 * Generates an anchor-linked Table of Contents.
 * Ported from Pustakam bookService.ts generateTableOfContents()
 */
function generateTableOfContents(modules: Array<{ title: string }>): string {
  const items = [
    `- [Introduction](#introduction)`,
    ...modules.map((m, i) => {
      const heading = `Chapter ${i + 1}: ${m.title}`;
      const slug = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `${i + 1}. [${heading}](#${slug})`;
    }),
    `- [Summary](#summary)`,
    `- [Glossary](#glossary)`,
  ];
  return items.join('\n');
}

/**
 * AI-generated book introduction (800-1200 words).
 * Ported from Pustakam bookService.ts generateBookIntroduction()
 */
async function generateIntroduction(
  seed: TopicSeed,
  roadmap: { title?: string; modules: Array<{ title: string }> }
): Promise<string> {
  const prompt = `Generate a compelling introduction for: "${seed.goal}"

ROADMAP:
${roadmap.modules.map(m => `- ${m.title}`).join('\n')}

TARGET: ${seed.complexity || 'beginner'} learners
CATEGORY: ${seed.category}

Write 800-1200 words covering: welcome and purpose, what readers will learn, book structure, motivation. Use ### markdown headers for internal sections (this is already wrapped in its own "## Introduction" heading, so don't title any of your own sections "Introduction" - start with something like "### Welcome and Purpose" instead).

${(EDITION === 'desi' || (EDITION === 'street' && STREET_LANG === 'hinglish')) ? 'TONE: Hardcore Hinglish tapori style — gaali + gyaan combo, savage but loving. Same persona as the rest of the book. "Abe sun, ye introduction hai, dhyan se padh nahi toh baad mein royega."' : EDITION === 'street' ? 'TONE: Raw, unfiltered, street-prophet style — curse when it hits, roast the reader for even thinking about skipping the intro. Same persona as the rest of the book. Pure English, no Hindi/Hinglish.' : 'TONE: Warm, knowledgeable, mentor-like. Make the reader excited about what they\'re about to learn.'}`;

  const result = await withRetry(
    () => callWriter(prompt, 800, 'assemble'),
    'introduction'
  );
  return result.text;
}

/**
 * AI-generated book summary (600-900 words).
 * Ported from Pustakam bookService.ts generateBookSummary()
 */
async function generateSummary(
  seed: TopicSeed,
  modules: Array<{ title: string }>
): Promise<string> {
  const prompt = `Generate a summary for: "${seed.goal}"

MODULES:
${modules.map(m => `- ${m.title}`).join('\n')}

Write 600-900 words covering: key learning outcomes, important concepts recap, next steps, congratulations. Use ### markdown headers for internal sections (this is already wrapped in its own "## Summary" heading, so don't title any of your own sections "Summary" - start with something like "### Key Learning Outcomes" instead).

${(EDITION === 'desi' || (EDITION === 'street' && STREET_LANG === 'hinglish')) ? 'TONE: Hinglish tapori wrap-up — "Bas bhai, itna seekh liya toh tu set hai. Ab jaake duniya hila." Same savage-but-proud persona.' : EDITION === 'street' ? 'TONE: Raw, street-smart, wrap-up — celebrate the reader like a psychotic coach. "You beautiful disaster, you actually made it through. Now go destroy mediocrity." Pure English, no Hindi/Hinglish.' : 'TONE: Warm, encouraging, forward-looking. Celebrate their progress and point them to next steps.'}`;

  const result = await withRetry(
    () => callWriter(prompt, 600, 'assemble'),
    'summary'
  );
  return result.text;
}

/**
 * AI-generated glossary (10-14 terms) with two-tier fallback.
 * Ported from Pustakam bookService.ts generateGlossary()
 */
async function generateGlossarySection(
  modules: Array<{ title: string; content: string }>
): Promise<string> {
  // Extract signal lines from module content
  const uniqueSignals = Array.from(new Set(
    modules.flatMap(module =>
      module.content
        .split('\n')
        .map(line => line.trim())
        .filter(line =>
          line.length > 0 &&
          line.length <= 120 &&
          (line.startsWith('#') || line.startsWith('**') || line.startsWith('- **'))
        )
    )
  ));

  const glossaryTerms = extractGlossaryTerms(modules, uniqueSignals);
  const compactSignals = uniqueSignals.slice(0, 90).join('\n').substring(0, 6000);

  const primaryPrompt = `Create a concise glossary from these extracted headings and highlighted terms:
${compactSignals}

Rules:
- Include 10-14 important terms only
- Skip duplicates and generic filler terms
- Keep definitions to one crisp sentence
- Sort alphabetically

Format:
**Term**: Definition.`;

  try {
    const result = await callWriter(primaryPrompt, 1200, 'glossary');
    return result.text;
  } catch (primaryError) {
    console.warn('  ⚠️  Primary glossary prompt failed, retrying with smaller seed set...');
  }

  // Fallback prompt — simpler
  const fallbackPrompt = `Create a concise glossary for this book using only the strongest topic signals.

MODULE TITLES:
${modules.map(module => `- ${module.title}`).join('\n')}

KEY TERMS:
${glossaryTerms.slice(0, 30).map(term => `- ${term}`).join('\n')}

Rules:
- Include 8-12 important terms only
- Skip duplicates and generic filler terms
- Keep each definition to one crisp sentence
- Sort alphabetically

Format:
**Term**: Definition.`;

  try {
    const result = await callWriter(fallbackPrompt, 800, 'glossary');
    return result.text;
  } catch (fallbackError) {
    console.warn('  ⚠️  Fallback glossary prompt also failed, building local glossary...');
    // Local fallback: just list the extracted terms
    return glossaryTerms
      .slice(0, 14)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(term => `**${term}**: A key concept covered in this guide.`)
      .join('\n\n');
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function countWords(t: string) { return t.trim().split(/\s+/).filter(Boolean).length; }

/**
 * Validates and normalises a parsed roadmap object.
 * Accepts both "focus" (Pustakam format) and "description" field names,
 * maps focus → description when description is absent, and adds
 * estimatedTime when missing. Ported from pustakam-main bookService.ts
 * parseRoadmapResponse().
 */
function assertAndNormalizeRoadmap(roadmap: any): void {
  if (!Array.isArray(roadmap?.modules) || roadmap.modules.length < 4 || roadmap.modules.length > 16) {
    throw new Error(`Roadmap must contain 4-16 modules (got ${roadmap?.modules?.length || 0})`);
  }
  roadmap.modules = roadmap.modules.map((m: any, i: number) => {
    const focusVal = typeof m.focus === 'string' ? m.focus.trim() : undefined;
    const descVal  = typeof m.description === 'string' ? m.description.trim() : (focusVal || '');
    if (!m?.title || !descVal || !Array.isArray(m?.objectives) || m.objectives.length < 2) {
      throw new Error(`Roadmap module ${i + 1} is incomplete (needs title, focus/description, and ≥2 objectives)`);
    }
    return { ...m, description: descVal, focus: focusVal, estimatedTime: m.estimatedTime || '1-2 hours' };
  });
  roadmap.estimatedReadingTime = roadmap.estimatedReadingTime || `${roadmap.modules.length * 2} hours`;
  roadmap.difficultyLevel = roadmap.difficultyLevel || 'intermediate';
}

function assertChapter(content: string): void {
  const words = countWords(content);
  if (words < CONFIG.MIN_MODULE_WORD_COUNT) throw new Error(`Chapter too short (${words} words, min ${CONFIG.MIN_MODULE_WORD_COUNT})`);
  if (!/^##\s+/m.test(content)) throw new Error('Chapter is missing section headings');
  if (EDITION === 'stellar') {
    // Pustakam stellar closes with Key Takeaways — Practice is optional
    if (!/##\s+Key Takeaways\b/i.test(content)) throw new Error('Chapter is missing ## Key Takeaways');
  }
  if (EDITION === 'street' || EDITION === 'desi') {
    if (!/##\s+Victory Lap\b/i.test(content)) throw new Error('Chapter is missing ## Victory Lap section');
  }
}

function makeMetaDescription(title: string, seed: TopicSeed): string {
  const complexity = seed.complexity || 'beginner';
  const desc = `${title} — a free ${complexity}-level guide covering ${seed.goal.toLowerCase()}. Learn with clear explanations, real examples, and hands-on exercises.`;
  // Ensure we never truncate mid-word
  if (desc.length <= 155) return desc;
  const truncated = desc.substring(0, 152).replace(/\s+\S*$/, '');
  return truncated + '...';
}
function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 50).replace(/-+$/, '');
}
function parseJSON(raw: string): any {
  const cleaned = raw.trim()
    .replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '')
    .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  const match = cleaned.match(/([\{\[][\s\S]*[\}\]])/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[1].replace(/,\s*([}\]])/g, '$1'));
}

// ── Core generator ─────────────────────────────────────────────────────────────

async function generateBook(seed: TopicSeed, workerIndex: number): Promise<'ok' | 'fail'> {
  // Slug will be regenerated from roadmap title after roadmap is generated
  let slug = toSlug(`${EDITION === 'desi' ? 'desi ' : EDITION === 'street' ? 'street ' : ''}${seed.goal} ${seed.complexity || 'beginner'}`);
  const tag = `[W${workerIndex}]`;
  const modelsUsed = new Set<string>();

  // ─── Step 1: Roadmap ────────────────────────────────────────────────────────
  let roadmap: any;
  try {
    roadmap = await withRetry(
      async () => {
        const result = await callWriter(buildRoadmapPrompt(seed), 500, 'roadmap');
        modelsUsed.add(result.model);
        const parsed = parseJSON(result.text);
        assertAndNormalizeRoadmap(parsed);  // normalises focus→description, adds estimatedTime
        return parsed;
      },
      `${tag} roadmap`
    );
    console.log(`  📋 ${tag} Roadmap: "${roadmap.title}" — ${roadmap.modules.length} modules`);
    // Regenerate slug from SEO-friendly roadmap title if available
    if (roadmap.title) {
      const editionPrefix = EDITION === 'desi' ? 'desi-' : EDITION === 'street' ? 'street-' : '';
      slug = editionPrefix + toSlug(roadmap.title);
    }
  } catch (e: any) {
    console.error(`\n❌ ${tag} roadmap failed: ${slug} — ${String(e.message).slice(0, 80)}`);
    return 'fail';
  }

  // ─── Step 2: Generate chapters sequentially with deep continuity ────────────
  const modules: Array<{ title: string; content: string; wordCount: number }> = [];
  for (let i = 0; i < roadmap.modules.length; i++) {
    const mod = roadmap.modules[i];
    try {
      const result = await withRetry(
        async () => {
          const promptObj = buildModulePrompt(seed, roadmap, mod, i, roadmap.modules.length, modules);
          const completion = await callWriter(
            promptObj.userPrompt,
            1500,
            'chapter',
            promptObj.systemPrompt
          );
          assertChapter(completion.text);
          return completion;
        },
        `${tag} module ${i + 1}/${roadmap.modules.length}`
      );
      modelsUsed.add(result.model);
      const content = stripLeadingDuplicateHeading(result.text, mod.title);
      modules.push({ title: mod.title, content, wordCount: countWords(content) });
      process.stdout.write(`  📖 ${tag} Chapter ${i + 1}/${roadmap.modules.length}: ${mod.title} (${countWords(content)} words)\n`);

      // Cooldown between modules to avoid rate limiting
      if (i < roadmap.modules.length - 1) {
        await sleep(CONFIG.MODULE_COOLDOWN);
      }
    } catch (error: any) {
      console.error(`\n❌ ${tag} module ${i + 1} failed: ${String(error?.message || error).slice(0, 120)}`);
      return 'fail';
    }
  }

  // ─── Step 3: Assembly (Introduction + Summary + Glossary) ───────────────────
  console.log(`  🔨 ${tag} Assembling book...`);

  let introduction = '';
  let summary = '';
  let glossary = '';

  try {
    console.log(`  📝 ${tag} Generating introduction...`);
    introduction = await generateIntroduction(seed, roadmap);
    introduction = stripLeadingDuplicateHeading(introduction, 'Introduction');
    await sleep(CONFIG.MODULE_COOLDOWN);

    console.log(`  📝 ${tag} Generating summary...`);
    summary = await generateSummary(seed, modules);
    summary = stripLeadingDuplicateHeading(summary, 'Summary');
    await sleep(CONFIG.MODULE_COOLDOWN);

    console.log(`  📝 ${tag} Generating glossary...`);
    glossary = await generateGlossarySection(modules);
  } catch (assemblyError: any) {
    console.warn(`  ⚠️  ${tag} Assembly partially failed: ${String(assemblyError?.message || assemblyError).slice(0, 100)}`);
    // Continue with whatever we have — the book still has all its chapters
  }

  const totalWords = modules.reduce((s, m) => s + m.wordCount, 0)
    + countWords(introduction) + countWords(summary) + countWords(glossary);

  const modelName = [...modelsUsed].join(', ');

  // Build the final book in Pustakam format
  const finalBook = [
    `# ${roadmap.title || seed.goal}\n\n`,
    `**Generated:** ${new Date().toLocaleDateString()}\n`,
    `**Words:** ${totalWords.toLocaleString()}\n`,
    `**Model:** ${modelName}\n\n`,
    `---\n\n## Table of Contents\n\n`,
    generateTableOfContents(modules),
    `\n\n---\n\n`,
    // Introduction
    introduction ? `## Introduction\n\n${introduction}\n\n---\n\n` : '',
    // Chapters
    ...modules.map((m, i) => {
      return `# Chapter ${i + 1}: ${m.title}\n\n${m.content}\n\n${i < modules.length - 1 ? '---\n\n' : ''}`;
    }),
    // Summary
    summary ? `\n---\n\n## Summary\n\n${summary}\n\n` : '',
    // Glossary
    glossary ? `---\n\n## Glossary\n\n${glossary}` : '',
  ].join('');

  // ─── Step 4: Save to LOCAL FILE ─────────────────────────────────────────────
  const bookFile: BookFile = {
    slug,
    title: roadmap.title || seed.goal,
    goal: seed.goal,
    category: seed.category,
    tags: seed.tags,
    language: seed.language || 'en',
    complexity: seed.complexity || 'beginner',
    wordCount: totalWords,
    moduleCount: modules.length,
    readingTimeMins: Math.ceil(totalWords / 250),
    metaDescription: makeMetaDescription(roadmap.title || seed.goal, seed),
    modelUsed: modelName,
    generatedAt: new Date().toISOString(),
    edition: EDITION,
    roadmap,
    modules,
    finalBook,
  };

  saveBook(bookFile);
  console.log(`\n✅ ${tag} ${slug} — ${totalWords.toLocaleString()} words, ${modules.length} chapters → public/library/books/${slug}.json`);
  return 'ok';
}

// ── Topic seeds (Fallback/Bootstrap seeds) ─────────────────────────────────────

const BOOTSTRAP_SEEDS: TopicSeed[] = [
  { goal: 'Learn Python programming from zero to real projects', category: 'programming', tags: ['python', 'coding'], complexity: 'beginner' },
  { goal: 'Understand data structures and algorithms for tech interviews', category: 'programming', tags: ['dsa', 'algorithms'], complexity: 'intermediate' },
  { goal: 'Understand prompt engineering and build LLM apps', category: 'ai', tags: ['llm', 'prompt-engineering'], complexity: 'advanced' },
  { goal: 'Learn stock market investing for beginners in India', category: 'finance', tags: ['stocks', 'india'], complexity: 'beginner' },
  { goal: 'Launch a startup from idea to product', category: 'business', tags: ['startup', 'entrepreneurship'], complexity: 'intermediate' },
  { goal: 'Crack UPSC CSE Prelims with systematic preparation', category: 'exams', tags: ['upsc', 'ias'], complexity: 'beginner' },
  { goal: 'Score band 7+ in IELTS writing and speaking', category: 'exams', tags: ['ielts', 'english'], complexity: 'advanced' },
  { goal: 'Improve spoken English fluency for Indian speakers', category: 'language', tags: ['english', 'speaking'], complexity: 'beginner' },
  { goal: 'Build a consistent gym workout routine for beginners', category: 'health', tags: ['gym', 'fitness'], complexity: 'beginner' },
  { goal: 'Learn UI/UX design from scratch with Figma', category: 'design', tags: ['uiux', 'figma'], complexity: 'intermediate' }
];

async function generateSeedsViaAI(count: number, existing: BookMeta[]): Promise<TopicSeed[]> {
  const existingList = existing.map(b => `- ${b.title} (${b.category}, ${b.complexity})`).join('\n');
  const prompt = `You are a curriculum curator for a free online book library. Generate exactly ${count} completely new learning guide topics.

CRITICAL — SEO & USER SEARCH INTENT:
Every goal MUST be something a real person would type into Google when they want to learn something. Think like an actual user searching, not an academic.

GOOD goals (real search queries):
- "Learn Python programming from scratch"
- "How to start investing in the stock market"
- "IELTS preparation guide for band 7+"
- "Build a personal website with HTML and CSS"
- "Basics of machine learning with Python"
- "How to write a resume that gets interviews"
- "Learn Excel for data analysis"
- "Digital marketing for small businesses"
- "How to lose weight with strength training"
- "Learn JavaScript for web development"

BAD goals (nobody searches for these):
- "Engineer hyperlocal bacterial cellulose textiles from kombucha SCOBY waste"
- "Construct a survival-state psychological profile to dominate high-stakes hostage negotiations"
- "Manipulate the autonomic nervous system to induce targeted torpor"
- "Decode and speak Toki Pona to radically simplify thought patterns"

Existing guides in the library (DO NOT duplicate or overlap):
${existingList || 'None yet.'}

Rules:
1. Goals must be 5-10 words max — short, clear, reads like a Google search query.
2. Topics must span diverse popular categories: programming, finance, health, career, exams, design, languages, business, productivity, science.
3. Mix complexities: 'beginner', 'intermediate', 'advanced'.
4. Every goal must pass this test: "Would at least 1000 people per month search for this on Google?"
5. NO hyper-specialized, academic, or bizarre niche topics.
6. Return ONLY a valid JSON array (no markdown, no wrap):
[
  {
    "goal": "Learn Python programming from scratch",
    "category": "programming",
    "tags": ["python", "coding", "beginners"],
    "complexity": "beginner"
  }
]`;

  try {
    const result = await callWriter(prompt, 500, 'seeds-generator');
    const parsed = parseJSON(result.text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(s => ({
        goal: s.goal,
        category: s.category || 'general',
        tags: s.tags || [],
        complexity: s.complexity || 'beginner'
      }));
    }
  } catch (e) {
    console.error('Failed to generate seeds dynamically, using bootstrap fallbacks:', e);
  }

  // Fallback to bootstrap seeds that aren't already completed
  const completedSet = new Set(existing.map(b => b.slug));
  return BOOTSTRAP_SEEDS
    .filter(s => !completedSet.has(toSlug(`${s.goal} ${s.complexity || 'beginner'}`)))
    .slice(0, count);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  if (!CONFIG.PRIMARY_API_KEY && !CONFIG.FALLBACK_API_KEY) {
    throw new Error('Missing configured API keys');
  }

  ensureDirs();
  const checkpoint = loadCheckpoint();
  const completedSet = new Set([...checkpoint.completedSlugs, ...getExistingSlugs()]);
  checkpoint.completedSlugs = [...completedSet];

  const catalogPath = path.join(CONFIG.OUTPUT_DIR, 'catalog.json');
  let existingBooks: BookMeta[] = [];
  if (fs.existsSync(catalogPath)) {
    try {
      existingBooks = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).books || [];
    } catch {}
  }

  const countToGenerate = CONFIG.MAX_BOOKS > 0 ? CONFIG.MAX_BOOKS : 20;

  console.log('\n🚀 Pustakam Library Generator — Full Pipeline (Sequential)');
  console.log(`🤖 Target books to generate this run: ${countToGenerate}`);
  console.log(`✅ Already done in library: ${completedSet.size}`);
  
  console.log(`🤖 Generating unique topic seeds via ${CONFIG.PRIMARY_PROVIDER.toUpperCase()}...`);
  const pending = await generateSeedsViaAI(countToGenerate, existingBooks);
  
  if (pending.length === 0) {
    console.log('ℹ️  No new topics generated or all bootstrap topics exhausted. Exiting.');
    return;
  }

  console.log(`⏭️  Topics selected for generation:\n${pending.map((p, idx) => `   ${idx + 1}. ${p.goal} (${p.complexity})`).join('\n')}`);

  // Estimate: ~10-17 API calls per book, sequential
  const avgCalls = 13; // roadmap + ~8 chapters + intro + summary + glossary
  const estMinutes = (pending.length * avgCalls * 15) / 60; // ~15s per call average
  console.log(`⚙️  Mode: Sequential (1 book at a time)`);
  console.log(`📁 Output: ${CONFIG.OUTPUT_DIR}`);
  console.log(`🤖 Primary: ${CONFIG.PRIMARY_MODEL}  |  Fallback: ${CONFIG.FALLBACK_MODEL}`);
  console.log(`📖 Edition: ${EDITION.toUpperCase()} ${EDITION === 'street' ? '🔥 (Street Oracle Mode)' : '✨ (Premium)'}`);
  console.log(`🔧 Pipeline: Full (Intro + Chapters + Summary + Glossary)`);
  console.log(`📏 Word target: ${CONFIG.MODULE_WORD_TARGET} per chapter | max_tokens: ${CONFIG.MAX_TOKENS}`);
  console.log(`⏱️  Estimated: ~${estMinutes.toFixed(0)} minutes`);
  console.log(`💾 Storage: ~${(pending.length * 0.04).toFixed(0)}MB (${pending.length} books × ~40KB each)`);
  console.log('─────────────────────────────────────────\n');

  // Apply MAX_BOOKS limit if set (useful for test runs or CI time limits)
  if (CONFIG.MAX_BOOKS > 0) pending.splice(CONFIG.MAX_BOOKS);

  const limit = pLimit(CONFIG.CONCURRENCY);
  let done = 0; let failed = 0;
  const startTime = Date.now();

  const tasks = pending.map((seed, i) =>
    limit(async () => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📚 Book ${i + 1}/${pending.length}: "${seed.goal}" (${seed.complexity})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const result = await generateBook(seed, i + 1);
      const slug = toSlug(`${EDITION === 'desi' ? 'desi ' : EDITION === 'street' ? 'street ' : ''}${seed.goal} ${seed.complexity || 'beginner'}`);

      if (result === 'ok') { checkpoint.completedSlugs.push(slug); done++; }
      else { checkpoint.failedSlugs.push(slug); failed++; }

      saveCheckpoint(checkpoint);
      const elapsed = (Date.now() - startTime) / 60000;
      const rate = done / Math.max(elapsed, 0.01);
      console.log(`\n📊 Progress: ${done + failed}/${pending.length} | ✅${done} ❌${failed} | ${rate.toFixed(1)} books/min | ~${((pending.length - done - failed) / Math.max(rate, 0.01)).toFixed(0)}min left\n`);
    })
  );

  await Promise.all(tasks);
  saveCheckpoint(checkpoint);

  // Rebuild index.json and sitemap.xml from all files
  rebuildIndex();
  const indexData = JSON.parse(fs.readFileSync(path.join(CONFIG.OUTPUT_DIR, 'catalog.json'), 'utf8'));
  generateSitemap(indexData.books);

  const totalMin = (Date.now() - startTime) / 60000;
  const totalSize = done * 0.04;

  console.log('\n═════════════════════════════════════════════════════');
  console.log(`✅ ${done} books generated in ${totalMin.toFixed(1)} minutes`);
  console.log(`❌ Failed: ${failed} (re-run to retry)`);
  console.log(`📁 Files saved to: ${CONFIG.OUTPUT_DIR}`);
  console.log(`💾 Approx size: ~${totalSize.toFixed(0)}MB`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. git add public/library && git push');
  console.log('  2. Vercel auto-deploys (your static files are now on CDN)');
  console.log(`  3. Submit sitemap: ${CONFIG.SITE_URL}/library/sitemap.xml`);
  console.log('     → https://search.google.com/search-console');
  console.log('═════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
