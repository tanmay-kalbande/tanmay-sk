import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Clock, FileText, ArrowRight, Sparkles } from 'lucide-react';
import '../styles/library.css';

interface BookMeta {
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
}

interface LibraryIndex {
  total: number;
  lastUpdated: string;
  books: BookMeta[];
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  programming: '💻 Programming',
  'data-science': '📊 Data Science',
  ai: '🤖 AI / LLM',
  finance: '💰 Finance',
  business: '🚀 Business',
  exams: '📝 Exams',
  language: '🗣️ Language',
  health: '💪 Health',
  design: '🎨 Design',
};

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';

export default function LibraryPage() {
  const [index, setIndex] = useState<LibraryIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "landing-v5");
    document.title = 'Free Book Library — Tanmay Kalbande';
    
    const saved = window.localStorage.getItem("theme");
    const preferDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const t = preferDark ? "dark" : "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);

    fetch('/library/catalog.json')
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then((data: LibraryIndex) => { setIndex(data); setLoading(false); })
      .catch(() => {
        setError('Library is being built — check back soon!');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const categories = useMemo(() => {
    if (!index) return ['all'];
    const cats = Array.from(new Set(index.books.map(b => b.category)));
    return ['all', ...cats.sort()];
  }, [index]);

  const filtered = useMemo(() => {
    if (!index) return [];
    let books = index.books;
    if (activeCategory !== 'all') books = books.filter(b => b.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      books = books.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.goal.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q)) ||
        b.category.toLowerCase().includes(q)
      );
    }
    return books;
  }, [index, activeCategory, search]);

  return (
    <div className="lib-root">
      {/* Background decoration matching landing page */}
      <div className="lp-bg-wrapper">
        <div className="lp-grain"></div>
        <div className="lp-grid-original"></div>
        <div className="lp-orb lp-orb-a"></div>
        <div className="lp-orb lp-orb-b"></div>
        <div className="lp-orb lp-orb-c"></div>
      </div>

      {/* Nav */}
      <header className="lv5-nav" style={{ position: 'sticky', top: 0, backdropFilter: 'blur(8px)', background: 'rgba(14, 14, 16, 0.4)' }}>
        <div className="lv5-nav__brand">
          <Link to="/" className="lv5-nav__link" style={{ padding: '0.4rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            ← <span className="lv5-nav__initials">TK</span>
          </Link>
          <span className="lv5-nav__sep" aria-hidden="true">·</span>
          <span className="lv5-nav__descriptor">LIBRARY</span>
        </div>
        <nav className="lv5-nav__links">
          <a
            href={PUSTAKAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="lv5-nav__cta"
          >
            GENERATE YOUR OWN
          </a>
          <button
            className="lv5-nav__theme"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
            style={{ marginLeft: '0.5rem' }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <div className="lib-hero">
        <div className="lib-hero-badge">
          AI-GENERATED · FREE TO READ
        </div>
        <div className="lv5-nameblock" style={{ width: 'auto', display: 'inline-block', margin: '0 auto 1.5rem', textAlign: 'left' }}>
          <h1 className="lv5-name">
            <span className="lv5-name__first">FREE</span>
            <span className="lv5-name__last" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>LIBRARY</span>
          </h1>
          <div className="lv5-nameblock__rule" />
        </div>
        <p className="lib-hero-sub">
          Structured, chapter-by-chapter guides on programming, finance, exams, and more.
          Every book is 100% free. Want one on your exact topic? Generate it instantly on Pustakam.
        </p>

        {index && (
          <div className="lib-stats-row">
            <div className="lib-stat">
              <span className="lib-stat-num">{index.total.toLocaleString()}</span>
              <span className="lib-stat-label">Books</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat-num">{(index.total * 9).toLocaleString()}K+</span>
              <span className="lib-stat-label">Words</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat-num">{categories.length - 1}</span>
              <span className="lib-stat-label">Topics</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat-num">Free</span>
              <span className="lib-stat-label">Always</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="lib-controls">
        <div className="lib-search-wrap">
          <Search size={15} className="lib-search-icon" />
          <input
            className="lib-search"
            type="text"
            placeholder="Search books — try &quot;python&quot;, &quot;UPSC&quot;, &quot;stock market&quot;..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="lib-category-row">
          {categories.map(cat => (
            <button
              key={cat}
              className={`lib-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="lib-grid-wrap">
        {loading && (
          <div className="lib-loading">
            <div className="lib-spinner" />
            Loading library...
          </div>
        )}

        {error && !loading && (
          <div className="lib-empty">
            <BookOpen size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
            <h3>{error}</h3>
            <p style={{ marginTop: 8 }}>
              Meanwhile, you can{' '}
              <a href={PUSTAKAM_URL} style={{ color: 'var(--lib-accent)' }}>
                generate a custom book on Pustakam
              </a>
              .
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="lib-results-count">
              {filtered.length === index?.total
                ? `${filtered.length} books`
                : `${filtered.length} of ${index?.total} books`}
            </div>
            {filtered.length === 0 ? (
              <div className="lib-empty">
                <Search size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                <h3>No books found for "{search}"</h3>
                <p style={{ marginTop: 8 }}>
                  <a href={PUSTAKAM_URL} style={{ color: 'var(--lib-accent)' }}>
                    Generate this exact book on Pustakam →
                  </a>
                </p>
              </div>
            ) : (
              <div className="lib-grid">
                {filtered.map(book => (
                  <Link
                    key={book.slug}
                    to={`/library/book/${book.slug}`}
                    className="lib-card"
                  >
                    <div className="lib-card-top">
                      <p className="lib-card-title">{book.title}</p>
                      <span className={`lib-card-complexity ${book.complexity}`}>
                        {book.complexity}
                      </span>
                    </div>
                    <div className="lib-card-meta">
                      <span><Clock size={11} /> {book.readingTimeMins} min</span>
                      <span><FileText size={11} /> {book.moduleCount} chapters</span>
                      <span>{(book.wordCount / 1000).toFixed(1)}K words</span>
                    </div>
                    <div className="lib-card-tags">
                      {book.tags.slice(0, 3).map(t => (
                        <span key={t} className="lib-tag">{t}</span>
                      ))}
                    </div>
                    <div className="lib-card-cta">
                      Read now <ArrowRight size={12} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
