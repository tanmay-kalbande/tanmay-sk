// src/services/pdfService.ts - Adapted for tanmay-sk-main library
import type { BookFile } from '../components/BookReaderPage';

let isGenerating = false;
let pdfMake: any = null;
let fontsLoaded = false;

function formatGeneratedDate(dateStr?: string) {
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
      // Direct vfs map check
      if (fontsAny['Roboto-Regular.ttf'] || Object.keys(fontsAny).some(k => k.includes('Roboto'))) {
        vfs = fontsAny;
      } else {
        // Deep key search for an object containing Roboto fonts
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

    // Set vfs across all scope references used by pdfmake/pdfkit internals
    pdfMake.vfs = vfs;
    if ((pdfMakeModule as any).default) {
      (pdfMakeModule as any).default.vfs = vfs;
    }
    (window as any).pdfMake = pdfMake;
    (window as any).pdfMake.vfs = vfs;

    // Dynamically match font keys in VFS to handle any path variations
    const vfsKeys = Object.keys(vfs);
    const regKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-regular.ttf')) || 'Roboto-Regular.ttf';
    const medKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-medium.ttf') || k.toLowerCase().endsWith('roboto-bold.ttf')) || 'Roboto-Medium.ttf';
    const italicKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-italic.ttf')) || 'Roboto-Italic.ttf';
    const medItalicKey = vfsKeys.find(k => k.toLowerCase().endsWith('roboto-mediumitalic.ttf') || k.toLowerCase().endsWith('roboto-bolditalic.ttf')) || 'Roboto-MediumItalic.ttf';

    const fontConfig: any = {
      Roboto: {
        normal: regKey,
        bold: medKey,
        italics: italicKey,
        bolditalics: medItalicKey
      }
    };

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
}

class ProfessionalPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;
  private fontFamily: string = 'Roboto';
  private codeFontFamily: string = 'Roboto';
  private headingFontFamily: string = 'Roboto';

  private brandGreen = '#1b4332';
  private readonly brandTan = '#a9793f';
  private readonly page = { width: 432, height: 648, contentWidth: 336 };

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
      h1Module: {
        fontSize: 22,
        bold: true,
        margin: [0, 0, 0, 16],
        color: '#1a202c',
        lineHeight: 1.18,
        characterSpacing: 0.35,
        alignment: 'left'
      },
      h2: {
        fontSize: 15,
        bold: true,
        margin: [0, 18, 0, 8],
        color: '#2d3748',
        lineHeight: 1.3,
        alignment: 'left'
      },
      h3: {
        fontSize: 12,
        bold: true,
        margin: [0, 14, 0, 6],
        color: '#2d3748',
        lineHeight: 1.3,
        alignment: 'left'
      },
      paragraph: {
        fontSize: 10,
        lineHeight: 1.5,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
        color: '#1a1a1a'
      }
    };
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

  private parseInlineMarkdown(text: string): any {
    text = this.normalizeDashes(text);
    const parts: any[] = [];
    let lastIndex = 0;

    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|~~(.+?)~~|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]))/gu;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index) });
      }

      if (match[13]) {
        parts.push({ text: match[13], fontSize: 11 });
      } else if (match[11]) {
        parts.push({ text: match[11], link: match[12], color: '#2563eb', decoration: 'underline' });
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
          color: '#e05a35',
          bold: true,
          fontSize: 9
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

  private createCoverCardPage(book: BookFile): PDFContent[] {
    const totalWords = book.wordCount.toLocaleString();
    const editionLabel = book.edition === 'street' ? '🔥 STREET EDITION' : book.edition === 'desi' ? '🇮🇳 DESI EDITION' : '✨ STELLAR EDITION';

    return [
      { text: '', margin: [0, 30, 0, 0] },
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                {
                  text: [
                    { text: book.complexity.toUpperCase(), color: book.complexity === 'beginner' ? '#34d399' : book.complexity === 'intermediate' ? '#fbbf24' : '#f87171', bold: true },
                    { text: '   |   ', color: '#555' },
                    { text: book.category.toUpperCase(), color: '#888' },
                    ...(book.tags.length > 0 ? [{ text: '   |   ' + book.tags.slice(0, 3).map((t: string) => t.toUpperCase()).join('  •  '), color: '#888' }] : []),
                    { text: '   |   ' + editionLabel, color: '#e05a35', bold: true },
                    ...(book.modelUsed ? [{ text: '   |   🤖 ' + book.modelUsed.toUpperCase(), color: '#aaa' }] : [])
                  ],
                  fontSize: 7.5,
                  margin: [0, 0, 0, 16]
                },
                {
                  text: book.title,
                  font: this.headingFontFamily,
                  fontSize: 26,
                  bold: true,
                  color: '#f0ede8',
                  lineHeight: 1.15,
                  margin: [0, 0, 0, 12]
                },
                {
                  text: book.goal,
                  font: this.codeFontFamily,
                  fontSize: 9.5,
                  color: '#999999',
                  lineHeight: 1.5,
                  margin: [0, 0, 0, 20]
                },
                {
                  canvas: [{ type: 'line', x1: 0, y1: 0, x2: 270, y2: 0, lineWidth: 1, lineColor: '#333333' }],
                  margin: [0, 0, 0, 16]
                },
                {
                  text: [
                    { text: `⏱ ${book.readingTimeMins} MIN READ   •   `, color: '#777' },
                    { text: `📖 ${book.moduleCount} CHAPTERS   •   `, color: '#777' },
                    { text: `📚 ${totalWords} WORDS`, color: '#777' },
                    ...(book.generatedAt ? [{ text: `   •   📅 ${formatGeneratedDate(book.generatedAt).toUpperCase()}`, color: '#666' }] : [])
                  ],
                  fontSize: 7.5,
                  font: this.codeFontFamily
                }
              ],
              fillColor: '#1c1c1b',
              margin: [18, 20, 18, 20]
            }
          ]]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#333333',
          vLineColor: () => '#333333'
        },
        margin: [0, 0, 0, 24]
      },
      {
        columns: [
          { text: 'PUSTAKAM REFERENCE LIBRARY', fontSize: 8, color: '#666666', font: this.codeFontFamily },
          { text: 'PUSTAKAM.TANMAYSK.IN', fontSize: 8, color: '#666666', font: this.codeFontFamily, alignment: 'right' }
        ]
      },
      { text: '', pageBreak: 'after' }
    ];
  }

  private parseMarkdownToContent(markdown: string): PDFContent[] {
    markdown = this.normalizeDashes(markdown);
    const content: PDFContent[] = [];
    const lines = markdown.split('\n');

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('# ')) {
        const title = trimmed.substring(2);
        content.push({ text: title, style: 'h1Module', keepWithNext: true });
      } else if (trimmed.startsWith('## ')) {
        const title = trimmed.substring(3);
        content.push({ text: title, style: 'h2', keepWithNext: true });
      } else if (trimmed.startsWith('### ')) {
        const title = trimmed.substring(4);
        content.push({ text: title, style: 'h3', keepWithNext: true });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.substring(2);
        content.push({
          text: [{ text: '•  ', bold: true, color: '#e05a35' }, ...[this.parseInlineMarkdown(bulletText)]],
          style: 'paragraph'
        });
      } else {
        content.push({
          text: this.parseInlineMarkdown(trimmed),
          style: 'paragraph'
        });
      }
    });

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

    onProgress(30);
    const coverContent = this.createCoverCardPage(book);

    onProgress(60);
    const mainContent = this.parseMarkdownToContent(book.finalBook || '');

    onProgress(85);
    this.content = [...coverContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        color: '#1a1a1a',
        lineHeight: 1.5,
        alignment: 'justify'
      },
      pageSize: { width: this.page.width, height: this.page.height },
      pageMargins: [40, 48, 40, 40],
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            { text: book.title, fontSize: 8, color: '#666666', italics: true },
            { text: `Page ${currentPage}`, fontSize: 8, color: '#666666', alignment: 'right' }
          ],
          margin: [40, 18, 40, 0]
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
