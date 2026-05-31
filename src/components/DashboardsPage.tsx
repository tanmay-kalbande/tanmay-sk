import { useEffect } from "react";
import { Link } from "react-router-dom";
import { assetUrls, dashboardProjects, socialLinks } from "../data/siteData";
import "../styles/landing.css";
import "../styles/dashboards.css";

export default function DashboardsPage() {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "portfolio");
    document.title = "Tanmay Kalbande - Power BI & Data Dashboards";
    return undefined;
  }, []);

  const dashboard = dashboardProjects[0];

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
        {/* ── Header ── */}
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
            <h1>Data Visualization</h1>
            <h2>Power BI &amp; Tableau Dashboards</h2>
          </div>
          <div className="contact-info">
            <p>
              Email: <a href="mailto:kalbandetanmay@gmail.com">kalbandetanmay@gmail.com</a>
              <br />
              Phone: <a href="tel:7378381494">737-838-1494</a>
            </p>
            <p className="back-home-link">
              <Link to="/">← Back Home</Link>
            </p>
          </div>
        </div>

        {/* ── Intro ── */}
        <div className="section">
          <h2>About This Work</h2>
          <p>
            I build dashboards that turn raw numbers into clear stories. Below is a Power BI
            report I created from India&apos;s public wireless-data records — tracking usage
            growth, tariff movement, and derived quarterly revenue from 2017 to 2022.
          </p>
          <p>
            My approach is straightforward: start with a clean dataset, find the trends that
            actually matter, and present them so a non-technical stakeholder can act on them
            within thirty seconds of opening the report.
          </p>
        </div>

        {/* ── Dashboard Showcase ── */}
        <div className="section">
          <h2>
            <i className="fas fa-chart-bar" style={{ marginRight: "0.5rem", opacity: 0.6 }} />
            {dashboard.title}
          </h2>
          <p className="project-description">{dashboard.description}</p>

          <div className="dash-screenshot-wrap">
            <img
              src={dashboard.screenshot}
              alt={dashboard.screenshotLabel}
              className="project-screenshot"
              draggable="false"
            />
            <span className="dash-screenshot-caption">
              <i className="fas fa-image" /> {dashboard.screenshotLabel}
            </span>
          </div>

          <h4>Key Analysis Points</h4>
          <ul>
            {dashboard.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className="project-links" style={{ marginTop: "1.25rem" }}>
            <a
              href={dashboard.downloadHref}
              className="neo-button"
              target="_blank"
              rel="noreferrer"
            >
              <i className="fas fa-download" /> Download PBIX
            </a>
            <a
              href="https://data.gov.in/"
              className="neo-button"
              target="_blank"
              rel="noreferrer"
              style={{ background: "#475569", borderColor: "#475569" }}
            >
              <i className="fas fa-database" /> Data Source
            </a>
            <Link to="/portfolio" className="neo-button" style={{ background: "#475569", borderColor: "#475569" }}>
              <i className="fas fa-folder-open" /> View Full Portfolio
            </Link>
          </div>
        </div>

        {/* ── Approach ── */}
        <div className="section">
          <h2>My Dashboard Philosophy</h2>
          <div className="dash-approach-grid">
            <div className="dash-approach-card">
              <div className="dash-approach-icon">
                <i className="fas fa-broom" />
              </div>
              <h3>Clean Data First</h3>
              <p>
                Every dashboard starts with proper data cleaning — removing noise, handling
                nulls, and validating sources before a single chart gets drawn.
              </p>
            </div>
            <div className="dash-approach-card">
              <div className="dash-approach-icon">
                <i className="fas fa-lightbulb" />
              </div>
              <h3>Insight-Driven</h3>
              <p>
                Charts exist to answer questions, not to look pretty. Each visual has a
                purpose — if it doesn&apos;t help someone make a decision, it gets cut.
              </p>
            </div>
            <div className="dash-approach-card">
              <div className="dash-approach-icon">
                <i className="fas fa-users" />
              </div>
              <h3>Built for Stakeholders</h3>
              <p>
                I design dashboards for the people who will actually use them — product
                managers, analysts, and leadership who need answers fast.
              </p>
            </div>
          </div>
        </div>

        {/* ── Tools Used ── */}
        <div className="section">
          <h2>Tools I Work With</h2>
          <div className="dash-tools-row">
            {[
              { icon: "fas fa-chart-pie", name: "Power BI" },
              { icon: "fas fa-chart-area", name: "Tableau" },
              { icon: "fab fa-python", name: "Matplotlib" },
              { icon: "fas fa-chart-bar", name: "Seaborn" },
              { icon: "fas fa-database", name: "SQL" },
              { icon: "fas fa-file-excel", name: "Excel" },
            ].map((tool) => (
              <div key={tool.name} className="dash-tool-chip">
                <i className={tool.icon} />
                <span>{tool.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="section cta-section">
          <h2>Want to see more?</h2>
          <p>
            Check out my full portfolio for analytics case studies, ML projects, and
            AI-powered tools I&apos;ve built.
          </p>
          <div className="cta-buttons">
            <Link to="/portfolio" className="neo-button">
              <i className="fas fa-briefcase" /> Full Portfolio
            </Link>
            <Link to="/assistant" className="neo-button" style={{ background: "#475569", borderColor: "#475569" }}>
              <i className="fas fa-robot" /> Ask AI About My Work
            </Link>
          </div>
        </div>

        {/* ── Contact ── */}
        <div className="section-divider">
          <p><strong>Interested in working together?</strong></p>
          <h3>Get in touch!</h3>
        </div>

        <div className="section">
          <h2 id="contact">Contact</h2>
          <p style={{ textAlign: "center" }}>
            Feel free to reach out if you&apos;d like to connect, discuss a project, or just
            say hello!
          </p>
          <div className="button-group centered-button-group">
            <a href="mailto:kalbandetanmay@gmail.com" className="neo-button">
              <i className="fas fa-envelope" /> Email Me
            </a>
            <a
              href="https://wa.me/7378381494?text=Hi%20Tanmay,%20I%20came%20across%20your%20portfolio%20and%20I%20"
              className="neo-button"
            >
              <i className="fab fa-whatsapp" /> WhatsApp
            </a>
            {socialLinks
              .filter((l) => l.label === "LinkedIn Profile" || l.label === "GitHub Profile")
              .map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="neo-button">
                  <i className={l.icon} /> {l.label.replace(" Profile", "")}
                </a>
              ))}
          </div>
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            <a href="#top">Back to top</a>
          </p>
        </div>
      </div>

      <footer className="portfolio-footer">
        <div className="footer-content">
          <span>&copy; {new Date().getFullYear()} Tanmay Kalbande. All rights reserved.</span>
          <span className="hidden-mobile">Crafted with love and coffee</span>
        </div>
      </footer>
    </div>
  );
}
