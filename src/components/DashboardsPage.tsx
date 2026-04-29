import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { assetUrls } from "../data/siteData";
import {
  financeRecords,
  reportMonths,
  salesRecords,
  supportRecords,
  workforceRecords,
  type MonthKey,
} from "../data/dashboardReports";
import "../styles/landing.css";
import "../styles/dashboards.css";

type PreviewMetric = {
  label: string;
  value: string;
  delta: string;
};

type PreviewChart = {
  label: string;
  value: number;
};

type PreviewState = {
  label: string;
  accent: string;
  status: string;
  metrics: PreviewMetric[];
  bars: PreviewChart[];
  line: PreviewChart[];
  table: Array<[string, string, string, string]>;
  insight: string;
};

type DashboardPreview = {
  kind: "image" | "generated";
  screenshot?: string;
  title: string;
  eyebrow: string;
  theme: "red" | "blue" | "green" | "orange" | "purple";
  states: PreviewState[];
  guide: string[];
};

type DashboardLink = {
  label: string;
  href: string;
  kind: "dashboard" | "data" | "api" | "source";
};

type DashboardProject = {
  title: string;
  description: string;
  points: string[];
  screenshotLabel: string;
  links: DashboardLink[];
  preview: DashboardPreview;
};

type AiPulsePayload = {
  generatedAt: string;
  sourceMode?: "live" | "fallback";
  metrics: {
    attentionScore: number;
    researchCount: number;
    repoStars: number;
    discussionPoints: number;
    hottestTopic: string;
  };
  topicMomentum: Array<{ topic: string; score: number }>;
  trend: Array<{ label: string; ai: number; dev: number; data: number }>;
};

type PreviewView = "overview" | "trend" | "records";

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
    { topic: "Agents", score: 96 },
    { topic: "LLMs", score: 91 },
    { topic: "Data Engineering", score: 74 },
    { topic: "Computer Vision", score: 68 },
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
};

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function monthlyTotal<T extends { month: MonthKey }>(rows: T[], value: (row: T) => number): PreviewChart[] {
  return reportMonths.map((month) => ({
    label: month,
    value: sum(rows.filter((row) => row.month === month).map(value)),
  }));
}

