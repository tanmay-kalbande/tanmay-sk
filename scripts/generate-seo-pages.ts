/**
 * Publishes crawlable HTML snapshots for the library's canonical URLs.
 * React fetches books after load; these pages let crawlers receive the title,
 * metadata, links, schema, and readable content in the initial response.
 */
import * as fs from 'fs';
import * as path from 'path';

type Meta = { slug: string; title: string; goal: string; category: string; tags: string[]; complexity: string; wordCount: number; moduleCount: number; readingTimeMins: number; metaDescription: string; generatedAt: string };
type Book = Meta & { modules: Array<{ title: string; content: string }> };
const input = path.resolve(process.cwd(), process.env.OUTPUT_DIR || 'public/library');
const output = path.resolve(process.cwd(), process.env.SEO_OUTPUT_DIR || 'public/library');
const site = (process.env.SITE_URL || 'https://tanmaysk.in').replace(/\/$/, '');

const esc = (text = '') => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const words = (markdown = '') => markdown.replace(/[\x60]{3}[\s\S]*?[\x60]{3}/g, '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[\x60*_>#]/g, '').replace(/\s+/g, ' ').trim().split(' ');
const name = (value: string) => value.split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');
const url = (slug: string) => site + '/library/book/' + encodeURIComponent(slug);
const summary = (markdown: string) => esc(words(markdown).slice(0, 450).join(' ') + (words(markdown).length > 450 ? ' …' : ''));

function document(title: string, description: string, canonical: string, body: string, schema: unknown) {
  const ld = JSON.stringify(schema).replace(/</g, '\\u003c');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) + '</title><meta name="description" content="' + esc(description) + '"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="' + esc(canonical) + '"><meta property="og:type" content="article"><meta property="og:site_name" content="Pustakam Library"><meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(description) + '"><meta property="og:url" content="' + esc(canonical) + '"><meta name="twitter:card" content="summary"><script type="application/ld+json">' + ld + '</script><style>:root{font-family:Inter,system-ui,sans-serif;color:#201a17;background:#fffaf6}*{box-sizing:border-box}body{margin:0;line-height:1.65}a{color:#9a3c25}header{background:#201a17;padding:18px 24px}header a{color:#fffaf6;text-decoration:none;font-weight:700}main{max-width:880px;margin:auto;padding:42px 24px 70px}.eyebrow{color:#9a3c25;font-size:.82rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}h1,h2{font-family:Georgia,serif;line-height:1.12;color:#201a17}h1{font-size:clamp(2.25rem,6vw,4.1rem);margin:.25rem 0 1rem}h2{font-size:1.8rem;margin:2.5rem 0 .7rem}.lead{font-size:1.18rem;max-width:720px}.meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:1.5rem 0 2rem}.meta span{border:1px solid #d9cfc7;border-radius:999px;padding:.24rem .6rem;font-size:.85rem}.notice,.toc{padding:1rem 1.2rem;margin:2rem 0}.notice{background:#fff0e7;border-left:4px solid #c95932}.toc{background:#f5eee8}.chapter{border-top:1px solid #ded4cc;padding-top:1.3rem;margin-top:1.8rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:14px;list-style:none;padding:0}.card{display:block;border:1px solid #ded4cc;padding:16px;text-decoration:none;color:#201a17;background:#fff}.card strong{display:block;font-family:Georgia,serif;font-size:1.1rem}.card small{color:#625b56}footer{border-top:1px solid #ded4cc;padding:24px;text-align:center;color:#625b56}</style></head><body><header><a href="/library">Pustakam Library</a></header>' + body + '<footer>Free learning guides published by <a href="' + site + '">Tanmay Kalbande</a>.</footer></body></html>';
}

function related(book: Meta, all: Meta[]) {
  const score = (item: Meta) => (item.category === book.category ? 4 : 0) + item.tags.filter(tag => book.tags.includes(tag)).length * 3;
  return all.filter(item => item.slug !== book.slug).sort((a, b) => score(b) - score(a)).slice(0, 4);
}

