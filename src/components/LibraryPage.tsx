import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Clock, FileText, ArrowRight, Calendar, Sun, Moon, Info, X, Sparkles } from 'lucide-react';
import { socialLinks } from '../data/siteData';
import { setFavicon } from '../utils/setFavicon';
import { AboutModal } from './AboutModal';
import { getCompletedBooks, getReadingPosition, ReadingPosition } from '../lib/learning';
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

function intentTokens(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(token =>
    token.length > 2 && !['learn', 'want', 'need', 'with', 'from', 'into', 'help', 'become', 'build', 'start'].includes(token)
  );
}

function suggestedPath(goal: string): string[] {
  const text = goal.toLowerCase();
  if (/(data|analyst|sql|power bi|tableau)/.test(text)) return ['SQL foundations', 'Spreadsheets & dashboards', 'Data analysis projects'];
  if (/(program|developer|web|coding|software)/.test(text)) return ['Programming foundations', 'Build practical projects', 'Ship and share your work'];
  if (/(business|freelance|marketing|startup)/.test(text)) return ['Core business skills', 'Audience & offer', 'Launch your first project'];
  if (/(career|job|interview|resume)/.test(text)) return ['Career foundations', 'Portfolio & proof of work', 'Interview preparation'];
  return ['Start with foundations', 'Practice with a guided project', 'Build your next skill'];
}

