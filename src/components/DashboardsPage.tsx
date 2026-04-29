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
};

type PreviewChart = {
  label: string;
  value: number;
};

type DashboardPreview = {
  kind: "image" | "generated";
  screenshot?: string;
  title: string;
  theme: "red" | "blue" | "green" | "orange" | "purple";
  metrics: PreviewMetric[];
  bars: PreviewChart[];
  line: PreviewChart[];
  table: Array<[string, string, string]>;
  guide: string[];
};

type DashboardProject = {
  title: string;
  description: string;
  points: string[];
  screenshotLabel: string;
  downloadHref?: string;
  actionLabel?: string;
  preview: DashboardPreview;
};

type AiPulsePayload = {
  generatedAt: string;
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

const fallbackPulse: AiPulsePayload = {
  generatedAt: new Date().toISOString(),
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
  const width = 360;
  const height = 132;
  const max = Math.max(...data.map((item) => item.value), 1);
  const min = Math.min(...data.map((item) => item.value), 0);
  const span = Math.max(max - min, 1);

  return data
    .map((item, index) => {
      const x = 16 + (index / Math.max(1, data.length - 1)) * (width - 32);
      const y = height - 16 - ((item.value - min) / span) * (height - 30);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function DashboardMockup({ preview }: { preview: DashboardPreview }) {
  if (preview.kind === "image" && preview.screenshot) {
    return <img src={preview.screenshot} alt={preview.title} className="project-screenshot" />;
  }

  const maxBar = Math.max(...preview.bars.map((item) => item.value), 1);

  return (
    <div className={`project-screenshot dashboard-preview dashboard-preview--${preview.theme}`}>
      <div className="dashboard-preview__top">
        <h3>{preview.title}</h3>
        <div className="dashboard-preview__stamp">Power BI style report</div>
      </div>

      <div className="dashboard-preview__metrics">
        {preview.metrics.map((metric) => (
          <div key={metric.label} className="dashboard-preview__metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-preview__grid">
        <section className="dashboard-tile dashboard-tile--bars">
          <h4>Category Breakdown</h4>
          {preview.bars.slice(0, 5).map((item) => (
            <div className="dashboard-bar" key={item.label}>
              <span>{item.label}</span>
              <i style={{ width: `${Math.max(8, (item.value / maxBar) * 100)}%` }} />
              <strong>{compact(item.value)}</strong>
            </div>
          ))}
        </section>

        <section className="dashboard-tile dashboard-tile--line">
          <h4>Monthly Trend</h4>
          <svg viewBox="0 0 360 132" role="img" aria-label={`${preview.title} line chart`}>
            <line x1="16" x2="344" y1="34" y2="34" />
            <line x1="16" x2="344" y1="72" y2="72" />
            <line x1="16" x2="344" y1="110" y2="110" />
            <polyline points={linePoints(preview.line)} />
          </svg>
        </section>

        <section className="dashboard-tile dashboard-tile--table">
          <h4>Detail Table</h4>
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Metric</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.table.map((row) => (
                <tr key={row.join("-")}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="dashboard-tile dashboard-tile--guide">
          <h4>Data Metrics Guide</h4>
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

function buildProjects(pulse: AiPulsePayload): DashboardProject[] {
  const salesRevenue = sum(salesRecords.map((row) => row.revenue));
  const salesTarget = sum(salesRecords.map((row) => row.target));
  const salesProfit = sum(salesRecords.map((row) => row.profit));
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
      downloadHref: assetUrls.dashboardFile,
      actionLabel: "Download Power BI Dashboard",
      preview: {
        kind: "image",
        screenshot: assetUrls.dashboardPhoto,
        title: "Data Wave Metrics in India",
        theme: "red",
        metrics: [],
        bars: [],
        line: [],
        table: [],
        guide: [],
      },
    },
    {
      title: "Power BI Dashboard: AI & Tech Pulse Intelligence",
      description:
        "A current AI and technology signal dashboard that tracks research activity, open-source momentum, and tech discussion pressure.",
      points: [
        "Combines live/cached public signals from arXiv, GitHub, and Hacker News.",
        "Ranks hot AI topics such as agents, LLMs, MLOps, and data engineering.",
        "Turns noisy tech activity into a compact analyst-ready trend view.",
      ],
      screenshotLabel: "AI Signal Momentum Overview",
      preview: {
        kind: "generated",
        title: "AI & Tech Pulse",
        theme: "blue",
        metrics: [
          { label: "Attention Score", value: String(pulse.metrics.attentionScore) },
          { label: "Research Items", value: compact(pulse.metrics.researchCount) },
          { label: "Repo Stars", value: compact(pulse.metrics.repoStars) },
        ],
        bars: pulse.topicMomentum.map((item) => ({ label: item.topic, value: item.score })),
        line: pulse.trend.map((item) => ({ label: item.label, value: item.ai })),
        table: [
          [pulse.metrics.hottestTopic, "Hot Topic", "Rising"],
          ["Research", compact(pulse.metrics.researchCount), "Active"],
          ["Discussions", compact(pulse.metrics.discussionPoints), "High"],
        ],
        guide: [
          "Attention score blends research, open-source, and discussion signals.",
          "Topic momentum highlights the strongest themes for the current period.",
          "Useful for tracking where AI builders and data teams are moving.",
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
      preview: {
        kind: "generated",
        title: "Sales Performance",
        theme: "green",
        metrics: [
          { label: "Revenue", value: money(salesRevenue) },
          { label: "Target", value: percent(safeRatio(salesRevenue, salesTarget)) },
          { label: "Profit", value: money(salesProfit) },
        ],
        bars: groupedTotal(salesRecords, (row) => row.category, (row) => row.revenue),
        line: monthlyTotal(salesRecords, (row) => row.revenue),
        table: groupedTotal(salesRecords, (row) => row.channel, (row) => row.revenue)
          .slice(0, 4)
          .map((row) => [row.label, money(row.value), "Healthy"]),
        guide: [
          "Revenue is compared against planned monthly and quarterly targets.",
          "Profit margin shows the quality of growth, not only total sales.",
          "Channel view helps identify where demand is converting best.",
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
      preview: {
        kind: "generated",
        title: "Support Operations",
        theme: "orange",
        metrics: [
          { label: "Tickets", value: compact(supportTickets) },
          { label: "Resolved", value: percent(safeRatio(supportResolved, supportTickets)) },
          { label: "Avg CSAT", value: average(supportRecords.map((row) => row.csat)).toFixed(2) },
        ],
        bars: groupedTotal(supportRecords, (row) => row.team, (row) => row.tickets),
        line: monthlyTotal(supportRecords, (row) => row.tickets),
        table: groupedTotal(supportRecords, (row) => row.priority, (row) => row.tickets).map((row) => [
          row.label,
          compact(row.value),
          row.label === "P1" ? "Watch" : "Stable",
        ]),
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
      preview: {
        kind: "generated",
        title: "Finance Performance",
        theme: "purple",
        metrics: [
          { label: "Revenue", value: money(financeRevenue) },
          { label: "Forecast", value: percent(safeRatio(financeRevenue, financeForecast)) },
          { label: "Cash", value: money(average(financeRecords.map((row) => row.cash))) },
        ],
        bars: groupedTotal(financeRecords, (row) => row.unit, (row) => row.revenue),
        line: monthlyTotal(financeRecords, (row) => row.revenue),
        table: groupedTotal(financeRecords, (row) => row.unit, (row) => row.revenue)
          .slice(0, 4)
          .map((row) => [row.label, money(row.value), "On Track"]),
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
      preview: {
        kind: "generated",
        title: "Workforce Analytics",
        theme: "blue",
        metrics: [
          { label: "Headcount", value: compact(workforceHeadcount) },
          { label: "Hires", value: compact(workforceHires) },
          { label: "Attrition", value: percent(safeRatio(workforceExits, workforceHeadcount + workforceHires)) },
        ],
        bars: groupedTotal(workforceRecords, (row) => row.department, (row) => row.headcount),
        line: monthlyTotal(workforceRecords, (row) => row.headcount),
        table: groupedTotal(workforceRecords, (row) => row.location, (row) => row.headcount)
          .slice(0, 4)
          .map((row) => [row.label, compact(row.value), "Active"]),
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
                {project.downloadHref ? (
                  <p className="project-link">
                    <a href={project.downloadHref} target="_blank" rel="noreferrer" className="download-button">
                      {project.actionLabel ?? "Download Dashboard"}
                    </a>
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