function renderBook(book: Book, all: Meta[]) {
  const toc = book.modules.map((module, i) => '<li><a href="#chapter-' + (i + 1) + '">' + esc(module.title) + '</a></li>').join('');
  const chapters = book.modules.map((module, i) => '<section class="chapter" id="chapter-' + (i + 1) + '"><h2>' + (i + 1) + '. ' + esc(module.title) + '</h2><p>' + summary(module.content) + '</p></section>').join('');
  const cards = related(book, all).map(item => '<li><a class="card" href="/library/book/' + encodeURIComponent(item.slug) + '"><strong>' + esc(item.title) + '</strong><small>' + esc(item.metaDescription || item.goal) + '</small></a></li>').join('');
  const body = '<main><nav><a href="/library">← All learning guides</a></nav><p class="eyebrow">Free ' + esc(name(book.category)) + ' learning guide</p><h1>' + esc(book.title) + '</h1><p class="lead">' + esc(book.metaDescription || book.goal) + '</p><div class="meta"><span>' + (book.readingTimeMins || 0) + ' min read</span><span>' + (book.moduleCount || book.modules.length) + ' chapters</span><span>' + esc(book.complexity || 'all levels') + '</span></div><aside class="notice"><strong>About this guide:</strong> ' + esc(book.goal) + ' This free preview includes the roadmap and key lessons.</aside><section class="toc"><h2>What you will learn</h2><ol>' + toc + '</ol></section>' + chapters + (cards ? '<section><h2>Continue learning</h2><ul class="grid">' + cards + '</ul></section>' : '') + '</main>';
  const schema = { '@context': 'https://schema.org', '@type': 'Book', name: book.title, description: book.metaDescription || book.goal, url: url(book.slug), author: { '@type': 'Person', name: 'Tanmay Kalbande', url: site }, datePublished: book.generatedAt?.slice(0, 10), inLanguage: 'en', isAccessibleForFree: true, genre: book.category, keywords: book.tags.join(', '), numberOfPages: book.moduleCount, wordCount: book.wordCount };
  return document(book.title + ' | Free Learning Guide | Pustakam Library', book.metaDescription || book.goal, url(book.slug), body, schema);
}

function renderLibrary(all: Meta[]) {
  const cards = all.map(book => '<li><a class="card" href="/library/book/' + encodeURIComponent(book.slug) + '"><strong>' + esc(book.title) + '</strong><small>' + esc(book.metaDescription || book.goal) + '</small></a></li>').join('');
  const body = '<main><p class="eyebrow">Pustakam by Tanmay Kalbande</p><h1>Free, structured learning guides</h1><p class="lead">Explore practical, chapter-by-chapter guides across programming, careers, business, finance, and everyday skills. Every guide is free to read.</p><div class="meta"><span>' + all.length + ' guides</span><span>Free access</span></div><section><h2>Browse all guides</h2><ul class="grid">' + cards + '</ul></section></main>';
  return document('Free Learning Guides | Pustakam Library', 'Free, structured learning guides across practical topics, programming, business, careers, and more.', site + '/library', body, { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Pustakam Library', url: site + '/library' });
}

const catalogPath = path.join(input, 'catalog.json');
if (!fs.existsSync(catalogPath)) throw new Error('Catalog not found: ' + catalogPath);
const all = (JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as { books: Meta[] }).books || [];
let count = 0;
for (const meta of all) {
  const source = path.join(input, 'books', meta.slug + '.json');
  if (!fs.existsSync(source)) continue;
  const destination = path.join(output, 'book', meta.slug, 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, renderBook(JSON.parse(fs.readFileSync(source, 'utf8')) as Book, all), 'utf8');
  count++;
}
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'index.html'), renderLibrary(all), 'utf8');
console.log('Generated ' + count + ' crawlable book pages and a library index in ' + output);
