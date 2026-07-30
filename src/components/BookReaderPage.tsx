import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';

import {
  ArrowLeft, Clock, FileText, BookOpen, Bookmark,
  Download, ExternalLink, Check, Calendar, Sun, Moon,
  Type, Minus, Plus, ArrowUp, ChevronLeft, ChevronRight,
  PanelLeftOpen, PanelLeftClose, Info, X
} from 'lucide-react';
import { socialLinks } from '../data/siteData';
import { setFavicon } from '../utils/setFavicon';
import { AboutModal } from './AboutModal';
import {
  CourseProgress,
  getCourseProgress,
  getReadingPosition,
  markBookCompleted,
  saveCourseProgress,
  saveReadingPosition,
} from '../lib/learning';
import '../styles/landing.css';
import '../styles/library.css';

interface BookModule {
  title: string;
  content: string;
  wordCount: number;
}

export interface BookFile {
  slug: string;
  title: string;
  goal: string;
  category: string;
  tags: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  wordCount: number;
  moduleCount: number;
  readingTimeMins: number;
  metaDescription: string;
  modelUsed?: string;
  generatedAt: string;
  edition?: 'stellar' | 'street' | 'desi';
  modules: BookModule[];
  finalBook?: string;
}

/**
 * Extract a named section (Introduction, Summary, Glossary) from the finalBook markdown.
 * Looks for ## SectionName and captures until the next # or ## heading or end of string.
 */
function extractSection(finalBook: string | undefined, sectionName: string): string | null {
  if (!finalBook) return null;
  try {
    const regex = new RegExp(`##\\s+${sectionName}\\s*\n([\\s\\S]*?)(?=\n#{1,2}\\s+|$)`, 'i');
    const match = finalBook.match(regex);
    if (!match || !match[1]) return null;
    let content = match[1].trim();
    content = content.replace(/(\n\s*---\s*)+$/, '').trim();
    return content.length > 50 ? content : null;
  } catch (err) {
    return null;
  }
}

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';

// ── Section heading badge maps per edition (covers both old and new prompt patterns) ──
const STREET_SECTION_BADGES: Record<string, string> = {
  // New Pustakam-aligned patterns
  'Core Carnage': 'badge-street-1',
  'Street Smarts': 'badge-street-2',
  'Fight Club': 'badge-street-3',
  'Victory Lap': 'badge-street-4',
  // Old portfolio patterns (still in existing books)
  'Street-level Application': 'badge-street-2',
  'Key Takeaways': 'badge-takeaway',
  'Practice': 'badge-practice',
};

const DESI_SECTION_BADGES: Record<string, string> = {
  // New Pustakam-aligned patterns
  'Victory Lap': 'badge-desi-4',
  // Old portfolio patterns
  'Asli Funda': 'badge-desi-1',
  'Practical Scene': 'badge-desi-2',
  'Key Takeaways': 'badge-takeaway',
  'Practice': 'badge-practice',
};

const STELLAR_SECTION_BADGES: Record<string, string> = {
  'Key Takeaways': 'badge-takeaway',
  'Practice': 'badge-practice',
};

function getSectionBadgeClass(headingText: string, edition?: string): string | null {
  const cleanText = headingText.replace(/\(.*\)/, '').trim(); // strip parentheticals for matching
  const map = edition === 'street' ? STREET_SECTION_BADGES
    : edition === 'desi' ? DESI_SECTION_BADGES
      : STELLAR_SECTION_BADGES;
  // Try exact match first, then prefix match
  for (const [key, cls] of Object.entries(map)) {
    if (cleanText.startsWith(key)) return cls;
  }
  return null;
}

const EDITION_LABEL: Record<string, string> = {
  street: '🔥 Street Edition',
  desi: '🇮🇳 Desi Edition',
  stellar: '✨ Stellar Edition',
};

const FONT_SCALE_LABELS = ['S', 'M', 'L', 'XL'];

function stripLeadingDuplicateHeading(content: string, moduleTitle: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) return content;

  const firstLine = lines[i].trim();
  const headingMatch = firstLine.match(/^#{1,3}\s+(.+)$/);
  if (!headingMatch) return content;

  const headingText = headingMatch[1].trim().toLowerCase();
  const titleText = (moduleTitle || '').trim().toLowerCase();

  const overlaps = titleText.length > 0 && (
    headingText.includes(titleText.slice(0, 15)) || titleText.includes(headingText.slice(0, 15))
  );
  if (!overlaps) return content;

  lines.splice(i, 1);
  return lines.join('\n').replace(/^\n+/, '');
}

function cleanChapterContent(content: string, moduleTitle: string): string {
  if (!content) return '';
  try {
    let cleaned = stripLeadingDuplicateHeading(content, moduleTitle);
    cleaned = cleaned.replace(/^(\s*---\s*\n)+/, '').replace(/(\n\s*---\s*)+$/, '').trim();
    return cleaned;
  } catch (err) {
    return content || '';
  }
}

