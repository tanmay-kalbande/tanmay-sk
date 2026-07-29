export interface ReadingPosition {
  slug: string;
  title: string;
  chapter: number;
  progress: number;
  savedAt: string;
}

export interface CourseProgress {
  completedChapters: number[];
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
  return progress || { completedChapters: [], note: '', updatedAt: '' };
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
