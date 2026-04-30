import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  ChevronLeft,
  Database,
  Download,
  FileChartColumn,
  Gauge,
  IndianRupee,
  Layers3,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  assetUrls,
  certifications,
  dashboardProjects,
  experiences,
  personalProjects,
  professionalProjects,
  skills,
  toolSummary,
} from "../data/siteData";
import "../styles/dashboards.css";

type DashboardId = "data-wave" | "portfolio-health" | "project-delivery";

type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: typeof BarChart3;
};

const dataWave = dashboardProjects[0];

const dashboardTabs: Array<{
  id: DashboardId;
  label: string;
  eyebrow: string;
  confidence: string;
  tone: string;
}> = [
  {
    id: "data-wave",
    label: "Data Wave Metrics",
    eyebrow: "Power BI report",
    confidence: "PBIX + screenshot",
    tone: "#dc2626",
  },
  {
    id: "portfolio-health",
    label: "Portfolio Health",
    eyebrow: "Profile analytics",
    confidence: "siteData.ts",
    tone: "#2563eb",
  },
  {
    id: "project-delivery",
    label: "Project Delivery",
    eyebrow: "Work map",
    confidence: "portfolio records",
    tone: "#0f766e",
  },
];

const dataWaveMetrics: Metric[] = [
  {
    label: "Period Covered",
    value: "2017-2022",
    detail: "Quarterly telecom trend window",
    icon: LineChart,
    tone: "#2563eb",
  },
  {
    label: "Revenue Total",
    value: "565,745 Cr.",
    detail: "Derived in the PBIX from usage x tariff",
    icon: IndianRupee,
    tone: "#dc2626",
  },
  {
    label: "Data Usage",
    value: "521,490 PB",
    detail: "Total quarterly usage shown in the report",
    icon: Database,
    tone: "#0f766e",
  },
  {
    label: "Report Asset",
    value: "PBIX",
    detail: "Source file included for review",
    icon: FileChartColumn,
    tone: "#7c3aed",
  },
];

const dataWaveChecks = [
  "Dataset source is stated inside the report as data.gov.in.",
  "Revenue is labelled as a derived telecom metric, not company revenue.",
  "The downloadable PBIX and screenshot reference the same report asset.",
  "This is the strongest public-data dashboard in the gallery.",
] as const;

function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <div className="dash-metric" style={cssVars({ "--tone": metric.tone })}>
      <Icon size={18} />
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
    </div>
  );
}

