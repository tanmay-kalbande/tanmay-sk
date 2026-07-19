import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';

import {
  ArrowLeft, Clock, FileText, BookOpen,
  Download, ExternalLink, Check, Calendar, Sun, Moon
} from 'lucide-react';
import { socialLinks } from '../data/siteData';
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
 * Looks for ## SectionName and captures until the next ## heading or end of string.
 */
function extractSection(finalBook: string | undefined, sectionName: string): string | null {
  if (!finalBook) return null;
  const regex = new RegExp(`## ${sectionName}\\s*\n([\\s\\S]*?)(?=\n## |$)`, 'i');
  const match = finalBook.match(regex);
  if (!match || !match[1]) return null;
  const content = match[1].trim();
  // Skip if too short (likely empty or just a placeholder)
  return content.length > 50 ? content : null;
}

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';

// ── Section heading badge maps per edition (covers both old and new prompt patterns) ──
const STREET_SECTION_BADGES: Record<string, string> = {
  // New Pustakam-aligned patterns
  'Core Carnage':   'badge-street-1',
  'Street Smarts':  'badge-street-2',
  'Fight Club':     'badge-street-3',
  'Victory Lap':    'badge-street-4',
  // Old portfolio patterns (still in existing books)
  'Street-level Application': 'badge-street-2',
  'Key Takeaways':  'badge-takeaway',
  'Practice':       'badge-practice',
};

const DESI_SECTION_BADGES: Record<string, string> = {
  // New Pustakam-aligned patterns
  'Victory Lap':    'badge-desi-4',
  // Old portfolio patterns
  'Asli Funda':               'badge-desi-1',
  'Practical Scene':          'badge-desi-2',
  'Key Takeaways':            'badge-takeaway',
  'Practice':                 'badge-practice',
};

