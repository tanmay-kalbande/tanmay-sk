import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, FileText, ArrowRight, Calendar, Sun, Moon } from 'lucide-react';
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
  edition?: 'stellar' | 'street' | 'desi';
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
  const [activeEdition, setActiveEdition] = useState<'all' | 'stellar' | 'street' | 'desi'>('all');
  const [showAllCategories, setShowAllCategories] = useState(false);
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

  const formatGeneratedDate = (dateStr?: string) => {
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
  };

  useEffect(() => {
    document.title = 'Free Book Library — Tanmay Kalbande';
    fetch('https://raw.githubusercontent.com/tanmay-kalbande/pustakam-books/main/catalog.json')
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

    // Keep 'all' at the top, sort others by book count descending (for top 5)
    const allItem = list.find(item => item.id === 'all')!;
    const sortedOthers = list
      .filter(item => item.id !== 'all')
      .sort((a, b) => b.count - a.count);

    return [allItem, ...sortedOthers];
  }, [index]);

  const top3Categories = useMemo(() => {
    return categoriesWithCounts.slice(1, 4);
  }, [categoriesWithCounts]);

  const remainingCategories = useMemo(() => {
    return categoriesWithCounts.slice(4);
  }, [categoriesWithCounts]);

  const filtered = useMemo(() => {
    if (!index) return [];
    let books = index.books;
    if (activeCategory !== 'all') books = books.filter(b => b.category === activeCategory);
    if (activeEdition !== 'all') books = books.filter(b => (b.edition || 'stellar') === activeEdition);
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
  }, [index, activeCategory, activeEdition, search]);

  const isFilterActive = useMemo(() => {
    return search.trim() !== '' || activeCategory !== 'all' || activeEdition !== 'all';
  }, [search, activeCategory, activeEdition]);

  const handleResetFilters = () => {
    setSearch('');
    setActiveCategory('all');
    setActiveEdition('all');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-2)'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a
            href={PUSTAKAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Generate Your Own
          </a>
        </div>
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
            <h3>Editions</h3>
            <div className="lib-edition-filter">
              <button 
                className={`lib-edition-btn ${activeEdition === 'all' ? 'active' : ''}`}
                onClick={() => setActiveEdition('all')}
              >
                All
              </button>
              <button 
                className={`lib-edition-btn ${activeEdition === 'stellar' ? 'active' : ''}`}
                onClick={() => setActiveEdition('stellar')}
              >
                ✨ Stellar
              </button>
              <button 
                className={`lib-edition-btn ${activeEdition === 'street' ? 'active' : ''}`}
                onClick={() => setActiveEdition('street')}
              >
                🔥 Street
              </button>
              <button 
                className={`lib-edition-btn ${activeEdition === 'desi' ? 'active' : ''}`}
                onClick={() => setActiveEdition('desi')}
              >
                🇮🇳 Desi
              </button>
            </div>
          </div>

          <div className="lib-sidebar-section">
            <h3>Categories</h3>
            <div className="lib-category-list">
              {/* Always show "All" first */}
              {categoriesWithCounts.slice(0, 1).map(cat => (
                <button
                  key={cat.id}
                  className={`lib-sidebar-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span>{cat.label}</span>
                  {index && <span className="lib-sidebar-cat-count">{cat.count}</span>}
                </button>
              ))}

              {/* Show top 3 sorted categories */}
              {top3Categories.map(cat => (
                <button
                  key={cat.id}
                  className={`lib-sidebar-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span>{cat.label}</span>
                  {index && <span className="lib-sidebar-cat-count">{cat.count}</span>}
                </button>
              ))}

              {/* Show the rest if expanded */}
              {showAllCategories && remainingCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`lib-sidebar-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span>{cat.label}</span>
                  {index && <span className="lib-sidebar-cat-count">{cat.count}</span>}
                </button>
              ))}

              {remainingCategories.length > 0 && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'var(--f-mono)',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--accent)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginTop: '8px',
                    opacity: 0.85
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
                >
                  {showAllCategories ? '← Show Less' : `+ ${remainingCategories.length} More Categories`}
                </button>
              )}
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
                  {(() => {
                    const totalWords = index.books.reduce((sum, b) => sum + (b.wordCount || 0), 0);
                    if (totalWords >= 1000000) {
                      return <span className="lib-sidebar-stat-value">{(totalWords / 1000000).toFixed(1)}M+</span>;
                    }
                    return <span className="lib-sidebar-stat-value">{Math.round(totalWords / 1000).toLocaleString()}K+</span>;
                  })()}
                </div>
                <div className="lib-sidebar-stat-item">
                  <span className="lib-sidebar-stat-label">Access</span>
                  <span className="lib-sidebar-stat-value">Free</span>
                </div>
              </div>
            </div>
          )}

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
            <div className="lib-hero-rule" />
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
                          {book.generatedAt && (
                            <span className="lib-card-date" style={{ opacity: 0.65, fontSize: '0.62rem' }}>
                              <Calendar size={9} /> {formatGeneratedDate(book.generatedAt)}
                            </span>
                          )}
                        </div>
                        <div className="lib-card-tags">
                          {book.tags.slice(0, 3).map(t => (
                            <span key={t} className="lib-tag">{t}</span>
                          ))}
                          <span className="lib-tag" style={{ borderStyle: 'solid', borderColor: book.edition === 'street' ? '#ff5722' : book.edition === 'desi' ? '#ff9800' : 'var(--accent)', color: book.edition === 'street' ? '#ff5722' : book.edition === 'desi' ? '#ff9800' : 'var(--accent)' }}>
                            {book.edition === 'street' ? '🔥 Street' : book.edition === 'desi' ? '🇮🇳 Desi' : '✨ Stellar'}
                          </span>
                          {book.modelUsed && (
                            <span className="lib-tag model-tag" style={{ borderStyle: 'solid', borderColor: 'var(--ink-3)', color: 'var(--ink-2)', opacity: 0.8 }}>
                              🤖 {book.modelUsed}
                            </span>
                          )}
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
