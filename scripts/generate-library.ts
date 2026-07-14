/**
 * Pustakam Library Generator — File-Based (No Database)
 * ─────────────────────────────────────────────────────────────────
 * Generates books locally as JSON files.
 * No Supabase needed. No storage limits.
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

const CONFIG = {
  // Read from env so GitHub Actions can override via workflow_dispatch inputs
  CONCURRENCY:           Number(process.env.CONCURRENCY || 8),
  MAX_BOOKS:             Number(process.env.MAX_BOOKS   || 0), // 0 = no limit

  TOKENS_PER_MIN_LIMIT:  450_000,
  MODULE_WORD_TARGET:    '800-1200',
  MAX_MODULES:           8,

  // ZAI_MODEL allows a controlled model upgrade without changing generator code.
  PRIMARY_MODEL:         process.env.ZAI_MODEL || 'glm-5.2',
  PRIMARY_API_URL:       'https://api.z.ai/api/paas/v4/chat/completions',
  PRIMARY_API_KEY:       process.env.ZAI_API_KEY || '',
  PRIMARY_PROVIDER:      'zai',

  // Keep a separate provider available if Z.ai is temporarily unavailable.
  FALLBACK_MODEL:        process.env.MISTRAL_FALLBACK_MODEL || 'mistral-small-2506',
  FALLBACK_API_URL:      'https://api.mistral.ai/v1/chat/completions',
  FALLBACK_API_KEY:      process.env.MISTRAL_API_KEY || '',
  FALLBACK_PROVIDER:     'mistral',

  OUTPUT_DIR:            path.resolve(__dirname, '../public/library'),
  CHECKPOINT_FILE:       path.resolve(__dirname, '.library-checkpoint.json'),
  SITE_URL:              process.env.SITE_URL || 'https://tanmaysk.in',
  RETRY_MAX:             5,
  RETRY_BASE_MS:         3000,
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
  for (let attempt = 1; attempt <= CONFIG.RETRY_MAX; attempt++) {
    try { return await fn(); } catch (e: any) {
      if (attempt === CONFIG.RETRY_MAX) throw e;
      const is429 = String(e?.message).includes('429') || String(e?.message).includes('rate');
      const delay = is429
        ? CONFIG.RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * 1000
        : CONFIG.RETRY_BASE_MS * attempt;
      console.warn(`  ⚠️  ${label} retry ${attempt}/${CONFIG.RETRY_MAX} in ${Math.ceil(delay/1000)}s`);
      await sleep(delay);
    }
  }
  throw new Error(`${label} failed all retries`);
}

// ── AI caller (Z.ai primary, Mistral fallback) ───────────────────────────────
type RequestKind = 'roadmap' | 'chapter';
type Completion = { text: string; model: string };

let primaryConsecutiveFailures = 0;
const FALLBACK_THRESHOLD = 3;

async function callAI(
  prompt: string,
  estInputTokens = 500,
  kind: RequestKind = 'chapter',
  forceFallback = false
): Promise<Completion> {
  const useFallback = forceFallback || (!CONFIG.PRIMARY_API_KEY && Boolean(CONFIG.FALLBACK_API_KEY)) ||
    (primaryConsecutiveFailures >= FALLBACK_THRESHOLD && CONFIG.FALLBACK_API_KEY);

  const model   = useFallback ? CONFIG.FALLBACK_MODEL   : CONFIG.PRIMARY_MODEL;
  const apiUrl  = useFallback ? CONFIG.FALLBACK_API_URL  : CONFIG.PRIMARY_API_URL;
  const apiKey  = useFallback ? CONFIG.FALLBACK_API_KEY  : CONFIG.PRIMARY_API_KEY;
  const provider = useFallback ? CONFIG.FALLBACK_PROVIDER : CONFIG.PRIMARY_PROVIDER;

  if (!apiKey) throw new Error(`No API key configured for ${useFallback ? 'Mistral fallback' : 'Z.ai primary'}`);

  const estTotal = estInputTokens + 1400;
  await tokenBudget.acquire(estTotal);

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
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
async function callWriter(prompt: string, estInputTokens = 500, kind: RequestKind = 'chapter'): Promise<Completion> {
  return callAI(prompt, estInputTokens, kind);
}

// ── Prompts ────────────────────────────────────────────────────────────────────

function buildRoadmapPrompt(seed: TopicSeed): string {
  const complexity = seed.complexity || 'beginner';
  return `You are designing a practical, evergreen learning guide.
Topic: "${seed.goal}"
Audience: ${complexity} learners. Category: ${seed.category}.

Create exactly ${CONFIG.MAX_MODULES} progressive modules. Start at the learner's current level and end with a usable outcome. Every module must be distinct and build on earlier modules. Prefer durable fundamentals over time-sensitive claims. Avoid invented statistics, guarantees, and clickbait titles.

Return ONLY valid JSON, no markdown:
{"title":"Clear, descriptive book title","modules":[{"title":"Module title","description":"One sentence focus","objectives":["Point 1","Point 2","Point 3"]}],"difficultyLevel":"${complexity}"}`;
}

function buildModulePrompt(
  seed: TopicSeed,
  roadmap: { title?: string; modules: Array<{ title: string; description: string; objectives: string[] }> },
  mod: { title: string; description: string; objectives: string[] },
  index: number,
  total: number,
  previousChapterMemory: string
): string {
  const outline = roadmap.modules.map((item, i) => `${i + 1}. ${item.title}`).join('\n');
  const exampleInstruction = ['programming', 'data-science', 'ai'].includes(seed.category)
    ? 'Include a small, correct code or worked technical example when it helps.'
    : 'Include a concrete, realistic scenario when it helps.';
  const continuity = previousChapterMemory
    ? `Previous chapter memory (continue from it; do not repeat it):\n${previousChapterMemory}`
    : 'This is the first chapter. Establish only the foundations needed for later chapters.';

  return `Write one chapter of the guide "${roadmap.title || seed.goal}".
Topic: "${seed.goal}". Audience: ${seed.complexity || 'beginner'} learners.
Chapter ${index + 1}/${total}: "${mod.title}"
Focus: ${mod.description}
Required learning objectives: ${mod.objectives.join('; ')}

Full learning path:\n${outline}

${continuity}

Write ${CONFIG.MODULE_WORD_TARGET} words of clear, useful prose. Start directly with the lesson. Use descriptive ## headings, short paragraphs, and explain why an idea matters before showing how to use it. ${exampleInstruction} Include a short "## Practice" section with one actionable exercise. Do not add filler, unsupported statistics, generic motivational language, or claims likely to become outdated. End with "## Key Takeaways" and exactly 3 bullet points.`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function countWords(t: string) { return t.trim().split(/\s+/).filter(Boolean).length; }
function chapterMemory(content: string): string {
  const takeaways = content.match(/## Key Takeaways[\s\S]*$/i)?.[0] || content;
  return takeaways.replace(/\s+/g, ' ').trim().slice(0, 900);
}
function assertRoadmap(roadmap: any): asserts roadmap is { title?: string; modules: Array<{ title: string; description: string; objectives: string[] }> } {
  if (!Array.isArray(roadmap?.modules) || roadmap.modules.length !== CONFIG.MAX_MODULES) {
    throw new Error(`Roadmap must contain exactly ${CONFIG.MAX_MODULES} modules`);
  }
  for (const module of roadmap.modules) {
    if (!module?.title || !module?.description || !Array.isArray(module?.objectives) || module.objectives.length < 3) {
      throw new Error('Roadmap contains an incomplete module');
    }
  }
}
function assertChapter(content: string): void {
  const words = countWords(content);
  if (words < 700) throw new Error(`Chapter too short (${words} words)`);
  if (!/^##\s+/m.test(content)) throw new Error('Chapter is missing section headings');
  if (!/##\s+Practice\b/i.test(content)) throw new Error('Chapter is missing a practice section');
  if (!/##\s+Key Takeaways\b/i.test(content)) throw new Error('Chapter is missing key takeaways');
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
  const slug = toSlug(`${seed.goal} ${seed.complexity || 'beginner'}`);
  const tag = `[W${workerIndex}]`;
  const modelsUsed = new Set<string>();

  // Step 1: Roadmap
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
  } catch (e: any) {
    console.error(`\n❌ ${tag} roadmap failed: ${slug} — ${String(e.message).slice(0, 80)}`);
    return 'fail';
  }

  // Step 2: Generate chapters sequentially, carrying forward a compact memory.
  const modules: Array<{ title: string; content: string; wordCount: number }> = [];
  let previousChapterMemory = '';
  for (let i = 0; i < roadmap.modules.length; i++) {
    const mod = roadmap.modules[i];
    try {
      const result = await withRetry(
        async () => {
          const completion = await callWriter(
            buildModulePrompt(seed, roadmap, mod, i, roadmap.modules.length, previousChapterMemory),
            1200,
            'chapter'
          );
          assertChapter(completion.text);
          return completion;
        },
        `${tag} module ${i + 1}`
      );
      modelsUsed.add(result.model);
      const content = result.text;
      modules.push({ title: mod.title, content, wordCount: countWords(content) });
      previousChapterMemory = chapterMemory(content);
      process.stdout.write('.');
    } catch (error: any) {
      console.error(`\n❌ ${tag} module ${i + 1} failed: ${String(error?.message || error).slice(0, 120)}`);
      return 'fail';
    }
  }

  const totalWords = modules.reduce((s, m) => s + m.wordCount, 0);
  const finalBook = [
    `# ${roadmap.title || seed.goal}\n`,
    `## Contents\n`,
    modules.map((m, i) => `${i + 1}. ${m.title}`).join('\n'),
    '\n\n---\n\n',
    modules.map((m, i) => `# Chapter ${i + 1}: ${m.title}\n\n${m.content}`).join('\n\n---\n\n'),
  ].join('\n');

  // Step 3: Save to LOCAL FILE (not Supabase)
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
    modelUsed: [...modelsUsed].join(', '),
    generatedAt: new Date().toISOString(),
    roadmap,
    modules,
    finalBook,
  };

  saveBook(bookFile);
  console.log(`\n✅ ${tag} ${slug} — ${totalWords.toLocaleString()} words → public/library/books/${slug}.json`);
  return 'ok';
}

// ── Topic seeds (10 highly diverse seeds across fields) ──────────────────────────

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
4. Return ONLY a valid JSON array matching this format (no markdown, no wrap):
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
    throw new Error('Missing ZAI_API_KEY and MISTRAL_API_KEY');
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

  const countToGenerate = CONFIG.MAX_BOOKS > 0 ? CONFIG.MAX_BOOKS : 3;

  console.log('\n🚀 Pustakam Library Generator (File-Based & AI-Driven)');
  console.log(`🤖 Target books to generate this run: ${countToGenerate}`);
  console.log(`✅ Already done in library: ${completedSet.size}`);
  
  console.log('🤖 Generating unique topic seeds via Z.ai GLM...');
  const pending = await generateSeedsViaAI(countToGenerate, existingBooks);
  
  if (pending.length === 0) {
    console.log('ℹ️  No new topics generated or all bootstrap topics exhausted. Exiting.');
    return;
  }

  console.log(`⏭️  Topics selected for generation:\n${pending.map((p, idx) => `   ${idx + 1}. ${p.goal} (${p.complexity})`).join('\n')}`);

  const estMinutes = (pending.length * CONFIG.MAX_MODULES * 3) / CONFIG.CONCURRENCY;
  console.log(`⚙️  Workers: ${CONFIG.CONCURRENCY} parallel`);
  console.log(`📁 Output: ${CONFIG.OUTPUT_DIR}`);
  console.log(`🤖 Primary: ${CONFIG.PRIMARY_MODEL}  |  Fallback: ${CONFIG.FALLBACK_MODEL}`);
  console.log(`⏱️  Estimated: ~${estMinutes.toFixed(0)} minutes`);
  console.log(`💾 Storage: ~${(pending.length * 0.015).toFixed(0)}MB (${pending.length} books × ~15KB each)`);
  console.log('─────────────────────────────────────────\n');

  // Apply MAX_BOOKS limit if set (useful for test runs or CI time limits)
  if (CONFIG.MAX_BOOKS > 0) pending.splice(CONFIG.MAX_BOOKS);

  const limit = pLimit(CONFIG.CONCURRENCY);
  let done = 0; let failed = 0;
  const startTime = Date.now();

  const tasks = pending.map((seed, i) =>
    limit(async () => {
      const result = await generateBook(seed, (i % CONFIG.CONCURRENCY) + 1);
      const slug = toSlug(`${seed.goal} ${seed.complexity || 'beginner'}`);

      if (result === 'ok') { checkpoint.completedSlugs.push(slug); done++; }
      else { checkpoint.failedSlugs.push(slug); failed++; }

      if ((done + failed) % 10 === 0) {
        saveCheckpoint(checkpoint);
        const elapsed = (Date.now() - startTime) / 60000;
        const rate = done / Math.max(elapsed, 0.01);
        console.log(`\n📊 ${done + failed}/${pending.length} | ✅${done} ❌${failed} | ${rate.toFixed(1)}/min | ~${((pending.length - done - failed) / Math.max(rate, 0.01)).toFixed(0)}min left\n`);
      }
    })
  );

  await Promise.all(tasks);
  saveCheckpoint(checkpoint);

  // Rebuild index.json and sitemap.xml from all files
  rebuildIndex();
  const indexData = JSON.parse(fs.readFileSync(path.join(CONFIG.OUTPUT_DIR, 'catalog.json'), 'utf8'));
  generateSitemap(indexData.books);

  const totalMin = (Date.now() - startTime) / 60000;
  const totalSize = done * 0.015;

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