const STELLAR_SECTION_BADGES: Record<string, string> = {
  'Key Takeaways':  'badge-takeaway',
  'Practice':       'badge-practice',
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

// ── Enhanced Markdown renderer with callout detection & mermaid prep ──
function renderMd(md: string, edition?: string): string {
  // Preprocess to clean up nested headings like "### **### Heading**" or "### ### Heading"
  const cleanedMd = md.replace(/^(\s*#{1,6}\s+)(?:\*\*\s*)?#{1,6}\s*(.*?)(?:\s*\*\*\s*)?\r?$/gm, '$1$2');
  let html = marked.parse(cleanedMd, { breaks: true, gfm: true }) as string;

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
      `<div class="mermaid-block"><pre class="mermaid">${code.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')}</pre></div>`
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
        <div class="chapter-body">${renderMd(mod.content)}</div>
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
  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const introRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const glossaryRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (window.localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };



  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/library/books/${slug}.json`)
      .then(r => r.ok ? r.json() : Promise.reject('Book not found'))
      .then((data: BookFile) => {
        setBook(data);
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
      try { document.head.removeChild(script); } catch {}
    };
  }, [activeChapter, book]);

  const scrollToChapter = (i: number) => {
    chapterRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
    <div className="reader-root">
      {/* Nav */}
      <nav className="lib-nav">
        <Link to="/library" className="lib-nav-back">
          <ArrowLeft size={12} /> Library
        </Link>
        <div className="lib-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              marginRight: '4px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-2)'}
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
        <aside className={`reader-toc ${tocOpen ? 'open' : ''}`}>
          <div className="reader-toc-header" onClick={() => setTocOpen(!tocOpen)}>
            <h3>Contents</h3>
            <span className="reader-toc-toggle-icon">{tocOpen ? '−' : '+'}</span>
          </div>
          <div className="reader-toc-list">
            {extractSection(book.finalBook, 'Introduction') && (
              <button
                className={`reader-toc-item ${activeChapter === -1 ? 'active' : ''}`}
                onClick={() => {
                  introRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setTocOpen(false);
                }}
              >
                Introduction
              </button>
            )}
            {book.modules.map((mod, i) => (
              <button
                key={i}
                className={`reader-toc-item ${activeChapter === i ? 'active' : ''}`}
                onClick={() => {
                  scrollToChapter(i);
                  setTocOpen(false);
                }}
              >
                {i + 1}. {mod.title}
              </button>
            ))}
            {extractSection(book.finalBook, 'Summary') && (
              <button
                className="reader-toc-item"
                onClick={() => {
                  summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setTocOpen(false);
                }}
              >
                Summary
              </button>
            )}
            {extractSection(book.finalBook, 'Glossary') && (
              <button
                className="reader-toc-item"
                onClick={() => {
                  glossaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setTocOpen(false);
                }}
              >
                Glossary
              </button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="reader-main">
          {/* Book Header */}
          <div className="reader-header">
            <div className="reader-header-meta">
              <span className={`reader-complexity ${book.complexity}`}>{book.complexity}</span>
              <span className="reader-category">{book.category}</span>
              {book.tags.slice(0, 2).map(t => (
                <span key={t} className="lib-tag">{t}</span>
              ))}
              <span className="lib-tag" style={{ borderStyle: 'solid', borderColor: book.edition === 'street' ? '#ff5722' : book.edition === 'desi' ? '#ff9800' : 'var(--accent)', color: book.edition === 'street' ? '#ff5722' : book.edition === 'desi' ? '#ff9800' : 'var(--accent)' }}>
                {book.edition === 'street' ? '🔥 Street Edition' : book.edition === 'desi' ? '🇮🇳 Desi Edition' : '✨ Stellar Edition'}
              </span>
              {book.modelUsed && (
                <span className="lib-tag model-tag">
                  🤖 {book.modelUsed}
                </span>
              )}
            </div>

            <h1 className="reader-title">{book.title}</h1>
            <p className="reader-goal">{book.goal}</p>

            <div className="reader-stats">
              <span className="reader-stat"><Clock size={12} /> {book.readingTimeMins} min read</span>
              <span className="reader-stat"><FileText size={12} /> {book.moduleCount} chapters</span>
              <span className="reader-stat"><BookOpen size={12} /> {book.wordCount.toLocaleString()} words</span>
              {book.generatedAt && (
                <span className="reader-stat"><Calendar size={12} /> {formatGeneratedDate(book.generatedAt)}</span>
              )}
            </div>

            <div className="reader-action-row">
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
          </div>

          {/* Introduction */}
          {(() => {
            const intro = extractSection(book.finalBook, 'Introduction');
            if (!intro) return null;
            return (
              <div className="reader-chapter reader-section-intro" ref={introRef}>
                <p className="reader-chapter-number">Introduction</p>
                <div
                  className="reader-chapter-body"
                  dangerouslySetInnerHTML={{ __html: renderMd(intro, book.edition) }}
                />
              </div>
            );
          })()}

          {/* Chapters */}
          {book.modules.map((mod, i) => (
            <div
              key={i}
              className={`reader-chapter edition-${book.edition || 'stellar'}`}
              ref={el => { chapterRefs.current[i] = el; }}
            >
              <p className="reader-chapter-number">Chapter {i + 1}</p>
              <h2 className="reader-chapter-title">{mod.title}</h2>
              <div
                className="reader-chapter-body"
                dangerouslySetInnerHTML={{ __html: renderMd(mod.content, book.edition) }}
              />
            </div>
          ))}

          {/* Summary */}
          {(() => {
            const summary = extractSection(book.finalBook, 'Summary');
            if (!summary) return null;
            return (
              <div className="reader-chapter reader-section-summary" ref={summaryRef}>
                <p className="reader-chapter-number">Summary</p>
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
                <p className="reader-chapter-number">Glossary</p>
                <div
                  className="reader-chapter-body"
                  dangerouslySetInnerHTML={{ __html: renderMd(glossary, book.edition) }}
                />
              </div>
            );
          })()}

          {/* CTA at bottom */}
          <div className="reader-cta-box">
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
        </main>
      </div>

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
    </div>
  );
}
