import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import {
  ArrowLeft, Clock, FileText, BookOpen,
  Download, ExternalLink, Check
} from 'lucide-react';
import { socialLinks } from '../data/siteData';
import '../styles/library.css';

interface BookModule {
  title: string;
  content: string;
  wordCount: number;
}

interface BookFile {
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
  modules: BookModule[];
}

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';

// ── Minimal Markdown renderer using `marked` (already in deps) ──
function renderMd(md: string): string {
  return marked.parse(md, { breaks: true, gfm: true }) as string;
}

// ── PDF export using custom high-end CSS Print template (emulates pdfmake design) ───
function exportToPdf(book: BookFile) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const totalWords = book.wordCount.toLocaleString();

  // TOC list HTML
  const tocHtml = book.modules
    .map((mod, i) => `
      <div class="toc-item">
        <span class="toc-item-title">${i + 1}. ${mod.title}</span>
        <span class="toc-item-dots"></span>
        <span class="toc-item-page">${i + 3}</span>
      </div>
    `)
    .join('');

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

    /* ── Professional Cover Page ── */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      background-color: #0e0e10;
      color: #f0ede8;
      padding: 35mm 25mm 25mm 25mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    /* V5 texture simulation on print cover */
    .cover-page::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .cover-top {
      z-index: 2;
    }

    .cover-brand {
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #e05a35;
      margin-bottom: 24px;
    }

    .cover-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 44pt;
      font-weight: 700;
      line-height: 1.05;
      margin: 0 0 16px 0;
      color: #f0ede8;
      max-width: 580px;
    }

    .cover-title-italic {
      font-style: italic;
      font-weight: 600;
    }

    .cover-subtitle {
      font-family: 'Roboto Mono', monospace;
      font-size: 11pt;
      font-weight: 400;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #999999;
      margin-bottom: 32px;
      max-width: 500px;
    }

    .cover-accent-line {
      width: 60px;
      height: 3px;
      background-color: #e05a35;
      margin-bottom: 32px;
    }

    .cover-goal {
      font-size: 13pt;
      line-height: 1.7;
      color: #bbbbbb;
      max-width: 540px;
    }

    .cover-bottom {
      z-index: 2;
      border-top: 1px solid #333;
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      font-family: 'Roboto Mono', monospace;
      font-size: 8pt;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #666666;
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

  <!-- CHAPTER CONTENT -->
  ${chaptersHtml}
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
  const [copied, setCopied] = useState(false);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/library/books/${slug}.json`)
      .then(r => r.ok ? r.json() : Promise.reject('Book not found'))
      .then((data: BookFile) => {
        setBook(data);
        document.title = `${data.title} — Free Book`;
        // Set meta description
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', data.metaDescription);
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

  const scrollToChapter = (i: number) => {
    chapterRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePdf = () => {
    if (!book) return;
    setPdfLoading(true);
    setTimeout(() => {
      exportToPdf(book);
      setPdfLoading(false);
    }, 100);
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
        <div className="lib-nav-actions">
          <button
            className="btn-secondary"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={12} /> : null}
            {copied ? 'Copied' : 'Share'}
          </button>
          <button
            className="btn-secondary"
            onClick={handlePdf}
            disabled={pdfLoading}
          >
            <Download size={12} />
            {pdfLoading ? 'Preparing...' : 'PDF'}
          </button>
          <a
            href={generateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Generate My Version
          </a>
        </div>
      </nav>

      {/* Layout */}
      <div className="reader-layout">
        {/* TOC Sidebar */}
        <aside className="reader-toc">
          <h3>Contents</h3>
          {book.modules.map((mod, i) => (
            <button
              key={i}
              className={`reader-toc-item ${activeChapter === i ? 'active' : ''}`}
              onClick={() => scrollToChapter(i)}
            >
              {i + 1}. {mod.title}
            </button>
          ))}
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
              <span className="lib-tag" style={{ borderStyle: 'solid', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                {book.modelUsed?.includes('large') ? 'Edition L' : 'Edition S'}
              </span>
            </div>

            <h1 className="reader-title">{book.title}</h1>
            <p className="reader-goal">{book.goal}</p>

            <div className="reader-stats">
              <span className="reader-stat"><Clock size={12} /> {book.readingTimeMins} min read</span>
              <span className="reader-stat"><FileText size={12} /> {book.moduleCount} chapters</span>
              <span className="reader-stat"><BookOpen size={12} /> {book.wordCount.toLocaleString()} words</span>
            </div>

            <div className="reader-action-row">
              <button className="btn-secondary" onClick={handlePdf} disabled={pdfLoading}>
                <Download size={13} />
                {pdfLoading ? 'Preparing PDF...' : 'Download PDF'}
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

          {/* Chapters */}
          {book.modules.map((mod, i) => (
            <div
              key={i}
              className="reader-chapter"
              ref={el => { chapterRefs.current[i] = el; }}
            >
              <p className="reader-chapter-number">Chapter {i + 1}</p>
              <h2 className="reader-chapter-title">{mod.title}</h2>
              <div
                className="reader-chapter-body"
                dangerouslySetInnerHTML={{ __html: renderMd(mod.content) }}
              />
            </div>
          ))}

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
