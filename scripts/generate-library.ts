/**
 * Pustakam Library Generator — File-Based (No Database)
 * ─────────────────────────────────────────────────────────────────
 * Generates books locally as JSON files.
 * No Supabase needed. No storage limits.
 *
 * Output structure:
 *   public/library/
 *     index.json              ← all book metadata (for directory page)
 *     sitemap.xml             ← submit this to Google Search Console
 *     books/
 *       learn-python.json     ← individual book (content + metadata)
 *       stock-market.json
 *       ...
 *
 * Run:  npx ts-node scripts/generate-library.ts
 * Env:  MISTRAL_API_KEY   (required)
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

  // Primary model — Mistral Small (cheapest, fastest, 1B tokens free)
  PRIMARY_MODEL:         'mistral-large-latest',
  PRIMARY_API_URL:       'https://api.mistral.ai/v1/chat/completions',
  PRIMARY_API_KEY:       process.env.MISTRAL_API_KEY || '',

  // Fallback model — Z.ai GLM-4.7 FlashX (used if Mistral fails 3+ times in a row)
  FALLBACK_MODEL:        'glm-4.7-flashx',
  FALLBACK_API_URL:      'https://api.z.ai/api/paas/v4/chat/completions',
  FALLBACK_API_KEY:      process.env.ZAI_API_KEY || '',

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

// ── AI caller (Mistral primary, Z.ai fallback) ───────────────────────────────

// Track consecutive Mistral failures to know when to switch to fallback
let mistralConsecutiveFailures = 0;
const FALLBACK_THRESHOLD = 3; // switch to Z.ai after 3 consecutive Mistral failures

async function callAI(
  prompt: string,
  estInputTokens = 500,
  forceFallback = false
): Promise<string> {
  const useFallback = forceFallback ||
    (mistralConsecutiveFailures >= FALLBACK_THRESHOLD && CONFIG.FALLBACK_API_KEY);

  const model   = useFallback ? CONFIG.FALLBACK_MODEL   : CONFIG.PRIMARY_MODEL;
  const apiUrl  = useFallback ? CONFIG.FALLBACK_API_URL  : CONFIG.PRIMARY_API_URL;
  const apiKey  = useFallback ? CONFIG.FALLBACK_API_KEY  : CONFIG.PRIMARY_API_KEY;

  if (!apiKey) throw new Error(`No API key configured for ${useFallback ? 'Z.ai fallback' : 'Mistral primary'}`);

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
    }),
  });

  if (res.status === 429) {
    const e: any = new Error(`429 rate limited (${useFallback ? 'Z.ai' : 'Mistral'})`);
    e.status = 429;
    if (!useFallback) mistralConsecutiveFailures++;
    throw e;
  }

  if (!res.ok) {
    if (!useFallback) mistralConsecutiveFailures++;
    throw new Error(`${useFallback ? 'Z.ai' : 'Mistral'} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  // Success — reset failure counter
  if (!useFallback) mistralConsecutiveFailures = 0;

  const data = await res.json() as any;
  tokenBudget.record(data.usage?.total_tokens || estTotal);
  return data.choices?.[0]?.message?.content || '';
}

// Convenience wrapper — always tries primary first
async function callMistral(prompt: string, estInputTokens = 500): Promise<string> {
  return callAI(prompt, estInputTokens);
}

// ── Prompts ────────────────────────────────────────────────────────────────────

function buildRoadmapPrompt(goal: string, complexity: string): string {
  return `Create a learning roadmap for: "${goal}"
Target: ${complexity} learners. Make ${CONFIG.MAX_MODULES} progressive modules.
Return ONLY valid JSON, no markdown:
{"title":"Engaging book title","modules":[{"title":"Module title","description":"One sentence focus","objectives":["Point 1","Point 2","Point 3"]}],"difficultyLevel":"${complexity}"}`;
}

function buildModulePrompt(
  goal: string,
  mod: { title: string; description: string; objectives: string[] },
  index: number, total: number
): string {
  return `Write a learning chapter for: "${goal}"
Chapter ${index + 1}/${total}: "${mod.title}"
Focus: ${mod.description}
Cover: ${mod.objectives.join(', ')}

Write ${CONFIG.MODULE_WORD_TARGET} words. Use ## headers. Include 1-2 real examples.
Start directly with content. End with "## Key Takeaways" (3 bullet points).`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function countWords(t: string) { return t.trim().split(/\s+/).filter(Boolean).length; }
function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 80).replace(/-+$/, '');
}
function parseJSON(raw: string): any {
  const cleaned = raw.trim()
    .replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '')
    .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
}

// ── Core generator ─────────────────────────────────────────────────────────────

async function generateBook(seed: TopicSeed, workerIndex: number): Promise<'ok' | 'fail'> {
  const slug = toSlug(`${seed.goal} ${seed.complexity || 'beginner'}`);
  const tag = `[W${workerIndex}]`;

  // Step 1: Roadmap
  let roadmap: any;
  try {
    roadmap = await withRetry(
      () => callMistral(buildRoadmapPrompt(seed.goal, seed.complexity || 'beginner'), 300)
        .then(parseJSON),
      `${tag} roadmap`
    );
  } catch (e: any) {
    console.error(`\n❌ ${tag} roadmap failed: ${slug} — ${String(e.message).slice(0, 80)}`);
    return 'fail';
  }

  // Step 2: Modules (sequential within book for narrative coherence)
  const modules: Array<{ title: string; content: string; wordCount: number }> = [];
  for (let i = 0; i < roadmap.modules.length; i++) {
    const mod = roadmap.modules[i];
    try {
      const content = await withRetry(
        () => callMistral(buildModulePrompt(seed.goal, mod, i, roadmap.modules.length), 500),
        `${tag} module ${i + 1}`
      );
      modules.push({ title: mod.title, content, wordCount: countWords(content) });
      process.stdout.write('.');
    } catch {
      modules.push({ title: mod.title, content: `## ${mod.title}\n\n${mod.description}`, wordCount: 10 });
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
    metaDescription: `${totalWords.toLocaleString()}-word guide: ${seed.goal}. Free to read on Pustakam.`,
    modelUsed: CONFIG.MODEL,
    generatedAt: new Date().toISOString(),
    roadmap,
    modules,
    finalBook,
  };

  saveBook(bookFile);
  console.log(`\n✅ ${tag} ${slug} — ${totalWords.toLocaleString()} words → public/library/books/${slug}.json`);
  return 'ok';
}

// ── Topic seeds (expand to 1000 by adding more base topics) ───────────────────

const BASE_SEEDS: Omit<TopicSeed, 'complexity'>[] = [
  { goal: 'Learn Python programming from zero to real projects', category: 'programming', tags: ['python', 'coding'] },
  { goal: 'Master JavaScript and build modern web applications', category: 'programming', tags: ['javascript', 'web'] },
  { goal: 'Build production-ready apps with React.js', category: 'programming', tags: ['react', 'frontend'] },
  { goal: 'Build REST APIs with Node.js and Express', category: 'programming', tags: ['nodejs', 'backend'] },
  { goal: 'Understand data structures and algorithms for tech interviews', category: 'programming', tags: ['dsa', 'algorithms'] },
  { goal: 'Learn SQL and relational database design', category: 'programming', tags: ['sql', 'database'] },
  { goal: 'Master Git and GitHub for professional developers', category: 'programming', tags: ['git', 'devops'] },
  { goal: 'Learn TypeScript for professional development', category: 'programming', tags: ['typescript'] },
  { goal: 'Build Android apps with Kotlin from scratch', category: 'programming', tags: ['android', 'kotlin'] },
  { goal: 'Learn Docker and containerization', category: 'programming', tags: ['docker', 'devops'] },
  { goal: 'Learn machine learning from scratch with Python', category: 'data-science', tags: ['ml', 'python'] },
  { goal: 'Master deep learning and neural networks', category: 'data-science', tags: ['deep-learning', 'ai'] },
  { goal: 'Learn data analysis with pandas and numpy', category: 'data-science', tags: ['pandas', 'data'] },
  { goal: 'Understand prompt engineering and build LLM apps', category: 'ai', tags: ['llm', 'prompt-engineering'] },
  { goal: 'Learn stock market investing for beginners in India', category: 'finance', tags: ['stocks', 'india'] },
  { goal: 'Understand mutual funds and SIP investing', category: 'finance', tags: ['mutual-funds', 'sip'] },
  { goal: 'Master personal finance management and budgeting', category: 'finance', tags: ['personal-finance'] },
  { goal: 'Start a freelance business and earn from skills online', category: 'business', tags: ['freelancing'] },
  { goal: 'Launch a startup from idea to product', category: 'business', tags: ['startup', 'entrepreneurship'] },
  { goal: 'Master digital marketing for business growth', category: 'business', tags: ['marketing', 'seo'] },
  { goal: 'Crack UPSC CSE Prelims with systematic preparation', category: 'exams', tags: ['upsc', 'ias'] },
  { goal: 'Prepare for GATE CSE examination', category: 'exams', tags: ['gate', 'engineering'] },
  { goal: 'Master quantitative aptitude for placements', category: 'exams', tags: ['aptitude', 'placements'] },
  { goal: 'Score band 7+ in IELTS writing and speaking', category: 'exams', tags: ['ielts', 'english'] },
  { goal: 'Improve spoken English fluency for Indian speakers', category: 'language', tags: ['english', 'speaking'] },
  { goal: 'Learn public speaking and overcome stage fright', category: 'language', tags: ['public-speaking'] },
  { goal: 'Build a consistent gym workout routine for beginners', category: 'health', tags: ['gym', 'fitness'] },
  { goal: 'Understand nutrition fundamentals and healthy eating', category: 'health', tags: ['nutrition', 'diet'] },
  { goal: 'Learn UI/UX design from scratch with Figma', category: 'design', tags: ['uiux', 'figma'] },
  // Add more seeds here — each generates 3 books (beginner/intermediate/advanced)
];

// Each base seed × 3 complexity levels = 3x library at zero extra effort
const TOPIC_SEEDS: TopicSeed[] = BASE_SEEDS.flatMap(s => [
  { ...s, complexity: 'beginner' },
  { ...s, complexity: 'intermediate' },
  { ...s, complexity: 'advanced' },
]);

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.MISTRAL_API_KEY) throw new Error('Missing MISTRAL_API_KEY');

  ensureDirs();
  const checkpoint = loadCheckpoint();
  const completedSet = new Set(checkpoint.completedSlugs);
  const pending = TOPIC_SEEDS.filter(s => !completedSet.has(toSlug(`${s.goal} ${s.complexity || 'beginner'}`)));

  const estMinutes = (pending.length * CONFIG.MAX_MODULES * 3) / CONFIG.CONCURRENCY;

  console.log('\n🚀 Pustakam Library Generator (File-Based)');
  console.log(`📚 ${TOPIC_SEEDS.length} total seeds → ${pending.length} to generate`);
  console.log(`✅ Already done: ${checkpoint.completedSlugs.length}`);
  console.log(`⏭️  Pending: ${pending.length}`);
  if (CONFIG.MAX_BOOKS > 0) console.log(`🎯 Limit: generating max ${CONFIG.MAX_BOOKS} books this run`);
  console.log(`⚙️  Workers: ${CONFIG.CONCURRENCY} parallel`);
  console.log(`📁 Output: ${CONFIG.OUTPUT_DIR}`);
  console.log(`🤖 Primary: Mistral Large  |  Fallback: Z.ai GLM-4.7 FlashX`);
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
