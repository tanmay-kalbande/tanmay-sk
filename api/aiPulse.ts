type VercelLikeRequest = {
  method?: string;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type TopicDatum = {
  topic: string;
  research: number;
  repos: number;
  news: number;
  score: number;
};

type PulseItem = {
  title: string;
  source: string;
  score: number;
  topic: string;
  url: string;
  detail: string;
  publishedAt: string;
};

type AiPulsePayload = {
  generatedAt: string;
  sourceMode: "live" | "fallback";
  metrics: {
    attentionScore: number;
    researchCount: number;
    repoStars: number;
    discussionPoints: number;
    hottestTopic: string;
  };
  topicMomentum: TopicDatum[];
  sourceMix: Array<{ label: string; value: number; color: string }>;
  trend: Array<{ label: string; ai: number; dev: number; data: number }>;
  items: PulseItem[];
};

type HnItem = {
  id: number;
  by?: string;
  time?: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  type?: string;
};

type GitHubRepo = {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  language?: string | null;
  pushed_at?: string;
  topics?: string[];
};

type GitHubSearchResponse = {
  items?: GitHubRepo[];
};

const CACHE_TTL_MS = 1000 * 60 * 15;
let cachedPayload: { expiresAt: number; payload: AiPulsePayload } | null = null;

const topicRules = [
  { topic: "Agents", terms: ["agent", "agents", "agentic", "tool use", "workflow"] },
  { topic: "LLMs", terms: ["llm", "language model", "gpt", "gemini", "claude", "llama", "transformer"] },
  { topic: "Computer Vision", terms: ["vision", "image", "video", "diffusion", "multimodal"] },
  { topic: "Data Engineering", terms: ["data", "warehouse", "pipeline", "lakehouse", "analytics", "sql"] },
  { topic: "Open Source", terms: ["open source", "github", "repo", "library", "framework"] },
  { topic: "MLOps", terms: ["mlops", "deploy", "monitoring", "inference", "serving", "evaluation"] },
];

function buildFallbackPayload(): AiPulsePayload {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    sourceMode: "fallback",
    metrics: {
      attentionScore: 86,
      researchCount: 24,
      repoStars: 182400,
      discussionPoints: 11820,
      hottestTopic: "Agents",
    },
    topicMomentum: [
      { topic: "Agents", research: 32, repos: 44, news: 39, score: 96 },
      { topic: "LLMs", research: 41, repos: 28, news: 31, score: 91 },
      { topic: "Data Engineering", research: 18, repos: 34, news: 23, score: 74 },
      { topic: "Computer Vision", research: 28, repos: 19, news: 17, score: 68 },
      { topic: "MLOps", research: 15, repos: 26, news: 18, score: 63 },
      { topic: "Open Source", research: 11, repos: 37, news: 20, score: 62 },
    ],
    sourceMix: [
      { label: "Research", value: 24, color: "#2563eb" },
      { label: "Open Source", value: 30, color: "#16a34a" },
      { label: "Tech News", value: 28, color: "#f97316" },
    ],
    trend: [
      { label: "Mon", ai: 62, dev: 38, data: 28 },
      { label: "Tue", ai: 66, dev: 41, data: 30 },
      { label: "Wed", ai: 72, dev: 44, data: 34 },
      { label: "Thu", ai: 78, dev: 46, data: 39 },
      { label: "Fri", ai: 86, dev: 51, data: 43 },
      { label: "Sat", ai: 82, dev: 47, data: 38 },
      { label: "Sun", ai: 90, dev: 53, data: 45 },
    ],
    items: [
      {
        title: "Agent workflows move from demos to production controls",
        source: "Tech Signal",
        score: 94,
        topic: "Agents",
        url: "https://news.ycombinator.com/",
        detail: "High discussion velocity around tool-use reliability, evaluation, and handoff design.",
        publishedAt: generatedAt,
      },
      {
        title: "New open-source LLM tools focus on observability and evals",
        source: "GitHub",
        score: 89,
        topic: "MLOps",
        url: "https://github.com/search?q=llm+evals&type=repositories",
        detail: "Repositories with recent pushes cluster around tracing, prompts, and regression testing.",
        publishedAt: generatedAt,
      },
      {
        title: "Retrieval and lightweight fine-tuning remain strong research themes",
        source: "arXiv",
        score: 84,
        topic: "LLMs",
        url: "https://arxiv.org/list/cs.CL/recent",
        detail: "Recent abstracts continue to mention retrieval, alignment, and efficiency.",
        publishedAt: generatedAt,
      },
    ],
  };
}

