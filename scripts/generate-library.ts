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

// Collect Cerebras API keys (dynamically detects CEREBRAS_API_KEYS, CEREBRAS_API_KEY_1..10, etc.)
const cerebrasEnvKeys = Object.keys(process.env)
  .filter(k => k === 'CEREBRAS_API_KEYS' || k.startsWith('CEREBRAS_API_KEY'))
  .map(k => process.env[k])
  .filter(Boolean)
  .join(',');

const CEREBRAS_API_KEYS = Array.from(new Set(cerebrasEnvKeys.split(',').map(k => k.trim()).filter(Boolean)));
let activeCerebrasKeyIndex = 0;

function getActiveCerebrasKey(): string {
  if (CEREBRAS_API_KEYS.length === 0) return '';
  return CEREBRAS_API_KEYS[activeCerebrasKeyIndex % CEREBRAS_API_KEYS.length];
}

function rotateCerebrasKey(): string {
  if (CEREBRAS_API_KEYS.length <= 1) return getActiveCerebrasKey();
  activeCerebrasKeyIndex = (activeCerebrasKeyIndex + 1) % CEREBRAS_API_KEYS.length;
  const newKey = CEREBRAS_API_KEYS[activeCerebrasKeyIndex];
  return newKey;
}

function getActiveCerebrasKeyTag(): string {
  if (CEREBRAS_API_KEYS.length === 0) return '';
  return ` [K${(activeCerebrasKeyIndex % CEREBRAS_API_KEYS.length) + 1}/${CEREBRAS_API_KEYS.length}]`;
}

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
  const validCerebrasModels = ['gemma-4-31b', 'zai-glm-4.7', 'gpt-oss-120b'];
  const modelToUse = validCerebrasModels.includes(SELECTED_MODEL) ? SELECTED_MODEL : '';
  const envModelRaw = process.env.CEREBRAS_MODEL || '';
  const envModel = validCerebrasModels.includes(envModelRaw) ? envModelRaw : '';
  primaryModel = modelToUse || envModel || 'gemma-4-31b';
  primaryApiUrl = 'https://api.cerebras.ai/v1/chat/completions';
  primaryApiKey = getActiveCerebrasKey();
  primaryProviderName = 'cerebras';
}

const CONFIG = {
  // Sequential execution: one book at a time to avoid rate-limit storms
  CONCURRENCY:           Number(process.env.CONCURRENCY || 1),
  MAX_BOOKS:             Number(process.env.MAX_BOOKS   || 0), // 0 = no limit

  // Cerebras real rate limit: 30,000 tokens/minute per key
  // (was incorrectly set to 450,000 — which let all requests through and caused 429s)
  TOKENS_PER_MIN_LIMIT:  30_000,

  // Match Pustakam's word targets (1800-3200 per module)
  MODULE_WORD_TARGET:    '1800-3200',
  MIN_MODULE_WORD_COUNT: 800,

  // Match Pustakam's max_tokens (8192 for full chapters)
  MAX_TOKENS:            8192,

  PRIMARY_MODEL:         primaryModel,
  PRIMARY_API_URL:       primaryApiUrl,
  PRIMARY_API_KEY:       primaryApiKey,
  PRIMARY_PROVIDER:      primaryProviderName,

  // Fallback configuration (supports secondary Cerebras model or Mistral)
  FALLBACK_MODEL:        process.env.CEREBRAS_FALLBACK_MODEL || (primaryProviderName === 'cerebras' ? 'gpt-oss-120b' : 'mistral-small-2506'),
  FALLBACK_API_URL:      primaryProviderName === 'cerebras' ? 'https://api.cerebras.ai/v1/chat/completions' : 'https://api.mistral.ai/v1/chat/completions',
  FALLBACK_API_KEY:      primaryProviderName === 'cerebras' ? getActiveCerebrasKey() : (process.env.MISTRAL_API_KEY || ''),
  FALLBACK_PROVIDER:     primaryProviderName === 'cerebras' ? 'cerebras' : 'mistral',

  // Cooldown between sequential module generations (ms)
  MODULE_COOLDOWN:       primaryProviderName === 'mistral' ? 3000 : 1000,

  OUTPUT_DIR:            process.env.OUTPUT_DIR
    ? path.resolve(process.cwd(), process.env.OUTPUT_DIR)
    : path.resolve(__dirname, '../public/library'),
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

// ── Keyword-based similarity detection ─────────────────────────────────────────

/** Extract meaningful keywords from a goal/title string (strips stop words). */
function extractKeywords(text: string): Set<string> {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'with',
    'from', 'your', 'how', 'what', 'is', 'are', 'by', 'at', 'as', 'its',
    'that', 'this', 'it', 'be', 'do', 'get', 'has', 'have', 'you', 'our',
    'learn', 'guide', 'complete', 'ultimate', 'step', 'stepbystep', 'step-by-step',
    'beginners', 'beginner', 'intermediate', 'advanced', 'basics', 'basic',
    'introduction', 'intro', 'start', 'started', 'getting', 'comprehensive',
    'roadmap', 'practical', 'tips', 'strategies', 'techniques', 'mastering',
    'master', 'build', 'create', 'make', 'using', 'use',
  ]);
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/[\s-]+/)
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w))
  );
}

/** Returns the fraction of keywords shared between two texts (Jaccard-ish). */
function keywordSimilarity(a: string, b: string): number {
  const kA = extractKeywords(a);
  const kB = extractKeywords(b);
  if (kA.size === 0 || kB.size === 0) return 0;
  let overlap = 0;
  for (const w of kA) if (kB.has(w)) overlap++;
  // Use the SMALLER set as denominator so "Shopify Dropshipping" (2 keywords)
  // matching against "How to Start Shopify Dropshipping Store" (3 keywords)
  // correctly scores as 2/2 = 1.0, not 2/3 = 0.67.
  return overlap / Math.min(kA.size, kB.size);
}

/** Filter out seeds that are too similar to existing books. */
function filterSimilarSeeds(
  seeds: TopicSeed[],
  existing: Array<{ title: string; goal?: string }>,
  threshold = 0.6
): TopicSeed[] {
  const existingTexts = existing.map(b => b.title + ' ' + (b.goal || ''));
  return seeds.filter(seed => {
    for (const existing of existingTexts) {
      if (keywordSimilarity(seed.goal, existing) >= threshold) {
        console.log(`  🔁 Skipping duplicate seed: "${seed.goal}" (too similar to existing book)`);
        return false;
      }
    }
    // Also check against other seeds in this batch (avoid intra-batch dupes)
    return true;
  });
}

/** Deduplicate seeds within the batch itself. */
function deduplicateSeedBatch(seeds: TopicSeed[], threshold = 0.6): TopicSeed[] {
  const kept: TopicSeed[] = [];
  for (const seed of seeds) {
    const isDupe = kept.some(k => keywordSimilarity(seed.goal, k.goal) >= threshold);
    if (isDupe) {
      console.log(`  🔁 Removing intra-batch duplicate: "${seed.goal}"`);
    } else {
      kept.push(seed);
    }
  }
  return kept;
}

