import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import {
  ArrowLeft, Clock, FileText, BookOpen,
  Download, ExternalLink, Check
} from 'lucide-react';
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
  generatedAt: string;
  modules: BookModule[];
}

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';
const LINKEDIN_URL = 'https://www.linkedin.com/in/tanmay-kalbande';

// ── Minimal Markdown renderer using `marked` (already in deps) ──
function renderMd(md: string): string {
  return marked.parse(md, { breaks: true, gfm: true }) as string;
}

// ── Premium PDF export with cover page ───
function exportToPdf(book: BookFile) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const generatedDate = new Date(book.generatedAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const tocHtml = book.modules
    .map((mod, i) => `<div class="toc-item"><span class="toc-num">${String(i + 1).padStart(2, '0')}</span><span class="toc-title">${mod.title}</span></div>`)
    .join('');

  const chaptersHtml = book.modules
    .map((mod, i) => `
      <div class="chapter" style="page-break-before: always;">
        <p class="ch-num">Chapter ${String(i + 1).padStart(2, '0')}</p>
        <h2>${mod.title}</h2>
        <div class="ch-body">${renderMd(mod.content)}</div>
      </div>
    `)
    .join('');

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${book.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Roboto+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { margin: 2cm 2.5cm; size: A4; }
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 100%; margin: 0; padding: 0; color: #1a1a1a; line-height: 1.7; font-size: 14px; }

    /* ── Cover Page ── */
    .cover { display: flex; flex-direction: column; justify-content: center; min-height: 90vh; padding: 60px 0; page-break-after: always; }
    .cover-badge { font-family: 'Roboto Mono', monospace; font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: #999; border: 1px dashed #ccc; padding: 4px 12px; display: inline-block; margin-bottom: 32px; }
    .cover h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 42px; font-weight: 700; line-height: 1.05; margin: 0 0 16px; color: #111; letter-spacing: -0.02em; }
    .cover-accent { color: #e05a35; }
    .cover-goal { font-family: 'Roboto Mono', monospace; font-size: 11px; color: #666; letter-spacing: 0.02em; line-height: 1.6; margin: 0 0 40px; max-width: 480px; }
    .cover-meta { font-family: 'Roboto Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; display: flex; gap: 24px; margin-bottom: 48px; }
    .cover-divider { border: none; border-top: 2px solid #e05a35; width: 48px; margin: 0 0 32px; }
    .cover-brand { font-family: 'Roboto Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: #bbb; }
    .cover-brand a { color: #e05a35; text-decoration: none; }

    /* ── Table of Contents ── */
    .toc-page { page-break-after: always; padding: 40px 0; }
    .toc-page h2 { font-family: 'Roboto Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #999; margin: 0 0 24px; }
    .toc-item { display: flex; align-items: baseline; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .toc-num { font-family: 'Roboto Mono', monospace; font-size: 10px; font-weight: 700; color: #e05a35; min-width: 24px; }
    .toc-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 16px; font-weight: 600; color: #333; }

    /* ── Chapters ── */
    .chapter { margin-bottom: 48px; }
    .ch-num { font-family: 'Roboto Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #e05a35; margin: 0 0 6px; font-weight: 700; }
    h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 700; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid #eee; line-height: 1.15; color: #111; }
    h3 { font-family: 'Roboto Mono', monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #333; margin: 28px 0 12px; }
    h4 { font-family: 'Roboto Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: #666; margin: 20px 0 10px; }
    p { margin: 0 0 14px; color: #333; }
    ul, ol { padding-left: 20px; margin: 0 0 14px; }
    li { margin-bottom: 6px; color: #333; }
    strong { font-weight: 600; color: #111; }
    code { background: #f5f5f3; padding: 2px 5px; border-radius: 2px; font-size: 12px; font-family: 'Roboto Mono', monospace; color: #c8451a; }
    pre { background: #f5f5f3; padding: 16px; border-radius: 2px; overflow-x: auto; border: 1px solid #e8e8e6; }
    pre code { padding: 0; background: none; color: #333; font-size: 12px; line-height: 1.6; }
    hr { border: none; border-top: 1px dashed #ccc; margin: 40px 0; }
    blockquote { border-left: 3px solid #e05a35; padding: 10px 20px; margin: 16px 0; background: #fdf6f4; }
    blockquote p { margin: 0; font-style: italic; color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th, td { padding: 8px 12px; text-align: left; border: 1px solid #e8e8e6; }
    th { background: #f5f5f3; font-family: 'Roboto Mono', monospace; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; color: #666; }

    /* ── Footer ── */
    .pdf-footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; }
    .pdf-footer p { font-family: 'Roboto Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin: 0 0 4px; }
    .pdf-footer a { color: #e05a35; text-decoration: none; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <span class="cover-badge">Pustakam AI · Free Book</span>
    <h1>${book.title.replace(/AI-/g, '<span class="cover-accent">AI</span>-').replace(/AI /g, '<span class="cover-accent">AI</span> ')}</h1>
    <p class="cover-goal">${book.goal}</p>
    <div class="cover-meta">
      <span>${book.wordCount.toLocaleString()} words</span>
      <span>${book.readingTimeMins} min read</span>
      <span>${book.moduleCount} chapters</span>
      <span>${book.complexity}</span>
    </div>
    <hr class="cover-divider">
    <p class="cover-brand">Generated by <a href="https://pustakam.tanmaysk.in">Pustakam AI</a> · ${generatedDate}</p>
  </div>

  <!-- Table of Contents -->
  <div class="toc-page">
    <h2>Table of Contents</h2>
    ${tocHtml}
  </div>

  <!-- Chapters -->
  ${chaptersHtml}

  <!-- Footer -->
  <div class="pdf-footer">
    <p>Generated by <a href="https://pustakam.tanmaysk.in">Pustakam AI</a></p>
    <p>Built by <a href="https://www.linkedin.com/in/tanmay-kalbande">Tanmay Kalbande</a></p>
  </div>
</body>
</html>`);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 600);
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
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', data.metaDescription);
        setLoading(false);
      })
      .catch(() => {
        setError('This book could not be found.');
        setLoading(false);
      });
  }, [slug]);

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
          <button className="btn-secondary" onClick={handleCopyLink}>
            {copied ? <Check size={12} /> : null}
            {copied ? 'Copied' : 'Share'}
          </button>
          <button className="btn-secondary" onClick={handlePdf} disabled={pdfLoading}>
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
              <p className="reader-chapter-number">Chapter {String(i + 1).padStart(2, '0')}</p>
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

          {/* Footer */}
          <footer className="lib-footer reader-footer">
            <div className="lib-footer-inner">
              <div className="lib-footer-left">
                <span className="lib-footer-dot" />
                <span>Built by Tanmay Kalbande</span>
              </div>
              <div className="lib-footer-links">
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <span className="lib-footer-sep">·</span>
                <a href="https://github.com/tanmay-kalbande" target="_blank" rel="noopener noreferrer">GitHub</a>
                <span className="lib-footer-sep">·</span>
                <Link to="/">Portfolio</Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
