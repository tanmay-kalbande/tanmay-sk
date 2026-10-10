export interface ReadingPosition {
  slug: string;
  title: string;
  chapter: number;
  progress: number;
  savedAt: string;
}

export interface CourseProgress {
  completedChapters: number[];
  bookmarks: number[];
  note: string;
  updatedAt: string;
}

export interface CompletedBook {
  slug: string;
  title: string;
  completedAt: string;
}

export const READING_PROGRESS_KEY = 'pustakam-last-reading-position';
const COMPLETED_BOOKS_KEY = 'pustakam-completed-books';
const courseKey = (slug: string) => 'pustakam-course-progress:' + slug;

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is optional; a full storage quota should not block reading.
  }
}

export function getReadingPosition(): ReadingPosition | null {
  const position = readJson<ReadingPosition | null>(READING_PROGRESS_KEY, null);
  return position?.slug && position.title ? position : null;
}

export function saveReadingPosition(position: ReadingPosition): void {
  writeJson(READING_PROGRESS_KEY, position);
}

export function getCourseProgress(slug: string): CourseProgress {
  const progress = readJson<CourseProgress | null>(courseKey(slug), null);
  return progress
    ? { completedChapters: progress.completedChapters || [], bookmarks: progress.bookmarks || [], note: progress.note || '', updatedAt: progress.updatedAt || '' }
    : { completedChapters: [], bookmarks: [], note: '', updatedAt: '' };
}

export function saveCourseProgress(slug: string, progress: CourseProgress): void {
  writeJson(courseKey(slug), progress);
}

export function getCompletedBooks(): CompletedBook[] {
  return readJson<CompletedBook[]>(COMPLETED_BOOKS_KEY, []);
}

export function markBookCompleted(book: CompletedBook): void {
  const withoutCurrent = getCompletedBooks().filter(item => item.slug !== book.slug);
  writeJson(COMPLETED_BOOKS_KEY, [book, ...withoutCurrent].slice(0, 12));
}

export interface LibrarySummaryStats {
  totalBooks: number;
  totalWords: number;
  totalHours: number;
  fetchedAt: number;
}

export const LIBRARY_STATS_CACHE_KEY = 'pustakam-library-stats-cache';
export const CATALOG_URL = 'https://raw.githubusercontent.com/tanmay-kalbande/pustakam-books/main/catalog.json';

export const DEFAULT_LIBRARY_STATS: LibrarySummaryStats = {
  totalBooks: 1727,
  totalWords: 38989059,
  totalHours: 2600,
  fetchedAt: 0,
};

export function getCachedLibraryStats(): LibrarySummaryStats {
  const cached = readJson<LibrarySummaryStats | null>(LIBRARY_STATS_CACHE_KEY, null);
  if (cached && typeof cached.totalWords === 'number' && cached.totalWords > 0) {
    return cached;
  }
  return DEFAULT_LIBRARY_STATS;
}

export async function fetchLiveLibraryStats(): Promise<LibrarySummaryStats> {
  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error('Failed to fetch catalog');
    const data = await res.json();
    const books = Array.isArray(data.books) ? data.books : [];
    const totalBooks = data.total || books.length;
    const totalWords = books.reduce((sum: number, b: { wordCount?: number }) => sum + (b.wordCount || 0), 0);
    const totalHours = Math.round(
      books.reduce((sum: number, b: { readingTimeMins?: number }) => sum + (b.readingTimeMins || 0), 0) / 60
    );

    const stats: LibrarySummaryStats = {
      totalBooks: totalBooks || DEFAULT_LIBRARY_STATS.totalBooks,
      totalWords: totalWords || DEFAULT_LIBRARY_STATS.totalWords,
      totalHours: totalHours || DEFAULT_LIBRARY_STATS.totalHours,
      fetchedAt: Date.now(),
    };

    writeJson(LIBRARY_STATS_CACHE_KEY, stats);
    return stats;
  } catch {
    return getCachedLibraryStats();
  }
}
