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

  // Sort by category then title
  index.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

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

// ── Visual content instructions (shared across editions) ──────────────────────
// Mermaid diagrams and quiz sections removed — matching Pustakam's core pipeline
const VISUAL_INSTRUCTIONS = `
VISUAL ENGAGEMENT RULES (follow these strictly):
- Use emoji-prefixed blockquotes for callout boxes. Types:
  > 💡 **Pro Tip:** for useful insights
  > ⚠️ **Common Mistake:** for pitfalls to avoid
  > 🎯 **Key Insight:** for important takeaways
  > ☕ **Real Talk:** for honest, grounded advice
- Use these callouts naturally throughout the chapter — at least 2-3 per chapter.
- Do NOT include mermaid diagrams.
`;

function buildRoadmapPrompt(seed: TopicSeed): string {
  const complexity = seed.complexity || 'beginner';

  if (EDITION === 'desi') {
    return `Abey sun, hum ek desi blackhole roadmap bana rahe hain for: "${seed.goal}". No bakwaas. Pure street-smart action plan.

PERSONA:
You're a street-smart Mumbai/Pune bhai - zero filter, full energy, pure tough love. You've been through the grind, now giving a reality check to a newbie. Use casual Hinglish with words like "Bhai", "Boss", "Guru", "Scene", "Fundoo", "Chamka kya".

LANGUAGE: Hinglish (Hindi + English mixed seamlessly, like urban Indian tech-bros talk).

STYLE WARFARE:
- Headings: Super catchy, punchy, full of attitude.
- Objectives: Crisp, crystal clear, zero fluff.

CONTEXT:
- Target Audience: ${complexity} learners who need real talk
- Category: ${seed.category}

MISSION SPECS:
- Break the topic into 6 to 14 modules.
- Each module: Savage Hinglish title + one-line focus + 3-5 objectives.

JSON FORMATTING & ESCAPING RULES (CRITICAL):
- Never use unescaped double quotes (") inside JSON string values.
- Use single quotes (') inside values if needed.
- Return ONLY valid JSON:
{"title":"Desi Book Title in Hinglish Style","modules":[{"title":"Module Title in Tapori Style","description":"One line focus","objectives":["Objective 1","Objective 2","Objective 3"]}],"difficultyLevel":"${complexity}"}`;
  }

  if (EDITION === 'street') {
    return `Boss, we're building a blackhole roadmap for: "${seed.goal}". No hand-holding. No shortcuts. Just raw strategy.

PERSONA:
You're the unhinged street oracle - zero filters, all grit. A battle-scarred hustler who's clawed through hell and back, now mapping out the war plan for someone who's hungry but clueless. Call 'em "bro," "chief," "dreamer" - whatever wakes 'em up. Roast their excuses, hype their potential, and hand 'em a roadmap that slaps.

LANGUAGE: Pure English with raw street dialect (bro, chief, slacker, needle mover, reality check). Absolutely NO Hindi, Hinglish, or tapori slang.

STYLE WARFARE:
- Titles that hit like headlines: Punchy, provocative, impossible to ignore.
- Objectives that corner 'em: Clear, actionable, no wiggle room for slackers.
- Energy on max: This roadmap should feel like a war briefing, not a PowerPoint snooze.

CONTEXT:
- Target Audience: ${complexity} learners who need a reality check
- Complexity Level: ${complexity}
- Category: ${seed.category}

MISSION SPECS:
- Break the topic into as many modules as it genuinely needs to be covered well - usually somewhere between 6 and 14. Do not pad with filler modules just to hit a number, and do not cram unrelated ideas into one module just to keep the count low.
- Each module: Savage title + a one-line "focus" + 3-5 real objectives + no two modules covering the same ground.
- Match the energy: Titles should make 'em curious, scared, or hyped - never bored.

JSON FORMATTING & ESCAPING RULES (CRITICAL):
- Never use unescaped double quotes (") inside any JSON string values (like titles, descriptions, or objectives).
- If you need to use quotes inside a value (e.g., 'noob'), use single quotes (').
- Do not add any text before or after the JSON.
- Ensure the JSON is valid.

Return ONLY valid JSON, no markdown:
{"title":"Savage Book Title in Street Style","modules":[{"title":"Module Title That Slaps Hard","description":"One line focus","objectives":["Objective 1","Objective 2","Objective 3"]}],"difficultyLevel":"${complexity}"}`;
  }

  // ── Stellar edition ──
  return `You are designing a practical, evergreen learning guide that hooks readers from the first line.
Topic: "${seed.goal}"
Audience: ${complexity} learners. Category: ${seed.category}.

Break the topic into as many modules as it genuinely needs to be covered well - usually somewhere between 6 and 14. Do not pad with filler modules just to hit a number, and do not cram unrelated ideas into one module just to keep the count low. Start at the learner's current level and end with a usable outcome. Every module must be distinct and build on earlier modules.

TITLE RULES:
- The book title should be compelling and specific, not generic. Make readers curious.
- Module titles should be intriguing — use questions, bold claims, or curiosity gaps. Instead of "Introduction to Variables" try "Why Your Computer Has a Memory Problem (And How Variables Fix It)".

Prefer durable fundamentals over time-sensitive claims. Avoid invented statistics, guarantees, and clickbait titles.

Return ONLY valid JSON, no markdown:
{"title":"Clear, compelling book title","modules":[{"title":"Intriguing module title","description":"One sentence focus","objectives":["Point 1","Point 2","Point 3"]}],"difficultyLevel":"${complexity}"}`;
}

