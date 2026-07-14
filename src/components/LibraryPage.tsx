import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, FileText, ArrowRight } from 'lucide-react';
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
  programming: 'Programming',
  'data-science': 'Data Science',
  ai: 'AI / LLM',
  finance: 'Finance',
  business: 'Business',
  exams: 'Exams',
  language: 'Language',
  health: 'Health',
  design: 'Design',
};

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';
const LINKEDIN_URL = 'https://www.linkedin.com/in/tanmay-kalbande';

export default function LibraryPage() {
  const [index, setIndex] = useState<LibraryIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    document.title = 'Free Book Library — Tanmay Kalbande';
    fetch('/library/catalog.json')
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then((data: LibraryIndex) => { setIndex(data); setLoading(false); })
      .catch(() => {
        setError('Library is being built — check back soon!');
        setLoading(false);
      });
  }, []);

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

  const totalWords = useMemo(() => {
    if (!index) return 0;
    return index.books.reduce((sum, b) => sum + b.wordCount, 0);
  }, [index]);

  return (
    <div className="lib-root">
      {/* Nav */}
      <nav className="lib-nav">
        <Link to="/" className="lib-nav-back">
          ← tanmaysk.in
        </Link>
        <Link to="/library" className="lib-nav-brand">
          <span>Free Library</span>
        </Link>
        <a
          href={PUSTAKAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Generate Your Own
        </a>
      </nav>

      {/* Hero */}
      <div className="lib-hero">
        <div className="lib-hero-badge">
          AI-Generated · Free to Read
        </div>
        <h1>
          <span className="first-name">A Free Library of</span><br />
          <span className="accent">AI-Generated</span><br />
          Learning Books
        </h1>
        <p className="lib-hero-sub">
          Structured, chapter-by-chapter guides on programming, finance, exams, and more.
          Every book is free to read. Want one on your exact topic? Generate it on Pustakam.
        </p>

        {index && (
          <div className="lib-stats-row">
            <div className="lib-stat">
              <span className="lib-stat-num">{index.total.toLocaleString()}</span>
              <span className="lib-stat-label">Books</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat-num">{Math.round(totalWords / 1000).toLocaleString()}K+</span>
              <span className="lib-stat-label">Words</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat-num">{categories.length - 1}</span>
              <span className="lib-stat-label">{categories.length - 1 === 1 ? 'Topic' : 'Topics'}</span>
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
          <Search size={14} className="lib-search-icon" />
          <input
            className="lib-search"
            type="text"
            placeholder='Search books — try "python", "UPSC", "stock market"...'
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
            <h3>{error}</h3>
            <p>
              Meanwhile, you can{' '}
              <a href={PUSTAKAM_URL}>
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
                <h3>No books found for "{search}"</h3>
                <p>
                  <a href={PUSTAKAM_URL}>
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
                      <span><Clock size={10} /> {book.readingTimeMins} min</span>
                      <span><FileText size={10} /> {book.moduleCount} ch</span>
                      <span>{(book.wordCount / 1000).toFixed(1)}K words</span>
                    </div>
                    <div className="lib-card-tags">
                      {book.tags.slice(0, 3).map(t => (
                        <span key={t} className="lib-tag">{t}</span>
                      ))}
                    </div>
                    <div className="lib-card-cta">
                      Read now <ArrowRight size={11} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="lib-footer">
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
            <span className="lib-footer-sep">·</span>
            <a href={PUSTAKAM_URL} target="_blank" rel="noopener noreferrer">Pustakam</a>
          </div>
          <div className="lib-footer-right">
            © {new Date().getFullYear()} Tanmay Kalbande
          </div>
        </div>
      </footer>
    </div>
  );
}
