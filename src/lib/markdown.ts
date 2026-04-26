import { marked, Renderer, Tokens } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true,
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return null;
}

function autolinkSegment(value: string) {
  const withUrls = value.replace(
    /(^|[\s(>])((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]\}])/g,
    (_, prefix: string, url: string) => {
      const href = url.startsWith("www.") ? `https://${url}` : url;
      return `${prefix}[${url}](${href})`;
    },
  );

  return withUrls.replace(
    /(^|[\s(>])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?=$|[\s),!?;:])/gi,
    (_, prefix: string, email: string) => `${prefix}[${email}](mailto:${email})`,
  );
}

function preprocessMarkdown(value: string) {
  return value
    .split(/(```[\s\S]*?```)/g)
    .map((segment, index) => (index % 2 === 1 ? segment : autolinkSegment(segment)))
    .join("");
}

const AUTOLINK_TEXT_RE = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]\}]|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

function buildAutolinkFragment(doc: Document, value: string) {
  AUTOLINK_TEXT_RE.lastIndex = 0;
  if (!AUTOLINK_TEXT_RE.test(value)) return null;

  AUTOLINK_TEXT_RE.lastIndex = 0;
  const fragment = doc.createDocumentFragment();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = AUTOLINK_TEXT_RE.exec(value)) !== null) {
    const token = match[0];
    const index = match.index;

    if (index > lastIndex) {
      fragment.append(value.slice(lastIndex, index));
    }

    const href = token.includes("@") && !token.startsWith("http") && !token.startsWith("www.")
      ? `mailto:${token}`
      : token.startsWith("www.")
        ? `https://${token}`
        : token;

    const safe = safeUrl(href);
    if (safe) {
      const anchor = doc.createElement("a");
      anchor.href = safe;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = token;
      fragment.append(anchor);
    } else {
      fragment.append(token);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < value.length) {
    fragment.append(value.slice(lastIndex));
  }

  return fragment;
}

function enhanceAutolinkHtml(html: string) {
  if (typeof document === "undefined" || typeof NodeFilter === "undefined") {
    return html;
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_SKIP;
      if (["A", "CODE", "PRE", "SCRIPT", "STYLE", "BUTTON"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }

      AUTOLINK_TEXT_RE.lastIndex = 0;
      return AUTOLINK_TEXT_RE.test(node.nodeValue ?? "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  textNodes.forEach((node) => {
    const fragment = buildAutolinkFragment(node.ownerDocument, node.nodeValue ?? "");
    if (fragment) {
      node.parentNode?.replaceChild(fragment, node);
    }
  });

  return template.innerHTML;
}

const renderer = new Renderer();

renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
  const level = Math.min(depth, 3);
  return `<h${level} class="qx__heading qx__heading--${level}">${renderer.parser.parseInline(tokens)}</h${level}>`;
};

renderer.paragraph = ({ tokens }: Tokens.Paragraph) =>
  `<p>${renderer.parser.parseInline(tokens)}</p>`;

renderer.blockquote = ({ tokens }: Tokens.Blockquote) =>
  `<blockquote class="qx__bq">${renderer.parser.parse(tokens, false)}</blockquote>`;

renderer.codespan = ({ text }: Tokens.Codespan) => `<code>${text}</code>`;

renderer.link = ({ href, tokens, title }: Tokens.Link) => {
  const safe = safeUrl(href);
  const label = renderer.parser.parseInline(tokens);
  if (!safe) return label;

  const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
  return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${label}</a>`;
};

renderer.table = (token: Tokens.Table) => {
  const header = token.header
    .map((cell) => renderer.tablecell({ ...cell, header: true }))
    .join("");
  const rows = token.rows
    .map((row) => renderer.tablerow({ text: row.map((cell) => renderer.tablecell(cell)).join("") }))
    .join("");

  return `<div class="qx__table-wrap"><table class="qx__table"><thead>${renderer.tablerow({ text: header })}</thead><tbody>${rows}</tbody></table></div>`;
};

renderer.code = ({ text, lang }: Tokens.Code) => {
  const language = (lang ?? "text").trim().match(/^[\w.+-]+/)?.[0] ?? "text";
  let encoded: string;
  try {
    encoded = escapeAttr(encodeURIComponent(text));
  } catch {
    // Streaming can produce partial/malformed text that breaks encodeURIComponent
    encoded = escapeAttr(text);
  }
  const code = text.replace(/\n$/, "");

  return [
    `<div class="qx__codeblock" data-lang="${escapeAttr(language)}">`,
    '<div class="qx__codebar">',
    `<span class="qx__code-lang">${escapeHtml(language)}</span>`,
    `<button type="button" class="qx__code-copy" data-copy-code="${encoded}" aria-label="Copy ${escapeAttr(language)} code">Copy</button>`,
    "</div>",
    `<pre><code>${code}</code></pre>`,
    "</div>",
  ].join("");
};

export function renderMarkdown(value: string) {
  const safeInput = escapeHtml(preprocessMarkdown(value));
  const html = marked.parse(safeInput, { renderer }) as string;
  return enhanceAutolinkHtml(html);
}