function MiniBars({ rows }: { rows: Array<{ label: string; value: number; tone?: string }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="dash-bars">
      {rows.map((row) => (
        <div className="dash-bars__row" key={row.label}>
          <span>{row.label}</span>
          <div>
            <i style={cssVars({ "--w": `${Math.max(8, (row.value / max) * 100)}%`, "--tone": row.tone ?? "#2563eb" })} />
          </div>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function DataWaveDashboard() {
  return (
    <div className="dash-board dash-board--data">
      <section className="dash-hero-panel">
        <div className="dash-panel-heading">
          <p>Power BI Dashboard</p>
          <h1>{dataWave.title.replace("Power BI Dashboard: ", "")}</h1>
          <span>
            Wireless data usage, tariff per GB, derived quarterly revenue, and petabyte consumption
            trends for India.
          </span>
        </div>
        <a href={dataWave.downloadHref} target="_blank" rel="noreferrer" className="dash-primary-action">
          <Download size={18} />
          Download PBIX
        </a>
      </section>

      <section className="dash-image-panel">
        <img src={dataWave.screenshot} alt={dataWave.screenshotLabel} />
      </section>

      <aside className="dash-side-panel">
        <div className="dash-section-title">
          <ShieldCheck size={18} />
          <div>
            <strong>Data Confidence</strong>
            <span>{dataWave.screenshotLabel}</span>
          </div>
        </div>
        <div className="dash-metric-grid">
          {dataWaveMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
        <ul className="dash-check-list">
          {dataWaveChecks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function PortfolioHealthDashboard() {
  const rows = useMemo(
    () => [
      { label: "Professional projects", value: professionalProjects.length, tone: "#2563eb" },
      { label: "Personal builds", value: personalProjects.length, tone: "#0f766e" },
      { label: "Certifications", value: certifications.length, tone: "#7c3aed" },
      { label: "Core skills", value: skills.length, tone: "#dc2626" },
    ],
    [],
  );

  const metrics: Metric[] = [
    {
      label: "Experience",
      value: "2+ yrs",
      detail: experiences.map((item) => item.company).join(" + "),
      icon: BriefcaseBusiness,
      tone: "#2563eb",
    },
    {
      label: "Project Records",
      value: String(professionalProjects.length + personalProjects.length),
      detail: "Projects listed in the portfolio data file",
      icon: Layers3,
      tone: "#0f766e",
    },
    {
      label: "Certifications",
      value: String(certifications.length),
      detail: "Credential entries currently shown",
      icon: BadgeCheck,
      tone: "#7c3aed",
    },
    {
      label: "Tool Groups",
      value: String(toolSummary.length),
      detail: "Languages, ML, BI, backend groups",
      icon: Gauge,
      tone: "#dc2626",
    },
  ];

  return (
    <div className="dash-board dash-board--profile">
      <section className="dash-hero-panel dash-hero-panel--blue">
        <div className="dash-panel-heading">
          <p>Profile Analytics</p>
          <h1>Portfolio Health Dashboard</h1>
          <span>
            A source-backed view of Tanmay's skills, experience, certifications, and project inventory
            using the portfolio content already shown on the site.
          </span>
        </div>
      </section>

      <section className="dash-metric-grid dash-metric-grid--wide">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="dash-visual-panel dash-visual-panel--bars">
        <div className="dash-section-title">
          <BarChart3 size={18} />
          <div>
            <strong>Portfolio Mix</strong>
            <span>Counts derived from siteData.ts</span>
          </div>
        </div>
        <MiniBars rows={rows} />
      </section>

      <section className="dash-visual-panel dash-visual-panel--timeline">
        <div className="dash-section-title">
          <BriefcaseBusiness size={18} />
          <div>
            <strong>Experience Timeline</strong>
            <span>Only roles listed on the portfolio</span>
          </div>
        </div>
        <div className="dash-timeline">
          {experiences.map((experience) => (
            <article key={experience.company}>
              <span>{experience.duration}</span>
              <strong>{experience.title}</strong>
              <small>{experience.company}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="dash-visual-panel dash-visual-panel--table">
        <div className="dash-section-title">
          <Database size={18} />
          <div>
            <strong>Tool Coverage</strong>
            <span>Grouped exactly from profile data</span>
          </div>
        </div>
        <div className="dash-table">
          {toolSummary.map((item) => (
            <div key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProjectDeliveryDashboard() {
  const publicPersonalProjects = personalProjects.filter((project) =>
    project.links.some((link) => link.label.toLowerCase().includes("live") || link.label.toLowerCase().includes("website")),
  );
  const githubProjects = personalProjects.filter((project) =>
    project.links.some((link) => link.label.toLowerCase().includes("github")),
  );
  const aiProjects = personalProjects.filter((project) => {
    const text = `${project.label} ${project.description} ${project.features.join(" ")}`.toLowerCase();
    return text.includes("ai") || text.includes("llm") || text.includes("gemma");
  });

  const rows = [
    { label: "Public demos", value: publicPersonalProjects.length, tone: "#0f766e" },
    { label: "GitHub-linked", value: githubProjects.length, tone: "#2563eb" },
    { label: "AI builds", value: aiProjects.length, tone: "#7c3aed" },
    { label: "Client analytics", value: professionalProjects.length, tone: "#dc2626" },
  ];

  const metrics: Metric[] = [
    {
      label: "Public Demos",
      value: String(publicPersonalProjects.length),
      detail: "Live links currently present",
      icon: Sparkles,
      tone: "#0f766e",
    },
    {
      label: "Code Links",
      value: String(githubProjects.length),
      detail: "Projects with GitHub links",
      icon: FileChartColumn,
      tone: "#2563eb",
    },
    {
      label: "AI Projects",
      value: String(aiProjects.length),
      detail: "Detected from listed project text",
      icon: BookOpen,
      tone: "#7c3aed",
    },
    {
      label: "Client Work",
      value: String(professionalProjects.length),
      detail: "Professional analytics case studies",
      icon: BriefcaseBusiness,
      tone: "#dc2626",
    },
  ];

  const featured = [
    personalProjects[0],
    ...personalProjects.filter((project) => project.label.includes("AI") || project.label.includes("Bias")).slice(0, 2),
    ...professionalProjects.slice(0, 2),
  ];

  return (
    <div className="dash-board dash-board--delivery">
      <section className="dash-hero-panel dash-hero-panel--green">
        <div className="dash-panel-heading">
          <p>Project Delivery</p>
          <h1>High-Confidence Work Map</h1>
          <span>
            A clean delivery dashboard based only on portfolio project entries, live links, GitHub links,
            and professional case-study records.
          </span>
        </div>
      </section>

      <section className="dash-metric-grid dash-metric-grid--wide">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="dash-visual-panel dash-visual-panel--bars">
        <div className="dash-section-title">
          <Layers3 size={18} />
          <div>
            <strong>Delivery Mix</strong>
            <span>Derived from project link and project text fields</span>
          </div>
        </div>
        <MiniBars rows={rows} />
      </section>

      <section className="dash-project-list">
        <div className="dash-section-title">
          <ShieldCheck size={18} />
          <div>
            <strong>Featured Records</strong>
            <span>Curated from stronger portfolio entries</span>
          </div>
        </div>
        <div className="dash-record-grid">
          {featured.map((project) => (
            <article key={"label" in project ? project.label : project.title}>
              <span>{"label" in project ? "Personal build" : "Professional case"}</span>
              <strong>{"label" in project ? project.label : project.title}</strong>
              <small>{"label" in project ? project.description : project.description}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DashboardsPage() {
  const [activeDashboard, setActiveDashboard] = useState<DashboardId>("data-wave");
  const activeMeta = dashboardTabs.find((tab) => tab.id === activeDashboard) ?? dashboardTabs[0];

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "dashboards-v4");
    document.title = "Tanmay Kalbande - Curated Dashboards";
  }, []);

  return (
    <div className="dash-page" style={cssVars({ "--active": activeMeta.tone })}>
      <header className="dash-topbar">
        <Link to="/portfolio" className="dash-back">
          <ChevronLeft size={17} />
          Portfolio
        </Link>
        <div className="dash-topbar__title">
          <BadgeCheck size={18} />
          <span>Curated High-Confidence Dashboards</span>
        </div>
        <a className="dash-download" href={assetUrls.dashboardFile} target="_blank" rel="noreferrer">
          <Download size={17} />
          PBIX
        </a>
      </header>

      <main className="dash-shell">
        <aside className="dash-nav" aria-label="Dashboard reports">
          <div className="dash-nav__brand">
            <div className="dash-logo">
              <span />
              <span />
              <span />
            </div>
            <div>
              <strong>Dashboard Gallery</strong>
              <small>Low-confidence pages removed</small>
            </div>
          </div>
          <div className="dash-nav__items">
            {dashboardTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tab.id === activeDashboard ? "is-active" : undefined}
                onClick={() => setActiveDashboard(tab.id)}
                style={cssVars({ "--tone": tab.tone })}
              >
                <span>{tab.eyebrow}</span>
                <strong>{tab.label}</strong>
                <small>{tab.confidence}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="dash-canvas">
          {activeDashboard === "data-wave" ? <DataWaveDashboard /> : null}
          {activeDashboard === "portfolio-health" ? <PortfolioHealthDashboard /> : null}
          {activeDashboard === "project-delivery" ? <ProjectDeliveryDashboard /> : null}
        </section>
      </main>
    </div>
  );
}