function buildModulePrompt(
  seed: TopicSeed,
  roadmap: { title?: string; modules: Array<{ title: string; description: string; objectives: string[] }> },
  mod: { title: string; description: string; objectives: string[] },
  index: number,
  total: number,
  previousModules: Array<{ title: string; content: string; wordCount: number }>
): { systemPrompt: string; userPrompt: string } {
  // Static outline for caching (no dynamic markers like ✅ or 👉)
  const staticOutline = roadmap.modules.map((item, i) => {
    return `- Module ${i + 1}: ${item.title} (${item.description})`;
  }).join('\n');

  // Deep continuity: extract glossary terms from all previous chapters
  const coveredConcepts = previousModules.length > 0
    ? extractGlossaryTerms(previousModules).slice(0, 25)
    : [];

  const coveredBlock = coveredConcepts.length > 0
    ? `\n\nALREADY INTRODUCED (reference these by name where relevant - don't redefine them from scratch):\n${coveredConcepts.join(', ')}`
    : '';

  const continuity = previousModules.length > 0
    ? `This is chapter ${index + 1}. The reader has already completed ${previousModules.length} chapter(s). Continue from where they left off.${coveredBlock}`
    : 'This is the first chapter. Establish only the foundations needed for later chapters.';

  if (EDITION === 'desi' || (EDITION === 'street' && STREET_LANG === 'hinglish')) {
    const exampleInstruction = ['programming', 'data-science', 'ai'].includes(seed.category)
      ? 'Include a small, correct code or worked technical example when it helps.'
      : 'Include a concrete, realistic scenario when it helps.';

    const systemPrompt = `PERSONA:
Tu hai asli gully ka don — full-on tapori energy, zero filter, dil se gaali dene wala lekin pyaar se. Tu wo bhai hai jo footpath pe baithke duniya ka gyaan deta hai, chai ki tapri pe philosophy peleta hai. "Abe", "BC", "Saale", "Bhai", "Boss", "Guru", "Kya maa ch*d raha hai sacchi mein" — ye tera daily vocab hai. Tu roast karta hai unko jinhe pyaar karta hai. Tu gaali deta hai because tu chahta hai wo succeed kare. Tough love level: Indian dad meets street hustler meets stand-up comedian.

LANGUAGE: Hardcore Hinglish — Hindi + English mila ke likh. 70% Hindi vibe, 30% English technical terms. Gaaliyan use kar but cleverly — "BC ye concept itna easy hai ki tera pet ka kutta bhi samajh jaaye." Reader ko hasana bhi hai, sikhana bhi hai, aur thappad bhi maarna hai (figuratively).

TONE RULES:
- Har cheez ko desi analogy se explain kar (chai, autorickshaw, jugaad, local train, sharma ji ka beta, arranged marriage, IPL)
- Complex concepts ko roadside conversation jaisa bana — "Dekh bhai, ye aise samajh..."
- Rhetorical questions pelega: "Samjha? Nahi samajh? Padh dubara, dimag lagaa."
- Reader ko kabhi bore mat hone de. Agar boring lag raha hai, gaali de aur aage badh.

${VISUAL_INSTRUCTIONS}

LAYOUT:
(Chapter title repeat mat kar heading mein)
## Asli Funda (Core Concepts)
## Practical Scene (Street-level Application)

DO NOT:
- Concepts already covered repeat mat kar (ALREADY INTRODUCED dekh)
- Mermaid diagrams mat daal
- Quiz sections mat daal
- Generic motivational bakwaas mat likh — be specific, be savage, be useful

BOOK STRUCTURE (Full Learning Path):
${staticOutline}`;

    const userPrompt = `Abe saale, Chapter ${index + 1} of ${total} shuru kar: "${mod.title}". Full power daal, nahi toh tera chapter delete kar dunga.

STYLE KA DHANDA:
- Opening mein aag lagaa — pehli line se reader ka collar pakad. Koi desi scenario se start kar (local train mein jhagda, sharma ji ka beta topper, startup fail hona, raat 3 baje coding).
- Sentences chhote rakh. Punch. Dhamaka. Phir explain. "Samjha? Nahi? Padh dubara BC."
- Har tough concept ko chai ki tapri wali language mein explain kar — "Bhai ye aise samajh, jaise tu biryani order karta hai..."
- Gaali + wisdom combo: "Saale, ye itna important hai ki isko skip kiya toh tera career ka barbaad ho jaayega, pakka."
- ${exampleInstruction}
- FACTS must be accurate. Masti kar, gaali de, lekin galat info mat de. Tera reader tujhpe trust karta hai.

CONTEXT:
- Topic: ${seed.goal}
- Chapter ${index + 1}/${total}: "${mod.title}"
- Focus: ${mod.description}
- Objectives: ${mod.objectives.join('; ')}

${continuity}

Write ${CONFIG.MODULE_WORD_TARGET} words in Hinglish. Markdown strict. Tone: Tapori, Savage, Knowledgeable, Desi Street King.`;

    return { systemPrompt, userPrompt };
  }

  if (EDITION === 'street') {
    const exampleInstruction = ['programming', 'data-science', 'ai'].includes(seed.category)
      ? 'Include a small, correct code or worked technical example when it helps.'
      : 'Include a concrete, realistic scenario when it helps.';

    const systemPrompt = `PERSONA:
You're the feral street prophet — the kind of maniac who learned everything the hard way and now you're out here saving these clueless bastards from their own stupidity. You talk like a drill sergeant who watched too much stand-up comedy. You're Gordon Ramsay meets a street corner philosopher meets a prison librarian who's read every book twice. Call 'em "you dumb beautiful bastard", "champ" (sarcastically), "genius" (sarcastically), "kid", "rookie". You drop f-bombs (written as f*ck, sh*t, a**, damn, hell) because that's how real people talk when they actually give a damn. You LOVE the reader — that's WHY you're mean. Coddling is for people who want them to fail.

LANGUAGE: Raw, unfiltered English. Street-level vocabulary — "no-BS", "screw that", "what the hell", "get your sh*t together", "wake the f*ck up". NOT academic. NOT corporate. You talk like someone who actually lives in the real world, not a LinkedIn influencer. Absolutely NO Hindi, Hinglish, or non-English.

TONE RULES:
- Every concept gets explained like you're telling a drunk friend at a bar why they're wrong — simple, brutal, memorable.
- Analogies should be gritty and real: breakups, bar fights, bad bosses, rent due, hangovers, getting fired, street hustle.
- Roast the reader's potential excuses BEFORE they make them: "I know what you're thinking — 'this is too hard.' Cute. My grandma learned this and she can't find the power button."
- Celebrate small wins like a psychotic coach: "YOU ABSOLUTE LEGEND. You just understood recursion. Most people tap out here. Not you, you beautiful disaster."
- Swear for EMPHASIS, not filler. Every curse should hit like a punchline.

${VISUAL_INSTRUCTIONS}

LAYOUT:
(Start directly with content - do NOT repeat the chapter title as a heading)
## Core Carnage (Rip Apart the Essentials)
## Street Smarts (How to Actually Use This)

DO NOT:
- Repeat or redefine concepts already covered in earlier chapters (see ALREADY INTRODUCED above)
- Start with a heading that duplicates the chapter title
- Include mermaid diagrams
- Include quiz sections
- Be generic or motivational-poster-fake. Be REAL. If something sucks, say it sucks.

BOOK STRUCTURE (Full Learning Path):
${staticOutline}`;

    const userPrompt = `Listen up genius, it's time for Chapter ${index + 1} of ${total}: "${mod.title}". Make it hurt so good.

STYLE WARFARE:
- First line should be a gut punch or a laugh-out-loud moment. Vary every chapter — a brutal question, a war story, a "picture this" nightmare scenario, a savage one-liner. NEVER the same opener twice.
- Write like you're texting someone you actually care about at 2am. Short. Punchy. Raw. Then go deep when it matters.
- Questions that corner 'em: "Still breathing? Good. Because this next part separates the pretenders from the players."
- Break down PhD-level concepts like bar napkin math — if a hungover college dropout can't get it, rewrite it.
- Sarcasm is your love language: "Oh sure, skip this section. I'm sure employers LOVE candidates who half-ass fundamentals."
- Tough love hits: "You think this is optional? Cool. Go compete with people who DID learn this. Spoiler: you lose."
- Make them FEEL smart when they get something right. Hype them up between the roasts.
- Facts must be bulletproof. You can swear about anything, but you NEVER lie about the subject matter.
- ${exampleInstruction}

KNOWLEDGE DEPTH:
- Don't just explain WHAT — explain WHY it exists, WHO invented/discovered it, WHAT problem it solved.
- Connect concepts to real-world consequences: money, careers, health, relationships.
- Include at least one "mind-blown" moment per chapter — something the reader didn't expect to learn.

CONTEXT:
- Big Picture: ${seed.goal}
- Chapter ${index + 1}/${total}: "${mod.title}"
- Focus: ${mod.description}
- Objectives: ${mod.objectives.join('; ')}
- Audience: ${seed.complexity || 'beginner'} learners

${continuity}

Write ${CONFIG.MODULE_WORD_TARGET} words. Markdown strict. Tone: Savage, Brilliant, Unhinged, Caring-but-Brutal.`;

    return { systemPrompt, userPrompt };
  }

  // ── Stellar edition ──
  const exampleInstruction = ['programming', 'data-science', 'ai'].includes(seed.category)
    ? 'Include a small, correct code or worked technical example when it helps.'
    : 'Include a concrete, realistic scenario when it helps.';

  const systemPrompt = `WRITING STYLE (follow these carefully):
- OPENING HOOK: Start every chapter with a mind-bending fact, a counterintuitive question, or a vivid "imagine this" scenario (2-3 sentences). Make the reader's brain itch. Never start with a definition or "In this chapter, we will..."
- MENTOR TONE: Write like the smartest person in the room who's also the most approachable. You're the professor who explains quantum physics using pizza analogies. Use "you" and "your" — this is a conversation, not a lecture.
- WHY BEFORE HOW: Before explaining any mechanism, answer: Why does this exist? What problem was someone trying to solve? What changes for the reader after understanding this? Context is everything.
- DEPTH OVER BREADTH: Go deep on fewer concepts rather than skimming many. One well-explained idea beats five glossed-over ones. Include the history, the reasoning, the edge cases.
- REAL-WORLD ANCHORS: Every abstract concept needs a concrete anchor — a company that uses it, a disaster caused by ignoring it, a daily-life parallel. Make knowledge STICKY.
- ANALOGIES: Use at least 2 vivid analogies per chapter. Not clichéd ones — surprising, memorable ones that make the reader go "ohh, NOW I get it."
- VARY STRUCTURE: Mix explanations, examples, comparisons, "what would happen if" scenarios, expert quotes (real ones only), and direct actionable advice.
- Use callout boxes for tips, warnings, and insights (see VISUAL ENGAGEMENT RULES below).

${VISUAL_INSTRUCTIONS}

DO NOT:
- Repeat or redefine concepts already covered in earlier chapters (see ALREADY INTRODUCED above)
- Start with a heading that duplicates the chapter title
- Include mermaid diagrams
- Include quiz sections
- Add filler, unsupported statistics, generic motivational language, or claims likely to become outdated
- Use phrases like "In today's world", "It's important to note", "Let's dive in" — these are AI-sounding clichés

BOOK STRUCTURE (Full Learning Path):
${staticOutline}`;

  const userPrompt = `Write one chapter of the guide "${roadmap.title || seed.goal}".
Topic: "${seed.goal}". Audience: ${seed.complexity || 'beginner'} learners.
Chapter ${index + 1}/${total}: "${mod.title}"
Focus: ${mod.description}
Required learning objectives: ${mod.objectives.join('; ')}
${exampleInstruction}

KNOWLEDGE DEPTH:
- Don't just explain WHAT — explain the origin story: WHO discovered/created this, WHEN, and what problem they were solving.
- Connect every concept to real consequences: careers, money, health, technology, society.
- Include at least one "most people don't know this" insight — something genuinely surprising or counterintuitive.
- When appropriate, mention what goes wrong when people misunderstand this concept.

Full learning path:
${outline}

${continuity}

Write ${CONFIG.MODULE_WORD_TARGET} words of clear, engaging prose. Start directly with the hook. Use descriptive ## headings, short paragraphs. Include a short "## Practice" section with one actionable exercise. End with "## Key Takeaways" (exactly 3 bullet points).`;

  return { systemPrompt, userPrompt };
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
      const heading = `Module ${i + 1}: ${m.title}`;
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

function assertRoadmap(roadmap: any): asserts roadmap is { title?: string; modules: Array<{ title: string; description: string; objectives: string[] }> } {
  if (!Array.isArray(roadmap?.modules) || roadmap.modules.length < 4 || roadmap.modules.length > 16) {
    throw new Error(`Roadmap must contain 4-16 modules (got ${roadmap?.modules?.length || 0})`);
  }
  for (const module of roadmap.modules) {
    if (!module?.title || !module?.description || !Array.isArray(module?.objectives) || module.objectives.length < 3) {
      throw new Error('Roadmap contains an incomplete module');
    }
  }
}

function assertChapter(content: string): void {
  const words = countWords(content);
  if (words < CONFIG.MIN_MODULE_WORD_COUNT) throw new Error(`Chapter too short (${words} words, min ${CONFIG.MIN_MODULE_WORD_COUNT})`);
  if (!/^##\s+/m.test(content)) throw new Error('Chapter is missing section headings');
  if (EDITION === 'stellar') {
    if (!/##\s+Practice\b/i.test(content)) throw new Error('Chapter is missing a practice section');
    if (!/##\s+Key Takeaways\b/i.test(content)) throw new Error('Chapter is missing key takeaways');
  }
}

function makeMetaDescription(title: string, seed: TopicSeed): string {
  return `${title}: a ${seed.complexity || 'beginner'} guide to ${seed.goal.toLowerCase()} with clear explanations, examples, and practice.`.slice(0, 155);
}
function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 80).replace(/-+$/, '');
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
  const slug = toSlug(`${EDITION === 'desi' ? 'desi ' : EDITION === 'street' ? 'street ' : ''}${seed.goal} ${seed.complexity || 'beginner'}`);
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
        assertRoadmap(parsed);
        return parsed;
      },
      `${tag} roadmap`
    );
    console.log(`  📋 ${tag} Roadmap: "${roadmap.title}" — ${roadmap.modules.length} modules`);
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
      return `# Module ${i + 1}: ${m.title}\n\n${m.content}\n\n${i < modules.length - 1 ? '---\n\n' : ''}`;
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
  const prompt = `You are a curriculum curator. Generate exactly ${count} completely new, highly interesting, and unique learning guide topics/seeds.
  
Existing guides in the library (DO NOT duplicate, overlap, or cover similar topics):
${existingList || 'None yet.'}

Requirements:
1. Ensure topics span diverse categories (e.g., programming, business, finance, health, design, science, career, languages).
2. Choose a mix of complexities: 'beginner', 'intermediate', 'advanced'.
3. Each guide must have a specific learning goal.
4. Ensure the goals are highly search-friendly (SEO optimized) and reflect terms people actually search for when wanting to learn a skill (e.g., 'Master personal finance and budgeting for beginners', 'Learn React from scratch', 'Crack code interviews with C++'). Avoid overly abstract, poetic, or academic titles.
5. Return ONLY a valid JSON array matching this format (no markdown, no wrap):
[
  {
    "goal": "Clear learning goal (e.g. Master personal finance and budgeting)",
    "category": "category-slug (e.g. finance)",
    "tags": ["tag1", "tag2"],
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