function classifyTopic(text: string): string {
  const normalized = text.toLowerCase();
  const matched = topicRules
    .map((rule) => ({
      topic: rule.topic,
      hits: rule.terms.filter((term) => normalized.includes(term)).length,
    }))
    .sort((a, b) => b.hits - a.hits)[0];

  return matched && matched.hits > 0 ? matched.topic : "Data Engineering";
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function entryText(entry: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return stripTags(entry.match(pattern)?.[1] ?? "");
}

function parseArxiv(xml: string): PulseItem[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.slice(0, 24).map((entry) => {
    const title = entryText(entry, "title");
    const summary = entryText(entry, "summary");
    const publishedAt = entryText(entry, "published") || new Date().toISOString();
    const url = entryText(entry, "id") || "https://arxiv.org/";
    const topic = classifyTopic(`${title} ${summary}`);
    const score = 60 + Math.min(35, Math.round(summary.length / 80));

    return {
      title,
      source: "arXiv",
      score,
      topic,
      url,
      detail: summary.slice(0, 190),
      publishedAt,
    };
  }).filter((item) => item.title);
}

async function fetchArxiv(): Promise<PulseItem[]> {
  const query = encodeURIComponent("cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV");
  const url = `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=24&sortBy=submittedDate&sortOrder=descending`;
  const response = await fetch(url, { headers: { "User-Agent": "tanmay-sk-ai-pulse/1.0" } });
  if (!response.ok) throw new Error(`arXiv ${response.status}`);
  return parseArxiv(await response.text());
}

async function fetchHn(): Promise<PulseItem[]> {
  const idsResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
  if (!idsResponse.ok) throw new Error(`HN ids ${idsResponse.status}`);
  const ids = (await idsResponse.json() as number[]).slice(0, 40);
  const stories = await Promise.all(
    ids.map(async (id) => {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (!response.ok) return null;
      return await response.json() as HnItem;
    }),
  );

  return stories
    .filter((story): story is HnItem => Boolean(story?.title) && story?.type === "story")
    .map((story) => {
      const topic = classifyTopic(story.title ?? "");
      const comments = story.descendants ?? 0;
      const score = Math.min(100, Math.round((story.score ?? 0) * 0.18 + comments * 0.55));
      return {
        title: story.title ?? "Untitled HN story",
        source: "Hacker News",
        score,
        topic,
        url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
        detail: `${story.score ?? 0} points, ${comments} comments, by ${story.by ?? "unknown"}`,
        publishedAt: story.time ? new Date(story.time * 1000).toISOString() : new Date().toISOString(),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

async function fetchGitHub(): Promise<PulseItem[]> {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString().slice(0, 10);
  const query = encodeURIComponent(`topic:artificial-intelligence pushed:>${since} stars:>100`);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "tanmay-sk-ai-pulse/1.0",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=24`, {
    headers,
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  const payload = await response.json() as GitHubSearchResponse;

  return (payload.items ?? []).map((repo) => {
    const title = repo.full_name ?? "unknown/repository";
    const detail = `${repo.language ?? "Mixed"} | ${(repo.stargazers_count ?? 0).toLocaleString("en-US")} stars | ${(repo.forks_count ?? 0).toLocaleString("en-US")} forks`;
    return {
      title,
      source: "GitHub",
      score: Math.min(100, Math.round((repo.stargazers_count ?? 0) / 1200 + (repo.forks_count ?? 0) / 240)),
      topic: classifyTopic(`${title} ${repo.description ?? ""} ${(repo.topics ?? []).join(" ")}`),
      url: repo.html_url ?? "https://github.com/",
      detail,
      publishedAt: repo.pushed_at ?? new Date().toISOString(),
    };
  });
}

function buildTopicMomentum(items: PulseItem[]): TopicDatum[] {
  const byTopic = new Map<string, TopicDatum>();
  for (const rule of topicRules) {
    byTopic.set(rule.topic, { topic: rule.topic, research: 0, repos: 0, news: 0, score: 0 });
  }

  for (const item of items) {
    const current = byTopic.get(item.topic) ?? { topic: item.topic, research: 0, repos: 0, news: 0, score: 0 };
    if (item.source === "arXiv") current.research += 1;
    else if (item.source === "GitHub") current.repos += 1;
    else current.news += 1;
    current.score += item.score;
    byTopic.set(item.topic, current);
  }

  return Array.from(byTopic.values())
    .map((datum) => ({
      ...datum,
      score: Math.min(100, Math.round(datum.score / Math.max(1, datum.research + datum.repos + datum.news))),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function buildTrend(items: PulseItem[]): AiPulsePayload["trend"] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const base = items.reduce((sum, item) => sum + item.score, 0) / Math.max(1, items.length);
  return days.map((label, index) => ({
    label,
    ai: Math.round(base * (0.72 + index * 0.035)),
    dev: Math.round(base * (0.42 + index * 0.02)),
    data: Math.round(base * (0.28 + index * 0.018)),
  }));
}

async function getPayload(): Promise<AiPulsePayload> {
  if (cachedPayload && cachedPayload.expiresAt > Date.now()) return cachedPayload.payload;

  const fallback = buildFallbackPayload();
  const settled = await Promise.allSettled([fetchArxiv(), fetchGitHub(), fetchHn()]);
  const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  if (items.length < 8) {
    cachedPayload = { payload: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
    return fallback;
  }

  const topicMomentum = buildTopicMomentum(items);
  const hottestTopic = topicMomentum[0]?.topic ?? "AI";
  const researchCount = items.filter((item) => item.source === "arXiv").length;
  const repoStars = items
    .filter((item) => item.source === "GitHub")
    .reduce((sum, item) => {
      const match = item.detail.match(/([\d,]+) stars/);
      return sum + Number(match?.[1]?.replace(/,/g, "") ?? 0);
    }, 0);
  const discussionPoints = items
    .filter((item) => item.source === "Hacker News")
    .reduce((sum, item) => sum + item.score, 0);
  const attentionScore = Math.min(100, Math.round(topicMomentum.reduce((sum, item) => sum + item.score, 0) / Math.max(1, topicMomentum.length)));

  const payload: AiPulsePayload = {
    generatedAt: new Date().toISOString(),
    sourceMode: "live",
    metrics: {
      attentionScore,
      researchCount,
      repoStars,
      discussionPoints,
      hottestTopic,
    },
    topicMomentum,
    sourceMix: [
      { label: "Research", value: researchCount, color: "#2563eb" },
      { label: "Open Source", value: items.filter((item) => item.source === "GitHub").length, color: "#16a34a" },
      { label: "Tech News", value: items.filter((item) => item.source === "Hacker News").length, color: "#f97316" },
    ],
    trend: buildTrend(items),
    items: items.sort((a, b) => b.score - a.score).slice(0, 18),
  };

  cachedPayload = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
  return payload;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");

  try {
    res.status(200).json(await getPayload());
  } catch {
    res.status(200).json(buildFallbackPayload());
  }
}