function groupedTotal<T>(rows: T[], label: (row: T) => string, value: (row: T) => number): PreviewChart[] {
  const groups = new Map<string, number>();
  rows.forEach((row) => groups.set(label(row), (groups.get(label(row)) ?? 0) + value(row)));
  return Array.from(groups.entries())
    .map(([groupLabel, groupValue]) => ({ label: groupLabel, value: groupValue }))
    .sort((a, b) => b.value - a.value);
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function linePoints(data: PreviewChart[]): string {
  const width = 470;
  const height = 172;
  const max = Math.max(...data.map((item) => item.value), 1);
  const min = Math.min(...data.map((item) => item.value), 0);
  const span = Math.max(max - min, 1);

  return data
    .map((item, index) => {
      const x = 20 + (index / Math.max(1, data.length - 1)) * (width - 40);
      const y = height - 18 - ((item.value - min) / span) * (height - 38);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaPoints(data: PreviewChart[]): string {
  const points = linePoints(data);
  return `20,172 ${points} 450,172`;
}

function localDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "cached";
  return date.toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DashboardMockup({ preview }: { preview: DashboardPreview }) {
  const [stateIndex, setStateIndex] = useState(0);
  const [view, setView] = useState<PreviewView>("overview");

  if (preview.kind === "image" && preview.screenshot) {
    return <img src={preview.screenshot} alt={preview.title} className="project-screenshot" />;
  }

  const activeState = preview.states[stateIndex] ?? preview.states[0];
  const maxBar = Math.max(...activeState.bars.map((item) => item.value), 1);
  const chartTotal = sum(activeState.bars.map((item) => item.value));

  return (
    <div className={`project-screenshot dashboard-preview dashboard-preview--${preview.theme}`}>
      <div className="dashboard-preview__hero">
        <div>
          <span>{preview.eyebrow}</span>
          <h3>{preview.title}</h3>
        </div>
        <div className="dashboard-preview__signal">
          <i />
          {activeState.status}
        </div>
      </div>

      <div className="dashboard-preview__controls" aria-label={`${preview.title} controls`}>
        <div className="dashboard-preview__chips">
          {preview.states.map((state, index) => (
            <button
              key={state.label}
              type="button"
              className={index === stateIndex ? "is-active" : ""}
              onClick={() => setStateIndex(index)}
            >
              {state.label}
            </button>
          ))}
        </div>
        <div className="dashboard-preview__tabs">
          {(["overview", "trend", "records"] as PreviewView[]).map((tab) => (
            <button key={tab} type="button" className={tab === view ? "is-active" : ""} onClick={() => setView(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-preview__metrics">
        {activeState.metrics.map((metric) => (
          <div key={metric.label} className="dashboard-preview__metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.delta}</small>
          </div>
        ))}
      </div>

      <div className={`dashboard-preview__grid dashboard-preview__grid--${view}`}>
        <section className="dashboard-tile dashboard-tile--bars">
          <div className="dashboard-tile__heading">
            <h4>Segment Contribution</h4>
            <span>{compact(chartTotal)} total</span>
          </div>
          {activeState.bars.slice(0, 5).map((item, index) => (
            <button className="dashboard-bar" key={item.label} type="button">
              <span>{item.label}</span>
              <i style={{ width: `${Math.max(8, (item.value / maxBar) * 100)}%` }} />
              <strong>{index === 0 ? "Lead" : compact(item.value)}</strong>
            </button>
          ))}
        </section>

        <section className="dashboard-tile dashboard-tile--line">
          <div className="dashboard-tile__heading">
            <h4>Momentum Curve</h4>
            <span>{activeState.line[activeState.line.length - 1]?.label ?? "Now"}</span>
          </div>
          <svg viewBox="0 0 470 172" role="img" aria-label={`${preview.title} line chart`}>
            <line x1="20" x2="450" y1="42" y2="42" />
            <line x1="20" x2="450" y1="86" y2="86" />
            <line x1="20" x2="450" y1="130" y2="130" />
            <polygon points={areaPoints(activeState.line)} />
            <polyline points={linePoints(activeState.line)} />
          </svg>
          <div className="dashboard-preview__axis">
            {activeState.line.slice(0, 6).map((item) => (
              <span key={item.label}>{item.label}</span>
            ))}
          </div>
        </section>

        <section className="dashboard-tile dashboard-tile--insight">
          <div className="dashboard-tile__heading">
            <h4>Insight State</h4>
            <span>{activeState.accent}</span>
          </div>
          <p>{activeState.insight}</p>
          <div className="dashboard-orbit">
            <b />
            <b />
            <b />
            <strong>{activeState.metrics[0]?.value}</strong>
          </div>
        </section>

        <section className="dashboard-tile dashboard-tile--table">
          <div className="dashboard-tile__heading">
            <h4>Records</h4>
            <span>drill table</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Metric</th>
                <th>Change</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeState.table.map((row) => (
                <tr key={row.join("-")}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="dashboard-tile dashboard-tile--guide">
          <div className="dashboard-tile__heading">
            <h4>Metric Guide</h4>
            <span>notes</span>
          </div>
          <ul>
            {preview.guide.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function makeState(
  label: string,
  accent: string,
  status: string,
  metrics: PreviewMetric[],
  bars: PreviewChart[],
  line: PreviewChart[],
  table: Array<[string, string, string, string]>,
  insight: string,
): PreviewState {
  return { label, accent, status, metrics, bars, line, table, insight };
}

function topTable(data: PreviewChart[], formatter: (value: number) => string, status = "Strong"): Array<[string, string, string, string]> {
  return data.slice(0, 4).map((row, index) => [
    row.label,
    formatter(row.value),
    index === 0 ? "+ leading" : "+ steady",
    index === 0 ? "Focus" : status,
  ]);
}

function buildProjects(pulse: AiPulsePayload): DashboardProject[] {
  const q4Sales = salesRecords.filter((row) => row.quarter === "Q4");
  const directSales = salesRecords.filter((row) => row.channel === "Direct");
  const p1Support = supportRecords.filter((row) => row.priority === "P1");
  const platformSupport = supportRecords.filter((row) => row.team === "Platform");
  const enterpriseFinance = financeRecords.filter((row) => row.unit === "Enterprise");
  const growthFinance = financeRecords.filter((row) => row.unit === "Growth");
  const analyticsWorkforce = workforceRecords.filter((row) => row.department === "Analytics");
  const engineeringWorkforce = workforceRecords.filter((row) => row.department === "Engineering");

  const salesRevenue = sum(salesRecords.map((row) => row.revenue));
  const salesTarget = sum(salesRecords.map((row) => row.target));
  const supportTickets = sum(supportRecords.map((row) => row.tickets));
  const supportResolved = sum(supportRecords.map((row) => row.resolved));
  const financeRevenue = sum(financeRecords.map((row) => row.revenue));
  const financeForecast = sum(financeRecords.map((row) => row.forecast));
  const workforceHeadcount = sum(workforceRecords.map((row) => row.headcount));
  const workforceHires = sum(workforceRecords.map((row) => row.hires));
  const workforceExits = sum(workforceRecords.map((row) => row.exits));

  return [
    {
      title: "Power BI Dashboard: Data Wave Metrics in India",
      description:
        "Explore key wireless data usage and ARPU metrics in India across quarters for revenue, consumption, and tariff insights.",
      points: [
        "Analyze wireless data usage and ARPU metrics across quarters.",
        "Review revenue and data-consumption trends over time.",
        "Understand tariff variations and their impact.",
      ],
      screenshotLabel: "Quarterly Metrics Overview",
      links: [
        { label: "Download PBIX", href: assetUrls.dashboardFile, kind: "dashboard" },
        { label: "TRAI Data Source", href: "https://data.gov.in/", kind: "source" },
      ],
      preview: {
        kind: "image",
        screenshot: assetUrls.dashboardPhoto,
        title: "Data Wave Metrics in India",
        eyebrow: "Wireless data analysis",
        theme: "red",
        states: [],
        guide: [],
      },
    },
    {
      title: "Power BI Dashboard: AI & Tech Pulse Intelligence",
      description:
        "A current AI and technology signal dashboard that tracks research activity, open-source momentum, and tech discussion pressure.",
      points: [
        "Fetches public signals through the live `/api/aiPulse` endpoint.",
        "Ranks hot AI topics such as agents, LLMs, MLOps, and data engineering.",
        "Turns noisy tech activity into a compact analyst-ready trend view.",
      ],
      screenshotLabel: "AI Signal Momentum Overview",
      links: [
        { label: "Live API JSON", href: "/api/aiPulse", kind: "api" },
        { label: "Local CSV Snapshot", href: "/dashboard-data/ai-tech-pulse.csv", kind: "data" },
        { label: "Hacker News API", href: "https://github.com/HackerNews/API", kind: "source" },
      ],
      preview: {
        kind: "generated",
        title: "AI & Tech Pulse",
        eyebrow: pulse.sourceMode === "live" ? `Live fetch - ${localDate(pulse.generatedAt)}` : "Cached snapshot",
        theme: "blue",
        states: [
          makeState(
            "Live Signal",
            pulse.metrics.hottestTopic,
            pulse.sourceMode === "live" ? "Live API connected" : "Fallback cache ready",
            [
              { label: "Attention", value: String(pulse.metrics.attentionScore), delta: `${pulse.metrics.hottestTopic} leads` },
              { label: "Research", value: compact(pulse.metrics.researchCount), delta: "arXiv items" },
              { label: "Repo Stars", value: compact(pulse.metrics.repoStars), delta: "GitHub pull" },
            ],
            pulse.topicMomentum.map((item) => ({ label: item.topic, value: item.score })),
            pulse.trend.map((item) => ({ label: item.label, value: item.ai })),
            [
              [pulse.metrics.hottestTopic, "Hot Topic", "+ rising", "Watch"],
              ["Research", compact(pulse.metrics.researchCount), "+ fresh", "Active"],
              ["Discussions", compact(pulse.metrics.discussionPoints), "+ social", "High"],
              ["Open Source", compact(pulse.metrics.repoStars), "+ stars", "Strong"],
            ],
            "The live signal mixes research, repositories, and technical discussion so the dashboard feels current rather than static.",
          ),
          makeState(
            "Builder View",
            "Open-source radar",
            "Repo signal emphasized",
            [
              { label: "OSS Weight", value: compact(pulse.metrics.repoStars), delta: "stars tracked" },
              { label: "Topics", value: compact(pulse.topicMomentum.length), delta: "clusters" },
              { label: "Pulse", value: String(Math.max(70, pulse.metrics.attentionScore - 4)), delta: "build activity" },
            ],
            pulse.topicMomentum.slice().reverse().map((item) => ({ label: item.topic, value: Math.max(18, item.score - 8) })),
            pulse.trend.map((item) => ({ label: item.label, value: item.dev })),
            [
              ["GitHub", compact(pulse.metrics.repoStars), "+ repo heat", "Strong"],
              ["Agents", "Tool-use", "+ adoption", "Focus"],
              ["MLOps", "Evals", "+ demand", "Watch"],
              ["Data", "Pipelines", "+ steady", "Stable"],
            ],
            "This state is tuned for product builders: it spotlights repo traction, tooling categories, and developer adoption.",
          ),
        ],
        guide: [
          "Live endpoint fetches arXiv, GitHub, and Hacker News, then falls back gracefully.",
          "Attention score blends research, open-source, and discussion signals.",
          "Topic chips switch the visual state without leaving the portfolio card.",
        ],
      },
    },
    {
      title: "Power BI Dashboard: Sales Performance Analytics",
      description:
        "Executive revenue dashboard for sales leaders to compare targets, profit, channel mix, and customer volume.",
      points: [
        "Tracks revenue, target attainment, profit margin, and active customers.",
        "Breaks performance down by region, channel, product category, and month.",
        "Highlights whether growth is coming from high-margin or high-volume channels.",
      ],
      screenshotLabel: "Revenue and Channel Performance Overview",
      links: [{ label: "Local CSV Dataset", href: "/dashboard-data/sales-performance.csv", kind: "data" }],
      preview: {
        kind: "generated",
        title: "Sales Performance",
        eyebrow: "Revenue operations",
        theme: "green",
        states: [
          makeState(
            "All Channels",
            "Full funnel",
            "Target pacing above plan",
            [
              { label: "Revenue", value: money(salesRevenue), delta: `${percent(safeRatio(salesRevenue, salesTarget))} target` },
              { label: "Profit", value: money(sum(salesRecords.map((row) => row.profit))), delta: "quality growth" },
              { label: "Orders", value: compact(sum(salesRecords.map((row) => row.orders))), delta: "closed volume" },
            ],
            groupedTotal(salesRecords, (row) => row.category, (row) => row.revenue),
            monthlyTotal(salesRecords, (row) => row.revenue),
            topTable(groupedTotal(salesRecords, (row) => row.channel, (row) => row.revenue), money),
            "Q4 and SaaS-led growth are doing the heavy lifting, while channel mix shows where the next push should land.",
          ),
          makeState(
            "Q4 Push",
            "Quarter close",
            "High momentum state",
            [
              { label: "Q4 Revenue", value: money(sum(q4Sales.map((row) => row.revenue))), delta: "closing quarter" },
              { label: "Q4 Profit", value: money(sum(q4Sales.map((row) => row.profit))), delta: "margin lift" },
              { label: "Q4 Orders", value: compact(sum(q4Sales.map((row) => row.orders))), delta: "deal flow" },
            ],
            groupedTotal(q4Sales, (row) => row.region, (row) => row.revenue),
            monthlyTotal(q4Sales, (row) => row.revenue),
            topTable(groupedTotal(q4Sales, (row) => row.channel, (row) => row.revenue), money),
            "The Q4 state behaves like a drill-down: regional contribution and channel pressure become the main story.",
          ),
          makeState(
            "Direct Sales",
            "High intent",
            "Direct channel selected",
            [
              { label: "Direct Rev", value: money(sum(directSales.map((row) => row.revenue))), delta: "owned channel" },
              { label: "Customers", value: compact(sum(directSales.map((row) => row.customers))), delta: "accounts" },
              { label: "AOV", value: money(safeRatio(sum(directSales.map((row) => row.revenue)), sum(directSales.map((row) => row.orders)))), delta: "avg order" },
            ],
            groupedTotal(directSales, (row) => row.category, (row) => row.revenue),
            monthlyTotal(directSales, (row) => row.revenue),
            topTable(groupedTotal(directSales, (row) => row.region, (row) => row.revenue), money),
            "Direct sales gives a cleaner read on customer intent and account value without marketplace noise.",
          ),
        ],
        guide: [
          "Revenue is compared against planned monthly and quarterly targets.",
          "Profit margin shows the quality of growth, not only total sales.",
          "State chips act like dashboard slicers for quarter and channel focus.",
        ],
      },
    },
    {
      title: "Power BI Dashboard: Customer Support Operations",
      description:
        "Service operations dashboard showing SLA reliability, ticket pressure, backlog, priority mix, and customer satisfaction.",
      points: [
        "Monitors tickets received, resolved, SLA hit rate, CSAT, and backlog.",
        "Compares operational pressure across Platform, Payments, Data, and Infra teams.",
        "Makes repeat incident and support load patterns easy to scan.",
      ],
      screenshotLabel: "SLA and Ticket Resolution Overview",
      links: [{ label: "Local CSV Dataset", href: "/dashboard-data/support-operations.csv", kind: "data" }],
      preview: {
        kind: "generated",
        title: "Support Operations",
        eyebrow: "Incident and SLA view",
        theme: "orange",
        states: [
          makeState(
            "All Tickets",
            "Ops load",
            "Queue under control",
            [
              { label: "Tickets", value: compact(supportTickets), delta: `${percent(safeRatio(supportResolved, supportTickets))} resolved` },
              { label: "SLA", value: percent(average(supportRecords.map((row) => row.sla))), delta: "hit rate" },
              { label: "CSAT", value: average(supportRecords.map((row) => row.csat)).toFixed(2), delta: "customer score" },
            ],
            groupedTotal(supportRecords, (row) => row.team, (row) => row.tickets),
            monthlyTotal(supportRecords, (row) => row.tickets),
            topTable(groupedTotal(supportRecords, (row) => row.priority, (row) => row.tickets), compact, "Stable"),
            "The operational state shows volume and customer health together, so SLA risk is visible before backlog becomes painful.",
          ),
          makeState(
            "P1 Watch",
            "Risk filter",
            "Priority incident state",
            [
              { label: "P1 Tickets", value: compact(sum(p1Support.map((row) => row.tickets))), delta: "urgent load" },
              { label: "SLA", value: percent(average(p1Support.map((row) => row.sla))), delta: "risk zone" },
              { label: "Backlog", value: compact(sum(p1Support.map((row) => row.backlog))), delta: "open queue" },
            ],
            groupedTotal(p1Support, (row) => row.team, (row) => row.tickets),
            monthlyTotal(p1Support, (row) => row.tickets),
            topTable(groupedTotal(p1Support, (row) => row.team, (row) => row.backlog), compact, "Watch"),
            "The P1 state changes the story from volume to risk: backlog and SLA become the primary visual cues.",
          ),
          makeState(
            "Platform",
            "Owner view",
            "Team selected",
            [
              { label: "Tickets", value: compact(sum(platformSupport.map((row) => row.tickets))), delta: "team load" },
              { label: "Resolved", value: compact(sum(platformSupport.map((row) => row.resolved))), delta: "closures" },
              { label: "CSAT", value: average(platformSupport.map((row) => row.csat)).toFixed(2), delta: "team score" },
            ],
            groupedTotal(platformSupport, (row) => row.priority, (row) => row.tickets),
            monthlyTotal(platformSupport, (row) => row.tickets),
            topTable(groupedTotal(platformSupport, (row) => row.priority, (row) => row.backlog), compact, "Review"),
            "This state works like a team drill-down, useful for connecting queue health to team ownership.",
          ),
        ],
        guide: [
          "SLA hit rate measures how reliably support commitments are met.",
          "Backlog points to capacity pressure and unresolved queue risk.",
          "Priority mix separates urgent operational issues from routine demand.",
        ],
      },
    },
    {
      title: "Power BI Dashboard: Finance Performance Report",
      description:
        "Financial dashboard for revenue, forecast accuracy, gross margin, operating profit, cash position, and invoice volume.",
      points: [
        "Compares actual revenue with forecast across business units.",
        "Tracks operating profit after COGS and operating expenses.",
        "Shows cash and invoice movement for quick executive review.",
      ],
      screenshotLabel: "Revenue, Forecast, and Cash Overview",
      links: [{ label: "Local CSV Dataset", href: "/dashboard-data/finance-performance.csv", kind: "data" }],
      preview: {
        kind: "generated",
        title: "Finance Performance",
        eyebrow: "Forecast and cash view",
        theme: "purple",
        states: [
          makeState(
            "Company",
            "Executive view",
            "Forecast beating plan",
            [
              { label: "Revenue", value: money(financeRevenue), delta: `${percent(safeRatio(financeRevenue, financeForecast))} forecast` },
              { label: "Gross Margin", value: percent(safeRatio(financeRevenue - sum(financeRecords.map((row) => row.cogs)), financeRevenue)), delta: "after COGS" },
              { label: "Cash", value: money(average(financeRecords.map((row) => row.cash))), delta: "avg position" },
            ],
            groupedTotal(financeRecords, (row) => row.unit, (row) => row.revenue),
            monthlyTotal(financeRecords, (row) => row.revenue),
            topTable(groupedTotal(financeRecords, (row) => row.unit, (row) => row.revenue), money, "On Track"),
            "The finance state focuses on executive pacing: actual revenue, forecast accuracy, and cash resilience in one view.",
          ),
          makeState(
            "Enterprise",
            "Largest unit",
            "High revenue selected",
            [
              { label: "Revenue", value: money(sum(enterpriseFinance.map((row) => row.revenue))), delta: "unit total" },
              { label: "Invoices", value: compact(sum(enterpriseFinance.map((row) => row.invoices))), delta: "billing flow" },
              { label: "Forecast", value: percent(safeRatio(sum(enterpriseFinance.map((row) => row.revenue)), sum(enterpriseFinance.map((row) => row.forecast)))), delta: "plan fit" },
            ],
            groupedTotal(enterpriseFinance, (row) => row.month, (row) => row.revenue).slice(0, 6),
            monthlyTotal(enterpriseFinance, (row) => row.revenue),
            topTable(groupedTotal(enterpriseFinance, (row) => row.month, (row) => row.revenue), money, "Strong"),
            "Enterprise shows the biggest revenue mass, so this state is useful for spotting forecast quality in the core account base.",
          ),
          makeState(
            "Growth",
            "Expansion view",
            "Scaling unit selected",
            [
              { label: "Revenue", value: money(sum(growthFinance.map((row) => row.revenue))), delta: "unit total" },
              { label: "Cash Avg", value: money(average(growthFinance.map((row) => row.cash))), delta: "runway read" },
              { label: "Invoices", value: compact(sum(growthFinance.map((row) => row.invoices))), delta: "volume" },
            ],
            groupedTotal(growthFinance, (row) => row.month, (row) => row.revenue).slice(0, 6),
            monthlyTotal(growthFinance, (row) => row.revenue),
            topTable(groupedTotal(growthFinance, (row) => row.month, (row) => row.revenue), money, "Scale"),
            "Growth mode changes the focus from total size to expansion consistency and collection rhythm.",
          ),
        ],
        guide: [
          "Forecast attainment shows how closely actual revenue follows plan.",
          "Gross margin separates revenue scale from cost efficiency.",
          "Cash position gives a quick read on business resilience.",
        ],
      },
    },
    {
      title: "Power BI Dashboard: Workforce Analytics",
      description:
        "People analytics dashboard for headcount growth, hiring movement, attrition, training investment, and engagement health.",
      points: [
        "Tracks headcount, hires, exits, engagement, training hours, and open roles.",
        "Compares departments and locations to identify hiring pressure.",
        "Connects workforce movement with morale and capacity planning.",
      ],
      screenshotLabel: "Headcount and Engagement Overview",
      links: [{ label: "Local CSV Dataset", href: "/dashboard-data/workforce-analytics.csv", kind: "data" }],
      preview: {
        kind: "generated",
        title: "Workforce Analytics",
        eyebrow: "People and capacity view",
        theme: "blue",
        states: [
          makeState(
            "Company",
            "People overview",
            "Hiring engine active",
            [
              { label: "Headcount", value: compact(workforceHeadcount), delta: `${compact(workforceHires)} hires` },
              { label: "Attrition", value: percent(safeRatio(workforceExits, workforceHeadcount + workforceHires)), delta: "exit rate" },
              { label: "Engagement", value: percent(average(workforceRecords.map((row) => row.engagement))), delta: "pulse score" },
            ],
            groupedTotal(workforceRecords, (row) => row.department, (row) => row.headcount),
            monthlyTotal(workforceRecords, (row) => row.headcount),
            topTable(groupedTotal(workforceRecords, (row) => row.location, (row) => row.headcount), compact, "Active"),
            "The people overview connects staffing movement with engagement, making the hiring story easier to defend.",
          ),
          makeState(
            "Analytics",
            "Data team",
            "High engagement selected",
            [
              { label: "Headcount", value: compact(sum(analyticsWorkforce.map((row) => row.headcount))), delta: "team capacity" },
              { label: "Engagement", value: percent(average(analyticsWorkforce.map((row) => row.engagement))), delta: "morale" },
              { label: "Training", value: compact(sum(analyticsWorkforce.map((row) => row.trainingHours))), delta: "hours" },
            ],
            groupedTotal(analyticsWorkforce, (row) => row.location, (row) => row.headcount),
            monthlyTotal(analyticsWorkforce, (row) => row.headcount),
            topTable(groupedTotal(analyticsWorkforce, (row) => row.location, (row) => row.openRoles), compact, "Open"),
            "Analytics mode surfaces the team you want recruiters to notice: high engagement, strong training, and open role clarity.",
          ),
          makeState(
            "Engineering",
            "Delivery team",
            "Capacity pressure selected",
            [
              { label: "Headcount", value: compact(sum(engineeringWorkforce.map((row) => row.headcount))), delta: "delivery base" },
              { label: "Open Roles", value: compact(sum(engineeringWorkforce.map((row) => row.openRoles))), delta: "hiring pressure" },
              { label: "Training", value: compact(sum(engineeringWorkforce.map((row) => row.trainingHours))), delta: "upskill hours" },
            ],
            groupedTotal(engineeringWorkforce, (row) => row.location, (row) => row.headcount),
            monthlyTotal(engineeringWorkforce, (row) => row.headcount),
            topTable(groupedTotal(engineeringWorkforce, (row) => row.location, (row) => row.openRoles), compact, "Hiring"),
            "Engineering mode shows capacity risk and where hiring pressure is concentrated by location.",
          ),
        ],
        guide: [
          "Headcount trend supports hiring and capacity planning.",
          "Engagement and attrition together reveal retention risk.",
          "Open roles show where teams may need more staffing focus.",
        ],
      },
    },
  ];
}

export default function DashboardsPage() {
  const [pulse, setPulse] = useState<AiPulsePayload>(fallbackPulse);

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "portfolio");
    document.title = "Tanmay Kalbande - Power BI & Tableau Dashboards";

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const loadPulse = async () => {
      try {
        const response = await fetch(`/api/aiPulse?ts=${Date.now()}`);
        if (!response.ok) return;
        const payload = (await response.json()) as AiPulsePayload;
        setPulse(payload);
      } catch {
        setPulse({ ...fallbackPulse, generatedAt: new Date().toISOString() });
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    void loadPulse();

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const dashboardProjects = useMemo(() => buildProjects(pulse), [pulse]);

  return (
    <div className="portfolio-shell">
      <div className="lp-bg-wrapper">
        <div className="lp-grain"></div>
        <div className="lp-grid-original"></div>
        <div className="lp-orb lp-orb-a"></div>
        <div className="lp-orb lp-orb-b"></div>
        <div className="lp-orb lp-orb-c"></div>
      </div>
      <div className="portfolio-container" style={{ position: "relative", zIndex: 2 }}>
        <div className="portfolio-header">
          <div className="logo">
            <div className="photo-protection-overlay" onContextMenu={(e) => e.preventDefault()} />
            <img
              src={assetUrls.profilePhoto}
              alt="Tanmay Kalbande profile"
              onContextMenu={(e) => e.preventDefault()}
              draggable="false"
              style={{ userSelect: "none" }}
            />
          </div>
          <div className="header-text">
            <h1>Tanmay - Power BI &amp; Tableau Dashboards</h1>
            <h2>Data Visualization Portfolio</h2>
          </div>
          <div className="contact-info">
            <p>
              Email: <a href="mailto:tanmaykalbande@gmail.com">tanmaykalbande@gmail.com</a>
              <br />
              Phone: 737-838-1494
            </p>
            <p className="back-home-link">
              <Link to="/portfolio">Back to Portfolio</Link>
            </p>
          </div>
        </div>

        <div className="section">
          <h2>Power BI &amp; Tableau Dashboards</h2>
          {dashboardProjects.map((project) => (
            <div key={project.title} className="project">
              <details className="project-title" open>
                <summary>
                  <strong>{project.title}</strong>
                  <p className="project-description">{project.description}</p>
                </summary>
                <ul>
                  {project.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <p>
                  <strong>Screenshot Title:</strong> {project.screenshotLabel}
                </p>
                <DashboardMockup preview={project.preview} />
                {project.links.length > 0 ? (
                  <p className="project-link dashboard-link-row">
                    {project.links.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={`download-button dashboard-link dashboard-link--${link.kind}`}>
                        {link.label}
                      </a>
                    ))}
                  </p>
                ) : null}
              </details>
            </div>
          ))}
        </div>

        <div className="section-divider">
          <p>
            <strong>Interested?</strong>
          </p>
          <h3>Get in touch!</h3>
        </div>

        <div className="section">
          <h2 id="contact">Contact</h2>
          <p className="text-center">Feel free to reach out if you&apos;d like to connect or discuss a project.</p>
          <p className="text-center">
            <i className="fab fa-linkedin" />{" "}
            <a href="https://www.linkedin.com/in/tanmay-kalbande" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <br />
            <i className="fab fa-github" />{" "}
            <a href="https://github.com/tanmay-kalbande" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </p>
          <p className="text-center">
            <a href="#top">Back to top</a>
          </p>
        </div>
      </div>

      <footer className="portfolio-footer">
        <span>&copy; {new Date().getFullYear()} Tanmay Kalbande. All rights reserved.</span>
        <span className="hidden-mobile">Crafted with love and coffee</span>
      </footer>
    </div>
  );
}
