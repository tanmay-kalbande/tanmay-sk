import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, FileText, ArrowRight, Calendar, Sun, Moon, Info, X } from 'lucide-react';
import { socialLinks } from '../data/siteData';
import { setFavicon } from '../utils/setFavicon';
import { AboutModal } from './AboutModal';
import '../styles/landing.css';
import '../styles/library.css';

type SortMode = 'newest' | 'longest' | 'chapters';
const BOOKS_PER_PAGE = 20;

function isNewBook(generatedAt?: string): boolean {
  if (!generatedAt) return false;
  const diff = Date.now() - new Date(generatedAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
}

function SkeletonGrid() {
  return (
    <div className="lib-skeleton-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="lib-skeleton-card">
          <div className="lib-skeleton-line title" />
          <div className="lib-skeleton-line meta" />
          <div className="lib-skeleton-line tags" />
          <div className="lib-skeleton-line cta" />
        </div>
      ))}
    </div>
  );
}

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

const KNOWN_LABELS: Record<string, string> = {
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
  career: 'Career',
  productivity: 'Productivity',
  science: 'Science',
  cooking: 'Cooking',
  music: 'Music',
  photography: 'Photography',
  psychology: 'Psychology',
  parenting: 'Parenting',
  travel: 'Travel',
  gaming: 'Gaming',
};

