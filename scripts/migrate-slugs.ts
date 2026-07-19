/**
 * Migration Script: Migrate existing books to SEO-friendly slugs & meta descriptions
 * ─────────────────────────────────────────────────────────────────────────────────────
 * 
 * This script:
 * 1. Reads every book JSON in public/library/books/
 * 2. Generates a new SEO-friendly slug from the book title (max 50 chars)
 * 3. Updates the slug and metaDescription inside the JSON
 * 4. Renames the file to match the new slug
 * 5. Rebuilds catalog.json and sitemap.xml
 * 
 * Run:  npx tsx scripts/migrate-slugs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOKS_DIR = path.resolve(__dirname, '../public/library/books');
const OUTPUT_DIR = path.resolve(__dirname, '../public/library');
const SITE_URL = process.env.SITE_URL || 'https://tanmaysk.in';

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 50).replace(/-+$/, '');
}

function makeMetaDescription(title: string, complexity: string, goal: string): string {
  const desc = `${title} — a free ${complexity}-level guide covering ${goal.toLowerCase()}. Learn with clear explanations, real examples, and hands-on exercises.`;
  if (desc.length <= 155) return desc;
  const truncated = desc.substring(0, 152).replace(/\s+\S*$/, '');
  return truncated + '...';
}

interface BookFile {
  slug: string;
  title: string;
  goal: string;
  category: string;
  tags: string[];
  language: string;
  complexity: string;
  wordCount: number;
  moduleCount: number;
  readingTimeMins: number;
  metaDescription: string;
  modelUsed: string;
  generatedAt: string;
  edition: string;
  roadmap: any;
  modules: any[];
  finalBook: string;
}

function main() {
  if (!fs.existsSync(BOOKS_DIR)) {
    console.error('❌ Books directory not found:', BOOKS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.json'));
  console.log(`\n📚 Migrating ${files.length} books to SEO-friendly slugs...\n`);

  const slugMap = new Map<string, string>(); // newSlug -> filename (for collision detection)
  const renames: Array<{ oldFile: string; newFile: string; oldSlug: string; newSlug: string; title: string }> = [];
  let unchanged = 0;

  for (const file of files) {
    const filePath = path.join(BOOKS_DIR, file);
    const book: BookFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const oldSlug = book.slug;
    
    // Generate new slug from GOAL (the actual searchable topic), not creative title
    // Goal is what users search for (e.g., "Learn Python programming from scratch")
    // Title is creative/editorial (e.g., "BLACKHOLE ROADMAP: Python Domination")
    const editionPrefix = book.edition === 'desi' ? 'desi-' : book.edition === 'street' ? 'street-' : '';
    let newSlug = editionPrefix + toSlug(book.goal);
    
    // Handle collisions by appending complexity
    if (slugMap.has(newSlug) && slugMap.get(newSlug) !== file) {
      newSlug = editionPrefix + toSlug(`${book.goal} ${book.complexity}`);
    }
    
    // If still collision, append a hash
    if (slugMap.has(newSlug) && slugMap.get(newSlug) !== file) {
      const hash = book.generatedAt ? book.generatedAt.slice(5, 10).replace(/[^0-9]/g, '') : Math.random().toString(36).slice(2, 6);
      newSlug = newSlug.slice(0, 44) + '-' + hash;
    }
    
    slugMap.set(newSlug, file);
    
    if (oldSlug === newSlug) {
      unchanged++;
      continue;
    }
    
    // Make the title SEO-friendly: use goal as the primary title
    // Capitalize first letter of each word for a clean book title
    const seoTitle = book.goal.replace(/\b\w/g, (c: string) => c.toUpperCase());
    book.title = seoTitle;
    book.slug = newSlug;
    book.metaDescription = makeMetaDescription(seoTitle, book.complexity, book.goal);
    
    // Write updated JSON to new file
    const newFileName = `${newSlug}.json`;
    const newFilePath = path.join(BOOKS_DIR, newFileName);
    
    fs.writeFileSync(newFilePath, JSON.stringify(book, null, 2), 'utf8');
    
    // Remove old file (only if it's different from new)
    if (file !== newFileName) {
      fs.unlinkSync(filePath);
    }
    
    renames.push({ oldFile: file, newFile: newFileName, oldSlug, newSlug, title: book.title });
    console.log(`  ✅ ${file}`);
    console.log(`     → ${newFileName}`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Migration Results:`);
  console.log(`   Renamed: ${renames.length}`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log(`   Total: ${files.length}`);

  // Rebuild catalog.json
  console.log(`\n🔄 Rebuilding catalog.json...`);
  const bookFiles = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.json'));
  const catalog: any[] = bookFiles.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(BOOKS_DIR, f), 'utf8'));
    const { roadmap: _r, modules: _m, finalBook: _f, ...meta } = data;
    return meta;
  });
  catalog.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'catalog.json'),
    JSON.stringify({ books: catalog, total: catalog.length, generatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
  console.log(`   📑 catalog.json: ${catalog.length} books`);

  // Rebuild sitemap.xml
  console.log(`🔄 Rebuilding sitemap.xml...`);
  const urls = [
    `  <url>
    <loc>${SITE_URL}/library</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    ...catalog.map(book => `  <url>
    <loc>${SITE_URL}/library/book/${book.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${book.generatedAt.split('T')[0]}</lastmod>
  </url>`),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml, 'utf8');
  console.log(`   🗺️  sitemap.xml: ${catalog.length + 1} URLs`);

  console.log(`\n✅ Migration complete!\n`);
}

main();
