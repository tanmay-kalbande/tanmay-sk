import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, FileText, ArrowRight } from 'lucide-react';
import { socialLinks } from '../data/siteData';
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
  modelUsed?: string;
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
  ai: 'AI & LLM',
  finance: 'Finance',
  business: 'Business',
  exams: 'Exams',
  language: 'Language',
  health: 'Health',
  design: 'Design',
};

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';

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

  // Compute category list with book counts
  const categoriesWithCounts = useMemo(() => {
    if (!index) return [{ id: 'all', label: 'All', count: 0 }];
    
    const counts: Record<string, number> = { all: index.books.length };
    index.books.forEach(b => {
      counts[b.category] = (counts[b.category] || 0) + 1;
    });

    const list = Object.keys(counts)
      .filter(c => c === 'all' || counts[c] > 0)
      .map(c => ({
        id: c,
        label: CATEGORY_LABELS[c] ?? c,
        count: counts[c]
      }));

    // Sort categories (keeping 'all' at the top)
    const allItem = list.find(item => item.id === 'all')!;
    const sortedOthers = list
      .filter(item => item.id !== 'all')
      .sort((a, b) => a.label.localeCompare(b.label));

    return [allItem, ...sortedOthers];
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

  const isFilterActive = useMemo(() => {
    return search.trim() !== '' || activeCategory !== 'all';
  }, [search, activeCategory]);

  const handleResetFilters = () => {
    setSearch('');
    setActiveCategory('all');
  };

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

      {/* Main Split Layout */}
      <div className="lib-layout">
        {/* Left Sidebar */}
        <aside className="lib-sidebar">
          <div className="lib-sidebar-section">
            <h3>Search Library</h3>
            <div className="lib-search-wrap">
              <Search size={14} className="lib-search-icon" />
              <input
                className="lib-search"
                type="text"
                placeholder="Find a topic..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="lib-sidebar-section">
            <h3>Categories</h3>
            <div className="lib-category-list">
              {categoriesWithCounts.map(cat => (
                <button
                  key={cat.id}
                  className={`lib-sidebar-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span>{cat.label}</span>
                  {index && <span className="lib-sidebar-cat-count">{cat.count}</span>}
                </button>
              ))}
            </div>
          </div>

          {index && (
            <div className="lib-sidebar-section">
              <h3>Status</h3>
              <div className="lib-sidebar-stats">
                <div className="lib-sidebar-stat-item">
                  <span className="lib-sidebar-stat-label">Books</span>
                  <span className="lib-sidebar-stat-value">{index.total}</span>
                </div>
                <div className="lib-sidebar-stat-item">
                  <span className="lib-sidebar-stat-label">Words</span>
                  <span className="lib-sidebar-stat-value">{(index.total * 9).toLocaleString()}K+</span>
                </div>
                <div className="lib-sidebar-stat-item">
                  <span className="lib-sidebar-stat-label">Access</span>
                  <span className="lib-sidebar-stat-value">Free</span>
                </div>
              </div>
            </div>
          )}

          <div className="lib-sidebar-cta">
            <a
              href={PUSTAKAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Generate Custom
            </a>
          </div>
        </aside>

        {/* Right Main Grid */}
        <main className="lib-main">
          {/* Collapsible Hero Block */}
          <div className={`lib-hero ${isFilterActive ? 'collapsed' : ''}`}>
            <div className="lib-hero-badge">
              Open-Access · Free to Read
            </div>
            <h1>
              <span className="first-name">A Curated Library of</span><br />
              <span className="accent">Structured</span><br />
              Learning Guides
            </h1>
            <p className="lib-hero-sub">
              Structured, chapter-by-chapter roadmaps on programming, finance, exams, and more.
              Every curriculum is free to read. Build a custom version on your exact topic with Pustakam.
            </p>
          </div>

          {/* Active Filter Header */}
          {isFilterActive && (
            <div className="lib-active-header">
              <h2>
                {activeCategory !== 'all' ? CATEGORY_LABELS[activeCategory] : 'All Books'}
                {search.trim() ? ` matching "${search}"` : ''}
              </h2>
              <button onClick={handleResetFilters} className="lib-reset-btn">
                Clear Filters ×
              </button>
            </div>
          )}

          {/* Grid Area */}
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
                      <button onClick={handleResetFilters} className="lib-reset-btn" style={{ fontSize: '0.65rem' }}>
                        Reset filters
                      </button>
                      {' or '}
                      <a href={PUSTAKAM_URL} target="_blank" rel="noopener noreferrer">
                        Generate this book on Pustakam →
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
                          <span className="lib-tag" style={{ borderStyle: 'solid', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                            {(book.modelUsed?.includes('large') || book.modelUsed?.includes('glm')) ? 'Edition L' : 'Edition S'}
                          </span>
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
