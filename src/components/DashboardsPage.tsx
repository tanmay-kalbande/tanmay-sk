import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  DatabaseZap,
  Download,
  Filter,
  Gauge,
  GitBranch,
  LineChart,
  Newspaper,
  RefreshCcw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { assetUrls } from "../data/siteData";
import {
  financeRecords,
  reportMonths,
  salesRecords,
  supportRecords,
  workforceRecords,
  type MonthKey,
} from "../data/dashboardReports";
import "../styles/dashboards.css";

type ReportId = "ai-pulse" | "sales" | "support" | "finance" | "workforce";
type AiSource = "All" | "arXiv" | "GitHub" | "Hacker News";

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

type ChartDatum = {
  label: string;
  value: number;
  secondary?: number;
  color?: string;
};

type TableColumn<T> = {
  label: string;
  value: (row: T) => string;
  align?: "left" | "right";
};

const fallbackPulse: AiPulsePayload = {
  generatedAt: new Date().toISOString(),
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
      source: "Hacker News",
      score: 94,
      topic: "Agents",
      url: "https://news.ycombinator.com/",
      detail: "High discussion velocity around tool-use reliability, evaluation, and handoff design.",
      publishedAt: new Date().toISOString(),
    },
    {
      title: "Open-source LLM tools focus on observability and evals",
      source: "GitHub",
      score: 89,
      topic: "MLOps",
      url: "https://github.com/search?q=llm+evals&type=repositories",
      detail: "Repositories with recent pushes cluster around tracing, prompts, and regression testing.",
      publishedAt: new Date().toISOString(),
    },
    {
      title: "Retrieval and lightweight fine-tuning remain strong research themes",
      source: "arXiv",
      score: 84,
      topic: "LLMs",
      url: "https://arxiv.org/list/cs.CL/recent",
      detail: "Recent abstracts continue to mention retrieval, alignment, and efficiency.",
      publishedAt: new Date().toISOString(),
    },
  ],
};

const reportNav = [
  { id: "ai-pulse", label: "AI Pulse", icon: Sparkles, color: "#2563eb" },
  { id: "sales", label: "Sales", icon: BriefcaseBusiness, color: "#16a34a" },
  { id: "support", label: "Support", icon: Activity, color: "#f97316" },
  { id: "finance", label: "Finance", icon: CircleDollarSign, color: "#7c3aed" },
  { id: "workforce", label: "Workforce", icon: Users, color: "#0891b2" },
] as const;

const allOption = "All";

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function percent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

function groupSum<T>(rows: T[], key: (row: T) => string, value: (row: T) => number): ChartDatum[] {
  const grouped = new Map<string, number>();
  rows.forEach((row) => grouped.set(key(row), (grouped.get(key(row)) ?? 0) + value(row)));
  return Array.from(grouped.entries())
    .map(([label, total]) => ({ label, value: total }))
    .sort((a, b) => b.value - a.value);
}

function monthlySum<T>(rows: T[], value: (row: T) => number, secondary?: (row: T) => number): ChartDatum[] {
  return reportMonths.map((month) => {
    const monthRows = rows.filter((row) => (row as { month: MonthKey }).month === month);
    return {
      label: month,
      value: sum(monthRows.map(value)),
      secondary: secondary ? sum(monthRows.map(secondary)) : undefined,
    };
  });
}

function unique<T extends string>(values: T[]): Array<T | "All"> {
  return ["All", ...Array.from(new Set(values))];
}

function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

function lastUpdatedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function KpiTile({
  label,
  value,
  delta,
  icon: Icon,
  tone = "#2563eb",
}: {
  label: string;
  value: string;
  delta: string;
  icon: typeof BarChart3;
  tone?: string;
}) {
  return (
    <div className="bi-kpi" style={cssVars({ "--tone": tone })}>
      <div className="bi-kpi__top">
        <span>{label}</span>
        <Icon size={18} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small>{delta}</small>
    </div>
  );
}

