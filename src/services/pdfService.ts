// src/services/pdfService.ts - EXACT PUBLISHED BOOK RENDERER (PORTED FROM PUSTAKAM)
import type { BookFile } from '../components/BookReaderPage';

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

interface CoverMetadata {
  coverTitle: string;
  subtitle: string;
  tagline: string;
  blurb: string;
  epigraph: { quote: string; author: string };
  audience: string;
  learningPoints: string[];
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

  // 6 × 9 inches standard non-fiction book size (72 pt/inch)
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
    const lines = markdown.split('\n');
    let stripIdx = 0;
    while (stripIdx < lines.length) {
      const t = lines[stripIdx].trim();
      if (t === '') { stripIdx++; continue; }
      if (/^#\s+/.test(t) && stripIdx === lines.findIndex(l => l.trim() !== '')) {
        lines.splice(stripIdx, 1);
        continue;
      }
      if (/^\*\*\s*(Generated|Words|Provider)\s*[:.]\*\*/i.test(t)) {
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
        parts.push({ text: match[13], fontSize: 11, characterSpacing: 0.5 });
      } else if (match[11]) {
        parts.push({ text: match[11], link: match[12], color: '#2563eb', decoration: 'underline', decorationColor: '#93c5fd' });
      } else if (match[9] !== undefined) {
        // Drop inline image syntax
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

  private createCoverAccent(): any[] {
    const { width, height } = this.page;
    const marginX = 48;
    return [
      { type: 'rect', x: 0, y: 0, w: 7, h: height, color: this.brandGreen },
      { type: 'rect', x: 7, y: 0, w: 2, h: height, color: this.brandTan },
      { type: 'line', x1: marginX, y1: 92, x2: width - marginX, y2: 92, lineWidth: 1, lineColor: this.brandGreen },
      {
        type: 'polyline',
        points: [
          { x: width - 28, y: height },
          { x: width, y: height },
          { x: width, y: height - 28 }
        ],
        lineWidth: 1.5,
        lineColor: this.brandTan
      }
    ];
  }

  private createCoverPage(title: string, coverMeta: CoverMetadata): PDFContent[] {
    const normalizedTitle = this.normalizeDashes(title);
    const displayTitle = coverMeta.coverTitle || normalizedTitle;
    const titleSize = displayTitle.length > 120 ? 20 : displayTitle.length > 90 ? 23 : displayTitle.length > 62 ? 27 : displayTitle.length > 42 ? 31 : 36;
    const darkText = this.brandGreenDeep;
    const subtleText = '#6b6459';
    const accent = this.createCoverAccent();
    const coverTagline = coverMeta.tagline;
    const seriesText = 'PUSTAKAM STUDY SERIES';
    const editionText = 'AI-ASSISTED LEARNING EDITION';

    const titleFirstChar = displayTitle.charAt(0);
    const titleRest = displayTitle.slice(1);
    const titleRuns = titleFirstChar
      ? [{ text: titleFirstChar, color: this.brandTan }, { text: titleRest }]
      : displayTitle;

    return [
      { canvas: accent, absolutePosition: { x: 0, y: 0 } },
      { text: '', margin: [0, 60, 0, 0] },
      { text: seriesText, font: this.headingFontFamily, fontSize: 7.5, bold: true, color: this.brandGreen, characterSpacing: 1.4, alignment: 'left', margin: [0, 0, 0, 14] },
      { text: titleRuns, font: this.fontFamily, fontSize: titleSize, bold: true, color: darkText, lineHeight: 1.12, alignment: 'left', margin: [0, 0, 18, coverMeta.subtitle ? 8 : 16] },
      ...(coverMeta.subtitle ? [{ text: coverMeta.subtitle, font: this.fontFamily, fontSize: 12, color: subtleText, lineHeight: 1.4, alignment: 'left', margin: [0, 0, 24, 16] }] : []),
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 64, y2: 0, lineWidth: 1.5, lineColor: this.brandTan }], margin: [0, 0, 0, 16] },
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: coverTagline, font: this.fontFamily, fontSize: 11.5, italics: true, color: '#ffffff', lineHeight: 1.45, margin: [0, 0, 0, 10] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 34, y2: 0, lineWidth: 1, lineColor: this.accentSubtle }], margin: [0, 0, 0, 8] },
              { text: editionText, font: this.headingFontFamily, fontSize: 7, bold: true, characterSpacing: 1.2, color: this.accentSubtle, margin: [0, 0, 0, 3] },
              { text: `First digital edition - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - (c) ${new Date().getFullYear()} Pustakam`, fontSize: 7.2, color: this.accentSubtle }
            ],
            alignment: 'left'
          }]]
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          hLineColor: () => 'transparent',
          vLineColor: () => 'transparent',
          paddingLeft: () => 22,
          paddingRight: () => 22,
          paddingTop: () => 14,
          paddingBottom: () => 14,
          fillColor: () => this.brandGreen
        },
        margin: [0, 0, 0, 0],
        unbreakable: true
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

  private parseMarkdownToContent(markdown: string, book?: BookFile): PDFContent[] {
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
        content.push({ text: 'Table of Contents', style: 'h1Module', alignment: 'left' });
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
            if (book?.modules) {
              const numMatch = label.match(/\d+/);
              const index = numMatch ? parseInt(numMatch[0], 10) - 1 : -1;
              let foundModule = null;
              if (index >= 0 && index < book.modules.length) {
                foundModule = book.modules[index];
              }
              const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!foundModule || foundModule.title.toLowerCase().replace(/[^a-z0-9]/g, '') !== normalizedTitle) {
                const matched = book.modules.find(m => m.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTitle);
                if (matched) {
                  foundModule = matched;
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

    onProgress(30);
    const coverMeta: CoverMetadata = {
      coverTitle: book.title,
      subtitle: `${book.complexity.toUpperCase()} LEVEL • ${book.category.toUpperCase()} EDITION`,
      tagline: book.goal,
      blurb: book.metaDescription || book.goal,
      epigraph: { quote: 'Learning is a treasure that will follow its owner everywhere.', author: 'Chinese Proverb' },
      audience: `Designed for ${book.complexity} learners who want clear, actionable insights on ${book.category}.`,
      learningPoints: book.tags.length > 0 
        ? book.tags.map(t => this.capitalizeFirstLetter(t)) 
        : ['Core Concepts', 'Practical Application', 'Key Takeaways', 'Real-world Context']
    };

    const coverContent = this.createCoverPage(book.title, coverMeta);
    const overviewContent = this.createLearningOverview(coverMeta);

    onProgress(60);
    const mainContent = this.parseMarkdownToContent(book.finalBook || '', book);
    const endMatterContent = this.createEndMatterPage(book.goal);

    onProgress(85);
    this.content = [...coverContent, ...overviewContent, ...mainContent, ...endMatterContent];

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
        font: 'Roboto',
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
              text: 'Author: Tanmay Kalbande (LinkedIn)',
              link: 'https://linkedin.com/in/tanmay-kalbande',
              fontSize: 7.5,
              color: '#2563eb',
              decoration: 'underline',
              alignment: 'left'
            },
            {
              text: 'pustakam.tanmaysk.in',
              fontSize: 7.5,
              color: '#888888',
              alignment: 'right'
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
