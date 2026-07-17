// src/services/pdfService.ts - FIXED VERSION WITH EMOJIS & HYPHENS
import type { BookFile } from '../components/BookReaderPage';

export type BookProject = BookFile & { bookType?: string; fiction?: boolean; id?: string };

// Stub bookService to prevent compile errors for generateCoverMetadata.
// PDF generation is client-side and doesn't need to call AI for cover.
export const bookService = {
  async generateForPdf(prompt: string, bookId?: string): Promise<string> {
    throw new Error('AI cover generation not available on client side');
  }
};

let isGenerating = false;
let pdfMake: any = null;
let fontsLoaded = false;

function formatGeneratedDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

async function loadPdfMake() {
  if (pdfMake && fontsLoaded) {
    return pdfMake;
  }
  try {
    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts')
    ]);
    pdfMake = pdfMakeModule.default || pdfMakeModule;
    const fontsAny: any = pdfFontsModule.default || pdfFontsModule;

    // Robust VFS Detection across ESM / Vite bundled module exports
    let vfs: any = null;
    if (fontsAny?.pdfMake?.vfs) {
      vfs = fontsAny.pdfMake.vfs;
    } else if (fontsAny?.vfs) {
      vfs = fontsAny.vfs;
    } else if (fontsAny && typeof fontsAny === 'object') {
      if (fontsAny['Roboto-Regular.ttf'] || Object.keys(fontsAny).some(k => k.includes('Roboto'))) {
        vfs = fontsAny;
      } else {
        for (const k of Object.keys(fontsAny)) {
          const val = fontsAny[k];
          if (val && typeof val === 'object' && (val['Roboto-Regular.ttf'] || Object.keys(val).some(sk => sk.includes('Roboto')))) {
            vfs = val;
            break;
          }
        }
      }
    }

    if (!vfs && (pdfFontsModule as any)?.pdfMake?.vfs) {
      vfs = (pdfFontsModule as any).pdfMake.vfs;
    }

    if (!vfs && (window as any).pdfMake?.vfs) {
      vfs = (window as any).pdfMake.vfs;
    }

    if (!vfs && (window as any).pdfFonts?.pdfMake?.vfs) {
      vfs = (window as any).pdfFonts.pdfMake.vfs;
    }

    if (!vfs) {
      console.error('[PDF] Could not resolve pdfMake VFS fonts module:', pdfFontsModule);
      throw new Error('FONT_VFS_NOT_FOUND');
    }

    pdfMake.vfs = vfs;
    if ((pdfMakeModule as any).default) {
      (pdfMakeModule as any).default.vfs = vfs;
    }
    (window as any).pdfMake = pdfMake;
    (window as any).pdfMake.vfs = vfs;

    if (typeof pdfMake.addVirtualFileSystem === 'function') {
      pdfMake.addVirtualFileSystem(vfs);
    }

    // Dynamically match font keys in VFS to handle any path variations
    const vfsKeys = Object.keys(vfs);
    const regKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-regular.ttf')) || 'Roboto-Regular.ttf';
    const medKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-medium.ttf') || k.toLowerCase().endsWith('roboto-bold.ttf')) || 'Roboto-Medium.ttf';
    const italicKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-italic.ttf')) || 'Roboto-Italic.ttf';
    const medItalicKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-mediumitalic.ttf') || k.toLowerCase().endsWith('roboto-bolditalic.ttf')) || 'Roboto-MediumItalic.ttf';

    // Auto-load Aptos-Mono and Rubik fonts
    const basePath = '/fonts/';
    const aptosMonoFonts = [
      { name: 'Aptos-Mono.ttf', key: 'Aptos-Mono.ttf' },
      { name: 'Aptos-Mono-Bold.ttf', key: 'Aptos-Mono-Bold.ttf' },
      { name: 'Aptos-Mono-Bold-Italic.ttf', key: 'Aptos-Mono-Bold-Italic.ttf' }
    ];

    const rubikFonts = [
      { name: 'Rubik-Regular.ttf', key: 'Rubik-Regular.ttf' },
      { name: 'Rubik-Bold.ttf', key: 'Rubik-Bold.ttf' },
      { name: 'Rubik-Black.ttf', key: 'Rubik-Black.ttf' }
    ];

    const sourceSerifFonts = [
      { name: 'SourceSerif4-Regular.ttf', key: 'SourceSerif4-Regular.ttf' },
      { name: 'SourceSerif4-Semibold.ttf', key: 'SourceSerif4-Semibold.ttf' },
      { name: 'SourceSerif4-It.ttf', key: 'SourceSerif4-It.ttf' }
    ];

    for (const font of aptosMonoFonts) {
      try {
        const response = await fetch(`${basePath}${font.name}`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          pdfMake.vfs[font.key] = base64;
          if (typeof pdfMake.addVirtualFileSystem === 'function') {
            pdfMake.addVirtualFileSystem({ [font.key]: base64 });
          }
        }
      } catch (error) {
        // Silent fail
      }
    }

    for (const font of rubikFonts) {
      try {
        const response = await fetch(`${basePath}${font.name}`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          pdfMake.vfs[font.key] = base64;
          if (typeof pdfMake.addVirtualFileSystem === 'function') {
            pdfMake.addVirtualFileSystem({ [font.key]: base64 });
          }
        }
      } catch (error) {
        // Silent fail
      }
    }

    for (const font of sourceSerifFonts) {
      try {
        const response = await fetch(`${basePath}${font.name}`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          pdfMake.vfs[font.key] = base64;
          if (typeof pdfMake.addVirtualFileSystem === 'function') {
            pdfMake.addVirtualFileSystem({ [font.key]: base64 });
          }
        }
      } catch (error) {
        // Graceful fallback to Roboto
      }
    }

    // Helper to validate font data
    const isValidFont = (key: string) => {
      const data = pdfMake.vfs[key];
      return data && typeof data === 'string' && data.length > 1000;
    };

    const fontConfig: any = {
      Roboto: {
        normal: regKey,
        bold: medKey,
        italics: italicKey,
        bolditalics: medItalicKey
      }
    };

    // Add Rubik if available (for PDF titles)
    if (isValidFont('Rubik-Regular.ttf') && isValidFont('Rubik-Black.ttf')) {
      fontConfig['Rubik'] = {
        normal: 'Rubik-Regular.ttf',
        bold: 'Rubik-Black.ttf',
        italics: 'Rubik-Regular.ttf',
        bolditalics: 'Rubik-Black.ttf'
      };
    }

    // Add Aptos-Mono if available (for code blocks)
    if (isValidFont('Aptos-Mono.ttf') && isValidFont('Aptos-Mono-Bold.ttf')) {
      const hasBoldItalic = isValidFont('Aptos-Mono-Bold-Italic.ttf');
      fontConfig['Aptos-Mono'] = {
        normal: 'Aptos-Mono.ttf',
        bold: 'Aptos-Mono-Bold.ttf',
        italics: hasBoldItalic ? 'Aptos-Mono-Bold-Italic.ttf' : 'Aptos-Mono.ttf',
        bolditalics: hasBoldItalic ? 'Aptos-Mono-Bold-Italic.ttf' : 'Aptos-Mono-Bold.ttf'
      };
    }

    if (isValidFont('SourceSerif4-Regular.ttf') && isValidFont('SourceSerif4-Semibold.ttf')) {
      const hasItalic = isValidFont('SourceSerif4-It.ttf');
      fontConfig['SourceSerif'] = {
        normal: 'SourceSerif4-Regular.ttf',
        bold: 'SourceSerif4-Semibold.ttf',
        italics: hasItalic ? 'SourceSerif4-It.ttf' : 'SourceSerif4-Regular.ttf',
        bolditalics: hasItalic ? 'SourceSerif4-It.ttf' : 'SourceSerif4-Semibold.ttf'
      };
    }

    pdfMake.fonts = fontConfig;
    fontsLoaded = true;
    return pdfMake;
  } catch (error) {
    console.error('[PDF] Loading failed:', error);
    fontsLoaded = false;
    pdfMake = null;
    throw error;
  }
}