function coverInitials(title: string): string {
  return title.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

export default function LibraryPage() {
  const { category: routeCategory } = useParams<{ category?: string }>();
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
  const [lastRead] = useState<ReadingPosition | null>(getReadingPosition);
  const [completedBooks] = useState(() => getCompletedBooks());
  const [learningGoal, setLearningGoal] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (window.localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  const heroSearchRef = useRef<HTMLInputElement>(null);
  const [heroSearchActive, setHeroSearchActive] = useState(false);
  const heroSectionRef = useRef<HTMLElement>(null);
  const [catalogNavVisible, setCatalogNavVisible] = useState(false);
  const [headerFiltersOpen, setHeaderFiltersOpen] = useState(false);

  useEffect(() => {
    setFavicon('/favicon_final.svg');
    document.documentElement.removeAttribute('data-app-page');
    document.body.style.overflow = '';
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const focusLibrarySearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        heroSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusLibrarySearch);
    return () => window.removeEventListener('keydown', focusLibrarySearch);
  }, []);

  useEffect(() => {
    const updateCatalogNavigation = () => {
      const heroBottom = heroSectionRef.current?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY;
      setCatalogNavVisible(heroBottom < 84);
    };
    updateCatalogNavigation();
    window.addEventListener('scroll', updateCatalogNavigation, { passive: true });
    return () => window.removeEventListener('scroll', updateCatalogNavigation);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BOOKS_PER_PAGE);
  }, [activeCategory, activeEdition, search, sortMode]);

  useEffect(() => {
    if (routeCategory) setActiveCategory(routeCategory);
  }, [routeCategory]);

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

  const discoveryResults = useMemo(() => {
    if (!index || intentTokens(learningGoal).length === 0) return [];
    const tokens = intentTokens(learningGoal);
    return [...index.books]
      .map(book => {
        const haystack = [book.title, book.goal, book.category, ...book.tags].join(' ').toLowerCase();
        const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
        return { book, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.book.generatedAt).getTime() - new Date(a.book.generatedAt).getTime())
      .slice(0, 3)
      .map(item => item.book);
  }, [index, learningGoal]);

  const isFilterActive = useMemo(() => {
    return search.trim() !== '' || (!routeCategory && activeCategory !== 'all') || activeEdition !== 'all';
  }, [search, activeCategory, activeEdition, routeCategory]);

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
      <nav className={`lib-nav ${catalogNavVisible ? 'is-catalog-active' : ''}`}>
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
        {catalogNavVisible && (
          <div className="lib-nav-catalog-controls" aria-label="Quick library filters">
            <span>Browse</span>
            <div className="lib-nav-quick-chips">
              <button className={activeEdition === 'all' ? 'active' : ''} onClick={() => setActiveEdition('all')}>All</button>
              {top3Categories.map(category => (
                <button key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => setActiveCategory(category.id)}>{category.label}</button>
              ))}
            </div>
            <button
              className="lib-nav-all-filters"
              type="button"
              onClick={() => setHeaderFiltersOpen(open => !open)}
              aria-expanded={headerFiltersOpen}
              aria-controls="library-header-filters"
            >
              {headerFiltersOpen ? 'Close filters' : 'All filters'}
            </button>
            {headerFiltersOpen && (
              <div id="library-header-filters" className="lib-nav-filter-popover">
                <div className="lib-nav-filter-popover-head">
                  <span>Refine the library</span>
                  <button type="button" onClick={() => setHeaderFiltersOpen(false)} aria-label="Close library filters"><X size={14} /></button>
                </div>
                <div className="lib-nav-filter-group">
                  <span>Edition</span>
                  <div>
                    {([['all', 'All'], ['stellar', '✨ Stellar'], ['street', '🔥 Street'], ['desi', '🇮🇳 Desi']] as const).map(([edition, label]) => (
                      <button key={edition} type="button" className={activeEdition === edition ? 'active' : ''} onClick={() => setActiveEdition(edition)}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="lib-nav-filter-group">
                  <span>Category</span>
                  <div>
                    {categoriesWithCounts.map(category => (
                      <button key={category.id} type="button" className={activeCategory === category.id ? 'active' : ''} onClick={() => { setActiveCategory(category.id); setHeaderFiltersOpen(false); }}>{category.label}<small>{category.count}</small></button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      <section ref={heroSectionRef} className={`lib-home-hero ${(heroSearchActive || search.trim()) ? 'is-condensed' : ''}`} aria-label="Pustakam Library introduction">
        <div className="lib-home-hero-copy">
          <span className="lib-home-kicker">Pustakam · Open learning archive</span>
          {routeCategory ? (
            <>
              <h1>{getCategoryLabel(routeCategory)}<em> learning hub.</em></h1>
              <p>A focused set of practical guides to help you build momentum one chapter at a time.</p>
            </>
          ) : (
            <>
              <h1>Find your next<br /><em>useful skill.</em></h1>
              <p>Free, structured guides for curious people who want to make steady progress on work and life.</p>
            </>
          )}
          <div className="lib-home-search">
            <Search size={17} aria-hidden="true" />
            <input
              ref={heroSearchRef}
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              onFocus={() => setHeroSearchActive(true)}
              onBlur={() => { if (!search.trim()) setHeroSearchActive(false); }}
              placeholder="Search guides, skills, or topics"
              aria-label="Search the Pustakam library"
            />
            <span>⌘ K</span>
          </div>
          <div className="lib-home-stats" aria-label="Library statistics">
            <span><strong>{index?.total?.toLocaleString() || '700+'}</strong> free guides</span>
            <span><strong>{index ? Math.round(index.books.reduce((total, book) => total + (book.readingTimeMins || 0), 0) / 60).toLocaleString() + '+' : '1,000+'}</strong> hours to explore</span>
            <span><strong>0</strong> paywalls</span>
          </div>
        </div>
        <div className="lib-home-visual" aria-hidden="true">
          <div className="lib-visual-grid" />
          <div className="lib-visual-line lib-visual-line-a" />
          <div className="lib-visual-line lib-visual-line-b" />
          <div className="lib-visual-line lib-visual-line-c" />
          <div className="lib-visual-orbit lib-visual-orbit-a" />
          <div className="lib-visual-orbit lib-visual-orbit-b" />
          <span>READ / BUILD / REPEAT</span>
        </div>
      </section>

      {/* Main Split Layout */}
      <div className="lib-layout">
        {/* Left Sidebar */}
        <aside className={`lib-sidebar ${showAllCategories ? 'expanded' : ''}`}>
          <div className="lib-sidebar-section lib-sidebar-search">
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
            {routeCategory ? (
              <>
                <h1>
                  <span className="first-name">{getCategoryLabel(routeCategory)} learning</span><br />
                  <span className="accent">Hub</span>
                </h1>
                <p className="lib-hero-sub">
                  A focused collection of free, structured {getCategoryLabel(routeCategory).toLowerCase()} guides.
                  Start with a foundation, practice through projects, and keep progressing.
                </p>
              </>
            ) : (
              <>
                <h1>
                  <span className="first-name">A Curated Library of</span><br />
                  <span className="accent">Structured</span><br />
                  Learning Guides
                </h1>
                <p className="lib-hero-sub">
                  Structured, chapter-by-chapter roadmaps on programming, finance, exams, and more.
                  Every curriculum is free to read. Build a custom version on your exact topic with Pustakam.
                </p>
              </>
            )}
            <div className="lib-discovery">
              <Sparkles size={15} aria-hidden="true" />
              <input
                value={learningGoal}
                onChange={event => setLearningGoal(event.target.value)}
                placeholder="Tell us what you want to learn…"
                aria-label="Describe what you want to learn"
              />
            </div>
            <p className="lib-discovery-help">Start typing to see matching guides and a suggested learning path.</p>
            <div className="lib-hero-rule" />
          </div>

          {false && (
            <section className="lib-learning-dashboard" aria-label="Your learning dashboard">
              <div className="lib-dashboard-heading">
                <div>
                  <span>Your learning</span>
                  <strong>Make every visit count.</strong>
                </div>
                <GraduationCap size={20} aria-hidden="true" />
              </div>
              <div className="lib-dashboard-grid">
                <div>
                  <span>In progress</span>
                  <strong>{lastRead && lastRead.progress < 100 ? '1 guide' : 'Ready to start'}</strong>
                </div>
                <div>
                  <span>Completed</span>
                  <strong>{completedBooks.length} {completedBooks.length === 1 ? 'guide' : 'guides'}</strong>
                </div>
                <div>
                  <span>Explore a hub</span>
                  {top3Categories[0] ? (
                    <Link to={'/library/category/' + top3Categories[0].id}>{top3Categories[0].label} <ArrowRight size={12} /></Link>
                  ) : <strong>Loading…</strong>}
                </div>
              </div>
            </section>
          )}

          {false && lastRead && lastRead.progress >= 2 && lastRead.progress < 100 && (
            <section className="lib-resume-card" aria-label="Continue reading">
              <div className="lib-resume-copy">
                <span className="lib-resume-eyebrow">Continue learning</span>
                <strong>{lastRead.title}</strong>
                <span>Chapter {Math.max(1, lastRead.chapter + 1)} · {lastRead.progress}% complete</span>
              </div>
              <Link to={'/library/book/' + lastRead.slug} className="lib-resume-link">
                Resume <ArrowRight size={13} />
              </Link>
            </section>
          )}

          {learningGoal.trim().length >= 3 && (
            <section className="lib-discovery-results" aria-live="polite">
              <div className="lib-discovery-heading">
                <div>
                  <span>Suggested learning path</span>
                  <strong>{suggestedPath(learningGoal).join('  →  ')}</strong>
                </div>
                <button onClick={() => setLearningGoal('')} aria-label="Clear learning goal">Clear</button>
              </div>
              <p className="lib-discovery-path"><span>Suggested path</span>{suggestedPath(learningGoal).join(' → ')}</p>
              {discoveryResults.length > 0 ? (
                <div className="lib-discovery-grid">
                  {discoveryResults.map((book, index) => (
                    <Link key={book.slug} to={'/library/book/' + book.slug} className="lib-discovery-book">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{book.title}</strong>
                        <small>{book.readingTimeMins} min · {getCategoryLabel(book.category)}</small>
                      </div>
                      <ArrowRight size={15} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="lib-discovery-empty">No exact guide yet. Try a broader goal, or generate a custom guide.</p>
              )}
            </section>
          )}

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
                    {visibleBooks.map((book, cardIndex) => (
                      <Link
                        key={book.slug}
                        to={`/library/book/${book.slug}`}
                        className={`lib-card ${cardIndex === 0 ? 'lib-card--featured' : ''}`}
                      >
                        <div className="lib-card-cover" data-category={book.category}>
                          <span>{getCategoryLabel(book.category)} · {book.complexity}</span>
                          <strong>{coverInitials(book.title)}</strong>
                          <em>{book.readingTimeMins} min guide</em>
                          <div className="lib-cover-graphic" aria-hidden="true"><i /><i /><i /></div>
                        </div>


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
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                                  <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" />
                                </svg>
                              );
                            } else if (m.includes('gpt-oss') || m.includes('openai')) {
                              iconComponent = (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                                  <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619-.357-1.356-.523-2.117-.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.946-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
                                </svg>
                              );
                            } else if (m.includes('mistral')) {
                              iconComponent = (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                                  <path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4zM3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828zM3.428 10.258h17.144v3.428H3.428v-3.428zM3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428zM0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" />
                                </svg>
                              );
                            } else if (m.includes('zai') || m.includes('glm')) {
                              iconComponent = (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
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