// ── Enhanced Markdown renderer with callout detection & mermaid prep ──
function renderMd(md: string, edition?: string): string {
  if (!md) return '';
  // Preprocess to clean up nested headings like "### **### Heading**" or "### ### Heading"
  const cleanedMd = md.replace(/^(\s*#{1,6}\s+)(?:\*\*\s*)?#{1,6}\s*(.*?)(?:\s*\*\*\s*)?\r?$/gm, '$1$2');
  let rawParsed: any = marked.parse(cleanedMd, { breaks: true, gfm: true, async: false });
  let html = typeof rawParsed === 'string' ? rawParsed : String(rawParsed || '');

  // Post-process callout blocks: detect emoji patterns in blockquotes and add CSS classes
  html = html.replace(
    /<blockquote>\s*<p>([💡🔥⚠️🏋️🧠☕🎯])/g,
    (_match: string, emoji: string) => {
      const classMap: Record<string, string> = {
        '💡': 'callout-tip', '🔥': 'callout-fire', '⚠️': 'callout-warning',
        '🏋️': 'callout-challenge', '🧠': 'callout-quiz', '☕': 'callout-chill',
        '🎯': 'callout-target',
      };
      const cls = classMap[emoji] || 'callout-tip';
      return `<blockquote class="${cls}"><p>${emoji}`;
    }
  );

  // Post-process: inject edition-aware section badge on known ## headings
  if (edition === 'street' || edition === 'desi' || edition === 'stellar') {
    html = html.replace(
      /<h2>([^<]+)<\/h2>/g,
      (_full: string, text: string) => {
        const badgeClass = getSectionBadgeClass(text, edition);
        if (!badgeClass) return _full;
        return `<h2 class="section-heading ${badgeClass}"><span class="section-badge">${text}</span></h2>`;
      }
    );
  }

  // Post-process mermaid code blocks into renderable containers
  html = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_: string, code: string) =>
      `<div class="mermaid-block"><pre class="mermaid">${code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')}</pre></div>`
  );

  // Post-process all other code blocks to add language labels and copy buttons
  html = html.replace(
    /<pre><code(?:\s+class="(language-[^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_: string, langClass: string, code: string) => {
      // Mermaid is already handled
      if (langClass === 'language-mermaid') return _;

      const lang = langClass ? langClass.replace('language-', '') : 'code';

      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <div class="code-block-header-left">
              <div class="code-block-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <span class="code-block-lang">${lang}</span>
            </div>
            <button class="code-block-copy" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => { const old = this.innerHTML; this.innerHTML = '<svg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'20 6 9 17 4 12\\'></polyline></svg> Copied!'; setTimeout(() => this.innerHTML = old, 2000); })">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
          </div>
          <pre><code${langClass ? ` class="${langClass}"` : ''}>${code}</code></pre>
        </div>
      `;
    }
  );

  return html;
}

// ── Helpers ──
function formatGeneratedDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' ' + d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ── PDF export using custom high-end CSS Print template (emulates pdfmake design) ───
function exportToPdf(book: BookFile) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const totalWords = book.wordCount.toLocaleString();

  // Extract intro/summary/glossary for PDF
  const introContent = extractSection(book.finalBook, 'Introduction');
  const summaryContent = extractSection(book.finalBook, 'Summary');
  const glossaryContent = extractSection(book.finalBook, 'Glossary');

  // TOC list HTML
  const tocItems: string[] = [];
  if (introContent) tocItems.push(`<div class="toc-item"><span class="toc-item-title">Introduction</span><span class="toc-item-dots"></span></div>`);
  book.modules.forEach((mod, i) => {
    tocItems.push(`<div class="toc-item"><span class="toc-item-title">${i + 1}. ${mod.title}</span><span class="toc-item-dots"></span><span class="toc-item-page">${i + 3}</span></div>`);
  });
  if (summaryContent) tocItems.push(`<div class="toc-item"><span class="toc-item-title">Summary</span><span class="toc-item-dots"></span></div>`);
  if (glossaryContent) tocItems.push(`<div class="toc-item"><span class="toc-item-title">Glossary</span><span class="toc-item-dots"></span></div>`);
  const tocHtml = tocItems.join('');

  // Introduction HTML
  const introHtml = introContent ? `
    <div class="chapter-page">
      <div class="chapter-header">
        <h2 class="chapter-title">Introduction</h2>
      </div>
      <div class="chapter-body">${renderMd(introContent)}</div>
    </div>` : '';

  // Chapter content HTML
  const chaptersHtml = book.modules
    .map((mod, i) => `
      <div class="chapter-page">
        <div class="chapter-header">
          <span class="chapter-num">Chapter ${i + 1}</span>
          <h2 class="chapter-title">${mod.title}</h2>
        </div>
        <div class="chapter-body">${renderMd(cleanChapterContent(mod.content, mod.title))}</div>
      </div>
    `)
    .join('');

  // Summary + Glossary HTML
  const summaryHtml = summaryContent ? `
    <div class="chapter-page">
      <div class="chapter-header"><h2 class="chapter-title">Summary</h2></div>
      <div class="chapter-body">${renderMd(summaryContent)}</div>
    </div>` : '';
  const glossaryHtml = glossaryContent ? `
    <div class="chapter-page">
      <div class="chapter-header"><h2 class="chapter-title">Glossary</h2></div>
      <div class="chapter-body">${renderMd(glossaryContent)}</div>
    </div>` : '';

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${book.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Roboto+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Print setup & page sizes */
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    @page :first {
      margin: 0;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1a1a;
      background-color: #ffffff;
      line-height: 1.8;
      font-size: 10.5pt;
    }

    /* ── Cover Page (Editorial Book Card Design) ── */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      background-color: #0e0e10;
      color: #f0ede8;
      padding: 25mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
    }

    .cover-card {
      position: relative;
      background: #1c1c1b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 36px 32px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    /* Noise texture overlay */
    .cover-card::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.12;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .cover-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 24px;
      z-index: 2;
      position: relative;
    }

    .cover-badge {
      font-family: 'Roboto Mono', monospace;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 3px 9px;
      border-radius: 3px;
      display: inline-flex;
      align-items: center;
    }

    .cover-badge.complexity-beginner {
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
      background: rgba(52, 211, 153, 0.08);
    }
    .cover-badge.complexity-intermediate {
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.3);
      background: rgba(251, 191, 36, 0.08);
    }
    .cover-badge.complexity-advanced {
      color: #f87171;
      border: 1px solid rgba(248, 113, 113, 0.3);
      background: rgba(248, 113, 113, 0.08);
    }

    .cover-badge.category, .cover-badge.tag {
      color: #999999;
      border: 1px dashed rgba(255, 255, 255, 0.2);
    }

    .cover-badge.edition {
      border: 1px solid #e05a35;
      color: #e05a35;
    }

    .cover-badge.model {
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #bbbbbb;
    }

    .cover-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 38pt;
      font-weight: 700;
      line-height: 1.1;
      margin: 0 0 16px 0;
      color: #f0ede8;
      z-index: 2;
      position: relative;
    }

    .cover-goal {
      font-family: 'Roboto Mono', monospace;
      font-size: 10pt;
      line-height: 1.6;
      color: #999999;
      margin-bottom: 28px;
      z-index: 2;
      position: relative;
    }

    .cover-card-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #666666;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      z-index: 2;
      position: relative;
    }

    .cover-footer {
      margin-top: 32px;
      display: flex;
      justify-content: space-between;
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #555555;
    }

    /* ── Table of Contents Page ── */
    .toc-page {
      page-break-after: always;
      padding: 20mm 10mm;
    }

    .toc-header {
      text-align: center;
      margin-bottom: 50px;
    }

    .toc-header h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .toc-header p {
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #666;
      margin: 0;
    }

    .toc-list {
      max-width: 540px;
      margin: 0 auto;
    }

    .toc-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .toc-item-title {
      font-family: 'Inter', sans-serif;
      font-size: 10.5pt;
      font-weight: 600;
      color: #1a1a1a;
    }

    .toc-item-dots {
      flex: 1;
      border-bottom: 1px dotted #ccc;
      margin: 0 10px;
      position: relative;
      top: -4px;
    }

    .toc-item-page {
      font-family: 'Roboto Mono', monospace;
      font-size: 10pt;
      font-weight: 700;
      color: #666;
    }

    /* ── Inside Book Chapters ── */
    .chapter-page {
      page-break-before: always;
      padding: 10mm 10mm 20mm 10mm;
      position: relative;
    }

    .chapter-header {
      margin-bottom: 40px;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 20px;
    }

    .chapter-num {
      font-family: 'Roboto Mono', monospace;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #e05a35;
      display: block;
      margin-bottom: 6px;
    }

    .chapter-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      line-height: 1.25;
      margin: 0;
      color: #1a1a1a;
    }

    /* ── Chapter Body Typography (Editorial Non-Fiction) ── */
    .chapter-body {
      text-align: justify;
      color: #2b2b2b;
    }

    .chapter-body p {
      margin: 0 0 18px 0;
    }

    .chapter-body h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 18pt;
      font-weight: 700;
      margin: 36px 0 16px 0;
      color: #1a1a1a;
    }

    .chapter-body h3 {
      font-family: 'Roboto Mono', monospace;
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 28px 0 12px 0;
      color: #1a1a1a;
    }

    .chapter-body ul, .chapter-body ol {
      margin: 0 0 18px 0;
      padding-left: 20px;
    }

    .chapter-body li {
      margin-bottom: 8px;
    }

    .chapter-body blockquote {
      border-left: 3px solid #e05a35;
      padding: 10px 20px;
      background: #faf7f5;
      margin: 20px 0;
    }
    .chapter-body blockquote p {
      margin: 0;
      font-style: italic;
      color: #555555;
    }

    .chapter-body code {
      font-family: 'Roboto Mono', monospace;
      font-size: 9.5pt;
      background: #f5f5f5;
      padding: 2px 5px;
      border: 1px solid #e2e2e2;
      border-radius: 2px;
      color: #e05a35;
    }

    .chapter-body pre {
      background: #f8f8f8;
      border: 1px solid #e5e5e5;
      padding: 16px;
      border-radius: 2px;
      overflow-x: auto;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    .chapter-body pre code {
      background: none;
      border: none;
      padding: 0;
      color: #333333;
      font-size: 9.5pt;
    }

    .chapter-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    .chapter-body th, .chapter-body td {
      border: 1px solid #e0e0e0;
      padding: 8px 12px;
      text-align: left;
    }
    .chapter-body th {
      background: #f9f9f9;
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .chapter-body hr {
      border: none;
      border-top: 1px dashed #cccccc;
      margin: 36px 0;
    }

    /* Print Break Utilities */
    hr.page-separator {
      border: none;
      height: 0;
      page-break-after: always;
      margin: 0;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-card">
      <div class="cover-card-meta">
        <span class="cover-badge complexity-${book.complexity}">${book.complexity.toUpperCase()}</span>
        <span class="cover-badge category">${book.category.toUpperCase()}</span>
        ${book.tags.slice(0, 3).map(t => `<span class="cover-badge tag">${t.toUpperCase()}</span>`).join('')}
        <span class="cover-badge edition">
          ${book.edition === 'street' ? '🔥 STREET EDITION' : book.edition === 'desi' ? '🇮🇳 DESI EDITION' : '✨ STELLAR EDITION'}
        </span>
        ${book.modelUsed ? `<span class="cover-badge model">🤖 ${book.modelUsed.toUpperCase()}</span>` : ''}
      </div>

      <h1 class="cover-title">${book.title}</h1>
      <p class="cover-goal">${book.goal}</p>

      <div class="cover-card-stats">
        <span>⏱ ${book.readingTimeMins} MIN READ</span>
        <span>📖 ${book.moduleCount} CHAPTERS</span>
        <span>📚 ${totalWords} WORDS</span>
        ${book.generatedAt ? `<span>📅 ${formatGeneratedDate(book.generatedAt).toUpperCase()}</span>` : ''}
      </div>
    </div>

    <div class="cover-footer">
      <span>PUSTAKAM LIBRARY</span>
      <span>PUSTAKAM.TANMAYSK.IN</span>
    </div>
  </div>

    /* ── Table of Contents Page ── */
    .toc-page {
      page-break-after: always;
      padding: 20mm 10mm;
    }

    .toc-header {
      text-align: center;
      margin-bottom: 50px;
    }

    .toc-header h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .toc-header p {
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #666;
      margin: 0;
    }

    .toc-list {
      max-width: 540px;
      margin: 0 auto;
    }

    .toc-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .toc-item-title {
      font-family: 'Inter', sans-serif;
      font-size: 10.5pt;
      font-weight: 600;
      color: #1a1a1a;
    }

    .toc-item-dots {
      flex: 1;
      border-bottom: 1px dotted #ccc;
      margin: 0 10px;
      position: relative;
      top: -4px;
    }

    .toc-item-page {
      font-family: 'Roboto Mono', monospace;
      font-size: 10pt;
      font-weight: 700;
      color: #666;
    }

    /* ── Inside Book Chapters ── */
    .chapter-page {
      page-break-before: always;
      padding: 10mm 10mm 20mm 10mm;
      position: relative;
    }

    .chapter-header {
      margin-bottom: 40px;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 20px;
    }

    .chapter-num {
      font-family: 'Roboto Mono', monospace;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #e05a35;
      display: block;
      margin-bottom: 6px;
    }

    .chapter-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      line-height: 1.25;
      margin: 0;
      color: #1a1a1a;
    }

    /* ── Chapter Body Typography (Editorial Non-Fiction) ── */
    .chapter-body {
      text-align: justify;
      color: #2b2b2b;
    }

    .chapter-body p {
      margin: 0 0 18px 0;
    }

    .chapter-body h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 18pt;
      font-weight: 700;
      margin: 36px 0 16px 0;
      color: #1a1a1a;
    }

    .chapter-body h3 {
      font-family: 'Roboto Mono', monospace;
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 28px 0 12px 0;
      color: #1a1a1a;
    }

    .chapter-body ul, .chapter-body ol {
      margin: 0 0 18px 0;
      padding-left: 20px;
    }

    .chapter-body li {
      margin-bottom: 8px;
    }

    .chapter-body blockquote {
      border-left: 3px solid #e05a35;
      padding: 10px 20px;
      background: #faf7f5;
      margin: 20px 0;
    }
    .chapter-body blockquote p {
      margin: 0;
      font-style: italic;
      color: #555555;
    }

    .chapter-body code {
      font-family: 'Roboto Mono', monospace;
      font-size: 9.5pt;
      background: #f5f5f5;
      padding: 2px 5px;
      border: 1px solid #e2e2e2;
      border-radius: 2px;
      color: #e05a35;
    }

    .chapter-body pre {
      background: #f8f8f8;
      border: 1px solid #e5e5e5;
      padding: 16px;
      border-radius: 2px;
      overflow-x: auto;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    .chapter-body pre code {
      background: none;
      border: none;
      padding: 0;
      color: #333333;
      font-size: 9.5pt;
    }

    .chapter-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    .chapter-body th, .chapter-body td {
      border: 1px solid #e0e0e0;
      padding: 8px 12px;
      text-align: left;
    }
    .chapter-body th {
      background: #f9f9f9;
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .chapter-body hr {
      border: none;
      border-top: 1px dashed #cccccc;
      margin: 36px 0;
    }

    /* Print Break Utilities */
    hr.page-separator {
      border: none;
      height: 0;
      page-break-after: always;
      margin: 0;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-brand">Pustakam Reference Library</div>
      <h1 class="cover-title"><span class="cover-title-italic">A Learning Guide to</span><br />${book.title}</h1>
      <div class="cover-subtitle">${book.complexity} LEVEL · ${book.category} EDITION</div>
      <div class="cover-accent-line"></div>
      <div class="cover-goal">${book.goal}</div>
    </div>
    <div class="cover-bottom">
      <span>${totalWords} words</span>
      <span>${book.readingTimeMins} minute read</span>
      <span>pustakam.tanmaysk.in</span>
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <div class="toc-page">
    <div class="toc-header">
      <h2>Contents</h2>
      <p>Roadmap Overview</p>
    </div>
    <div class="toc-list">
      ${tocHtml}
    </div>
  </div>

  <!-- INTRODUCTION -->
  ${introHtml}

  <!-- CHAPTER CONTENT -->
  ${chaptersHtml}

  <!-- SUMMARY & GLOSSARY -->
  ${summaryHtml}
  ${glossaryHtml}
</body>
</html>`);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 700);
}