// ── Category normalizer — minimal cleanup only, AI has full freedom ──────────
function normalizeCategory(raw: string): string {
  // Only deduplicate obvious plural/synonym collisions — never collapse
  // distinct topics into a generic parent. The AI picks whatever category
  // it wants; we just clean up the slug.
  const DEDUP_MAP: Record<string, string> = {
    'languages': 'language',
    'coding': 'programming',
    'tech': 'technology',
    'ml': 'machine-learning',
    'ai': 'artificial-intelligence',
    'test-prep': 'exams',
    'certification': 'exams',
    'photo': 'photography',
    'recipes': 'cooking',
    'baking': 'cooking',
    'instruments': 'music',
    'jobs': 'career',
    'job-search': 'career',
    'money': 'finance',
    'investing': 'finance',
    'self-help': 'personal-development',
    'self-improvement': 'personal-development',
  };
  const slug = raw.toLowerCase().trim().replace(/\s+/g, '-');
  return DEDUP_MAP[slug] || slug;
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

/** Throw this to skip all retries — for permanent errors like 402 Payment Required. */
class NonRetryableError extends Error {
  constructor(msg: string) { super(msg); this.name = 'NonRetryableError'; }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [5000, 15000, 30000, 60000, 120000];
  for (let attempt = 1; attempt <= CONFIG.RETRY_MAX; attempt++) {
    try { return await fn(); } catch (e: any) {
      // Don't retry permanent failures (payment required, auth errors, etc.)
      if (e instanceof NonRetryableError) throw e;
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
  systemPrompt?: string,
  modelOverride?: string
): Promise<Completion> {
  const useFallback = forceFallback || (!CONFIG.PRIMARY_API_KEY && Boolean(CONFIG.FALLBACK_API_KEY)) ||
    (primaryConsecutiveFailures >= FALLBACK_THRESHOLD && CONFIG.FALLBACK_API_KEY);

  let model     = modelOverride || (useFallback ? CONFIG.FALLBACK_MODEL : CONFIG.PRIMARY_MODEL);
  const apiUrl  = useFallback ? CONFIG.FALLBACK_API_URL  : CONFIG.PRIMARY_API_URL;
  let apiKey    = useFallback ? (CONFIG.FALLBACK_PROVIDER === 'cerebras' ? getActiveCerebrasKey() : CONFIG.FALLBACK_API_KEY) : (CONFIG.PRIMARY_PROVIDER === 'cerebras' ? getActiveCerebrasKey() : CONFIG.PRIMARY_API_KEY);
  const provider = useFallback ? CONFIG.FALLBACK_PROVIDER : CONFIG.PRIMARY_PROVIDER;

  if (!apiKey) throw new Error(`No API key configured for ${useFallback ? 'fallback' : CONFIG.PRIMARY_PROVIDER}`);

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

  if (res.status === 429 || res.status === 404) {
    if (provider === 'cerebras') {
      const nextKey = rotateCerebrasKey();
      if (nextKey) {
        CONFIG.PRIMARY_API_KEY = nextKey;
      }
      if (res.status === 404 && model === 'gemma-4-31b') {
        // gemma-4-31b is a Preview model — this key may not have access.
        // Switch BOTH the global config AND the local model variable so
        // withRetry's next attempt actually sends gpt-oss-120b, not gemma-4-31b.
        console.log(`  🔄 gemma-4-31b returned 404 on Cerebras (Preview access denied), switching to gpt-oss-120b...`);
        if (CONFIG.PRIMARY_MODEL === 'gemma-4-31b') CONFIG.PRIMARY_MODEL = 'gpt-oss-120b';
        model = 'gpt-oss-120b';
      }
      const e: any = new Error(`${provider} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      e.status = res.status;
      e.retryModel = model; // carry updated model through to next withRetry attempt
      if (!useFallback) primaryConsecutiveFailures++;
      throw e;
    }
  }

  if (res.status === 402) {
    // Payment Required — free quota exhausted on this key; rotate and fail immediately
    // (retrying with the same key won't help — quota resets on a monthly cycle)
    if (provider === 'cerebras') {
      rotateCerebrasKey();
    }
    const body = (await res.text()).slice(0, 200);
    throw new NonRetryableError(`cerebras 402: ${body}`);
  }

  if (res.status === 401 || res.status === 403) {
    // Auth errors are also non-retryable
    const body = (await res.text()).slice(0, 200);
    throw new NonRetryableError(`${provider} ${res.status} Auth error: ${body}`);
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
  systemPrompt?: string,
  modelOverride?: string
): Promise<Completion> {
  return callAI(prompt, estInputTokens, kind, false, systemPrompt, modelOverride);
}

// ── ZAI GLM-4.7-Flash fallback ────────────────────────────────────────────────────────────
// Free ZAI model used when Cerebras quota (402) is exhausted mid-book.
async function callGLMFallback(
  prompt: string,
  estInputTokens = 500,
  kind: RequestKind = 'chapter',
  systemPrompt?: string,
  model = 'glm-4.7-flash'
): Promise<Completion> {
  const glmApiKey = process.env.ZAI_API_KEY || '';
  if (!glmApiKey) throw new Error('ZAI_API_KEY not set — cannot use ZAI fallback');
  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];
  const estTotal = estInputTokens + 2000;
  await tokenBudget.acquire(estTotal);
  const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${glmApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: CONFIG.MAX_TOKENS,
    }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`ZAI ${model} ${res.status}: ${body}`);
  }
  const data = await res.json() as any;
  tokenBudget.record(data.usage?.total_tokens || estTotal);
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new Error(`ZAI ${model} returned no content`);
  return { text, model };
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
  roadmap: { title?: string; modules: Array<{ title: string }> },
  modelOverride?: string
): Promise<string> {
  const prompt = `Generate a compelling introduction for: "${seed.goal}"

ROADMAP:
${roadmap.modules.map(m => `- ${m.title}`).join('\n')}

TARGET: ${seed.complexity || 'beginner'} learners
CATEGORY: ${seed.category}

Write 800-1200 words covering: welcome and purpose, what readers will learn, book structure, motivation. Use ### markdown headers for internal sections (this is already wrapped in its own "## Introduction" heading, so don't title any of your own sections "Introduction" - start with something like "### Welcome and Purpose" instead).

${(EDITION === 'desi' || (EDITION === 'street' && STREET_LANG === 'hinglish')) ? 'TONE: Hardcore Hinglish tapori style — gaali + gyaan combo, savage but loving. Same persona as the rest of the book. Vary your opening hook wildly based on the topic. Do NOT repeat generic lines like "Abe sun, ye introduction hai". Make it unique and directly tied to the subject matter.' : EDITION === 'street' ? 'TONE: Raw, unfiltered, street-prophet style — curse when it hits, roast the reader for even thinking about skipping the intro. Same persona as the rest of the book. Pure English, no Hindi/Hinglish.' : 'TONE: Warm, knowledgeable, mentor-like. Make the reader excited about what they\'re about to learn.'}`;

  const result = await withRetry(
    () => callWriter(prompt, 800, 'assemble', undefined, modelOverride),
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
  modules: Array<{ title: string }>,
  modelOverride?: string
): Promise<string> {
  const prompt = `Generate a summary for: "${seed.goal}"

MODULES:
${modules.map(m => `- ${m.title}`).join('\n')}

Write 600-900 words covering: key learning outcomes, important concepts recap, next steps, congratulations. Use ### markdown headers for internal sections (this is already wrapped in its own "## Summary" heading, so don't title any of your own sections "Summary" - start with something like "### Key Learning Outcomes" instead).

${(EDITION === 'desi' || (EDITION === 'street' && STREET_LANG === 'hinglish')) ? 'TONE: Hinglish tapori wrap-up — "Bas bhai, itna seekh liya toh tu set hai. Ab jaake duniya hila." Same savage-but-proud persona.' : EDITION === 'street' ? 'TONE: Raw, street-smart, wrap-up — celebrate the reader like a psychotic coach. "You beautiful disaster, you actually made it through. Now go destroy mediocrity." Pure English, no Hindi/Hinglish.' : 'TONE: Warm, encouraging, forward-looking. Celebrate their progress and point them to next steps.'}`;

  const result = await withRetry(
    () => callWriter(prompt, 600, 'assemble', undefined, modelOverride),
    'summary'
  );
  return result.text;
}

/**
 * AI-generated glossary (10-14 terms) with two-tier fallback.
 * Ported from Pustakam bookService.ts generateGlossary()
 */
async function generateGlossarySection(
  modules: Array<{ title: string; content: string }>,
  modelOverride?: string
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
    const result = await callWriter(primaryPrompt, 1200, 'glossary', undefined, modelOverride);
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
    const result = await callWriter(fallbackPrompt, 800, 'glossary', undefined, modelOverride);
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

async function generateBook(seed: TopicSeed, workerIndex: number, existingTitles: string[]): Promise<'ok' | 'fail'> {
  // Determine model for this book (50/50 split between gemma-4-31b and gpt-oss-120b if Cerebras)
  let targetModel: string | undefined = undefined;
  if (CONFIG.PRIMARY_PROVIDER === 'cerebras' && (!SELECTED_MODEL || !['gemma-4-31b', 'zai-glm-4.7', 'gpt-oss-120b'].includes(SELECTED_MODEL))) {
    targetModel = workerIndex % 2 === 1 ? 'gemma-4-31b' : 'gpt-oss-120b';
  }

  // Slug will be regenerated from roadmap title after roadmap is generated
  let slug = toSlug(`${EDITION === 'desi' ? 'desi ' : EDITION === 'street' ? 'street ' : ''}${seed.goal} ${seed.complexity || 'beginner'}`);
  const getTag = () => `[W${workerIndex}]${targetModel ? ` [${targetModel}]` : ''}${getActiveCerebrasKeyTag()}`;
  const modelsUsed = new Set<string>();

  // ─── Step 1: Roadmap ────────────────────────────────────────────────────────
  let roadmap: any;
  try {
    roadmap = await withRetry(
      async () => {
        const result = await callWriter(buildRoadmapPrompt(seed), 500, 'roadmap', undefined, targetModel);
        modelsUsed.add(result.model);
        const parsed = parseJSON(result.text);
        assertAndNormalizeRoadmap(parsed);  // normalises focus→description, adds estimatedTime
        return parsed;
      },
      `${getTag()} roadmap`
    ).catch(async (e: any) => {
      // On Cerebras quota exhaustion, try GLM-4.7-Flash before abandoning
      if (e instanceof NonRetryableError && process.env.ZAI_API_KEY) {
        console.log(`  🔄 ${getTag()} Cerebras quota exhausted — retrying roadmap with GLM-4.7-Flash...`);
        const result = await callGLMFallback(buildRoadmapPrompt(seed), 500, 'roadmap');
        modelsUsed.add(result.model);
        const parsed = parseJSON(result.text);
        assertAndNormalizeRoadmap(parsed);
        return parsed;
      }
      throw e;
    });
    console.log(`  📋 ${getTag()} Roadmap: "${roadmap.title}" — ${roadmap.modules.length} modules`);
    // Regenerate slug from SEO-friendly roadmap title if available
    if (roadmap.title) {
      const editionPrefix = EDITION === 'desi' ? 'desi-' : EDITION === 'street' ? 'street-' : '';
      const newSlug = editionPrefix + toSlug(roadmap.title);
      // 1. Exact slug check (fast path)
      const existingBookPath = path.join(CONFIG.OUTPUT_DIR, 'books', `${newSlug}.json`);
      if (fs.existsSync(existingBookPath)) {
        console.log(`  ⏭️  ${getTag()} Skipping — book with slug "${newSlug}" already exists`);
        return 'ok';
      }
      // 2. Keyword similarity check against ALL known titles (catches same topic with
      //    different subtitle — e.g. "A Complete Guide" vs "A Comprehensive Guide")
      for (const existingTitle of existingTitles) {
        const sim = keywordSimilarity(roadmap.title, existingTitle);
        if (sim >= 0.75) {
          console.log(`  ⏭️  ${getTag()} Skipping — "${roadmap.title}" is ${(sim * 100).toFixed(0)}% similar to existing "${existingTitle}"`);
          return 'ok';
        }
      }
      slug = newSlug;
    }
  } catch (e: any) {
    console.error(`\n❌ ${getTag()} roadmap failed: ${slug} — ${String(e.message).slice(0, 80)}`);
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
            promptObj.systemPrompt,
            targetModel
          );
          assertChapter(completion.text);
          return completion;
        },
        `${getTag()} module ${i + 1}/${roadmap.modules.length}`
      ).catch(async (e: any) => {
        // Cerebras quota exhausted — rescue already-written chapters by switching to GLM
        if (e instanceof NonRetryableError && process.env.ZAI_API_KEY) {
          console.log(`  🔄 ${getTag()} Cerebras quota — rescuing chapter ${i + 1}/${roadmap.modules.length} with GLM-4.7-Flash...`);
          const promptObj = buildModulePrompt(seed, roadmap, mod, i, roadmap.modules.length, modules);
          const completion = await callGLMFallback(promptObj.userPrompt, 1500, 'chapter', promptObj.systemPrompt);
          // Only check word count + headings for GLM chapters — skip Key Takeaways
          // (GLM sometimes omits it; retrying just fails again with same result)
          const words = countWords(completion.text);
          if (words < CONFIG.MIN_MODULE_WORD_COUNT) throw new Error(`GLM chapter too short (${words} words)`);
          if (!/^##\s+/m.test(completion.text)) throw new Error('GLM chapter is missing section headings');
          return completion;
        }
        throw e;
      });
      modelsUsed.add(result.model);
      const content = stripLeadingDuplicateHeading(result.text, mod.title);
      modules.push({ title: mod.title, content, wordCount: countWords(content) });
      process.stdout.write(`  📖 ${getTag()} Chapter ${i + 1}/${roadmap.modules.length}: ${mod.title} (${countWords(content)} words)\n`);

      // Cooldown between modules to avoid rate limiting
      if (i < roadmap.modules.length - 1) {
        await sleep(CONFIG.MODULE_COOLDOWN);
      }
    } catch (error: any) {
      console.error(`\n❌ ${getTag()} module ${i + 1} failed: ${String(error?.message || error).slice(0, 120)}`);
      return 'fail';
    }
  }

  // ─── Step 3: Assembly (Introduction + Summary + Glossary) ───────────────────
  console.log(`  🔨 ${getTag()} Assembling book...`);

  let introduction = '';
  let summary = '';
  let glossary = '';

  try {
    console.log(`  📝 ${getTag()} Generating introduction...`);
    introduction = await generateIntroduction(seed, roadmap, targetModel);
    introduction = stripLeadingDuplicateHeading(introduction, 'Introduction');
    await sleep(CONFIG.MODULE_COOLDOWN);

    console.log(`  📝 ${getTag()} Generating summary...`);
    summary = await generateSummary(seed, modules, targetModel);
    summary = stripLeadingDuplicateHeading(summary, 'Summary');
    await sleep(CONFIG.MODULE_COOLDOWN);

    console.log(`  📝 ${getTag()} Generating glossary...`);
    glossary = await generateGlossarySection(modules, targetModel);
  } catch (assemblyError: any) {
    const errMsg = String(assemblyError?.message || assemblyError);
    console.warn(`  ⚠️  ${getTag()} Assembly partially failed: ${errMsg.slice(0, 100)}`);
    // Cerebras quota hit during assembly — rescue intro/summary/glossary via GLM-4.7-Flash
    if (process.env.ZAI_API_KEY && (errMsg.includes('402') || errMsg.includes('Payment'))) {
      console.log(`  🔄 ${getTag()} Retrying assembly sections with GLM-4.7-Flash (free)...`);
      try {
        if (!introduction) {
          console.log(`  📝 ${getTag()} Generating introduction (GLM)...`);
          const res = await callGLMFallback(buildIntroductionPrompt(seed, roadmap), 300, 'chapter');
          introduction = stripLeadingDuplicateHeading(res.text.trim(), 'Introduction');
        }
        if (!summary) {
          console.log(`  📝 ${getTag()} Generating summary (GLM)...`);
          const summaryPrompt = `Write a comprehensive summary of this book covering all key concepts:\n${modules.slice(0, 5).map(m => m.title).join(', ')}...`;
          const res = await callGLMFallback(summaryPrompt, 300, 'chapter');
          summary = stripLeadingDuplicateHeading(res.text.trim(), 'Summary');
        }
        if (!glossary) {
          console.log(`  📝 ${getTag()} Generating glossary (GLM)...`);
          const glossaryPrompt = `Create a glossary of 10-15 key terms with definitions // ── Topic seeds (Fallback pool — 140+ diverse seeds across global + India-specific) ────────
// Used when AI seed generation fails. Large enough that even with 700+ books in library,
// there are always fresh, non-duplicate seeds available after filterSimilarSeeds().

const BOOTSTRAP_SEEDS: TopicSeed[] = [
  // Crafts & Making
  { goal: 'How to make candles at home for beginners', category: 'crafts', tags: ['candles', 'wax'], complexity: 'beginner' },
  { goal: 'Learn soap making from scratch at home', category: 'crafts', tags: ['soap', 'natural'], complexity: 'beginner' },
  { goal: 'How to make macrame wall hangings', category: 'crafts', tags: ['macrame', 'rope'], complexity: 'beginner' },
  { goal: 'Resin art pour painting for beginners', category: 'crafts', tags: ['resin', 'pour-art'], complexity: 'beginner' },
  { goal: 'How to make terracotta clay jewelry', category: 'crafts', tags: ['clay', 'jewelry'], complexity: 'beginner' },
  { goal: 'Paper quilling art designs for beginners', category: 'crafts', tags: ['paper', 'quilling'], complexity: 'beginner' },
  { goal: 'Learn basket weaving techniques for beginners', category: 'crafts', tags: ['weaving', 'basket'], complexity: 'beginner' },
  { goal: 'How to tie dye fabric at home step by step', category: 'crafts', tags: ['tye-dye', 'fabric'], complexity: 'beginner' },
  { goal: 'Needle felting wool animals for beginners', category: 'crafts', tags: ['felting', 'wool'], complexity: 'beginner' },
  { goal: 'How to make friendship bracelets at home', category: 'crafts', tags: ['braiding', 'friendship'], complexity: 'beginner' },
  { goal: 'Crochet stuffed animals amigurumi for beginners', category: 'crafts', tags: ['crochet', 'amigurumi'], complexity: 'intermediate' },
  { goal: 'How to make bath bombs from scratch at home', category: 'crafts', tags: ['bath-bombs', 'natural'], complexity: 'beginner' },
  { goal: 'Origami art for beginners step by step', category: 'crafts', tags: ['origami', 'paper-folding'], complexity: 'beginner' },
  // Culinary (Specific)
  { goal: 'How to make homemade pasta from scratch', category: 'cooking', tags: ['pasta', 'italian'], complexity: 'beginner' },
  { goal: 'Beginner guide to making sushi at home', category: 'cooking', tags: ['sushi', 'japanese'], complexity: 'intermediate' },
  { goal: 'How to make croissants at home step by step', category: 'cooking', tags: ['croissants', 'baking'], complexity: 'intermediate' },
  { goal: 'Korean cooking basics for beginners at home', category: 'cooking', tags: ['korean', 'bibimbap'], complexity: 'beginner' },
  { goal: 'Thai cooking stir fry basics for beginners', category: 'cooking', tags: ['thai', 'stir-fry'], complexity: 'beginner' },
  { goal: 'How to make kombucha at home for beginners', category: 'cooking', tags: ['kombucha', 'fermentation'], complexity: 'beginner' },
  { goal: 'Homemade ice cream without a machine', category: 'cooking', tags: ['ice-cream', 'dessert'], complexity: 'beginner' },
  { goal: 'How to ferment vegetables kimchi and pickles', category: 'cooking', tags: ['fermentation', 'kimchi'], complexity: 'beginner' },
  { goal: 'How to make ramen from scratch at home', category: 'cooking', tags: ['ramen', 'japanese'], complexity: 'intermediate' },
  { goal: 'Mexican cooking basics tacos and salsas', category: 'cooking', tags: ['mexican', 'tacos'], complexity: 'beginner' },
  { goal: 'How to brew beer at home for beginners', category: 'cooking', tags: ['brewing', 'beer'], complexity: 'intermediate' },
  { goal: 'How to make pizza dough from scratch', category: 'cooking', tags: ['pizza', 'dough'], complexity: 'beginner' },
  // Music (Specific instruments)
  { goal: 'Learn ukulele chords and songs for beginners', category: 'music', tags: ['ukulele', 'chords'], complexity: 'beginner' },
  { goal: 'How to play harmonica blues for beginners', category: 'music', tags: ['harmonica', 'blues'], complexity: 'beginner' },
  { goal: 'Learn to play drums for beginners at home', category: 'music', tags: ['drums', 'rhythm'], complexity: 'beginner' },
  { goal: 'Beginner violin lessons technique and practice', category: 'music', tags: ['violin', 'strings'], complexity: 'beginner' },
  { goal: 'Music production basics in Ableton Live', category: 'music', tags: ['ableton', 'production'], complexity: 'beginner' },
  { goal: 'Learn music theory basics for all musicians', category: 'music', tags: ['theory', 'harmony'], complexity: 'intermediate' },
  { goal: 'How to DJ and mix music for beginners', category: 'music', tags: ['dj', 'mixing'], complexity: 'beginner' },
  { goal: 'Learn to sing and develop your voice', category: 'music', tags: ['singing', 'vocal'], complexity: 'beginner' },
  // Languages (Specific)
  { goal: 'Learn Spanish speaking basics for beginners', category: 'language', tags: ['spanish', 'speaking'], complexity: 'beginner' },
  { goal: 'Japanese language hiragana basics for beginners', category: 'language', tags: ['japanese', 'hiragana'], complexity: 'beginner' },
  { goal: 'Learn French conversation basics for beginners', category: 'language', tags: ['french', 'conversation'], complexity: 'beginner' },
  { goal: 'Mandarin Chinese tones and basics for beginners', category: 'language', tags: ['mandarin', 'tones'], complexity: 'beginner' },
  { goal: 'Learn Arabic alphabet and basics from scratch', category: 'language', tags: ['arabic', 'alphabet'], complexity: 'beginner' },
  { goal: 'Portuguese conversation basics for beginners', category: 'language', tags: ['portuguese', 'conversation'], complexity: 'beginner' },
  { goal: 'Learn German grammar basics for beginners', category: 'language', tags: ['german', 'grammar'], complexity: 'beginner' },
  { goal: 'Italian for complete beginners at home', category: 'language', tags: ['italian', 'conversation'], complexity: 'beginner' },
  { goal: 'Learn sign language ASL for beginners', category: 'language', tags: ['asl', 'sign-language'], complexity: 'beginner' },
  // Sports & Martial Arts
  { goal: 'Learn rock climbing bouldering for beginners', category: 'sports', tags: ['climbing', 'bouldering'], complexity: 'beginner' },
  { goal: 'How to skateboard ollie tricks for beginners', category: 'sports', tags: ['skateboarding', 'tricks'], complexity: 'beginner' },
  { goal: 'Learn boxing basics punching technique', category: 'sports', tags: ['boxing', 'punching'], complexity: 'beginner' },
  { goal: 'Muay Thai kickboxing basics for beginners', category: 'sports', tags: ['muay-thai', 'kickboxing'], complexity: 'beginner' },
  { goal: 'Brazilian jiu-jitsu BJJ basics for beginners', category: 'sports', tags: ['bjj', 'grappling'], complexity: 'beginner' },
  { goal: 'Badminton techniques smash and footwork', category: 'sports', tags: ['badminton', 'smash'], complexity: 'beginner' },
  { goal: 'Table tennis spin techniques for beginners', category: 'sports', tags: ['ping-pong', 'spin'], complexity: 'beginner' },
  { goal: 'Learn fencing sword fighting for beginners', category: 'sports', tags: ['fencing', 'sword'], complexity: 'beginner' },
  { goal: 'How to do handstands calisthenics at home', category: 'fitness', tags: ['calisthenics', 'handstand'], complexity: 'intermediate' },
  { goal: 'Learn archery for beginners at home', category: 'sports', tags: ['archery', 'bow'], complexity: 'beginner' },
  // Art & Drawing
  { goal: 'How to draw realistic portraits for beginners', category: 'art', tags: ['portrait', 'drawing'], complexity: 'beginner' },
  { goal: 'Learn oil painting basics for beginners', category: 'art', tags: ['oil-painting', 'canvas'], complexity: 'beginner' },
  { goal: 'Digital art illustration using Procreate', category: 'art', tags: ['procreate', 'digital'], complexity: 'beginner' },
  { goal: 'How to draw anime manga characters step by step', category: 'art', tags: ['anime', 'manga'], complexity: 'beginner' },
  { goal: 'Learn gouache painting for beginners', category: 'art', tags: ['gouache', 'painting'], complexity: 'beginner' },
  { goal: 'Urban sketching with pen and ink for beginners', category: 'art', tags: ['sketching', 'urban'], complexity: 'beginner' },
  { goal: 'Charcoal drawing shading and blending basics', category: 'art', tags: ['charcoal', 'shading'], complexity: 'beginner' },
  { goal: 'Linocut printmaking for beginners at home', category: 'art', tags: ['linocut', 'printmaking'], complexity: 'beginner' },
  // Technology (Specific)
  { goal: 'Learn React JS build web apps from scratch', category: 'programming', tags: ['react', 'javascript'], complexity: 'intermediate' },
  { goal: 'Docker containers basics for developers', category: 'technology', tags: ['docker', 'devops'], complexity: 'intermediate' },
  { goal: 'Linux command line bash scripting basics', category: 'technology', tags: ['linux', 'bash'], complexity: 'beginner' },
  { goal: 'Learn SQL and database design from scratch', category: 'programming', tags: ['sql', 'database'], complexity: 'beginner' },
  { goal: 'Build a website with HTML CSS JavaScript', category: 'programming', tags: ['html', 'css'], complexity: 'beginner' },
  { goal: 'Learn TypeScript for JavaScript developers', category: 'programming', tags: ['typescript', 'javascript'], complexity: 'intermediate' },
  { goal: 'Blender 3D modelling basics for beginners', category: 'technology', tags: ['blender', '3d'], complexity: 'beginner' },
  { goal: 'Raspberry Pi home automation projects', category: 'electronics', tags: ['raspberry-pi', 'automation'], complexity: 'intermediate' },
  { goal: 'Learn Git version control for beginners', category: 'programming', tags: ['git', 'github'], complexity: 'beginner' },
  // Health & Wellness
  { goal: 'How to do intermittent fasting for beginners', category: 'health', tags: ['fasting', 'nutrition'], complexity: 'beginner' },
  { goal: 'Running couch to 5k plan for beginners', category: 'fitness', tags: ['running', '5k'], complexity: 'beginner' },
  { goal: 'Beginner stretching and flexibility training', category: 'fitness', tags: ['stretching', 'flexibility'], complexity: 'beginner' },
  { goal: 'How to track macros and calories for fitness', category: 'health', tags: ['macros', 'nutrition'], complexity: 'intermediate' },
  { goal: 'Resistance band full body workout for beginners', category: 'fitness', tags: ['resistance-bands', 'strength'], complexity: 'beginner' },
  { goal: 'Learn acupressure and pressure point therapy', category: 'health', tags: ['acupressure', 'massage'], complexity: 'beginner' },
  { goal: 'Cold exposure and ice bath therapy basics', category: 'health', tags: ['cold-therapy', 'recovery'], complexity: 'beginner' },
  // Home & Garden
  { goal: 'How to paint a room interior wall step by step', category: 'home-improvement', tags: ['painting', 'walls'], complexity: 'beginner' },
  { goal: 'How to fix a leaking tap plumbing basics', category: 'home-improvement', tags: ['plumbing', 'diy'], complexity: 'beginner' },
  { goal: 'Install ceramic floor tiles for beginners', category: 'home-improvement', tags: ['tiling', 'flooring'], complexity: 'intermediate' },
  { goal: 'Basic home electrical repairs and rewiring', category: 'home-improvement', tags: ['electrical', 'wiring'], complexity: 'intermediate' },
  { goal: 'How to build a raised garden bed at home', category: 'gardening', tags: ['raised-bed', 'vegetables'], complexity: 'beginner' },
  { goal: 'Learn companion planting for vegetable gardens', category: 'gardening', tags: ['companion-planting', 'organic'], complexity: 'intermediate' },
  { goal: 'How to prune fruit trees correctly', category: 'gardening', tags: ['pruning', 'fruit-trees'], complexity: 'intermediate' },
  { goal: 'Composting at home beginners guide', category: 'gardening', tags: ['composting', 'soil'], complexity: 'beginner' },
  // Finance
  { goal: 'How to read stock charts technical analysis', category: 'finance', tags: ['stocks', 'charts'], complexity: 'intermediate' },
  { goal: 'How to create a personal budget from scratch', category: 'finance', tags: ['budgeting', 'savings'], complexity: 'beginner' },
  { goal: 'Cryptocurrency basics bitcoin and blockchain', category: 'finance', tags: ['crypto', 'bitcoin'], complexity: 'beginner' },
  { goal: 'How to invest in index funds for beginners', category: 'finance', tags: ['index-funds', 'passive'], complexity: 'beginner' },
  { goal: 'Options trading basics for stock market beginners', category: 'finance', tags: ['options', 'trading'], complexity: 'intermediate' },
  { goal: 'Tax basics for freelancers and self-employed', category: 'finance', tags: ['taxes', 'freelance'], complexity: 'intermediate' },
  // Animals & Pets
  { goal: 'How to care for a pet gecko at home', category: 'pets', tags: ['gecko', 'reptile'], complexity: 'beginner' },
  { goal: 'Beekeeping basics hives and honey for beginners', category: 'pets', tags: ['bees', 'honey'], complexity: 'beginner' },
  { goal: 'How to raise backyard chickens for eggs', category: 'pets', tags: ['chickens', 'eggs'], complexity: 'beginner' },
  { goal: 'Freshwater aquarium fishkeeping for beginners', category: 'pets', tags: ['aquarium', 'fish'], complexity: 'beginner' },
  { goal: 'Parrot care and basic training for beginners', category: 'pets', tags: ['parrot', 'bird'], complexity: 'beginner' },
  { goal: 'How to care for succulents and cacti', category: 'gardening', tags: ['succulents', 'indoor-plants'], complexity: 'beginner' },
  // Photography & Video
  { goal: 'Portrait photography natural light techniques', category: 'photography', tags: ['portrait', 'natural-light'], complexity: 'intermediate' },
  { goal: 'Product photography basics at home studio', category: 'photography', tags: ['product', 'studio'], complexity: 'beginner' },
  { goal: 'Learn film photography and developing rolls', category: 'photography', tags: ['film', 'analog'], complexity: 'beginner' },
  { goal: 'How to make YouTube videos from scratch', category: 'video', tags: ['youtube', 'filming'], complexity: 'beginner' },
  { goal: 'Video editing in DaVinci Resolve for beginners', category: 'video', tags: ['davinci', 'editing'], complexity: 'beginner' },
  { goal: 'Drone photography and flying basics', category: 'photography', tags: ['drone', 'aerial'], complexity: 'intermediate' },
  // Personal Development
  { goal: 'How to practice daily gratitude journaling', category: 'personal-development', tags: ['gratitude', 'journaling'], complexity: 'beginner' },
  { goal: 'Speed reading and memory techniques', category: 'personal-development', tags: ['speed-reading', 'memory'], complexity: 'intermediate' },
  { goal: 'How to develop a morning routine for productivity', category: 'personal-development', tags: ['morning-routine', 'habits'], complexity: 'beginner' },
  { goal: 'Learn public speaking and overcoming stage fright', category: 'personal-development', tags: ['public-speaking', 'confidence'], complexity: 'beginner' },
  { goal: 'Emotional intelligence skills for everyday life', category: 'personal-development', tags: ['emotional-intelligence', 'eq'], complexity: 'intermediate' },
  // Outdoor & Adventure
  { goal: 'How to plan a backpacking trip for beginners', category: 'outdoor', tags: ['backpacking', 'hiking'], complexity: 'beginner' },
  { goal: 'Wilderness camping and outdoor survival basics', category: 'outdoor', tags: ['camping', 'survival'], complexity: 'beginner' },
  { goal: 'Learn kayaking for beginners on flat water', category: 'outdoor', tags: ['kayak', 'paddling'], complexity: 'beginner' },
  { goal: 'How to navigate with map and compass', category: 'outdoor', tags: ['navigation', 'orienteering'], complexity: 'intermediate' },
  { goal: 'Shore fishing basics for complete beginners', category: 'outdoor', tags: ['fishing', 'angling'], complexity: 'beginner' },
  // Writing & Communication
  { goal: 'Learn copywriting for websites and ads', category: 'writing', tags: ['copywriting', 'conversion'], complexity: 'intermediate' },
  { goal: 'How to write a blog post that ranks on Google', category: 'writing', tags: ['blogging', 'seo'], complexity: 'intermediate' },
  { goal: 'How to write children picture books for beginners', category: 'writing', tags: ['childrens-books', 'publishing'], complexity: 'beginner' },
  { goal: 'Podcast production and recording for beginners', category: 'writing', tags: ['podcast', 'audio'], complexity: 'beginner' },
  // Automotive
  { goal: 'How to change car brake pads yourself', category: 'automotive', tags: ['brakes', 'diy'], complexity: 'intermediate' },
  { goal: 'How to detail a car professionally at home', category: 'automotive', tags: ['detailing', 'polish'], complexity: 'beginner' },
  { goal: 'Motorcycle riding safety basics for beginners', category: 'automotive', tags: ['motorcycle', 'riding'], complexity: 'beginner' },
  { goal: 'How to change a flat tyre roadside guide', category: 'automotive', tags: ['tyre', 'roadside'], complexity: 'beginner' },
  // Dance
  { goal: 'Learn salsa dancing basics for beginners', category: 'dance', tags: ['salsa', 'latin'], complexity: 'beginner' },
  { goal: 'How to learn hip hop dance at home', category: 'dance', tags: ['hip-hop', 'street-dance'], complexity: 'beginner' },
  { goal: 'Beginner swing dancing and lindy hop basics', category: 'dance', tags: ['swing', 'lindy-hop'], complexity: 'beginner' },
  { goal: 'Learn belly dancing at home for beginners', category: 'dance', tags: ['belly-dance', 'fitness'], complexity: 'beginner' },
  // Business & Freelancing
  { goal: 'How to start a dropshipping business from scratch', category: 'business', tags: ['dropshipping', 'ecommerce'], complexity: 'beginner' },
  { goal: 'Etsy shop setup and selling handmade products', category: 'business', tags: ['etsy', 'handmade'], complexity: 'beginner' },
  { goal: 'How to start freelancing on Fiverr and Upwork', category: 'business', tags: ['freelancing', 'fiverr'], complexity: 'beginner' },
  { goal: 'Print on demand business setup for beginners', category: 'business', tags: ['print-on-demand', 'merch'], complexity: 'beginner' },
  { goal: 'How to pitch to investors beginner guide', category: 'business', tags: ['pitch', 'funding'], complexity: 'intermediate' },
  // India-specific (Desi edition primary pool)
  { goal: 'How to cook dal tadka from scratch at home', category: 'cooking', tags: ['dal', 'indian'], complexity: 'beginner' },
  { goal: 'Making biryani from scratch at home', category: 'cooking', tags: ['biryani', 'rice'], complexity: 'intermediate' },
  { goal: 'How to make paneer from scratch at home', category: 'cooking', tags: ['paneer', 'dairy'], complexity: 'beginner' },
  { goal: 'Learn to make roti and chapati at home', category: 'cooking', tags: ['roti', 'bread'], complexity: 'beginner' },
  { goal: 'How to make Indian street food chaat at home', category: 'cooking', tags: ['chaat', 'street-food'], complexity: 'beginner' },
  { goal: 'How to crack SBI PO exam from scratch', category: 'exams', tags: ['banking', 'sbi'], complexity: 'beginner' },
  { goal: 'SSC CGL preparation complete guide for beginners', category: 'exams', tags: ['ssc', 'government'], complexity: 'beginner' },
  { goal: 'How to prepare for CAT exam from zero', category: 'exams', tags: ['cat', 'mba'], complexity: 'intermediate' },
  { goal: 'NEET biology preparation strategy for beginners', category: 'exams', tags: ['neet', 'biology'], complexity: 'intermediate' },
  { goal: 'Learn Hindi typing and keyboard shortcuts', category: 'technology', tags: ['hindi', 'typing'], complexity: 'beginner' },
  { goal: 'How to invest in Indian mutual funds for beginners', category: 'finance', tags: ['mutual-funds', 'sip'], complexity: 'beginner' },
  { goal: 'How to file GST returns for small business', category: 'finance', tags: ['gst', 'tax'], complexity: 'intermediate' },
  { goal: 'Ayurvedic home remedies for common ailments', category: 'health', tags: ['ayurveda', 'remedies'], complexity: 'beginner' },
  { goal: 'How to start a tiffin service business at home', category: 'business', tags: ['tiffin', 'food-business'], complexity: 'beginner' },
  { goal: 'Learn classical Indian music ragas for beginners', category: 'music', tags: ['ragas', 'classical'], complexity: 'beginner' },
  { goal: 'Bharatanatyam dance basics for beginners', category: 'dance', tags: ['bharatanatyam', 'classical'], complexity: 'beginner' },
  { goal: 'How to grow tulsi and medicinal herbs at home', category: 'gardening', tags: ['tulsi', 'herbs'], complexity: 'beginner' },
  { goal: 'Learn mehendi henna art for beginners', category: 'crafts', tags: ['mehendi', 'henna'], complexity: 'beginner' },
  { goal: 'How to make Indian pickles achar at home', category: 'cooking', tags: ['achar', 'preserving'], complexity: 'beginner' },
  { goal: 'Trekking in Himalayas beginner preparation guide', category: 'outdoor', tags: ['himalaya', 'trekking'], complexity: 'intermediate' },
];epair for beginners', category: 'automotive', tags: ['cars', 'diy-repair'], complexity: 'beginner' },
  // Pets
  { goal: 'Dog training basics for first-time owners', category: 'pets', tags: ['dogs', 'training'], complexity: 'beginner' },
  // Yoga & Meditation
  { goal: 'Yoga for beginners complete home practice guide', category: 'yoga', tags: ['flexibility', 'mindfulness'], complexity: 'beginner' },
  { goal: 'Mindfulness meditation for stress and anxiety relief', category: 'meditation', tags: ['mindfulness', 'stress'], complexity: 'beginner' },
  // Sports
  { goal: 'Learn to swim as an adult beginner', category: 'sports', tags: ['swimming', 'water'], complexity: 'beginner' },
  // Writing
  { goal: 'Creative writing for beginners fiction and stories', category: 'writing', tags: ['fiction', 'storytelling'], complexity: 'beginner' },
  // Home Improvement
  { goal: 'DIY home renovation projects for beginners', category: 'home-improvement', tags: ['diy', 'renovation'], complexity: 'beginner' },
  // Woodworking
  { goal: 'Woodworking projects for beginners with hand tools', category: 'woodworking', tags: ['furniture', 'hand-tools'], complexity: 'beginner' },
  // Marketing
  { goal: 'Social media marketing strategy for small business', category: 'marketing', tags: ['social-media', 'growth'], complexity: 'intermediate' },
  // Data Science
  { goal: 'Data science with Python for beginners', category: 'data-science', tags: ['python', 'analytics'], complexity: 'beginner' },
  // Cybersecurity
  { goal: 'Cybersecurity fundamentals for beginners', category: 'cybersecurity', tags: ['security', 'networking'], complexity: 'beginner' },
  // Personal Development
  { goal: 'Build self-confidence and overcome social anxiety', category: 'personal-development', tags: ['confidence', 'anxiety'], complexity: 'beginner' },
  // Sustainability
  { goal: 'Zero waste living for beginners practical guide', category: 'sustainability', tags: ['eco-friendly', 'zero-waste'], complexity: 'beginner' },
  // Real Estate
  { goal: 'Real estate investing for beginners complete guide', category: 'real-estate', tags: ['property', 'investing'], complexity: 'beginner' },
  // Astronomy
  { goal: 'Backyard astronomy and stargazing for beginners', category: 'astronomy', tags: ['stars', 'telescope'], complexity: 'beginner' },
  // Electronics
  { goal: 'Arduino projects for beginners step by step', category: 'electronics', tags: ['arduino', 'circuits'], complexity: 'beginner' },
];

function buildCategorySummaryMap(existing: BookMeta[]): string {
  const byCategory: Record<string, string[]> = {};
  for (const b of existing) {
    const cat = b.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(b.title);
  }

  const lines: string[] = [];
  for (const [cat, titles] of Object.entries(byCategory)) {
    const sample = titles.slice(0, 10).map(t => `"${t}"`).join(', ');
    const more = titles.length > 10 ? ` (+${titles.length - 10} more)` : '';
    lines.push(`• Category "${cat}" (${titles.length} books): ${sample}${more}`);
  }
  return lines.join('\n');
}

async function generateSeedsViaAI(
  count: number,
  existing: BookMeta[],
  domainHint = ''
): Promise<TopicSeed[]> {
  const compactCategoryMap = buildCategorySummaryMap(existing);

  // Build a set of categories already well-represented (>= 10 books)
  const categoryCounts: Record<string, number> = {};
  for (const b of existing) {
    categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
  }
  const overRepresented = Object.entries(categoryCounts)
    .filter(([, c]) => c >= 10)
    .map(([cat]) => cat);

  const avoidBlock = overRepresented.length > 0
    ? `\nCATEGORIES ALREADY SATURATED (DO NOT generate topics in these categories):\n${overRepresented.join(', ')}\n`
    : '';

  const focusBlock = domainHint
    ? `\nDOMAIN FOCUS FOR THIS BATCH: ${domainHint}\n`
    : '';

  const prompt = `You are a curriculum curator for a free online book library. Generate exactly ${count} completely new learning guide topics.

CRITICAL — SEO & USER SEARCH INTENT:
Every goal MUST be something a real person would type into Google when they want to learn something. Think like an actual user searching, not an academic.

GOOD goals (real search queries):
- "Learn Python programming from scratch"
- "How to start investing in the stock market"
- "Beginner's guide to watercolor painting"
- "How to train a puppy at home"
- "Learn to play ukulele for beginners"
- "Beginner's guide to indoor herb gardening"
- "How to start a podcast from scratch"
- "Basic car engine repair for beginners"
- "Learn Korean for beginners step by step"
- "How to do calligraphy for beginners"
- "Meditation for anxiety and stress relief"
- "How to brew beer at home"
- "Learn chess strategy for intermediate players"
- "How to raise backyard chickens"
- "Pottery and ceramics for beginners"

BAD goals (nobody searches for these):
- "Engineer hyperlocal bacterial cellulose textiles from kombucha SCOBY waste"
- "Construct a survival-state psychological profile to dominate high-stakes hostage negotiations"

CURRENT LIBRARY SUMMARY BY CATEGORY (DO NOT duplicate, overlap, or rephrase any existing topics):
${compactCategoryMap || 'None yet.'}
${avoidBlock}${focusBlock}
Rules:
1. Goals must be 5-10 words max — short, clear, reads like a Google search query.
2. YOU CHOOSE THE CATEGORY — pick under-represented or brand new categories (e.g., "trades", "crafts", "culinary", "gardening", "woodworking", "mechanics", "music", "pottery", "sports", "martial-arts", "languages", "health", "astronomy", "hobbies", "software-tools").
3. Mix complexities: 'beginner', 'intermediate', 'advanced'.
4. Every goal must pass this test: "Would at least 1000 people per month search for this on Google?"
5. ZERO TOLERANCE FOR DUPLICATES — check the existing catalog above carefully!
6. Return ONLY a valid JSON array (no markdown, no wrap):
[
  {
    "goal": "Learn pottery and ceramics for beginners",
    "category": "pottery",
    "tags": ["ceramics", "clay", "handmade"],
    "complexity": "beginner"
  }
]`;

  // Seed generation: try ZAI (glm-4.7-flash, free) first, then Cerebras, then fallback pool.
  // max_tokens capped at 3000 to prevent GLM from truncating the JSON array mid-element.
  const seedCallOpts = { maxTokens: 3000 }; // override for seed generation only
  const trySeedParse = (text: string): TopicSeed[] | null => {
    try {
      const parsed = parseJSON(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let seeds: TopicSeed[] = parsed
          .filter((s: any) => s && typeof s.goal === 'string' && s.goal.trim())
          .map((s: any) => ({
            goal: s.goal.trim(),
            category: normalizeCategory(s.category || 'general'),
            tags: Array.isArray(s.tags) ? s.tags : [],
            complexity: (s.complexity || 'beginner') as TopicSeed['complexity']
          }));
        seeds = filterSimilarSeeds(seeds, existing);
        seeds = deduplicateSeedBatch(seeds);
        return seeds;
      }
    } catch {}
    return null;
  };

  // Attempt 1: Cerebras — same primary model as the rest of the pipeline
  if (CONFIG.PRIMARY_API_KEY) {
    try {
      const result = await callWriter(prompt, 500, 'seeds-generator');
      const seeds = trySeedParse(result.text);
      if (seeds && seeds.length > 0) {
        console.log(`  ✅ ${seeds.length} unique seeds via Cerebras`);
        return seeds;
      }
    } catch (e: any) {
      console.log(`  ⚠️  Cerebras seed call failed: ${String(e?.message || e).slice(0, 80)}`);
    }
  }

  // Attempt 2: ZAI glm-4.7-flash (free, 200K context) — fallback if Cerebras 402s
  if (process.env.ZAI_API_KEY) {
    try {
      console.log('  🔄 Cerebras unavailable — trying ZAI glm-4.7-flash for seeds...');
      const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'glm-4.7-flash', messages: [{ role: 'user', content: prompt }], temperature: 0.9, max_tokens: 3000 }),
      });
      if (res.ok) {
        const data = await res.json() as any;
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        const seeds = text ? trySeedParse(text) : null;
        if (seeds && seeds.length > 0) {
          console.log(`  ✅ ${seeds.length} unique seeds via ZAI glm-4.7-flash`);
          return seeds;
        }
      }
    } catch (e: any) {
      console.log(`  ⚠️  ZAI seed call failed: ${String(e?.message || e).slice(0, 80)}`);
    }
  }

  console.log('  ⚠️  All AI seed sources failed — using fallback seed pool...');

  let bootstrapSeeds = filterSimilarSeeds(BOOTSTRAP_SEEDS, existing, 0.6);
  bootstrapSeeds = deduplicateSeedBatch(bootstrapSeeds);
  return bootstrapSeeds.slice(0, count);
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
  console.log(`✅ Already done in library: ${getExistingSlugs().length} books on disk`);
  
  // Multi-pass seed generation loop to collect countToGenerate guaranteed fresh, unique seeds
  const existingSlugsOnDisk = new Set(getExistingSlugs());
  const pending: TopicSeed[] = [];
  const domainHints = [
    '', // General topics across missing categories
    'Focus on practical trades, home DIY, crafts, woodworking, culinary arts, mechanics, gardening',
    'Focus on specialized software tools, digital creative arts, music production, languages, outdoor sports',
    'Focus on health, wellness, martial arts, astronomy, writing, photography, niche practical hobbies',
  ];

  let hintIndex = 0;
  let consecutiveEmpty = 0;           // break early if AI consistently returns nothing
  while (pending.length < countToGenerate && hintIndex < domainHints.length * 2) {
    const hint = domainHints[hintIndex % domainHints.length];
    hintIndex++;
    const needed = Math.min((countToGenerate - pending.length) * 2, 40);
    console.log(`🤖 Seed Attempt ${hintIndex}: requesting ${needed} candidates (need ${countToGenerate - pending.length} more)...`);
    const rawSeeds = await generateSeedsViaAI(needed, existingBooks, hint);

    if (rawSeeds.length === 0) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 2) {
        console.log('  ⚠️  Two consecutive empty seed batches — stopping seed loop to avoid waste.');
        break;
      }
    } else {
      consecutiveEmpty = 0;
    }

    for (const seed of rawSeeds) {
      if (pending.length >= countToGenerate) break;
      const editionPrefix = EDITION === 'desi' ? 'desi-' : EDITION === 'street' ? 'street-' : '';
      const prelimSlug = editionPrefix + toSlug(`${seed.goal} ${seed.complexity || 'beginner'}`);

      const isDiskDupe = existingSlugsOnDisk.has(prelimSlug);
      const isPendingDupe = pending.some(p => keywordSimilarity(seed.goal, p.goal) >= 0.6);

      if (!isDiskDupe && !isPendingDupe) {
        pending.push(seed);
      } else {
        console.log(`  🔁 Pre-filtered: "${seed.goal}"`);
      }
    }
  }

  if (pending.length === 0) {
    console.log('ℹ️  No new topics generated or all topics exhausted. Exiting.');
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

  // Build a live title list — seeded from catalog, updated as new books are generated
  // within the same run so intra-run duplicates are also caught.
  const liveTitles: string[] = existingBooks.map(b => b.title);

  // Strictly sequential: process one book at a time — no worker pool, no concurrency
  let done = 0; let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < pending.length; i++) {
    const seed = pending[i];
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📚 Book ${i + 1}/${pending.length}: "${seed.goal}" (${seed.complexity})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const result = await generateBook(seed, i + 1, liveTitles);
    const slug = toSlug(`${EDITION === 'desi' ? 'desi ' : EDITION === 'street' ? 'street ' : ''}${seed.goal} ${seed.complexity || 'beginner'}`);

    if (result === 'ok') {
      checkpoint.completedSlugs.push(slug);
      done++;
      // Track the title so the next book in this run won't duplicate it
      const bookPath = path.join(CONFIG.OUTPUT_DIR, 'books', `${slug}.json`);
      try {
        const saved = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
        if (saved.title) liveTitles.push(saved.title);
      } catch { /* slug may differ from roadmap title — just skip */ }
    } else {
      checkpoint.failedSlugs.push(slug);
      failed++;
    }

    saveCheckpoint(checkpoint);
    const elapsed = (Date.now() - startTime) / 60000;
    const rate = done / Math.max(elapsed, 0.01);
    console.log(`\n📊 Progress: ${done + failed}/${pending.length} | ✅${done} ❌${failed} | ${rate.toFixed(1)} books/min | ~${((pending.length - done - failed) / Math.max(rate, 0.01)).toFixed(0)}min left\n`);
  }
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