interface PDFContent {
  id?: string;
  text?: string | any[];
  style?: string | string[];
  margin?: number[];
  alignment?: string;
  pageBreak?: string;
  ul?: any[];
  ol?: any[];
  table?: any;
  canvas?: any;
  columns?: any[];
  fillColor?: string;
  border?: boolean[];
  layout?: any;
  stack?: any[];
  absolutePosition?: any;
  fontSize?: number;
  bold?: boolean;
  color?: string;
  lineHeight?: number;
  italics?: boolean;
  characterSpacing?: number;
  link?: string;
  decoration?: string;
  decorationColor?: string;
  width?: string | number;
  preserveLeadingSpaces?: boolean;
  background?: string;
  font?: string;
  unbreakable?: boolean;
  dontBreakRows?: boolean;
  keepWithNext?: boolean;
  headlineLevel?: number;
  widths?: any;
  image?: string;
  height?: number;
  columnGap?: number;
}

interface CoverMetadata {
  coverTitle: string;
  subtitle: string;
  tagline: string;
  blurb: string;
  epigraph: { quote: string; author: string };
  audience: string;
  learningPoints: string[];
  accentColor?: string;
  tags?: string[];
  category?: string;
  complexity?: string;
  chapterCount?: number;
  wordCount?: number;
  readTimeMinutes?: number;
}

function isNovelProject(project: BookProject & { fiction?: unknown }): boolean {
  return project.bookType === 'novel' || Boolean(project.fiction);
}

async function generateCoverMetadata(project: BookProject): Promise<CoverMetadata | null> {
  const isNovel = isNovelProject(project);
  const chapterList = project.modules
    .map((m, i) => `${i + 1}. ${m.title}`)
    .join('\n');
  const totalWords = project.modules.reduce((s, m) => s + m.wordCount, 0);

  const prompt = isNovel
    ? `You are an editorial book designer. Given a novel's details, generate cover metadata.

RULES:
- coverTitle: Maximum 8 words. Clear and memorable. The BIG text on the front cover.
- subtitle: Maximum 12 words. A catchy subtitle or genre description.
- tagline: One short sentence (maximum 12 words) hooking the reader.
- blurb: Maximum 2 short sentences (under 30 words total) summarizing the premise.
- epigraph: A real, famous quote relevant to the story's theme with the author. Keep it short.
- audience: One short sentence (under 15 words) describing the target reader.
- learningPoints: Exactly 4 short, punchy bullet points of key themes or motifs (each under 8 words).
- accentColor: A single dark, rich hex color that matches the novel's mood.
- Return ONLY valid JSON. No markdown, no backticks, no explanation.
- Start your response with { and end with }.

Book Title: "${project.title}"
Premise: "${project.goal}"
Chapters (${project.modules.length}):
${chapterList}
Total Words: ${totalWords.toLocaleString()}

{"coverTitle":"...","subtitle":"...","tagline":"...","blurb":"...","epigraph":{"quote":"...","author":"..."},"audience":"...","learningPoints":["...","...","...","..."],"accentColor":"#......"}`
    : `You are an editorial learning-book designer. Given a book's details, generate cover metadata for an educational, practical book.

RULES:
- coverTitle: Maximum 8 words. Clear, memorable, and education-focused. The BIG text on the front cover.
- subtitle: Maximum 12 words. State the practical learning outcome.
- tagline: One short sentence (maximum 12 words) explaining the main learner benefit.
- blurb: Maximum 2 short sentences (under 30 words total) summarizing the book's value.
- epigraph: A real, famous quote relevant to the topic with the author. Keep it short.
- audience: One short sentence (under 15 words) describing the target reader.
- learningPoints: Exactly 4 short, punchy bullet points of key takeaways (each under 8 words).
- accentColor: A single dark, rich hex color (like #1b4332, #1a1b4b, #4a1942, #2d1810) that matches the book's subject. Must be dark enough for white text on top. Technology=deep blue/teal, Science=dark teal, Finance=dark navy, Health=dark emerald, History=dark burgundy, Cooking=dark sienna, Art=deep purple, Math=dark indigo. Be creative but keep it DARK and sophisticated.
- Return ONLY valid JSON. No markdown, no backticks, no explanation.
- Start your response with { and end with }.

Book Title: "${project.title}"
Topic: "${project.goal}"
Level: ${(project as any).roadmap?.difficultyLevel || project.complexity || 'intermediate'}
Chapters (${project.modules.length}):
${chapterList}
Total Words: ${totalWords.toLocaleString()}

{"coverTitle":"...","subtitle":"...","tagline":"...","blurb":"...","epigraph":{"quote":"...","author":"..."},"audience":"...","learningPoints":["...","...","...","..."],"accentColor":"#......"}`;

  try {
    const raw = await bookService.generateForPdf(prompt, project.id);
    
    // Find the first { and last } to extract JSON block robustly
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      throw new Error('Could not find JSON block in AI response');
    }
    const jsonString = raw.substring(firstBrace, lastBrace + 1);
    
    const parsed = JSON.parse(jsonString);
    if (!parsed.coverTitle || !parsed.subtitle) return null;
    return parsed as CoverMetadata;
  } catch (e) {
    console.warn('[PDF] Cover metadata AI call failed:', e);
    return null;
  }
}

function generateNoiseDataUrl(w = 256, h = 256): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;
      data[i+1] = val;
      data[i+2] = val;
      data[i+3] = 10; // Subtle noise opacity
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (e) {
    return '';
  }
}

class ProfessionalPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;
  private fontFamily: string = 'Roboto';
  private codeFontFamily: string = 'Roboto';
  private headingFontFamily: string = 'Roboto';

  private brandGreen = '#1b4332';
  private brandGreenDeep = '#14301f';
  private readonly brandTan = '#a9793f';
  private rowTint = '#eef2ec';
  private codeBg = '#f6f2ea';
  private accentLight = '#eaf2ed';
  private accentSubtle = '#d9eadf';
  private accentMid = '#d8ddd6';
  private accentFaint = '#f0f5f1';
  private accentText = '#26352d';
  private accentUnderline = '#a9c9b6';

  private readonly page = { width: 432, height: 648, contentWidth: 336 };

  private hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  private hslToHex(h: number, s: number, l: number): string {
    h /= 360; s /= 100; l /= 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let r: number, g: number, b: number;
    if (s === 0) { r = g = b = l; } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private tint(h: number, s: number, lightness: number): string {
    return this.hslToHex(h, Math.min(s, 30), lightness);
  }

  private applyAccentColor(hex: string | undefined): void {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return; // keep defaults
    const [h, s, l] = this.hexToHsl(hex);
    if (l > 35) return;
    this.brandGreen = hex;
    this.brandGreenDeep = this.hslToHex(h, s, Math.max(l - 6, 5));
    this.rowTint = this.tint(h, s, 94);
    this.codeBg = this.tint(h, s / 2, 95);
    this.accentLight = this.tint(h, s, 93);
    this.accentSubtle = this.tint(h, s, 87);
    this.accentMid = this.tint(h, s, 85);
    this.accentFaint = this.tint(h, s, 95);
    this.accentText = this.hslToHex(h, Math.min(s, 25), 18);
    this.accentUnderline = this.tint(h, s, 72);
    if (this.styles?.partLabel) {
      this.styles.partLabel.color = hex;
    }
  }

  private readonly CODE_KEYWORDS = new Set([
    'select', 'from', 'where', 'order', 'by', 'group', 'having', 'join', 'left', 'right', 'inner', 'outer',
    'on', 'as', 'desc', 'asc', 'over', 'partition', 'with', 'insert', 'into', 'update', 'set', 'delete',
    'create', 'table', 'values', 'and', 'or', 'not', 'null', 'is', 'in', 'like', 'limit', 'union', 'distinct',
    'case', 'when', 'then', 'else', 'end', 'def', 'class', 'import', 'return', 'if', 'elif', 'while', 'for',
    'lambda', 'yield', 'pass', 'break', 'continue', 'self', 'raise', 'global', 'nonlocal', 'async', 'await',
    'function', 'const', 'let', 'var', 'switch', 'extends', 'new', 'this', 'typeof', 'instanceof', 'export',
    'default', 'try', 'catch', 'finally', 'throw', 'interface', 'type', 'public', 'private', 'static', 'void',
    'implements', 'true', 'false', 'none', 'undefined'
  ]);

  private highlightCode(code: string): any[] {
    const lines = code.split('\n');
    const tokens: any[] = [];
    const regex = /(#[^\n]*|--[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_][A-Za-z0-9_]*)(?=\()|([A-Za-z_][A-Za-z0-9_]*)/g;

    lines.forEach((line, lineIdx) => {
      let lastIndex = 0;
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          tokens.push({ text: line.substring(lastIndex, match.index) });
        }
        if (match[1] !== undefined) {
          tokens.push({ text: match[1], italics: true, color: '#8a8578' });
        } else if (match[2] !== undefined) {
          tokens.push({ text: match[2], color: '#8a4b2f' });
        } else if (match[3] !== undefined) {
          tokens.push({ text: match[3], color: this.brandTan });
        } else if (match[4] !== undefined) {
          const isKeyword = this.CODE_KEYWORDS.has(match[4].toLowerCase());
          tokens.push(isKeyword ? { text: match[4], bold: true, color: this.brandGreen } : { text: match[4] });
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < line.length) {
        tokens.push({ text: line.substring(lastIndex) });
      }
      if (lineIdx < lines.length - 1) {
        tokens.push({ text: '\n' });
      }
    });

    return tokens;
  }

  constructor() {
    this.styles = {
      coverTitle: {
        fontSize: 28,
        bold: true,
        alignment: 'left',
        margin: [0, 0, 0, 8],
        color: '#1a1a1a',
        lineHeight: 1.1,
        characterSpacing: 0.5
      },
      coverSubtitle: {
        fontSize: 18,
        alignment: 'left',
        color: '#1a1a1a',
        bold: true,
        margin: [0, 0, 0, 4],
        lineHeight: 1.2
      },
      h1Module: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 18],
        color: '#1a202c',
        lineHeight: 1.18,
        characterSpacing: 0.35,
        alignment: 'left'
      },
      h2: {
        fontSize: 16,
        bold: true,
        margin: [0, 20, 0, 9],
        color: '#2d3748',
        lineHeight: 1.3,
        alignment: 'left'
      },
      h3: {
        fontSize: 13,
        bold: true,
        margin: [0, 16, 0, 7],
        color: '#2d3748',
        lineHeight: 1.3,
        alignment: 'left'
      },
      h4: {
        fontSize: 12,
        bold: true,
        lineHeight: 1.2,
        margin: [0, 15, 0, 8],
        color: '#4a5568',
        alignment: 'left'
      },
      paragraph: {
        fontSize: 10.75,
        lineHeight: 1.5,
        alignment: 'justify',
        margin: [0, 0, 0, 12],
        color: '#1a1a1a',
        characterSpacing: 0
      },
      listItem: {
        fontSize: 10.5,
        lineHeight: 1.45,
        margin: [0, 3, 0, 3],
        color: '#1a1a1a',
        alignment: 'left'
      },
      codeBlock: {
        fontSize: 9,
        margin: [0, 12, 0, 12],
        color: '#1e293b',
        preserveLeadingSpaces: true,
        lineHeight: 1.5,
        alignment: 'left',
        characterSpacing: -0.3
      },
      blockquote: {
        fontSize: 10.5,
        italics: true,
        margin: [20, 10, 15, 10],
        color: '#4a5568',
        lineHeight: 1.6,
        alignment: 'justify'
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: '#ffffff',
        lineHeight: 1.2,
        alignment: 'left'
      },
      tableCell: {
        fontSize: 8.5,
        color: '#1f2937',
        lineHeight: 1.2,
        alignment: 'left'
      },
      disclaimerTitle: {
        fontSize: 24,
        bold: true,
        alignment: 'center',
        color: '#4a5568',
        margin: [0, 0, 0, 20]
      },
      disclaimerText: {
        fontSize: 10,
        lineHeight: 1.65,
        alignment: 'justify',
        color: '#2d3748',
        margin: [0, 0, 0, 12],
        characterSpacing: 0
      },
      disclaimerNote: {
        fontSize: 9,
        lineHeight: 1.5,
        alignment: 'justify',
        color: '#4a5568',
        margin: [0, 8, 0, 8]
      },
      partLabel: {
        fontSize: 12,
        bold: true,
        color: '#1b4332',
        margin: [0, 0, 0, 4],
        characterSpacing: 2
      },
      tocChapter: {
        fontSize: 10,
        lineHeight: 1.15,
        color: '#1a1a1a',
        margin: [0, 2, 0, 2]
      },
      tocLeader: {
        fontSize: 11,
        color: '#cbd5e1',
        margin: [0, 4, 0, 4]
      }
    };
  }

  private preprocessMarkdown(markdown: string): string {
    let lines = markdown.split('\n');

    // Strip stray front-matter/branding lines the AI sometimes echoes back into
    // the body — these belong on the generated cover only, not inside chapters,
    // and left in place they crowd whatever heading immediately follows them.
    const boilerplatePatterns = [
      /^AI-ASSISTED STUDY EDITION$/i,
      /^PUSTAKAM STUDY SERIES$/i,
      /^First digital edition\b/i,
      /^\*\*\s*(Generated|Words|Provider|Model)\s*[:.]\*\*/i
    ];
    lines = lines.filter(l => !boilerplatePatterns.some(p => p.test(l.trim())));

    let stripIdx = 0;
    while (stripIdx < lines.length) {
      const t = lines[stripIdx].trim();
      if (t === '') { stripIdx++; continue; }
      if (/^#\s+/.test(t) && stripIdx === lines.findIndex(l => l.trim() !== '')) {
        lines.splice(stripIdx, 1);
        continue;
      }
      if (/^-{3,}$/.test(t)) {
        lines.splice(stripIdx, 1);
        continue;
      }
      break;
    }

    for (let i = 1; i < lines.length; i++) {
      const current = lines[i].trim();
      const prev = lines[i - 1].trim();
      const isListItem = /^[-*+]\s+/.test(current) || /^\d+\.\s+/.test(current);
      if (isListItem && prev !== '' && !/^[-*+]\s+/.test(prev) && !/^\d+\.\s+/.test(prev)) {
        lines.splice(i, 0, '');
        i++;
      }
    }
    return lines.join('\n');
  }

  private normalizeDashes(text: string): string {
    if (!text) return text;
    return text
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2026]/g, '...')
      .replace(/\u2192/g, '->')
      .replace(/\u2190/g, '<-')
      .replace(/\u2194/g, '<->')
      .replace(/\u21D2/g, '=>')
      .replace(/\u21D0/g, '<=')
      .replace(/\u21D4/g, '<=>')
      .replace(/\u2265/g, '>=')
      .replace(/\u2264/g, '<=')
      .replace(/\u2260/g, '!=');
  }

  private cleanText(text: string): string {
    text = this.normalizeDashes(text);
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/!\[.*?\]\(.+?\)/g, '')
      .trim();
  }

  private preventHyphenGap(text: string): string {
    return text.replace(/([A-Za-z0-9])-([A-Za-z0-9])/g, '$1\u2011$2');
  }

  private capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private parseInlineMarkdown(text: string): any {
    text = this.normalizeDashes(text);
    text = this.preventHyphenGap(text);

    const parts: any[] = [];
    let lastIndex = 0;

    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|~~(.+?)~~|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]))/gu;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index) });
      }

      if (match[13]) {
        parts.push({
          text: match[13],
          fontSize: 11,
          characterSpacing: 0.5
        });
      } else if (match[11]) {
        parts.push({ text: match[11], link: match[12], color: '#2563eb', decoration: 'underline', decorationColor: '#93c5fd' });
      } else if (match[9] !== undefined) {
        // no-op
      } else if (match[2]) {
        parts.push({ text: match[2], bold: true, italics: true });
      } else if (match[3]) {
        parts.push({ text: match[3], bold: true });
      } else if (match[4]) {
        parts.push({ text: match[4], italics: true });
      } else if (match[5]) {
        parts.push({ text: match[5], bold: true });
      } else if (match[6]) {
        parts.push({ text: match[6], italics: true });
      } else if (match[7]) {
        parts.push({ 
          text: match[7],
          font: this.codeFontFamily, 
          color: this.brandGreen,
          bold: true,
          fontSize: 9.5,
          decoration: 'underline'
        });
      } else if (match[8]) {
        parts.push({ text: match[8], decoration: 'lineThrough' });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex) });
    }

    return parts.length === 0 ? text : (parts.length === 1 && typeof parts[0] === 'string') ? parts[0] : parts;
  }

  private splitCodeBlock(code: string, maxLines: number = 40): string[] {
    const lines = code.split('\n');
    const chunks: string[] = [];

    for (let i = 0; i < lines.length; i += maxLines) {
      chunks.push(lines.slice(i, i + maxLines).join('\n'));
    }

    return chunks;
  }

  private createGradientBackground(width: number, height: number, endHex: string = '#e9eff2'): any[] {
    const steps = 60;
    const canvas: any[] = [];
    const stepHeight = height / steps;
    const startR = 250, startG = 248, startB = 245; // warm soft cream (#faf8f5)
    const endR = parseInt(endHex.slice(1, 3), 16);
    const endG = parseInt(endHex.slice(3, 5), 16);
    const endB = parseInt(endHex.slice(5, 7), 16);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      // Interpolate from a warm soft cream into a faint tint of the book's accent color
      const r = Math.round(startR + t * (endR - startR));
      const g = Math.round(startG + t * (endG - startG));
      const b = Math.round(startB + t * (endB - startB));
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      canvas.push({
        type: 'rect',
        x: 0,
        y: i * stepHeight,
        w: width,
        h: stepHeight + 0.5,
        color: hex
      });
    }
    return canvas;
  }

  private buildCoverChips(chips: string[]): PDFContent {
    const items = chips.filter(Boolean).slice(0, 4).map((label) => ({
      table: {
        widths: ['auto'],
        body: [[{
          text: label.toUpperCase(),
          font: this.headingFontFamily,
          fontSize: 7,
          bold: true,
          color: this.accentText,
          characterSpacing: 0.8,
          margin: [8, 4, 8, 4]
        }]]
      },
      layout: {
        hLineWidth: () => 0.75,
        vLineWidth: () => 0.75,
        hLineColor: () => this.accentUnderline,
        vLineColor: () => this.accentUnderline,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },
      width: 'auto'
    }));

    return {
      columns: items,
      columnGap: 6,
      margin: [0, 0, 0, 22]
    };
  }

  private createCoverPage(title: string, coverMeta: CoverMetadata): PDFContent[] {
    const normalizedTitle = this.normalizeDashes(title);
    const displayTitle = coverMeta.coverTitle || normalizedTitle;
    const { width, height } = this.page;

    const background = this.createGradientBackground(width, height, this.accentFaint);
    const border = [
      {
        type: 'rect',
        x: 24,
        y: 24,
        w: width - 48,
        h: height - 48,
        lineColor: this.accentMid,
        lineWidth: 0.75,
        r: 12
      }
    ];

    let mainTitle = displayTitle;
    let subTitle = '';
    const colonIndex = displayTitle.indexOf(':');
    if (colonIndex !== -1) {
      mainTitle = displayTitle.substring(0, colonIndex).trim();
      subTitle = displayTitle.substring(colonIndex + 1).trim();
    } else {
      const words = displayTitle.split(' ');
      if (words.length > 3) {
        mainTitle = words.slice(0, 2).join(' ');
        subTitle = words.slice(2).join(' ');
      }
    }

    const levelWord = coverMeta.subtitle
      ? this.capitalizeFirstLetter(coverMeta.subtitle.split(' ')[0].toLowerCase())
      : 'Structured';

    const noiseDataUrl = generateNoiseDataUrl(width, height);

    const chips = [coverMeta.complexity, coverMeta.category, ...(coverMeta.tags || [])]
      .filter((c): c is string => Boolean(c && c.trim()));

    const statsParts: string[] = [];
    if (coverMeta.readTimeMinutes) statsParts.push(`${coverMeta.readTimeMinutes} MIN READ`);
    if (coverMeta.chapterCount) statsParts.push(`${coverMeta.chapterCount} CHAPTER${coverMeta.chapterCount === 1 ? '' : 'S'}`);
    if (coverMeta.wordCount) statsParts.push(`${coverMeta.wordCount.toLocaleString()} WORDS`);

    return [
      { canvas: background, absolutePosition: { x: 0, y: 0 } },
      ...(noiseDataUrl ? [{
        image: noiseDataUrl,
        width: width,
        height: height,
        absolutePosition: { x: 0, y: 0 }
      }] : []),
      { canvas: border, absolutePosition: { x: 0, y: 0 } },
      {
        stack: [
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 336, y2: 0, lineWidth: 0.75, lineColor: this.accentUnderline }],
            margin: [0, 0, 0, 10]
          },
          ...(statsParts.length ? [{
            text: statsParts.join('   \u00b7   '),
            font: this.codeFontFamily,
            fontSize: 6.5,
            bold: true,
            color: this.brandGreen,
            characterSpacing: 0.6,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          }] : []),
          {
            columns: [
              {
                text: 'AI-ASSISTED STUDY EDITION',
                font: this.headingFontFamily,
                fontSize: 7,
                bold: true,
                color: '#64748b',
                characterSpacing: 1.2,
                alignment: 'left'
              },
              {
                text: `First digital edition • ${new Date().getFullYear()}`,
                font: this.fontFamily,
                fontSize: 7,
                color: '#64748b',
                alignment: 'right'
              }
            ]
          }
        ],
        absolutePosition: { x: 48, y: height - 92 }
      },
      { text: '', margin: [0, 30, 0, 0] },
      ...(chips.length ? [this.buildCoverChips(chips)] : []),
      {
        text: 'PUSTAKAM STUDY SERIES',
        font: this.codeFontFamily,
        fontSize: 7.5,
        bold: true,
        color: '#64748b',
        characterSpacing: 1.5,
        alignment: 'center',
        margin: [0, 0, 0, 26]
      },
      {
        text: `A Structured ${levelWord} Guide`,
        font: this.fontFamily,
        fontSize: 13,
        italics: true,
        color: '#475569',
        alignment: 'left',
        margin: [0, 0, 0, 6]
      },
      {
        text: mainTitle,
        font: this.fontFamily,
        fontSize: mainTitle.length > 30 ? 22 : mainTitle.length > 18 ? 26 : 30,
        bold: true,
        color: this.brandGreen,
        alignment: 'left',
        lineHeight: 1.15,
        margin: [0, 0, 0, 4]
      },
      ...(subTitle ? [{
        text: subTitle,
        font: this.fontFamily,
        fontSize: subTitle.length > 50 ? 16 : subTitle.length > 30 ? 19 : 22,
        bold: true,
        color: this.accentText,
        alignment: 'left',
        lineHeight: 1.15,
        margin: [0, 0, 0, 16]
      }] : []),
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 72, y2: 0, lineWidth: 1.5, lineColor: this.brandGreen }],
        margin: [0, 0, 0, 24]
      },
      {
        text: coverMeta.tagline,
        font: this.fontFamily,
        fontSize: 11,
        italics: true,
        color: '#334155',
        lineHeight: 1.45,
        margin: [0, 0, 0, 24],
        alignment: 'justify'
      },
      { text: '', pageBreak: 'after' }
    ];
  }

  private createLearningOverview(coverMeta: CoverMetadata): PDFContent[] {
    return [
      { text: '', margin: [0, 10, 0, 0] },
      { text: 'OVERVIEW', style: 'partLabel', margin: [0, 0, 0, 4] },
      { text: 'Your Learning Path', font: this.headingFontFamily, fontSize: 19, bold: true, color: this.brandGreenDeep, lineHeight: 1.2, margin: [0, 0, 0, 6] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 70, y2: 0, lineWidth: 1.5, lineColor: this.brandGreen }], margin: [0, 0, 0, 14] },
      ...(coverMeta.epigraph?.quote ? [
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: `"${coverMeta.epigraph.quote}"`, font: this.fontFamily, fontSize: 11, italics: true, color: this.accentText, lineHeight: 1.55, margin: [0, 0, 0, 8] },
                { text: `— ${coverMeta.epigraph.author}`, font: this.headingFontFamily, fontSize: 9, bold: true, color: this.brandGreen, alignment: 'right' }
              ],
              fillColor: this.accentFaint,
              margin: [14, 10, 14, 10]
            }]]
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (i: number) => i === 0 ? 3 : 0,
            vLineColor: () => this.brandGreen
          },
          margin: [0, 0, 0, 14]
        }
      ] : []),
      ...(coverMeta.blurb ? [{ text: coverMeta.blurb, font: this.fontFamily, fontSize: 10.75, color: '#4c514c', lineHeight: 1.6, margin: [0, 0, 0, 14] }] : []),
      ...(coverMeta.audience ? [
        { text: 'WHO THIS BOOK IS FOR', font: this.headingFontFamily, fontSize: 9, bold: true, color: this.brandGreen, characterSpacing: 1, margin: [0, 0, 0, 6] },
        { text: coverMeta.audience, font: this.fontFamily, fontSize: 10.75, color: '#4c514c', lineHeight: 1.55, margin: [0, 0, 0, 14] }
      ] : []),
      ...(coverMeta.learningPoints?.length ? [
        { text: 'WHAT YOU WILL LEARN', font: this.headingFontFamily, fontSize: 9, bold: true, color: this.brandGreen, characterSpacing: 1, margin: [0, 0, 0, 6] },
        ...coverMeta.learningPoints.map((point) => ({
          text: [{ text: '\u2022  ', bold: true, color: this.brandTan }, { text: point, font: this.fontFamily }],
          fontSize: 10.75,
          color: this.accentText,
          lineHeight: 1.5,
          margin: [4, 0, 0, 4]
        }))
      ] : []),
      { text: '', pageBreak: 'after' }
    ];
  }

  private createEndMatterPage(goal: string): PDFContent[] {
    const highStakes = /(medical|health|legal|law|financial|finance|investment|tax)/i.test(goal);
    const note = highStakes
      ? 'This edition is an educational learning companion, not professional advice. Verify important information with current, qualified sources before making health, legal, financial, or other high-stakes decisions.'
      : 'This edition is designed as a learning companion. Verify important claims with current, independent sources before relying on them in academic, professional, or consequential work.';

    return [
      { text: '', pageBreak: 'before' },
      { text: '', margin: [0, 180, 0, 0] },
      { text: 'About This Edition', font: this.headingFontFamily, fontSize: 20, bold: true, color: this.brandGreenDeep, alignment: 'center', margin: [20, 0, 20, 16] },
      { canvas: [{ type: 'line', x1: 145, y1: 0, x2: 191, y2: 0, lineWidth: 1.5, lineColor: this.brandGreen }], margin: [0, 0, 0, 18] },
      { text: note, font: this.fontFamily, fontSize: 10.5, color: '#4c514c', lineHeight: 1.55, alignment: 'center', margin: [35, 0, 35, 20] },
      {
        text: [
          { text: 'Connect with the creator: ', color: '#6b6459' },
          { text: 'Tanmay Kalbande', link: 'https://linkedin.com/in/tanmay-kalbande', color: this.brandGreen, bold: true, decoration: 'underline', decorationColor: this.accentUnderline }
        ],
        fontSize: 9.5,
        alignment: 'center',
        margin: [20, 0, 20, 16]
      },
      { text: 'Pustakam', font: this.headingFontFamily, fontSize: 10, bold: true, color: this.brandGreen, alignment: 'center' }
    ];
  }

  private parseMarkdownToContent(markdown: string, project?: BookProject): PDFContent[] {
    markdown = this.preprocessMarkdown(markdown);
    markdown = this.normalizeDashes(markdown);

    const content: PDFContent[] = [];
    const tocEntries: { level: number, title: string, id: string }[] = [];
    let tocPlaceholderIndex: number | null = null;
    let headingIdCounter = 0;

    const lines = markdown.split('\n');
    let paragraphBuffer: string[] = [];
    let isFirstModule = true;
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = 'Code example';
    let skipToC = false;
    let tocDepth = 0;
    let inSkipSubheadingsSection = false;

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text && !skipToC) {
          const editorialCallout = text.match(/^\*\*(Key Idea|In Practice|Common Mistake|Try This|Chapter Recap)\s*:\*\*\s*([\s\S]+)$/i);
          let calloutColor = null;
          let calloutBorder = null;
          let emoji = '💡';
          if (text.startsWith('**⚠️')) { calloutColor = '#fffbeb'; calloutBorder = '#f59e0b'; emoji = '⚠️'; }
          else if (text.startsWith('**💡')) { calloutColor = '#eff6ff'; calloutBorder = '#3b82f6'; emoji = '💡'; }
          else if (text.startsWith('**📌')) { calloutColor = '#f5f3ff'; calloutBorder = '#8b5cf6'; emoji = '📌'; }
          else if (text.startsWith('**🔑')) { calloutColor = '#f0fdf4'; calloutBorder = '#22c55e'; emoji = '🔑'; }

          if (editorialCallout) {
            const label = editorialCallout[1].toUpperCase();
            const body = editorialCallout[2];
            const accents: Record<string, { fill: string; rule: string }> = {
              'KEY IDEA': { fill: this.accentLight, rule: this.brandGreen },
              'IN PRACTICE': { fill: '#edf3f7', rule: '#355c7d' },
              'COMMON MISTAKE': { fill: '#fbf1e8', rule: '#b45309' },
              'TRY THIS': { fill: '#f3eef8', rule: '#725a9b' },
              'CHAPTER RECAP': { fill: '#f1f1ed', rule: '#5f6b61' }
            };
            const accent = accents[label] || accents['KEY IDEA'];
            content.push({
              table: {
                widths: [82, '*'],
                body: [[
                  {
                    text: label,
                    font: this.headingFontFamily,
                    fontSize: 7.5,
                    bold: true,
                    color: accent.rule,
                    characterSpacing: 0.8,
                    margin: [8, 10, 5, 8]
                  },
                  {
                    text: this.parseInlineMarkdown(body),
                    style: 'paragraph',
                    margin: [0, 8, 10, 8]
                  }
                ]]
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: (index: number) => index === 0 ? 3 : 0,
                vLineColor: () => accent.rule,
                fillColor: () => accent.fill,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0
              },
              margin: [0, 8, 0, 16],
              unbreakable: true
            });
          } else if (calloutColor) {
            let cleanText = text;
            const emojiPattern = /^\*\*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚠️💡📌🔑]\s*(.*?)\*\*(.*)/u;
            const emojiMatch = text.match(emojiPattern);
            if (emojiMatch) {
              const titleText = emojiMatch[1].trim();
              const bodyText = emojiMatch[2].trim();
              cleanText = titleText ? `**${titleText}**\n${bodyText}` : bodyText;
            }

            content.push({
              table: {
                widths: [20, '*'],
                body: [[
                  { text: emoji, fontSize: 14, margin: [0, 6, 0, 0], alignment: 'center' },
                  {
                    text: this.parseInlineMarkdown(cleanText),
                    style: 'paragraph',
                    margin: [5, 6, 10, 6]
                  }
                ]]
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: (i: number) => (i === 0 ? 4 : 0),
                vLineColor: () => calloutBorder,
                fillColor: () => calloutColor,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0
              },
              margin: [0, 5, 0, 15]
            });
          } else {
            const formattedText = this.parseInlineMarkdown(text);
            content.push({
              text: formattedText,
              style: 'paragraph',
              alignment: 'justify'
            });
          }
        }
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length === 0 || skipToC) return;

      const fullCode = codeBuffer.join('\n');
      const fontSize = 9;
      const lineHeight = 1.5;
      const paddingTopBottom = 14;
      const paddingLeftRight = 16;

      const chunks = this.splitCodeBlock(fullCode, 40);

      chunks.forEach((chunk, chunkIndex) => {
        const lines = chunk.split('\n');
        const lineCount = lines.length;
        const textHeight = lineCount * fontSize * lineHeight;
        const blockHeight = textHeight + (paddingTopBottom * 2);
        const contentWidth = this.page.contentWidth;

        if (chunkIndex > 0) {
          content.push({ text: '', pageBreak: 'before' });
        }

        content.push({
          table: {
            widths: [contentWidth],
            body: [[
              {
                text: codeLanguage.toUpperCase(),
                font: this.headingFontFamily,
                fontSize: 7.5,
                bold: true,
                color: '#ffffff',
                characterSpacing: 0.8,
                fillColor: this.brandGreen,
                margin: [paddingLeftRight, 6, paddingLeftRight, 5]
              }
            ], [
              {
                text: this.highlightCode(chunk),
                font: this.codeFontFamily,
                fontSize: fontSize,
                color: '#2d3320',
                preserveLeadingSpaces: true,
                lineHeight: lineHeight,
                characterSpacing: -0.2,
                alignment: 'left',
                fillColor: this.codeBg,
                margin: [paddingLeftRight, paddingTopBottom, paddingLeftRight, paddingTopBottom]
              }
            ]]
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (i: number) => (i === 0 ? 4 : 0),
            vLineColor: () => this.brandGreen,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0
          },
          margin: [0, 12, 0, 12],
          unbreakable: blockHeight < 500
        });

        if (chunkIndex < chunks.length - 1) {
          content.push({
            text: '... (continued on next page)',
            fontSize: 7,
            color: '#64748b',
            italics: true,
            alignment: 'right',
            margin: [0, -8, 0, 8]
          });
        }
      });

      codeBuffer = [];
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipToC) {
        const colCount = tableHeaders.length;

        const calculateColumnWidths = () => {
          if (colCount <= 2) {
            return Array(colCount).fill('*');
          }
          
          const colMaxLengths = Array(colCount).fill(0);
          for (let col = 0; col < colCount; col++) {
            let maxLen = tableHeaders[col]?.length || 0;
            for (let row = 0; row < tableRows.length; row++) {
              const cellText = tableRows[row][col] || '';
              if (cellText.length > maxLen) {
                maxLen = cellText.length;
              }
            }
            colMaxLengths[col] = maxLen;
          }
          
          const totalLength = colMaxLengths.reduce((sum, len) => sum + len, 0);
          if (totalLength === 0) {
            return Array(colCount).fill('*');
          }
          
          const weights = colMaxLengths.map(len => Math.sqrt(len || 1));
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          
          const paddingPerCol = 12;
          const availableWidth = this.page.contentWidth - (colCount * paddingPerCol);
          
          let allocatedWidths = weights.map(w => (w / totalWeight) * availableWidth);
          
          const minWidth = 40;
          allocatedWidths = allocatedWidths.map(w => Math.max(w, minWidth));
          
          const sumAllocated = allocatedWidths.reduce((sum, w) => sum + w, 0);
          return allocatedWidths.map(w => (w / sumAllocated) * availableWidth);
        };

        content.push({
          table: {
            headerRows: 1,
            widths: calculateColumnWidths(),
            body: [
              tableHeaders.map(h => ({
                text: this.parseInlineMarkdown(h),
                style: 'tableHeader',
                alignment: 'left',
                fontSize: 9
              })),
              ...tableRows.map(row =>
                row.map(cell => ({
                  text: this.parseInlineMarkdown(cell),
                  style: 'tableCell',
                  alignment: 'left',
                  fontSize: 8.5
                }))
              )
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number) => (i <= 1 ? this.brandGreen : this.accentMid),
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return this.brandGreen;
              return rowIndex % 2 === 0 ? this.rowTint : null;
            },
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4
          },
          margin: [0, 8, 0, 12]
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const leadingSpaces = line.length - line.replace(/^\s+/, '').length;
      const indentLevel = Math.min(Math.floor(leadingSpaces / 2), 3);

      if (trimmed.match(/^#{1,2}\s+(table of contents|contents)/i)) {
        skipToC = true;
        tocDepth = (trimmed.match(/^#+/) || [''])[0].length;

        flushParagraph();
        // NOTE: no forced pageBreak here — the cover page already ends with its
        // own pageBreak:'after', so the ToC naturally lands on a fresh page.
        // Adding another break here would insert a blank page in between.
        content.push({ text: '', margin: [0, 20, 0, 0] });
        content.push({ text: 'CONTENTS', style: 'partLabel', margin: [0, 0, 0, 4] });
        content.push({ text: 'Table of Contents', style: 'h1Module', alignment: 'left', margin: [0, 0, 0, 26] });
        tocPlaceholderIndex = content.length;
        content.push({ text: '', margin: [0, 0, 0, 0] });
        continue;
      }
      if (skipToC && trimmed.match(/^#{1,2}\s+/)) {
        const currentDepth = (trimmed.match(/^#+/) || [''])[0].length;
        if (currentDepth <= tocDepth) {
          skipToC = false;
        }
      }
      if (trimmed === '---' || trimmed.match(/^-{3,}$/)) {
        flushParagraph();
        flushTable();
        content.push({
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: this.page.contentWidth, y2: 0,
            lineWidth: 1.5,
            lineColor: '#cbd5e1'
          }],
          margin: [0, 15, 0, 20]
        });
        continue;
      }
      if (trimmed.startsWith('```')) {
        flushParagraph();
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
          codeLanguage = 'Code example';
        } else {
          inCodeBlock = true;
          const language = trimmed.slice(3).trim();
          codeLanguage = language ? `${language} example` : 'Code example';
        }
        continue;
      }
      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }
      if (!trimmed || skipToC) {
        flushParagraph();
        flushTable();
        continue;
      }
      if (trimmed.includes('|') && !inTable) {
        flushParagraph();
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
        const nextLine = lines[i + 1]?.trim() || '';
        if (nextLine.match(/^\|?[\s\-:]+\|/)) {
          tableHeaders = cells;
          inTable = true;
          i++;
          continue;
        }
      }
      if (inTable && trimmed.includes('|')) {
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.length === tableHeaders.length) {
          tableRows.push(cells);
          continue;
        } else {
          flushTable();
        }
      }
      if (inTable && !trimmed.includes('|')) {
        flushTable();
      }
      const isModuleHeading = trimmed.startsWith('# ') &&
        /^#\s+(module|part|chapter)\s+\d+/i.test(trimmed);
      if (trimmed.startsWith('# ')) {
        flushParagraph();
        let text = trimmed.substring(2);
        inSkipSubheadingsSection = /^(introduction|summary|glossary|conclusion|preface|epilogue|about the author|disclaimer)$/i.test(text.trim());
        
        const partMatch = text.match(/^(PART\s+\d+)\s*[—:-]\s*(.+)$/i) || 
                          text.match(/^(CHAPTER\s+\d+)\s*[—:-]\s*(.+)$/i) ||
                          text.match(/^(MODULE\s+\d+)\s*[—:-]\s*(.+)$/i);
        
        if (partMatch) {
           const label = partMatch[1].toUpperCase();
           const title = this.capitalizeFirstLetter(partMatch[2].trim());
           content.push({ text: '', pageBreak: 'before' });
           isFirstModule = false;
           content.push({ text: '', margin: [0, 50, 0, 0] });
           const headingId = `tocTarget${headingIdCounter++}`;
           content.push({ text: label, style: 'partLabel' });
           content.push({ text: this.parseInlineMarkdown(title), style: 'h1Module', alignment: 'left', id: headingId, keepWithNext: true, headlineLevel: 1 });
            
            let subtitle = 'A focused, practical chapter to help you understand the ideas and apply them with confidence.';
            const modules = project?.modules || (project as any)?.roadmap?.modules;
            if (modules) {
              const numMatch = label.match(/\d+/);
              const index = numMatch ? parseInt(numMatch[0], 10) - 1 : -1;
              let foundModule = null;
              if (index >= 0 && index < modules.length) {
                foundModule = modules[index];
              }
              const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!foundModule || foundModule.title.toLowerCase().replace(/[^a-z0-9]/g, '') !== normalizedTitle) {
                const matched = modules.find((m: any) => m.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTitle);
                if (matched) {
                  foundModule = matched;
                }
              }
              if (foundModule) {
                const possibleDesc = foundModule.description || foundModule.focus;
                if (possibleDesc && possibleDesc.trim()) {
                  subtitle = possibleDesc.trim();
                }
              }
            }

            content.push({
              text: this.parseInlineMarkdown(subtitle),
              fontSize: 10.5,
              italics: true,
              color: '#6b6459',
              lineHeight: 1.45,
              margin: [0, -6, 18, 14],
              keepWithNext: true
            });
            content.push({
              canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1.5, lineColor: this.brandGreen }],
              margin: [0, -10, 0, 18]
            });
           tocEntries.push({ level: 1, title: `${label} \u2014 ${title}`, id: headingId });
        } else {
           text = this.capitalizeFirstLetter(text);
           const formattedText = this.parseInlineMarkdown(text);
           if (isModuleHeading) {
             content.push({ text: '', pageBreak: 'before' });
             isFirstModule = false;
             content.push({ text: '', margin: [0, 50, 0, 0] });
           }
           const headingId = `tocTarget${headingIdCounter++}`;
           content.push({ text: formattedText, style: 'h1Module', alignment: 'left', id: headingId, keepWithNext: true, headlineLevel: 1 });
           content.push({
             canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1.5, lineColor: this.brandGreen }],
             margin: [0, -10, 0, 18]
           });
           if (isModuleHeading) {
             tocEntries.push({ level: 1, title: text, id: headingId });
           }
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        let text = trimmed.substring(3);
        text = this.capitalizeFirstLetter(text);
        
        const isPrimarySectionStart = /^(introduction|summary|glossary|conclusion|preface|epilogue|about the author|disclaimer)$/i.test(text.trim());
        if (isPrimarySectionStart) {
          inSkipSubheadingsSection = true;
        }
        
        const headingId = `tocTarget${headingIdCounter++}`;
        content.push({ text: this.parseInlineMarkdown(text), style: 'h2', alignment: 'left', id: headingId, keepWithNext: true, headlineLevel: 2 });
        
        if (isPrimarySectionStart || !inSkipSubheadingsSection) {
          tocEntries.push({ level: 2, title: text, id: headingId });
        }
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        let text = trimmed.substring(4);
        text = this.capitalizeFirstLetter(text);
        const headingId = `tocTarget${headingIdCounter++}`;
        content.push({ text: this.parseInlineMarkdown(text), style: 'h3', alignment: 'left', id: headingId, keepWithNext: true, headlineLevel: 3 });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        let text = trimmed.substring(5);
        text = this.capitalizeFirstLetter(text);
        content.push({ text: this.parseInlineMarkdown(text), style: 'h4', alignment: 'left' });
      } else if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph();
        const listText = trimmed.replace(/^[-*+]\s+/, '');
        const formattedText = this.parseInlineMarkdown(listText);
        const bullet = ['\u2022', '-', '\u2022', '-'][indentLevel] || '\u2022';
        content.push({
          text: Array.isArray(formattedText) ? [{ text: bullet + ' ' }, ...formattedText] : [{ text: bullet + ' ' }, formattedText],
          style: 'listItem',
          margin: [10 + indentLevel * 16, 3, 0, 3],
          alignment: 'left'
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        const listText = trimmed.replace(/^\d+\.\s+/, '');
        const formattedText = this.parseInlineMarkdown(listText);
        content.push({
          text: Array.isArray(formattedText) ? [{ text: num + '. ' }, ...formattedText] : [{ text: num + '. ' }, formattedText],
          style: 'listItem',
          margin: [10 + indentLevel * 16, 3, 0, 3],
          alignment: 'left'
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        const quoteText = trimmed.substring(1).trim();
        content.push({
          columns: [
            {
              width: 15,
              text: '“',
              fontSize: 32,
              bold: true,
              color: this.brandGreen,
              margin: [0, -8, 0, 0]
            },
            {
              width: '*',
              text: this.parseInlineMarkdown(quoteText),
              style: 'blockquote',
              margin: [5, 0, 0, 0],
              alignment: 'justify'
            }
          ],
          margin: [15, 8, 15, 8]
        });
      } else {
        const cleaned = trimmed.trim();
        if (cleaned) paragraphBuffer.push(cleaned);
      }
    }
    flushParagraph();
    flushCodeBlock();
    flushTable();

    if (tocPlaceholderIndex !== null) {
      const tocRows = tocEntries.map((entry) => {
        const isChapter = entry.level === 1;
        const isPrimarySection = isChapter || 
          /^(introduction|summary|glossary|conclusion|preface|epilogue|about the author|disclaimer)$/i.test(entry.title.trim());
          
        return [
          {
            text: entry.title,
            style: isPrimarySection ? 'h4' : 'tocChapter',
            bold: isPrimarySection,
            linkToDestination: entry.id,
            margin: [0, isPrimarySection ? 6 : 2, 0, isPrimarySection ? 2 : 2],
            border: [false, false, false, true]
          },
          {
            text: [{ text: '', pageReference: entry.id }],
            style: isPrimarySection ? 'h4' : 'tocChapter',
            bold: isPrimarySection,
            alignment: 'right',
            margin: [0, isPrimarySection ? 6 : 2, 0, isPrimarySection ? 2 : 2],
            border: [false, false, false, true]
          }
        ];
      });

      const tocBlock: PDFContent[] = [
        {
          table: {
            widths: ['*', 46],
            dontBreakRows: true,
            body: tocRows
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#cbd5e1',
            hLineStyle: () => ({ dash: { length: 2, space: 3 } }),
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 1,
            paddingBottom: () => 1
          },
          margin: [0, 0, 0, 8]
        }
      ];
      content.splice(tocPlaceholderIndex, 1, ...tocBlock);
    }

    return content;
  }

  private generateSafeFilename(title: string): string {
    const sanitized = title
      .replace(/[^a-z0-9\s-]/gi, '')
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('_')
      .substring(0, 50);

    const date = new Date().toISOString().slice(0, 10);
    return `${sanitized}_${date}.pdf`;
  }

  public async generate(book: BookFile, onProgress: (progress: number) => void): Promise<void> {
    onProgress(10);
    const pdfMakeLib = await loadPdfMake();

    const availableFonts = pdfMakeLib.fonts || {};
    this.fontFamily = availableFonts['SourceSerif'] ? 'SourceSerif' : 'Roboto';
    this.codeFontFamily = availableFonts['Aptos-Mono'] ? 'Aptos-Mono' : 'Roboto';
    this.headingFontFamily = availableFonts['Rubik'] ? 'Rubik' : 'Roboto';

    onProgress(30);
    const totalWords = (book.modules || []).reduce((s, m) => s + (m.wordCount || 0), 0);
    const chapterCount = (book.modules || []).length;
    const readTimeMinutes = totalWords > 0 ? Math.max(1, Math.round(totalWords / 248)) : undefined;

    // Per-category accent so each book gets its own cohesive palette instead of
    // every cover using the same hardcoded orange/green regardless of topic.
    const categoryAccents: Record<string, string> = {
      technology: '#123a5c',
      science: '#0f3d3e',
      finance: '#152447',
      business: '#1b4332',
      health: '#12432c',
      history: '#4a1620',
      cooking: '#5c3317',
      art: '#3b1f4d',
      math: '#241b52',
      sustainability: '#1b4332',
      'circular-economy': '#1b4332',
      marketing: '#1e3a5c',
      psychology: '#3b1f4d',
      productivity: '#1b4332'
    };
    const categoryKey = (book.category || '').toLowerCase().trim();
    const accentColor = categoryAccents[categoryKey] || this.brandGreen;
    this.applyAccentColor(accentColor);

    const coverMeta: CoverMetadata = {
      coverTitle: book.title,
      subtitle: `${book.complexity.toUpperCase()} LEVEL • ${book.category.toUpperCase()} EDITION`,
      tagline: book.goal,
      blurb: book.metaDescription || book.goal,
      epigraph: { quote: 'Learning is a treasure that will follow its owner everywhere.', author: 'Chinese Proverb' },
      audience: `Designed for ${book.complexity} learners who want clear, actionable insights on ${book.category}.`,
      learningPoints: book.tags.length > 0 
        ? book.tags.map(t => this.capitalizeFirstLetter(t)) 
        : ['Core Concepts', 'Practical Application', 'Key Takeaways', 'Real-world Context'],
      tags: book.tags,
      accentColor,
      category: book.category,
      complexity: book.complexity,
      chapterCount,
      wordCount: totalWords || undefined,
      readTimeMinutes
    };

    const coverContent = this.createCoverPage(book.title, coverMeta);

    onProgress(60);
    const mainContent = this.parseMarkdownToContent(book.finalBook || '', book);
    const endMatterContent = this.createEndMatterPage(book.goal);

    onProgress(85);
    this.content = [...coverContent, ...mainContent, ...endMatterContent];

    const docDefinition: any = {
      background: (currentPage: number) => {
        if (currentPage === 1) {
          return {
            canvas: [
              { type: 'rect', x: 0, y: 0, w: this.page.width, h: this.page.height, color: '#faf7f0' }
            ]
          };
        }
        return {};
      },
      content: this.content,
      styles: this.styles,
      defaultStyle: {
        font: this.fontFamily,
        fontSize: 10,
        color: '#1a1a1a',
        lineHeight: 1.5,
        alignment: 'justify'
      },
      pageSize: { width: this.page.width, height: this.page.height },
      pageMargins: [48, 60, 48, 50],
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        const isEven = currentPage % 2 === 0;
        const titleCol = { text: this.normalizeDashes(book.title), fontSize: 8, color: '#666666', italics: true, width: '*' };
        const pageCol = { text: `${currentPage}`, fontSize: 8, color: '#666666', width: 'auto' };
        return {
          columns: isEven
            ? [{ ...pageCol, alignment: 'left' }, { ...titleCol, alignment: 'right' }]
            : [{ ...titleCol, alignment: 'left' }, { ...pageCol, alignment: 'right' }],
          margin: [48, 20, 48, 0]
        };
      },
      footer: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: 'Pustakam Injin',
              font: this.codeFontFamily,
              fontSize: 7.5,
              color: '#888888',
              alignment: 'left',
              width: 'auto'
            },
            {
              text: 'https://www.linkedin.com/in/tanmay-kalbande/',
              link: 'https://www.linkedin.com/in/tanmay-kalbande/',
              font: this.codeFontFamily,
              fontSize: 7.5,
              color: '#888888',
              alignment: 'right',
              width: '*'
            }
          ],
          margin: [48, 15, 48, 0]
        };
      },
      info: {
        title: book.title,
        author: 'Pustakam',
        creator: 'Pustakam',
        subject: book.goal,
        keywords: 'Pustakam, AI, Knowledge'
      }
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = this.generateSafeFilename(book.title);
        pdfDocGenerator.download(filename, () => {
          onProgress(100);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const pdfService = {
  async generatePdf(book: BookFile, onProgress: (progress: number) => void): Promise<void> {
    if (isGenerating) {
      throw new Error('A PDF is already being generated. Please wait.');
    }
    isGenerating = true;
    onProgress(5);
    try {
      const generator = new ProfessionalPdfGenerator();
      await generator.generate(book, onProgress);
    } catch (error: any) {
      console.error('[PDF] Generation error:', error);
      onProgress(0);
      throw error;
    } finally {
      isGenerating = false;
    }
  }
};