export default function BookReaderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [book, setBook] = useState<BookFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChapter, setActiveChapter] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocCollapsed, setTocCollapsed] = useState(true);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const introRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const glossaryRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (window.localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  // ── Reading preferences: text size & line width, persisted like theme ──
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = window.localStorage.getItem('reader-font-size');
    const n = saved ? parseInt(saved, 10) : 1;
    return Number.isFinite(n) && n >= 0 && n <= 3 ? n : 1;
  });
  const [contentWidth, setContentWidth] = useState<'normal' | 'wide'>(() => {
    return (window.localStorage.getItem('reader-width') as 'normal' | 'wide') || 'normal';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  // ── Scroll-driven reading progress ──
  const [scrollPct, setScrollPct] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [savedProgress, setSavedProgress] = useState(getReadingPosition);
  const [courseProgress, setCourseProgress] = useState<CourseProgress>(() => getCourseProgress(slug || ''));

  useEffect(() => {
    setFavicon('/favicon_final.svg');
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'outfit' | 'lora' | 'mono'>(() => {
    const saved = window.localStorage.getItem('reader-font-family');
    return (saved as any) || 'sans';
  });

  useEffect(() => {
    window.localStorage.setItem('reader-font-size', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    window.localStorage.setItem('reader-font-family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    window.localStorage.setItem('reader-width', contentWidth);
  }, [contentWidth]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Close the reading-preferences panel on outside click or Escape
  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [settingsOpen]);

  // Track overall scroll progress for the top progress rail, TOC rail, and back-to-top button
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const scrollTop = doc.scrollTop || document.body.scrollTop;
        const height = doc.scrollHeight - doc.clientHeight;
        const pct = height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0;
        setScrollPct(pct);
        setShowBackToTop(scrollTop > 640);
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [book]);

  // Save a reader's place locally without requiring an account.
  useEffect(() => {
    if (!book || scrollPct < 2) return;
    const progress = {
      slug: book.slug,
      title: book.title,
      chapter: activeChapter,
      progress: Math.round(scrollPct),
      savedAt: new Date().toISOString(),
    };
    const timer = window.setTimeout(() => {
      try {
        saveReadingPosition(progress);
        setSavedProgress(progress);
      } catch { }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [book, scrollPct, activeChapter]);

  useEffect(() => {
    if (!book) return;
    saveCourseProgress(book.slug, courseProgress);
  }, [book, courseProgress]);



  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`https://cdn.jsdelivr.net/gh/tanmay-kalbande/pustakam-books@main/books/${slug}.json`)
      .then(r => r.ok ? r.json() : Promise.reject('Book not found'))
      .then((data: BookFile) => {
        setBook(data);
        setCourseProgress(getCourseProgress(data.slug));
        // ── SEO: Page title ──
        document.title = `${data.title} — Free Book | Tanmay Kalbande`;

        // ── SEO: Meta description ──
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', data.metaDescription);

        // ── SEO: Canonical URL ──
        const canonicalUrl = `https://tanmaysk.in/library/book/${data.slug}`;
        let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (!canonical) {
          canonical = document.createElement('link');
          canonical.rel = 'canonical';
          document.head.appendChild(canonical);
        }
        canonical.href = canonicalUrl;

        // ── SEO: Open Graph tags ──
        const ogTags: Record<string, string> = {
          'og:title': data.title,
          'og:description': data.metaDescription,
          'og:url': canonicalUrl,
          'og:type': 'book',
          'og:site_name': 'Pustakam Library — Tanmay Kalbande',
        };
        Object.entries(ogTags).forEach(([property, content]) => {
          let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
          if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute('property', property);
            document.head.appendChild(tag);
          }
          tag.setAttribute('content', content);
        });

        // ── SEO: Twitter Card tags ──
        const twitterTags: Record<string, string> = {
          'twitter:card': 'summary',
          'twitter:title': data.title,
          'twitter:description': data.metaDescription,
        };
        Object.entries(twitterTags).forEach(([name, content]) => {
          let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
          if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute('name', name);
            document.head.appendChild(tag);
          }
          tag.setAttribute('content', content);
        });

        // ── SEO: Schema.org JSON-LD structured data ──
        let ldScript = document.querySelector('script[data-seo="book-jsonld"]');
        if (ldScript) ldScript.remove();
        ldScript = document.createElement('script');
        ldScript.setAttribute('type', 'application/ld+json');
        ldScript.setAttribute('data-seo', 'book-jsonld');
        ldScript.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Book',
          'name': data.title,
          'description': data.metaDescription,
          'author': { '@type': 'Person', 'name': 'Tanmay Kalbande' },
          'datePublished': data.generatedAt?.split('T')[0] || '',
          'wordCount': data.wordCount,
          'inLanguage': 'en',
          'url': canonicalUrl,
          'isAccessibleForFree': true,
          'genre': data.category,
          'keywords': data.tags?.join(', ') || '',
          'numberOfPages': data.moduleCount,
        });
        document.head.appendChild(ldScript);
        setLoading(false);
      })
      .catch(() => {
        setError('This book could not be found.');
        setLoading(false);
      });
  }, [slug]);

  // Track which chapter is in view
  useEffect(() => {
    if (!book) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = chapterRefs.current.indexOf(e.target as HTMLDivElement);
            if (idx !== -1) setActiveChapter(idx);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    chapterRefs.current.forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [book]);

  // Gently reveal chapters/sections as the reader scrolls to them (imperative — no re-renders)
  useEffect(() => {
    if (!book) return;
    const revealEls = [
      introRef.current, summaryRef.current, glossaryRef.current, ...chapterRefs.current,
    ].filter(Boolean) as HTMLElement[];
    if (revealEls.length === 0) return;
    const reveal = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            reveal.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach(el => reveal.observe(el));
    return () => reveal.disconnect();
  }, [book]);

  // Mermaid diagram rendering — lazy-load from CDN only when needed
  useEffect(() => {
    const mermaidBlocks = document.querySelectorAll('.mermaid');
    if (mermaidBlocks.length === 0) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      (window as any).mermaid?.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#e05a35',
          primaryBorderColor: '#e05a35',
          primaryTextColor: '#f5efe6',
          lineColor: '#999',
          secondaryColor: '#1a1a1a',
          tertiaryColor: '#111',
          fontFamily: 'Inter, sans-serif',
        }
      });
      (window as any).mermaid?.run({ nodes: mermaidBlocks });
    };
    document.head.appendChild(script);

    return () => {
      try { document.head.removeChild(script); } catch { }
    };
  }, [activeChapter, book]);

  const scrollToElement = (el: HTMLElement | null) => {
    if (!el) return;
    const navHeight = 72;
    const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - navHeight;
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  };

  const scrollToChapter = (i: number) => {
    scrollToElement(chapterRefs.current[i]);
  };

  const resumeReading = () => {
    if (!savedProgress || savedProgress.slug !== book?.slug) return;
    if (savedProgress.chapter < 0) {
      scrollToElement(introRef.current);
      return;
    }
    scrollToChapter(savedProgress.chapter);
  };

  const completedChapterCount = useMemo(
    () => courseProgress.completedChapters.filter(index => index >= 0 && index < (book?.modules.length || 0)).length,
    [book, courseProgress.completedChapters]
  );

  const toggleChapterComplete = (chapterIndex: number) => {
    setCourseProgress(current => {
      const completedChapters = current.completedChapters.includes(chapterIndex)
        ? current.completedChapters.filter(index => index !== chapterIndex)
        : [...current.completedChapters, chapterIndex].sort((a, b) => a - b);
      return { ...current, completedChapters, updatedAt: new Date().toISOString() };
    });
  };

  const toggleChapterBookmark = (chapterIndex: number) => {
    setCourseProgress(current => {
      const bookmarks = current.bookmarks.includes(chapterIndex)
        ? current.bookmarks.filter(index => index !== chapterIndex)
        : [...current.bookmarks, chapterIndex].sort((a, b) => a - b);
      return { ...current, bookmarks, updatedAt: new Date().toISOString() };
    });
  };

  const isCourseComplete = Boolean(book?.modules.length && completedChapterCount === book.modules.length);

  const completeAllChapters = () => {
    if (!book) return;
    setCourseProgress(current => ({
      ...current,
      completedChapters: book.modules.map((_, index) => index),
      updatedAt: new Date().toISOString(),
    }));
  };

  const printCertificate = () => {
    if (!book) return;
    const safeTitle = book.title.replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char] || char));
    const issueDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const certId = 'PK-' + Date.now().toString(36).toUpperCase().slice(-6);
    const certificateWindow = window.open('', '_blank');
    if (!certificateWindow) return;
    certificateWindow.document.write(
      `<!doctype html><html><head><title>Certificate of Completion — ${safeTitle}</title>`
      + `<link rel="preconnect" href="https://fonts.googleapis.com">`
      + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
      + `<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`
      + `<style>`
      + `@page{size:A4 landscape;margin:0}`
      + `*{box-sizing:border-box;margin:0;padding:0}`
      + `body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c;color:#f5efe9;font-family:'Inter',sans-serif}`
      + `.cert{position:relative;width:min(1080px,94vw);min-height:700px;padding:0;text-align:center;overflow:hidden;background:linear-gradient(145deg,#12110f 0%,#1a1816 40%,#0f0e0c 100%);border:1px solid rgba(200,160,100,.15);box-shadow:0 40px 100px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.04)}`
      + `.cert-inner{position:relative;z-index:2;padding:56px 80px 48px}`
      /* ambient glow */
      + `.cert::before{content:'';position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse 60% 50% at 50% 35%,rgba(200,130,60,.08),transparent 65%),radial-gradient(ellipse 40% 40% at 80% 80%,rgba(160,120,80,.04),transparent)}`
      /* accent top line */
      + `.cert-top-line{position:absolute;top:0;left:10%;right:10%;height:2px;background:linear-gradient(90deg,transparent,rgba(200,160,100,.6) 30%,rgba(220,180,120,.8) 50%,rgba(200,160,100,.6) 70%,transparent);z-index:3}`
      /* decorative corners */
      + `.corner-svg{position:absolute;width:72px;height:72px;z-index:3;opacity:.35}`
      + `.corner-tl{top:20px;left:20px}`
      + `.corner-tr{top:20px;right:20px;transform:scaleX(-1)}`
      + `.corner-bl{bottom:20px;left:20px;transform:scaleY(-1)}`
      + `.corner-br{bottom:20px;right:20px;transform:scale(-1)}`
      + `.corner-svg path{fill:none;stroke:rgba(200,160,100,.7);stroke-width:1.2}`
      /* border inset */
      + `.cert-border{position:absolute;inset:14px;border:1px solid rgba(200,160,100,.12);z-index:1;pointer-events:none}`
      + `.cert-border::after{content:'';position:absolute;inset:6px;border:1px solid rgba(200,160,100,.06)}`
      /* brand */
      + `.brand{color:rgba(200,160,100,.55);font:600 10px 'Inter',sans-serif;letter-spacing:.35em;text-transform:uppercase}`
      /* kicker */
      + `.kicker{margin:36px 0 6px;color:rgba(200,160,100,.7);font:600 11px 'Inter',sans-serif;letter-spacing:.22em;text-transform:uppercase}`
      /* main title */
      + `.main-title{font:400 clamp(48px,5.5vw,72px)/1 'Cormorant Garamond',serif;color:#f5efe9;letter-spacing:-.03em}`
      + `.main-title em{font-style:italic;color:rgba(200,160,100,.85)}`
      /* decorative divider */
      + `.divider{display:flex;align-items:center;justify-content:center;gap:12px;margin:22px auto;width:200px}`
      + `.divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(200,160,100,.4),transparent)}`
      + `.divider-diamond{width:6px;height:6px;background:rgba(200,160,100,.5);transform:rotate(45deg);flex-shrink:0}`
      /* copy text */
      + `.copy{color:rgba(245,239,233,.5);font:400 15px/1.7 'Inter',sans-serif}`
      /* book title */
      + `.book-title{max-width:780px;margin:14px auto 28px;font:600 clamp(26px,3vw,34px)/1.2 'Cormorant Garamond',serif;color:#f5efe9}`
      /* seal */
      + `.seal{position:relative;width:80px;height:80px;margin:0 auto 18px}`
      + `.seal-ring{position:absolute;inset:0;border:2px solid rgba(200,160,100,.5);border-radius:50%}`
      + `.seal-ring-outer{position:absolute;inset:-8px;border:1px solid rgba(200,160,100,.15);border-radius:50%}`
      + `.seal-check{position:absolute;inset:0;display:grid;place-items:center;font:700 28px 'Inter',sans-serif;color:rgba(200,160,100,.8)}`
      + `.seal-glow{position:absolute;inset:-16px;border-radius:50%;background:radial-gradient(circle,rgba(200,160,100,.08),transparent 65%)}`
      /* details row */
      + `.details{display:flex;justify-content:center;gap:48px;margin:28px 0 0}`
      + `.details>div{min-width:100px}`
      + `.details span{display:block;color:rgba(200,160,100,.45);font:600 9px 'Inter',sans-serif;letter-spacing:.18em;text-transform:uppercase;margin-bottom:6px}`
      + `.details strong{display:block;color:rgba(245,239,233,.8);font:600 13px 'Inter',sans-serif;letter-spacing:.02em}`
      /* signature */
      + `.signature{margin-top:32px;color:rgba(245,239,233,.3);font:italic 14px 'Cormorant Garamond',serif;letter-spacing:.04em}`
      /* cert id */
      + `.cert-id{position:absolute;bottom:22px;right:32px;color:rgba(200,160,100,.2);font:600 8px 'Inter',sans-serif;letter-spacing:.15em;z-index:3}`
      /* watermark */
      + `.watermark{position:absolute;bottom:22px;left:32px;color:rgba(200,160,100,.12);font:700 8px 'Inter',sans-serif;letter-spacing:.3em;text-transform:uppercase;z-index:3}`
      /* print */
      + `@media print{body{background:#0a0a0c}.cert{width:100vw;min-height:100vh;border-width:0;box-shadow:none}}`
      + `</style></head><body>`
      + `<main class="cert">`
      + `<div class="cert-top-line"></div>`
      + `<div class="cert-border"></div>`
      /* corner ornaments */
      + `<svg class="corner-svg corner-tl" viewBox="0 0 72 72"><path d="M4 68 L4 4 L68 4" /><path d="M4 52 C4 28 28 4 52 4" /><path d="M12 24 L12 12 L24 12" /></svg>`
      + `<svg class="corner-svg corner-tr" viewBox="0 0 72 72"><path d="M4 68 L4 4 L68 4" /><path d="M4 52 C4 28 28 4 52 4" /><path d="M12 24 L12 12 L24 12" /></svg>`
      + `<svg class="corner-svg corner-bl" viewBox="0 0 72 72"><path d="M4 68 L4 4 L68 4" /><path d="M4 52 C4 28 28 4 52 4" /><path d="M12 24 L12 12 L24 12" /></svg>`
      + `<svg class="corner-svg corner-br" viewBox="0 0 72 72"><path d="M4 68 L4 4 L68 4" /><path d="M4 52 C4 28 28 4 52 4" /><path d="M12 24 L12 12 L24 12" /></svg>`
      + `<div class="cert-inner">`
      + `<p class="brand">Pustakam Library · tanmaysk.in</p>`
      + `<p class="kicker">Certificate of Completion</p>`
      + `<h1 class="main-title">Well <em>read.</em></h1>`
      + `<div class="divider"><span class="divider-line"></span><span class="divider-diamond"></span><span class="divider-line"></span></div>`
      + `<p class="copy">This certifies the successful completion of</p>`
      + `<p class="book-title">${safeTitle}</p>`
      + `<div class="seal"><div class="seal-glow"></div><div class="seal-ring-outer"></div><div class="seal-ring"></div><div class="seal-check">✓</div></div>`
      + `<p class="copy">Awarded to a committed learner for completing every chapter of this guide.</p>`
      + `<div class="details">`
      + `<div><span>Chapters</span><strong>${book.modules.length} completed</strong></div>`
      + `<div><span>Reading Time</span><strong>${book.readingTimeMins} minutes</strong></div>`
      + `<div><span>Words Read</span><strong>${(book.wordCount / 1000).toFixed(1)}K words</strong></div>`
      + `<div><span>Issued</span><strong>${issueDate}</strong></div>`
      + `</div>`
      + `<p class="signature">"The more that you read, the more things you will know."</p>`
      + `</div>`
      + `<span class="watermark">Pustakam</span>`
      + `<span class="cert-id">${certId}</span>`
      + `</main></body></html>`
    );
    certificateWindow.document.close();
    certificateWindow.focus();
    window.setTimeout(() => certificateWindow.print(), 500);
  };

  const shareCompletion = async () => {
    if (!book) return;
    const text = 'I completed “' + book.title + '” on Pustakam Library.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Pustakam completion', text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(text + ' ' + window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch { }
  };

  useEffect(() => {
    if (!book || book.modules.length === 0 || completedChapterCount !== book.modules.length) return;
    markBookCompleted({
      slug: book.slug,
      title: book.title,
      completedAt: new Date().toISOString(),
    });
  }, [book, completedChapterCount]);

  const handlePdf = async () => {
    if (!book) return;
    setPdfLoading(true);
    setPdfProgress(5);
    try {
      const { pdfService } = await import('../services/pdfService');
      await pdfService.generatePdf(book, (progress) => {
        setPdfProgress(progress);
      });
    } catch (err) {
      console.warn('pdfService error, falling back to print template:', err);
      exportToPdf(book);
    } finally {
      setPdfLoading(false);
      setPdfProgress(0);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formattedGoal = useMemo(() => {
    if (!book) return '';
    const titleClean = (book.title || '').toLowerCase().trim();
    const goalClean = (book.goal || '').toLowerCase().trim();
    if (!goalClean || titleClean === goalClean || goalClean.length < 15 || titleClean.includes(goalClean)) {
      return 'A structured guide covering the core concepts, practical examples, and next steps for this topic.';
    }
    return book.goal;
  }, [book]);

  const generateUrl = book
    ? `${PUSTAKAM_URL}/?topic=${encodeURIComponent(book.goal)}&complexity=${book.complexity}`
    : PUSTAKAM_URL;

  if (loading) {
    return (
      <div className="reader-root">
        <div className="lib-loading" style={{ height: '100vh' }}>
          <div className="lib-spinner" />
          Loading book...
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="reader-root">
        <nav className="lib-nav">
          <Link to="/library" className="lib-nav-back">
            <ArrowLeft size={12} /> Library
          </Link>
        </nav>
        <div className="lib-empty" style={{ paddingTop: 120 }}>
          <h3>{error || 'Book not found'}</h3>
          <p>
            <Link to="/library" style={{ color: 'var(--accent)' }}>← Back to library</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-root" data-font-family={fontFamily} data-font-size={fontSize} data-width={contentWidth}>
      {/* Background — grain + orbs identical to landing */}
      <div className="lp-bg-wrapper">
        <div className="lp-grain"></div>
        <div className="lp-orb lp-orb-a"></div>
        <div className="lp-orb lp-orb-b"></div>
        <div className="lp-orb lp-orb-c"></div>
      </div>

      {/* Nav */}
      <nav className="lib-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/library" className="lib-nav-back">
            <ArrowLeft size={12} /> Library
          </Link>
          {tocCollapsed && (
            <button
              className="nav-toc-expand-btn"
              onClick={() => setTocCollapsed(false)}
              title="Expand Table of Contents (Contents)"
              aria-label="Expand Table of Contents"
            >
              <PanelLeftOpen size={14} />
              <span className="btn-text">Contents</span>
            </button>
          )}
        </div>
        <div className="lib-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="reader-settings" ref={settingsRef}>
            <button
              className="nav-icon-btn"
              onClick={() => setSettingsOpen(o => !o)}
              aria-label="Reading preferences"
              aria-expanded={settingsOpen}
            >
              <Type size={15} />
            </button>
            {settingsOpen && (
              <div className="reader-settings-panel" role="dialog" aria-label="Reading preferences">
                <div className="reader-settings-row vertical">
                  <span className="reader-settings-label">Font Family</span>
                  <div className="reader-settings-font-grid">
                    <button
                      className={`font-pill-btn ${fontFamily === 'sans' ? 'active' : ''}`}
                      onClick={() => setFontFamily('sans')}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Sans
                    </button>
                    <button
                      className={`font-pill-btn ${fontFamily === 'serif' ? 'active' : ''}`}
                      onClick={() => setFontFamily('serif')}
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}
                    >
                      Serif
                    </button>
                    <button
                      className={`font-pill-btn ${fontFamily === 'outfit' ? 'active' : ''}`}
                      onClick={() => setFontFamily('outfit')}
                      style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
                    >
                      Outfit
                    </button>
                    <button
                      className={`font-pill-btn ${fontFamily === 'lora' ? 'active' : ''}`}
                      onClick={() => setFontFamily('lora')}
                      style={{ fontFamily: "'Lora', serif", fontWeight: 600 }}
                    >
                      Lora
                    </button>
                    <button
                      className={`font-pill-btn ${fontFamily === 'mono' ? 'active' : ''}`}
                      onClick={() => setFontFamily('mono')}
                      style={{ fontFamily: "'Roboto Mono', monospace" }}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                <div className="reader-settings-row">
                  <span className="reader-settings-label">Text Size</span>
                  <div className="reader-settings-stepper">
                    <button
                      onClick={() => setFontSize(f => Math.max(0, f - 1))}
                      disabled={fontSize === 0}
                      aria-label="Decrease text size"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="reader-settings-value">{FONT_SCALE_LABELS[fontSize]}</span>
                    <button
                      onClick={() => setFontSize(f => Math.min(3, f + 1))}
                      disabled={fontSize === 3}
                      aria-label="Increase text size"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div className="reader-settings-row">
                  <span className="reader-settings-label">Line Width</span>
                  <div className="reader-settings-toggle">
                    <button
                      className={contentWidth === 'normal' ? 'active' : ''}
                      onClick={() => setContentWidth('normal')}
                    >
                      Standard
                    </button>
                    <button
                      className={contentWidth === 'wide' ? 'active' : ''}
                      onClick={() => setContentWidth('wide')}
                    >
                      Wide
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            className="nav-icon-btn"
            onClick={() => setInfoOpen(true)}
            aria-label="About this project"
            title="About Free Library"
          >
            <Info size={15} />
          </button>
          <button
            className="nav-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            className="btn-secondary"
            onClick={handleCopyLink}
            aria-label="Share this book"
          >
            {copied ? <Check size={12} /> : <ExternalLink size={12} />}
            <span className="btn-text">{copied ? 'Copied' : 'Share'}</span>
          </button>
          <button
            className="btn-secondary"
            onClick={handlePdf}
            disabled={pdfLoading}
            aria-label="Download PDF version"
          >
            <Download size={12} />
            <span className="btn-text">
              {pdfProgress > 0 ? `${pdfProgress}%` : pdfLoading ? 'Preparing...' : 'PDF'}
            </span>
          </button>
          <a
            href={generateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <span className="btn-text-desktop">Generate My Version</span>
            <span className="btn-text-mobile">Generate</span>
          </a>
        </div>
      </nav>

      {/* Layout */}
      <div className="reader-layout">
        {/* TOC Sidebar */}
        <aside
          className={`reader-toc ${tocCollapsed ? 'toc-collapsed' : ''} ${tocOpen ? 'open' : ''}`}
          onClick={() => { if (tocCollapsed) setTocCollapsed(false); }}
        >
          <div className="reader-toc-header">
            <h3>Contents</h3>
            <span className="reader-toc-progress-pct">{Math.round(scrollPct)}%</span>
            <button
              className="toc-collapse-btn"
              onClick={(e) => {
                e.stopPropagation();
                setTocCollapsed(!tocCollapsed);
              }}
              title={tocCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={tocCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {tocCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <span className="reader-toc-toggle-icon" onClick={() => setTocOpen(!tocOpen)}>{tocOpen ? '−' : '+'}</span>
          </div>
          {/* Collapsed Sidebar Strip */}
          {tocCollapsed ? (
            <div className="reader-toc-collapsed-strip" title={`Progress: ${Math.round(scrollPct)}%`}>
              <div className="collapsed-pct-badge">{Math.round(scrollPct)}%</div>
              <div className="reader-toc-collapsed-nums">
                {extractSection(book.finalBook, 'Introduction') && (
                  <button
                    className={`collapsed-num-btn ${activeChapter === -1 ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); scrollToElement(introRef.current); }}
                    title="Introduction"
                  >
                    INT
                  </button>
                )}
                {(book.modules || []).map((mod, i) => (
                  <button
                    key={i}
                    className={`collapsed-num-btn ${activeChapter === i ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); scrollToChapter(i); }}
                    title={`Chapter ${i + 1}: ${mod.title}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
                {extractSection(book.finalBook, 'Summary') && (
                  <button
                    className="collapsed-num-btn"
                    onClick={(e) => { e.stopPropagation(); scrollToElement(summaryRef.current); }}
                    title="Summary"
                  >
                    SUM
                  </button>
                )}
                {extractSection(book.finalBook, 'Glossary') && (
                  <button
                    className="collapsed-num-btn"
                    onClick={(e) => { e.stopPropagation(); scrollToElement(glossaryRef.current); }}
                    title="Glossary"
                  >
                    GLO
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="reader-toc-list">
              {extractSection(book.finalBook, 'Introduction') && (
                <button
                  className={`reader-toc-item reader-toc-item--label ${activeChapter === -1 ? 'active' : ''}`}
                  onClick={() => {
                    scrollToElement(introRef.current);
                    setTocOpen(false);
                  }}
                >
                  Introduction
                </button>
              )}
              {(book.modules || []).map((mod, i) => (
                <button
                  key={i}
                  className={`reader-toc-item ${activeChapter === i ? 'active' : ''}`}
                  onClick={() => {
                    scrollToChapter(i);
                    setTocOpen(false);
                  }}
                >
                  <span className="reader-toc-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="reader-toc-item-title">{mod.title}</span>
                </button>
              ))}
              {extractSection(book.finalBook, 'Summary') && (
                <button
                  className="reader-toc-item reader-toc-item--label"
                  onClick={() => {
                    scrollToElement(summaryRef.current);
                    setTocOpen(false);
                  }}
                >
                  Summary
                </button>
              )}
              {extractSection(book.finalBook, 'Glossary') && (
                <button
                  className="reader-toc-item reader-toc-item--label"
                  onClick={() => {
                    scrollToElement(glossaryRef.current);
                    setTocOpen(false);
                  }}
                >
                  Glossary
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="reader-main">
          {/* Book Header */}
          <div className="reader-header" data-edition={book.edition || 'stellar'}>
            <div className="reader-header-meta">
              <span className={`reader-complexity ${book.complexity}`}>{book.complexity}</span>
              <span className="reader-category">{book.category}</span>
              {book.tags.slice(0, 2).map(t => (
                <span key={t} className="lib-tag">{t}</span>
              ))}
              <span className="reader-edition-tag" data-edition={book.edition || 'stellar'}>
                {EDITION_LABEL[book.edition || 'stellar']}
              </span>
            </div>

            <h1 className="reader-title">{book.title}</h1>
            <p className="reader-goal">{formattedGoal}</p>

            <div className="reader-stats">
              <span className="reader-stat"><Clock size={13} /> {book.readingTimeMins} min read</span>
              <span className="reader-stat-divider" aria-hidden="true" />
              <span className="reader-stat"><FileText size={13} /> {book.moduleCount} chapters</span>
              <span className="reader-stat-divider" aria-hidden="true" />
              <span className="reader-stat"><BookOpen size={13} /> {book.wordCount.toLocaleString()} words</span>
              {book.generatedAt && (
                <>
                  <span className="reader-stat-divider" aria-hidden="true" />
                  <span className="reader-stat"><Calendar size={13} /> {formatGeneratedDate(book.generatedAt)}</span>
                </>
              )}
              {book.modelUsed && (() => {
                const m = book.modelUsed!.toLowerCase();
                let iconComponent = null;
                let label = book.modelUsed!;

                if (m.includes('gemma')) {
                  iconComponent = (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" />
                    </svg>
                  );
                } else if (m.includes('gpt-oss') || m.includes('openai')) {
                  iconComponent = (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619-.357-1.356-.523-2.117-.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.946-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
                    </svg>
                  );
                } else if (m.includes('mistral')) {
                  iconComponent = (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4zM3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828zM3.428 10.258h17.144v3.428H3.428v-3.428zM3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428zM0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" />
                    </svg>
                  );
                } else if (m.includes('zai') || m.includes('glm')) {
                  iconComponent = (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z" />
                    </svg>
                  );
                }
                return (
                  <>
                    <span className="reader-stat-divider" aria-hidden="true" />
                    <span className="reader-stat reader-stat-model" title={`Generated by ${label}`}>
                      {iconComponent}
                      <span>{label}</span>
                    </span>
                  </>
                );
              })()}
            </div>

            <div className="reader-action-row">
              {savedProgress?.slug === book.slug && savedProgress.progress >= 2 && savedProgress.progress < 100 && (
                <button className="btn-secondary reader-resume-btn" onClick={resumeReading}>
                  <BookOpen size={13} />
                  Continue · Ch {Math.max(1, savedProgress.chapter + 1)}
                </button>
              )}
              <button className="btn-secondary" onClick={handlePdf} disabled={pdfLoading}>
                <Download size={13} />
                {pdfProgress > 0 ? `Generating... ${pdfProgress}%` : pdfLoading ? 'Preparing PDF...' : 'Download PDF'}
              </button>
              <a
                href={generateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Generate My Own Version
                <ExternalLink size={11} />
              </a>
            </div>

            <details className="reader-note-panel">
              <summary>Personal notes <span>Saved only on this device</span></summary>
              <textarea
                value={courseProgress.note}
                onChange={event => setCourseProgress(current => ({
                  ...current,
                  note: event.target.value,
                  updatedAt: new Date().toISOString(),
                }))}
                placeholder="Capture an idea, next action, or question while you read…"
                aria-label="Personal notes for this guide"
              />
            </details>
          </div>

          {/* Unified Reading Well — 100% Identical Left Alignment */}
          <div className="reader-body-well">
            {/* Introduction */}
            {(() => {
              const intro = extractSection(book.finalBook, 'Introduction');
              if (!intro) return null;
              return (
                <div className="reader-chapter reader-section-intro" ref={introRef}>
                  <div className="reader-chapter-head">
                    <div className="reader-chapter-head-text">
                      <p className="reader-chapter-number">Introduction</p>
                      <h2 className="reader-chapter-title">Overview &amp; Foundations</h2>
                    </div>
                  </div>
                  <div
                    className="reader-chapter-body"
                    dangerouslySetInnerHTML={{ __html: renderMd(intro, book.edition) }}
                  />
                </div>
              );
            })()}

            {/* Chapters */}
            {(book.modules || []).map((mod, i) => (
              <div
                key={i}
                className={`reader-chapter edition-${book.edition || 'stellar'}`}
                ref={el => { chapterRefs.current[i] = el; }}
              >
                <div className="reader-chapter-head">
                  <span className="reader-chapter-ghost" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <div className="reader-chapter-head-text">
                    <p className="reader-chapter-number">Chapter {i + 1} of {book.modules?.length || 0}</p>
                    <h2 className="reader-chapter-title">{mod.title}</h2>
                  </div>
                  <div className="reader-chapter-actions">
                    <button
                      className={'reader-chapter-bookmark ' + (courseProgress.bookmarks.includes(i) ? 'is-bookmarked' : '')}
                      onClick={() => toggleChapterBookmark(i)}
                      aria-pressed={courseProgress.bookmarks.includes(i)}
                      aria-label={courseProgress.bookmarks.includes(i) ? 'Remove chapter bookmark' : 'Bookmark chapter'}
                      title={courseProgress.bookmarks.includes(i) ? 'Remove bookmark' : 'Bookmark chapter'}
                    >
                      <Bookmark size={13} />
                    </button>
                    <button
                      className={'reader-chapter-complete ' + (courseProgress.completedChapters.includes(i) ? 'is-complete' : '')}
                      onClick={() => toggleChapterComplete(i)}
                      aria-pressed={courseProgress.completedChapters.includes(i)}
                    >
                      <Check size={13} />
                      {courseProgress.completedChapters.includes(i) ? 'Completed' : 'Mark complete'}
                    </button>
                  </div>
                </div>
                <div
                  className="reader-chapter-body"
                  dangerouslySetInnerHTML={{ __html: renderMd(cleanChapterContent(mod.content, mod.title), book.edition) }}
                />
              </div>
            ))}

            {/* Summary */}
            {(() => {
              const summary = extractSection(book.finalBook, 'Summary');
              if (!summary) return null;
              return (
                <div className="reader-chapter reader-section-summary" ref={summaryRef}>
                  <div className="reader-chapter-head">
                    <span className="reader-chapter-ghost" aria-hidden="true">✓</span>
                    <div className="reader-chapter-head-text">
                      <p className="reader-chapter-number summary-num">Key Takeaways</p>
                      <h2 className="reader-chapter-title">Summary &amp; Next Steps</h2>
                    </div>
                  </div>
                  <div
                    className="reader-chapter-body"
                    dangerouslySetInnerHTML={{ __html: renderMd(summary, book.edition) }}
                  />
                </div>
              );
            })()}

            {/* Glossary */}
            {(() => {
              const glossary = extractSection(book.finalBook, 'Glossary');
              if (!glossary) return null;
              return (
                <div className="reader-chapter reader-section-glossary" ref={glossaryRef}>
                  <div className="reader-chapter-head">
                    <span className="reader-chapter-ghost" aria-hidden="true">§</span>
                    <div className="reader-chapter-head-text">
                      <p className="reader-chapter-number glossary-num">Reference</p>
                      <h2 className="reader-chapter-title">Glossary &amp; Terminology</h2>
                    </div>
                  </div>
                  <div
                    className="reader-chapter-body"
                    dangerouslySetInnerHTML={{ __html: renderMd(glossary, book.edition) }}
                  />
                </div>
              );
            })()}

            <section className="reader-completion-card" aria-label="Reading completion">
              <span className="reader-cta-eyebrow">{isCourseComplete ? 'Course complete' : 'Finish your reading'}</span>
              <h2>{isCourseComplete ? `You finished ${book.title}.` : `${completedChapterCount} of ${book.modules.length} chapters complete.`}</h2>
              <p>
                {isCourseComplete
                  ? 'Your chapter progress and notes are saved on this device. Celebrate the work, then choose what to learn next.'
                  : 'You are at the end of the book. Confirm your reading to unlock your completion certificate.'}
              </p>
              <div className="reader-completion-actions">
                {isCourseComplete ? (
                  <>
                    <button className="btn-primary" onClick={printCertificate}>
                      <Download size={13} /> Print certificate
                    </button>
                    <button className="btn-secondary" onClick={shareCompletion}>
                      <ExternalLink size={13} /> {copied ? 'Copied' : 'Share completion'}
                    </button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={completeAllChapters}>
                    <Check size={13} /> Complete all chapters &amp; unlock certificate
                  </button>
                )}
              </div>
            </section>

            {/* CTA at bottom */}
            <div className="reader-cta-box">
              <span className="reader-cta-eyebrow">Next up</span>
              <h3>Want a book made just for you?</h3>
              <p>
                Generate a fully custom book on any topic — your complexity level, your goals,
                your learning style. Free to try on Pustakam.
              </p>
              <div className="reader-cta-row">
                <a
                  href={generateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Generate on Pustakam
                </a>
                <Link to="/library" className="btn-secondary">
                  ← Browse More Books
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Back to top */}
      <button
        className={`reader-back-to-top ${showBackToTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={showBackToTop ? 0 : -1}
      >
        <ArrowUp size={16} />
      </button>

      {/* Footer */}
      <footer className="lv5-footer">
        <div className="lv5-footer__inner">
          <span className="lv5-footer__status">
            <span className="lv5-footer__dot" />
            Available for work
          </span>
          <span className="lv5-footer__copy">© {new Date().getFullYear()} Tanmay Kalbande</span>
          <div className="lv5-footer__socials">
            {socialLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="lv5-footer__social"
                aria-label={l.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className={l.icon} />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* About Project Modal */}
      <AboutModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