function Slicer({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="bi-slicer">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function VisualFrame({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bi-visual ${className}`}>
      <header className="bi-visual__header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <button type="button" aria-label={`Focus ${title}`}>
          <Search size={15} />
        </button>
      </header>
      <div className="bi-visual__body">{children}</div>
    </section>
  );
}

function HorizontalBars({ data, formatValue = compact }: { data: ChartDatum[]; formatValue?: (value: number) => string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="bi-bars">
      {data.map((item, index) => (
        <div className="bi-bars__row" key={item.label}>
          <span>{item.label}</span>
          <div className="bi-bars__track">
            <i
              style={cssVars({
                "--w": `${Math.max(5, (item.value / max) * 100)}%`,
                "--bar": item.color ?? ["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#0891b2"][index % 5],
              })}
            />
          </div>
          <strong>{formatValue(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function ColumnChart({
  data,
  formatValue = compact,
  stacked = false,
}: {
  data: ChartDatum[];
  formatValue?: (value: number) => string;
  stacked?: boolean;
}) {
  const max = Math.max(...data.flatMap((item) => [item.value, item.secondary ?? 0]), 1);
  return (
    <div className="bi-columns" aria-label="Column chart">
      {data.map((item) => (
        <div className="bi-columns__group" key={item.label}>
          <div className="bi-columns__plot">
            {stacked && item.secondary !== undefined ? (
              <>
                <i className="is-secondary" style={cssVars({ "--h": `${Math.max(4, (item.secondary / max) * 100)}%` })} />
                <i style={cssVars({ "--h": `${Math.max(4, (item.value / max) * 100)}%` })} />
              </>
            ) : (
              <i style={cssVars({ "--h": `${Math.max(4, (item.value / max) * 100)}%` })} />
            )}
          </div>
          <span>{item.label}</span>
          <em>{formatValue(item.value)}</em>
        </div>
      ))}
    </div>
  );
}

function pathFor(values: number[], width: number, height: number, padding = 10): string {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / span) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function LineVisual({
  data,
  series,
}: {
  data: Array<Record<string, number | string>>;
  series: Array<{ key: string; label: string; color: string }>;
}) {
  const width = 420;
  const height = 162;
  return (
    <div className="bi-line">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend line chart">
        <defs>
          <linearGradient id="lineShade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120].map((y) => (
          <line key={y} x1="12" x2={width - 12} y1={y} y2={y} className="bi-line__grid" />
        ))}
        {series.map((item) => {
          const values = data.map((row) => Number(row[item.key] ?? 0));
          return (
            <path
              key={item.key}
              d={pathFor(values, width, height)}
              fill="none"
              stroke={item.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <div className="bi-line__legend">
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = Math.max(1, sum(data.map((item) => item.value)));
  let cursor = 0;
  const stops = data.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  });
  return (
    <div className="bi-donut">
      <div className="bi-donut__ring" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        <strong>{compact(total)}</strong>
        <span>total</span>
      </div>
      <div className="bi-donut__legend">
        {data.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
            <strong>{compact(item.value)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function DataTable<T>({ rows, columns }: { rows: T[]; columns: TableColumn<T>[] }) {
  return (
    <div className="bi-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label} className={column.align === "right" ? "is-right" : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.label} className={column.align === "right" ? "is-right" : undefined}>
                  {column.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportHeader({
  title,
  kicker,
  updatedAt,
  mode,
  onRefresh,
}: {
  title: string;
  kicker: string;
  updatedAt: string;
  mode?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="bi-report-header">
      <div>
        <p>{kicker}</p>
        <h1>{title}</h1>
      </div>
      <div className="bi-report-header__meta">
        <span>{mode ?? "Interactive report"}</span>
        <strong>Updated {lastUpdatedLabel(updatedAt)}</strong>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} aria-label="Refresh live data">
            <RefreshCcw size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AiPulseReport({
  pulse,
  loading,
  source,
  setSource,
  onRefresh,
}: {
  pulse: AiPulsePayload;
  loading: boolean;
  source: AiSource;
  setSource: (source: AiSource) => void;
  onRefresh: () => void;
}) {
  const filteredItems = useMemo(() => {
    const rows = source === "All" ? pulse.items : pulse.items.filter((item) => item.source === source);
    return rows.slice(0, 12);
  }, [pulse.items, source]);

  const topicData = pulse.topicMomentum.map((topic) => ({
    label: topic.topic,
    value: topic.score,
    color: topic.topic === pulse.metrics.hottestTopic ? "#f97316" : undefined,
  }));

  return (
    <>
      <ReportHeader
        title="AI & Tech Pulse"
        kicker="Live public-signal intelligence"
        updatedAt={pulse.generatedAt}
        mode={loading ? "Refreshing" : pulse.sourceMode === "live" ? "Live sources" : "Cached sample"}
        onRefresh={onRefresh}
      />

      <div className="bi-slicer-row">
        <Slicer label="Source" value={source} options={["All", "arXiv", "GitHub", "Hacker News"]} onChange={(value) => setSource(value as AiSource)} />
        <div className="bi-live-pill">
          <span />
          {pulse.sourceMode === "live" ? "arXiv + GitHub + HN" : "Fallback dataset"}
        </div>
      </div>

      <div className="bi-kpi-grid">
        <KpiTile label="Attention score" value={String(pulse.metrics.attentionScore)} delta={`Hot topic: ${pulse.metrics.hottestTopic}`} icon={Gauge} tone="#2563eb" />
        <KpiTile label="Research items" value={compact(pulse.metrics.researchCount)} delta="latest AI categories" icon={DatabaseZap} tone="#7c3aed" />
        <KpiTile label="Repo stars" value={compact(pulse.metrics.repoStars)} delta="open-source gravity" icon={GitBranch} tone="#16a34a" />
        <KpiTile label="Discussion points" value={compact(pulse.metrics.discussionPoints)} delta="HN signal score" icon={Newspaper} tone="#f97316" />
      </div>

      <div className="bi-report-grid bi-report-grid--ai">
        <VisualFrame title="Topic Momentum" subtitle="Composite signal score">
          <HorizontalBars data={topicData} formatValue={(value) => String(Math.round(value))} />
        </VisualFrame>
        <VisualFrame title="Signal Trend" subtitle="Indexed weekly pulse">
          <LineVisual
            data={pulse.trend}
            series={[
              { key: "ai", label: "AI", color: "#2563eb" },
              { key: "dev", label: "Dev", color: "#16a34a" },
              { key: "data", label: "Data", color: "#f97316" },
            ]}
          />
        </VisualFrame>
        <VisualFrame title="Source Mix" subtitle="Items by source">
          <Donut data={pulse.sourceMix} />
        </VisualFrame>
        <VisualFrame title="Top Signals" subtitle="Ranked live/cached records" className="bi-visual--wide">
          <DataTable
            rows={filteredItems}
            columns={[
              { label: "Signal", value: (row) => row.title },
              { label: "Source", value: (row) => row.source },
              { label: "Topic", value: (row) => row.topic },
              { label: "Score", value: (row) => String(row.score), align: "right" },
            ]}
          />
        </VisualFrame>
      </div>
    </>
  );
}

function SalesReport() {
  const [quarter, setQuarter] = useState("All");
  const [region, setRegion] = useState("All");
  const [channel, setChannel] = useState("All");

  const rows = useMemo(
    () =>
      salesRecords.filter(
        (row) =>
          (quarter === "All" || row.quarter === quarter) &&
          (region === "All" || row.region === region) &&
          (channel === "All" || row.channel === channel),
      ),
    [quarter, region, channel],
  );

  const revenue = sum(rows.map((row) => row.revenue));
  const target = sum(rows.map((row) => row.target));
  const profit = sum(rows.map((row) => row.profit));
  const orders = sum(rows.map((row) => row.orders));
  const monthly = monthlySum(rows, (row) => row.revenue, (row) => row.target);
  const category = groupSum(rows, (row) => row.category, (row) => row.revenue);
  const regions = groupSum(rows, (row) => row.region, (row) => row.profit);
  const tableRows = groupSum(rows, (row) => row.channel, (row) => row.revenue).map((item) => {
    const channelRows = rows.filter((row) => row.channel === item.label);
    return {
      channel: item.label,
      revenue: item.value,
      profit: sum(channelRows.map((row) => row.profit)),
      orders: sum(channelRows.map((row) => row.orders)),
      attainment: safeRatio(item.value, sum(channelRows.map((row) => row.target))),
    };
  });

  return (
    <>
      <ReportHeader title="Sales Performance Dashboard" kicker="Executive revenue report" updatedAt="2026-04-29T10:00:00.000Z" />
      <div className="bi-slicer-row">
        <Slicer label="Quarter" value={quarter} options={["All", "Q1", "Q2", "Q3", "Q4"]} onChange={setQuarter} />
        <Slicer label="Region" value={region} options={unique(salesRecords.map((row) => row.region))} onChange={setRegion} />
        <Slicer label="Channel" value={channel} options={unique(salesRecords.map((row) => row.channel))} onChange={setChannel} />
      </div>

      <div className="bi-kpi-grid">
        <KpiTile label="Revenue" value={money(revenue)} delta={`${percent(safeRatio(revenue, target), 1)} of target`} icon={BarChart3} tone="#16a34a" />
        <KpiTile label="Gross profit" value={money(profit)} delta={`${percent(safeRatio(profit, revenue), 1)} margin`} icon={CircleDollarSign} tone="#2563eb" />
        <KpiTile label="Orders" value={compact(orders)} delta={`${money(safeRatio(revenue, orders))} avg order`} icon={BriefcaseBusiness} tone="#f97316" />
        <KpiTile label="Customers" value={compact(sum(rows.map((row) => row.customers)))} delta="active buying accounts" icon={Users} tone="#0891b2" />
      </div>

      <div className="bi-report-grid">
        <VisualFrame title="Revenue vs Target" subtitle="Monthly run-rate">
          <ColumnChart data={monthly} formatValue={money} stacked />
        </VisualFrame>
        <VisualFrame title="Revenue by Category" subtitle="Product contribution">
          <HorizontalBars data={category} formatValue={money} />
        </VisualFrame>
        <VisualFrame title="Profit by Region" subtitle="Margin contribution">
          <Donut
            data={regions.map((item, index) => ({
              label: item.label,
              value: item.value,
              color: ["#2563eb", "#16a34a", "#f97316", "#7c3aed"][index % 4],
            }))}
          />
        </VisualFrame>
        <VisualFrame title="Channel Scorecard" subtitle="Attainment and volume" className="bi-visual--wide">
          <DataTable
            rows={tableRows}
            columns={[
              { label: "Channel", value: (row) => row.channel },
              { label: "Revenue", value: (row) => money(row.revenue), align: "right" },
              { label: "Profit", value: (row) => money(row.profit), align: "right" },
              { label: "Orders", value: (row) => compact(row.orders), align: "right" },
              { label: "Target", value: (row) => percent(row.attainment), align: "right" },
            ]}
          />
        </VisualFrame>
      </div>
    </>
  );
}

function SupportReport() {
  const [team, setTeam] = useState("All");
  const [priority, setPriority] = useState("All");

  const rows = useMemo(
    () =>
      supportRecords.filter(
        (row) => (team === "All" || row.team === team) && (priority === "All" || row.priority === priority),
      ),
    [team, priority],
  );

  const tickets = sum(rows.map((row) => row.tickets));
  const resolved = sum(rows.map((row) => row.resolved));
  const backlog = sum(rows.map((row) => row.backlog));
  const monthly = monthlySum(rows, (row) => row.tickets, (row) => row.resolved);
  const priorityBars = groupSum(rows, (row) => row.priority, (row) => row.tickets);
  const teamRows = groupSum(rows, (row) => row.team, (row) => row.tickets).map((item) => {
    const teamRecords = rows.filter((row) => row.team === item.label);
    return {
      team: item.label,
      tickets: item.value,
      sla: average(teamRecords.map((row) => row.sla)),
      csat: average(teamRecords.map((row) => row.csat)),
      backlog: sum(teamRecords.map((row) => row.backlog)),
    };
  });

  return (
    <>
      <ReportHeader title="Customer Support Operations" kicker="SLA and resolution health" updatedAt="2026-04-29T09:30:00.000Z" />
      <div className="bi-slicer-row">
        <Slicer label="Team" value={team} options={unique(supportRecords.map((row) => row.team))} onChange={setTeam} />
        <Slicer label="Priority" value={priority} options={unique(supportRecords.map((row) => row.priority))} onChange={setPriority} />
      </div>

      <div className="bi-kpi-grid">
        <KpiTile label="Tickets" value={compact(tickets)} delta={`${percent(safeRatio(resolved, tickets), 1)} resolved`} icon={Activity} tone="#f97316" />
        <KpiTile label="SLA hit rate" value={percent(average(rows.map((row) => row.sla)), 1)} delta="weighted service health" icon={Gauge} tone="#16a34a" />
        <KpiTile label="CSAT" value={average(rows.map((row) => row.csat)).toFixed(2)} delta="out of 5.00" icon={Sparkles} tone="#2563eb" />
        <KpiTile label="Backlog" value={compact(backlog)} delta={`${Math.round(average(rows.map((row) => row.avgHours)))}h avg resolution`} icon={DatabaseZap} tone="#7c3aed" />
      </div>

      <div className="bi-report-grid">
        <VisualFrame title="Tickets vs Resolved" subtitle="Monthly operation flow">
          <ColumnChart data={monthly} stacked />
        </VisualFrame>
        <VisualFrame title="Priority Mix" subtitle="Ticket volume by severity">
          <HorizontalBars data={priorityBars} />
        </VisualFrame>
        <VisualFrame title="SLA Trend" subtitle="Service reliability index">
          <LineVisual
            data={reportMonths.map((month) => {
              const monthRows = rows.filter((row) => row.month === month);
              return { label: month, sla: average(monthRows.map((row) => row.sla)), csat: average(monthRows.map((row) => row.csat)) * 20 };
            })}
            series={[
              { key: "sla", label: "SLA", color: "#16a34a" },
              { key: "csat", label: "CSAT", color: "#2563eb" },
            ]}
          />
        </VisualFrame>
        <VisualFrame title="Team Scorecard" subtitle="Operational ownership" className="bi-visual--wide">
          <DataTable
            rows={teamRows}
            columns={[
              { label: "Team", value: (row) => row.team },
              { label: "Tickets", value: (row) => compact(row.tickets), align: "right" },
              { label: "SLA", value: (row) => percent(row.sla), align: "right" },
              { label: "CSAT", value: (row) => row.csat.toFixed(2), align: "right" },
              { label: "Backlog", value: (row) => compact(row.backlog), align: "right" },
            ]}
          />
        </VisualFrame>
      </div>
    </>
  );
}

function FinanceReport() {
  const [unit, setUnit] = useState("All");
  const rows = useMemo(() => financeRecords.filter((row) => unit === "All" || row.unit === unit), [unit]);
  const revenue = sum(rows.map((row) => row.revenue));
  const cogs = sum(rows.map((row) => row.cogs));
  const opex = sum(rows.map((row) => row.opex));
  const forecast = sum(rows.map((row) => row.forecast));
  const operatingProfit = revenue - cogs - opex;
  const monthly = monthlySum(rows, (row) => row.revenue, (row) => row.forecast);
  const unitBars = groupSum(rows, (row) => row.unit, (row) => row.revenue - row.cogs - row.opex);
  const tableRows = groupSum(rows, (row) => row.unit, (row) => row.revenue).map((item) => {
    const unitRows = rows.filter((row) => row.unit === item.label);
    const unitRevenue = item.value;
    const unitProfit = unitRevenue - sum(unitRows.map((row) => row.cogs)) - sum(unitRows.map((row) => row.opex));
    return {
      unit: item.label,
      revenue: unitRevenue,
      profit: unitProfit,
      forecast: sum(unitRows.map((row) => row.forecast)),
      invoices: sum(unitRows.map((row) => row.invoices)),
    };
  });

  return (
    <>
      <ReportHeader title="Finance Performance Dashboard" kicker="Revenue, forecast, and cash view" updatedAt="2026-04-29T08:45:00.000Z" />
      <div className="bi-slicer-row">
        <Slicer label="Business Unit" value={unit} options={unique(financeRecords.map((row) => row.unit))} onChange={setUnit} />
      </div>

      <div className="bi-kpi-grid">
        <KpiTile label="Revenue" value={money(revenue)} delta={`${percent(safeRatio(revenue, forecast), 1)} forecast`} icon={CircleDollarSign} tone="#16a34a" />
        <KpiTile label="Gross margin" value={percent(safeRatio(revenue - cogs, revenue), 1)} delta={money(revenue - cogs)} icon={BarChart3} tone="#2563eb" />
        <KpiTile label="Operating profit" value={money(operatingProfit)} delta={`${percent(safeRatio(operatingProfit, revenue), 1)} op margin`} icon={LineChart} tone="#7c3aed" />
        <KpiTile label="Cash position" value={money(average(rows.map((row) => row.cash)))} delta="average monthly cash" icon={Building2} tone="#f97316" />
      </div>

      <div className="bi-report-grid">
        <VisualFrame title="Revenue vs Forecast" subtitle="Monthly financial pacing">
          <ColumnChart data={monthly} formatValue={money} stacked />
        </VisualFrame>
        <VisualFrame title="Operating Profit by Unit" subtitle="Business-unit contribution">
          <HorizontalBars data={unitBars} formatValue={money} />
        </VisualFrame>
        <VisualFrame title="Cash and Revenue Trend" subtitle="Balance strength">
          <LineVisual
            data={reportMonths.map((month) => {
              const monthRows = rows.filter((row) => row.month === month);
              return {
                label: month,
                revenue: sum(monthRows.map((row) => row.revenue)) / 10000,
                cash: average(monthRows.map((row) => row.cash)) / 10000,
              };
            })}
            series={[
              { key: "revenue", label: "Revenue", color: "#16a34a" },
              { key: "cash", label: "Cash", color: "#7c3aed" },
            ]}
          />
        </VisualFrame>
        <VisualFrame title="Unit Scorecard" subtitle="Forecast and collection volume" className="bi-visual--wide">
          <DataTable
            rows={tableRows}
            columns={[
              { label: "Unit", value: (row) => row.unit },
              { label: "Revenue", value: (row) => money(row.revenue), align: "right" },
              { label: "Profit", value: (row) => money(row.profit), align: "right" },
              { label: "Forecast", value: (row) => percent(safeRatio(row.revenue, row.forecast)), align: "right" },
              { label: "Invoices", value: (row) => compact(row.invoices), align: "right" },
            ]}
          />
        </VisualFrame>
      </div>
    </>
  );
}

function WorkforceReport() {
  const [department, setDepartment] = useState("All");
  const [location, setLocation] = useState("All");

  const rows = useMemo(
    () =>
      workforceRecords.filter(
        (row) =>
          (department === "All" || row.department === department) &&
          (location === "All" || row.location === location),
      ),
    [department, location],
  );

  const headcount = sum(rows.map((row) => row.headcount));
  const hires = sum(rows.map((row) => row.hires));
  const exits = sum(rows.map((row) => row.exits));
  const monthly = monthlySum(rows, (row) => row.headcount);
  const locationBars = groupSum(rows, (row) => row.location, (row) => row.headcount);
  const departmentRows = groupSum(rows, (row) => row.department, (row) => row.headcount).map((item) => {
    const departmentRecords = rows.filter((row) => row.department === item.label);
    return {
      department: item.label,
      headcount: item.value,
      hires: sum(departmentRecords.map((row) => row.hires)),
      exits: sum(departmentRecords.map((row) => row.exits)),
      engagement: average(departmentRecords.map((row) => row.engagement)),
      openRoles: sum(departmentRecords.map((row) => row.openRoles)),
    };
  });

  return (
    <>
      <ReportHeader title="Workforce Analytics Dashboard" kicker="People growth and retention report" updatedAt="2026-04-29T08:15:00.000Z" />
      <div className="bi-slicer-row">
        <Slicer label="Department" value={department} options={unique(workforceRecords.map((row) => row.department))} onChange={setDepartment} />
        <Slicer label="Location" value={location} options={unique(workforceRecords.map((row) => row.location))} onChange={setLocation} />
      </div>

      <div className="bi-kpi-grid">
        <KpiTile label="Headcount" value={compact(headcount)} delta={`${compact(hires)} hires in period`} icon={Users} tone="#0891b2" />
        <KpiTile label="Attrition" value={percent(safeRatio(exits, headcount + hires), 1)} delta={`${compact(exits)} exits`} icon={Activity} tone="#f97316" />
        <KpiTile label="Engagement" value={percent(average(rows.map((row) => row.engagement)), 1)} delta="employee pulse" icon={Sparkles} tone="#16a34a" />
        <KpiTile label="Training" value={compact(sum(rows.map((row) => row.trainingHours)))} delta="learning hours" icon={DatabaseZap} tone="#7c3aed" />
      </div>

      <div className="bi-report-grid">
        <VisualFrame title="Headcount Trend" subtitle="Monthly capacity">
          <ColumnChart data={monthly} />
        </VisualFrame>
        <VisualFrame title="Location Distribution" subtitle="Workforce placement">
          <HorizontalBars data={locationBars} />
        </VisualFrame>
        <VisualFrame title="Engagement vs Open Roles" subtitle="Hiring pressure">
          <LineVisual
            data={reportMonths.map((month) => {
              const monthRows = rows.filter((row) => row.month === month);
              return {
                label: month,
                engagement: average(monthRows.map((row) => row.engagement)),
                roles: sum(monthRows.map((row) => row.openRoles)) * 8,
              };
            })}
            series={[
              { key: "engagement", label: "Engagement", color: "#16a34a" },
              { key: "roles", label: "Open roles", color: "#f97316" },
            ]}
          />
        </VisualFrame>
        <VisualFrame title="Department Scorecard" subtitle="People movement and morale" className="bi-visual--wide">
          <DataTable
            rows={departmentRows}
            columns={[
              { label: "Department", value: (row) => row.department },
              { label: "Headcount", value: (row) => compact(row.headcount), align: "right" },
              { label: "Hires", value: (row) => compact(row.hires), align: "right" },
              { label: "Exits", value: (row) => compact(row.exits), align: "right" },
              { label: "Engagement", value: (row) => percent(row.engagement), align: "right" },
              { label: "Open Roles", value: (row) => compact(row.openRoles), align: "right" },
            ]}
          />
        </VisualFrame>
      </div>
    </>
  );
}

export default function DashboardsPage() {
  const [activeReport, setActiveReport] = useState<ReportId>("ai-pulse");
  const [pulse, setPulse] = useState<AiPulsePayload>(fallbackPulse);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [aiSource, setAiSource] = useState<AiSource>("All");

  const loadPulse = async () => {
    setPulseLoading(true);
    try {
      const response = await fetch(`/api/aiPulse?ts=${Date.now()}`);
      if (!response.ok) throw new Error(`AI pulse ${response.status}`);
      const payload = (await response.json()) as AiPulsePayload;
      setPulse(payload);
    } catch {
      setPulse({ ...fallbackPulse, generatedAt: new Date().toISOString() });
    } finally {
      setPulseLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "dashboards-v2");
    document.title = "Tanmay Kalbande - BI Dashboard Gallery";
    void loadPulse();
  }, []);

  const activeMeta = reportNav.find((item) => item.id === activeReport) ?? reportNav[0];

  return (
    <div className="bi-app">
      <aside className="bi-sidebar">
        <div className="bi-sidebar__brand">
          <div className="bi-power-logo">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Power BI</strong>
            <span>Portfolio Reports</span>
          </div>
        </div>

        <nav className="bi-report-nav" aria-label="Dashboard reports">
          {reportNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={item.id === activeReport ? "is-active" : undefined}
                onClick={() => setActiveReport(item.id)}
                style={cssVars({ "--report": item.color })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="bi-sidebar__footer">
          <span>Dataset</span>
          <strong>FY 2026 portfolio model</strong>
          <a href={assetUrls.dashboardFile} target="_blank" rel="noreferrer">
            <Download size={15} />
            PBIX sample
          </a>
        </div>
      </aside>

      <main className="bi-main">
        <header className="bi-topbar">
          <Link to="/portfolio" className="bi-back">
            <ChevronLeft size={16} />
            Portfolio
          </Link>
          <div className="bi-topbar__center">
            <span className="bi-file-dot" style={{ background: activeMeta.color }} />
            <strong>{activeMeta.label}</strong>
            <span>Report page</span>
          </div>
          <div className="bi-topbar__actions">
            <button type="button">
              <Filter size={16} />
              Filters
            </button>
            <button type="button">
              <Download size={16} />
              Export
            </button>
          </div>
        </header>

        <div className="bi-canvas-wrap">
          <section className="bi-canvas" style={cssVars({ "--report": activeMeta.color })}>
            {activeReport === "ai-pulse" ? (
              <AiPulseReport
                pulse={pulse}
                loading={pulseLoading}
                source={aiSource}
                setSource={setAiSource}
                onRefresh={loadPulse}
              />
            ) : null}
            {activeReport === "sales" ? <SalesReport /> : null}
            {activeReport === "support" ? <SupportReport /> : null}
            {activeReport === "finance" ? <FinanceReport /> : null}
            {activeReport === "workforce" ? <WorkforceReport /> : null}
          </section>
        </div>
      </main>
    </div>
  );
}
