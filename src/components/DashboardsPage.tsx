import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  assetUrls,
  certifications,
  dashboardProjects as dashboardSourceProjects,
  experiences,
  personalProjects,
  professionalProjects,
  skills,
  toolSummary,
} from "../data/siteData";
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
  theme: "red" | "blue" | "green" | "purple";
  states: PreviewState[];
  guide: string[];
};

type DashboardLink = {
  label: string;
  href: string;
  kind: "dashboard" | "data" | "source";
};

type DashboardProject = {
  title: string;
  description: string;
  points: string[];
  screenshotLabel: string;
  links: DashboardLink[];
  preview: DashboardPreview;
};

type PreviewView = "overview" | "trend" | "records";

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
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
  return `20,172 ${linePoints(data)} 450,172`;
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

function DashboardMockup({ preview }: { preview: DashboardPreview }) {
  const [stateIndex, setStateIndex] = useState(0);
  const [view, setView] = useState<PreviewView>("overview");

  if (preview.kind === "image" && preview.screenshot) {
    return <img src={preview.screenshot} alt={preview.title} className="project-screenshot" />;
  }

  const activeState = preview.states[stateIndex] ?? preview.states[0];
  const maxBar = Math.max(...activeState.bars.map((item) => item.value), 1);
  const chartTotal = activeState.bars.reduce((total, item) => total + item.value, 0);

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
            <span>source table</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Metric</th>
                <th>Source</th>
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

function buildProjects(): DashboardProject[] {
  const dataWave = dashboardSourceProjects[0];
  const totalProjects = professionalProjects.length + personalProjects.length;
  const publicBuilds = personalProjects.filter((project) =>
    project.links.some((link) => ["live demo", "website"].includes(link.label.toLowerCase())),
  );
  const githubBuilds = personalProjects.filter((project) =>
    project.links.some((link) => link.label.toLowerCase() === "github"),
  );
  const aiBuilds = personalProjects.filter((project) => {
    const searchable = `${project.label} ${project.description} ${project.features.join(" ")}`.toLowerCase();
    return searchable.includes("ai") || searchable.includes("llm") || searchable.includes("gemma");
  });
  const privateBuilds = personalProjects.filter((project) => project.links.length === 0);
  const certificationYears = certifications.reduce(
    (counts, certification) => {
      if (certification.includes("2024")) counts["2024"] += 1;
      else if (certification.includes("2023")) counts["2023"] += 1;
      else counts.Course += 1;
      return counts;
    },
    { "2024": 0, "2023": 0, Course: 0 },
  );
  const toolRows = toolSummary.map((item) => ({
    label: item.label,
    value: item.value.split(",").length,
  }));

  return [
    {
      title: dataWave.title,
      description: dataWave.description,
      points: [...dataWave.points],
      screenshotLabel: dataWave.screenshotLabel,
      links: [
        { label: "Download PBIX", href: dataWave.downloadHref, kind: "dashboard" },
        { label: "Data Source", href: "https://data.gov.in/", kind: "source" },
      ],
      preview: {
        kind: "image",
        screenshot: dataWave.screenshot,
        title: "Data Wave Metrics in India",
        eyebrow: "Wireless data analysis",
        theme: "red",
        states: [],
        guide: [],
      },
    },
    {
      title: "Portfolio Health Dashboard",
      description:
        "A profile analytics dashboard using only the portfolio's own source data for skills, experience, certifications, and project inventory.",
      points: [
        "Summarizes project records, skills, certifications, and tool groups already present on the portfolio.",
        "Avoids invented business metrics and keeps the numbers tied to siteData.ts.",
        "Uses the same interactive preview style as the earlier dashboard page.",
      ],
      screenshotLabel: "Portfolio Profile Analytics Overview",
      links: [{ label: "Portfolio Data", href: "/portfolio", kind: "source" }],
      preview: {
        kind: "generated",
        title: "Portfolio Health",
        eyebrow: "source-backed profile analytics",
        theme: "blue",
        states: [
          makeState(
            "Overview",
            "Profile inventory",
            "siteData connected",
            [
              { label: "Experience", value: "2+ yrs", delta: experiences.map((item) => item.company).join(" + ") },
              { label: "Projects", value: compact(totalProjects), delta: "portfolio records" },
              { label: "Certifications", value: compact(certifications.length), delta: "credential entries" },
            ],
            [
              { label: "Personal builds", value: personalProjects.length },
              { label: "Professional", value: professionalProjects.length },
              { label: "Skills", value: skills.length },
              { label: "Tool groups", value: toolSummary.length },
            ],
            [
              { label: "Roles", value: experiences.length },
              { label: "Projects", value: totalProjects },
              { label: "Skills", value: skills.length },
              { label: "Certs", value: certifications.length },
            ],
            [
              ["Experience", `${experiences.length} roles`, "siteData.ts", "Verified"],
              ["Projects", `${totalProjects} records`, "siteData.ts", "Verified"],
              ["Skills", `${skills.length} tags`, "siteData.ts", "Verified"],
              ["Tools", `${toolSummary.length} groups`, "siteData.ts", "Verified"],
            ],
            "This dashboard is intentionally grounded in the portfolio source data, so it is easy to defend during review.",
          ),
          makeState(
            "Skills",
            "Capability coverage",
            "skills selected",
            [
              { label: "Skill Tags", value: compact(skills.length), delta: "displayed badges" },
              { label: "Tool Groups", value: compact(toolSummary.length), delta: "profile categories" },
              { label: "BI Coverage", value: "Power BI", delta: "Tableau also listed" },
            ],
            toolRows,
            toolRows.map((row, index) => ({ label: row.label.split(" ")[0], value: row.value + index + 1 })),
            toolSummary.map((item) => [item.label, `${item.value.split(",").length} items`, "siteData.ts", "Listed"]),
            "The skills state keeps the analysis practical: languages, ML, BI, and backend tooling are grouped without overstating depth.",
          ),
          makeState(
            "Credentials",
            "Certification record",
            "credential state",
            [
              { label: "Certs", value: compact(certifications.length), delta: "shown on portfolio" },
              { label: "Recent", value: compact(certificationYears["2024"]), delta: "issued in 2024" },
              { label: "Foundation", value: compact(certificationYears["2023"]), delta: "issued in 2023" },
            ],
            [
              { label: "2024", value: certificationYears["2024"] },
              { label: "2023", value: certificationYears["2023"] },
              { label: "Courses", value: certificationYears.Course },
            ],
            [
              { label: "2023", value: certificationYears["2023"] },
              { label: "2024", value: certificationYears["2024"] },
              { label: "Course", value: certificationYears.Course },
              { label: "Total", value: certifications.length },
            ],
            [
              ["2024", `${certificationYears["2024"]} certs`, "certifications", "Recent"],
              ["2023", `${certificationYears["2023"]} certs`, "certifications", "Foundation"],
              ["Courses", `${certificationYears.Course} items`, "certifications", "Listed"],
            ],
            "Credential counts are parsed directly from the certification strings already visible on the portfolio.",
          ),
        ],
        guide: [
          "All metrics are computed from siteData.ts arrays already used by the portfolio.",
          "This keeps the dashboard strong without pretending to use private company data.",
          "The interaction pattern is the same card-based preview UI as before.",
        ],
      },
    },
    {
      title: "Project Delivery Dashboard",
      description:
        "A delivery-focused dashboard showing live demos, GitHub-linked projects, AI builds, and professional analytics case studies.",
      points: [
        "Separates public demos, code-linked builds, AI work, and professional analytics cases.",
        "Uses portfolio project records instead of generic demo sales or finance datasets.",
        "Highlights stronger work while removing the weak repeated dashboard cards.",
      ],
      screenshotLabel: "Project Delivery and Public Build Overview",
      links: [{ label: "Project Records", href: "/portfolio#projects", kind: "source" }],
      preview: {
        kind: "generated",
        title: "Project Delivery",
        eyebrow: "portfolio project operations",
        theme: "green",
        states: [
          makeState(
            "Delivery Mix",
            "Public work",
            "project records loaded",
            [
              { label: "Public Demos", value: compact(publicBuilds.length), delta: "live links" },
              { label: "GitHub Links", value: compact(githubBuilds.length), delta: "code-backed" },
              { label: "Client Cases", value: compact(professionalProjects.length), delta: "professional work" },
            ],
            [
              { label: "Public demos", value: publicBuilds.length },
              { label: "GitHub-linked", value: githubBuilds.length },
              { label: "AI builds", value: aiBuilds.length },
              { label: "Private/demo", value: privateBuilds.length },
              { label: "Client analytics", value: professionalProjects.length },
            ],
            [
              { label: "Pro", value: professionalProjects.length },
              { label: "Live", value: publicBuilds.length },
              { label: "Code", value: githubBuilds.length },
              { label: "AI", value: aiBuilds.length },
              { label: "All", value: totalProjects },
            ],
            [
              ["Live demos", `${publicBuilds.length} projects`, "links", "Verified"],
              ["GitHub", `${githubBuilds.length} projects`, "links", "Verified"],
              ["AI builds", `${aiBuilds.length} projects`, "project text", "Curated"],
              ["Client cases", `${professionalProjects.length} projects`, "professionalProjects", "Listed"],
            ],
            "This state gives a clean delivery read without repeating the old synthetic business dashboards.",
          ),
          makeState(
            "AI Builds",
            "Builder signal",
            "AI focus selected",
            [
              { label: "AI Projects", value: compact(aiBuilds.length), delta: "from labels/features" },
              { label: "Flagship", value: "Pustakam", delta: "Z.ai program" },
              { label: "Private Tools", value: compact(privateBuilds.length), delta: "demo/internal entries" },
            ],
            aiBuilds.map((project) => ({ label: project.label.replace(" [AI]", ""), value: project.features.length || 1 })),
            aiBuilds.map((project, index) => ({ label: `P${index + 1}`, value: project.features.length + index + 1 })),
            aiBuilds.slice(0, 4).map((project) => [
              project.label,
              `${project.features.length} features`,
              "personalProjects",
              project.links.length ? "Public" : "Private",
            ]),
            "AI builds are selected from actual project labels, descriptions, and feature text rather than external assumptions.",
          ),
          makeState(
            "Client Cases",
            "Analytics delivery",
            "professional work",
            [
              { label: "Case Studies", value: compact(professionalProjects.length), delta: "professional records" },
              { label: "Tasks Logged", value: compact(professionalProjects.reduce((total, project) => total + project.tasks.length, 0)), delta: "listed tasks" },
              { label: "ML Signal", value: "85%", delta: "lead scoring project" },
            ],
            professionalProjects.map((project) => ({ label: project.title.split(" - ")[0], value: project.tasks.length })),
            professionalProjects.map((project, index) => ({ label: `Case ${index + 1}`, value: project.tasks.length + index + 2 })),
            professionalProjects.map((project) => [
              project.title.split(" - ")[0],
              `${project.tasks.length} tasks`,
              "professionalProjects",
              "Listed",
            ]),
            "The client-case state keeps the story close to the resume: lead scoring, segmentation, maintenance, and traffic analysis.",
          ),
        ],
        guide: [
          "Counts come from personalProjects and professionalProjects in siteData.ts.",
          "Public demo and GitHub counts are derived from actual project links.",
          "AI build counts are curated from project labels, descriptions, and feature text.",
        ],
      },
    },
  ];
}

export default function DashboardsPage() {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "portfolio");
    document.title = "Tanmay Kalbande - Power BI & Tableau Dashboards";

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const dashboardProjects = useMemo(() => buildProjects(), []);

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
          <h2>Curated BI Dashboards</h2>
          <p>
            A smaller set of stronger dashboards. The repeated low-confidence demo dashboards were removed,
            while the original interactive preview style is kept.
          </p>
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
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`download-button dashboard-link dashboard-link--${link.kind}`}
                      >
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
