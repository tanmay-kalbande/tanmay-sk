import { marked } from "marked";

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

export function renderMarkdown(value: string) {
  return marked.parse(escapeHtml(value)) as string;
}