// Auto-generate label for any category the AI invents
function getCategoryLabel(slug: string): string {
  return KNOWN_LABELS[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';

export default function LibraryPage() {
  const [index, setIndex] = useState<LibraryIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeEdition, setActiveEdition] = useState<'all' | 'stellar' | 'street' | 'desi'>('all');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [visibleCount, setVisibleCount] = useState(BOOKS_PER_PAGE);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (window.localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    setFavicon('/favicon_final.svg');
    document.documentElement.removeAttribute('data-app-page');
    document.body.style.overflow = '';
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BOOKS_PER_PAGE);
  }, [activeCategory, activeEdition, search, sortMode]);

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
        label: getCategoryLabel(c),
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
    let books = [...index.books];
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
    // Sort
    if (sortMode === 'newest') {
      books.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    } else if (sortMode === 'longest') {
      books.sort((a, b) => b.wordCount - a.wordCount);
    } else if (sortMode === 'chapters') {
      books.sort((a, b) => b.moduleCount - a.moduleCount);
    }
    return books;
  }, [index, activeCategory, activeEdition, search, sortMode]);

  const visibleBooks = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

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
      {/* Background — grain + orbs identical to landing */}
      <div className="lp-bg-wrapper">
        <div className="lp-grain"></div>
        <div className="lp-orb lp-orb-a"></div>
        <div className="lp-orb lp-orb-b"></div>
        <div className="lp-orb lp-orb-c"></div>
      </div>

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
            className="info-toggle-btn"
            onClick={() => setInfoOpen(true)}
            aria-label="About this project"
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
            title="About Free Library"
          >
            <Info size={15} />
          </button>
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
        <aside className={`lib-sidebar ${showAllCategories ? 'expanded' : ''}`}>
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
                {activeCategory !== 'all' ? getCategoryLabel(activeCategory) : 'All Books'}
                {search.trim() ? ` matching "${search}"` : ''}
              </h2>
              <button onClick={handleResetFilters} className="lib-reset-btn">
                Clear Filters ×
              </button>
            </div>
          )}

          {/* Grid Area */}
          <div className="lib-grid-wrap">
            {loading && <SkeletonGrid />}

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
                <div className="lib-sort-controls">
                  <div className="lib-results-count" style={{ marginBottom: 0 }}>
                    {filtered.length === index?.total
                      ? `${filtered.length} books`
                      : `${filtered.length} of ${index?.total} books`}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="lib-sort-label">Sort</span>
                    <select
                      className="lib-sort-select"
                      value={sortMode}
                      onChange={e => setSortMode(e.target.value as SortMode)}
                    >
                      <option value="newest">Newest First</option>
                      <option value="longest">Longest Read</option>
                      <option value="chapters">Most Chapters</option>
                    </select>
                  </div>
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
                  <>
                  <div className="lib-grid">
                    {visibleBooks.map(book => (
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
                          {book.modelUsed && (() => {
                            const m = book.modelUsed.toLowerCase();
                            let iconComponent = null;
                            if (m.includes('gemma')) {
                              iconComponent = (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                                  <defs>
                                    <linearGradient id="gemmaGradCard" x1="24%" y1="75%" x2="75%" y2="25%">
                                      <stop offset="0%" stopColor="#446EFF" />
                                      <stop offset="36.6%" stopColor="#2E96FF" />
                                      <stop offset="83.2%" stopColor="#B1C5FF" />
                                    </linearGradient>
                                  </defs>
                                  <path fill="url(#gemmaGradCard)" fillRule="evenodd" d="M12.34 5.953a8.233 8.233 0 01-.247-1.125V3.72a8.25 8.25 0 015.562 2.232H12.34zm-.69 0c.113-.373.199-.755.257-1.145V3.72a8.25 8.25 0 00-5.562 2.232h5.304zm-5.433.187h5.373a7.98 7.98 0 01-.267.696 8.41 8.41 0 01-1.76 2.65L6.216 6.14zm-.264-.187H2.977v.187h2.915a8.436 8.436 0 00-2.357 5.767H0v.186h3.535a8.436 8.436 0 002.357 5.767H2.977v.186h2.976v2.977h.187v-2.915a8.436 8.436 0 005.767 2.357V24h.186v-3.535a8.436 8.436 0 005.767-2.357v2.915h.186v-2.977h2.977v-.186h-2.915a8.436 8.436 0 002.357-5.767H24v-.186h-3.535a8.436 8.436 0 00-2.357-5.767h2.915v-.187h-2.977V2.977h-.186v2.915a8.436 8.436 0 00-5.767-2.357V0h-.186v3.535A8.436 8.436 0 006.14 5.892V2.977h-.187v2.976zm6.14 14.326a8.25 8.25 0 005.562-2.233H12.34c-.108.367-.19.743-.247 1.126v1.107zm-.186-1.087a8.015 8.015 0 00-.258-1.146H6.345a8.25 8.25 0 005.562 2.233v-1.087zm-8.186-7.285h1.107a8.23 8.23 0 001.125-.247V6.345a8.25 8.25 0 00-2.232 5.562zm1.087.186H3.72a8.25 8.25 0 002.232 5.562v-5.304a8.012 8.012 0 00-1.145-.258zm15.47-.186a8.25 8.25 0 00-2.232-5.562v5.315c.367.108.743.19 1.126.247h1.107zm-1.086.186c-.39.058-.772.144-1.146.258v5.304a8.25 8.25 0 002.233-5.562h-1.087zm-1.332 5.69V12.41a7.97 7.97 0 00-.696.267 8.409 8.409 0 00-2.65 1.76l3.346 3.346zm0-6.18v-5.45l-.012-.013h-5.451c.076.235.162.468.26.696a8.698 8.698 0 001.819 2.688 8.698 8.698 0 002.688 1.82c.228.097.46.183.696.259zM6.14 17.848V12.41c.235.078.468.167.696.267a8.403 8.403 0 012.688 1.799 8.404 8.404 0 011.799 2.688c.1.228.19.46.267.696H6.152l-.012-.012zm0-6.245V6.326l3.29 3.29a8.716 8.716 0 01-2.594 1.728 8.14 8.14 0 01-.696.259zm6.257 6.257h5.277l-3.29-3.29a8.716 8.716 0 00-1.728 2.594 8.135 8.135 0 00-.259.696zm-2.347-7.81a9.435 9.435 0 01-2.88 1.96 9.14 9.14 0 012.88 1.94 9.14 9.14 0 011.94 2.88 9.435 9.435 0 011.96-2.88 9.14 9.14 0 012.88-1.94 9.435 9.435 0 01-2.88-1.96 9.434 9.434 0 01-1.96-2.88 9.14 9.14 0 01-1.94 2.88z" />
                                </svg>
                              );
                            } else if (m.includes('gpt-oss') || m.includes('openai')) {
                              iconComponent = (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, color: 'var(--accent)' }}>
                                  <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.946-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
                                </svg>
                              );
                            } else if (m.includes('mistral')) {
                              iconComponent = (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                                  <path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" fill="gold" />
                                  <path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" fill="#FFAF00" />
                                  <path d="M3.428 10.258h17.144v3.428H3.428v-3.428z" fill="#FF8205" />
                                  <path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z" fill="#FA500F" />
                                  <path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" fill="#E10500" />
                                </svg>
                              );
                            } else if (m.includes('zai') || m.includes('glm')) {
                              iconComponent = (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, color: 'var(--accent)' }}>
                                  <path d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z" />
                                </svg>
                              );
                            }
                            return (
                              <span title={`Generated by ${book.modelUsed}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                {iconComponent}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="lib-card-tags">
                          {book.tags.slice(0, 3).map(t => (
                            <span key={t} className="lib-tag">{t}</span>
                          ))}
                          <span className="lib-tag" style={{ borderStyle: 'solid', borderColor: book.edition === 'street' ? '#ff5722' : book.edition === 'desi' ? '#ff9800' : 'var(--accent)', color: book.edition === 'street' ? '#ff5722' : book.edition === 'desi' ? '#ff9800' : 'var(--accent)' }}>
                            {book.edition === 'street' ? '🔥 Street' : book.edition === 'desi' ? '🇮🇳 Desi' : '✨ Stellar'}
                          </span>
                        </div>
                        <div className="lib-card-cta">
                          Read now <ArrowRight size={11} />
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="lib-load-more-wrap">
                      <div>
                        <button
                          className="lib-load-more-btn"
                          onClick={() => setVisibleCount(prev => prev + BOOKS_PER_PAGE)}
                        >
                          Load More Books
                        </button>
                        <div className="lib-load-more-count">
                          Showing {visibleBooks.length} of {filtered.length}
                        </div>
                      </div>
                    </div>
                  )}
                  </>
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

      {/* About Project Modal */}
      <AboutModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
