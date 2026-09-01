import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  assetUrls,
  beyondTheDesk,
  certifications,
  education,
  experiences,
  featuredProject,
  personalInfo,
  personalProjects,
  professionalProjects,
  skillsCategories,
  technicalSummary,
} from "../data/siteData";
import "../styles/landing.css";

type PersonalProjectId = (typeof personalProjects)[number]["id"];

export default function PortfolioPage() {
  const [activeProjectId, setActiveProjectId] = useState<PersonalProjectId>(personalProjects[0].id);

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "portfolio");
    document.title = "Tanmay Kalbande — Data Analyst & GenAI Engineer";
    return undefined;
  }, []);

  const activeProject = personalProjects.find((project) => project.id === activeProjectId) ?? personalProjects[0];

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
            <h1>{personalInfo.name}</h1>
            <h2>{personalInfo.title}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
              📍 {personalInfo.location} · <em>Open to relocate</em>
            </p>
          </div>
          <div className="contact-info">
            <p>
              <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>
              <br />
              <a href={`tel:${personalInfo.phone.replace(/[^0-9+]/g, "")}`}>{personalInfo.phone}</a>
            </p>
            <p className="back-home-link" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Link to="/">Back Home</Link>
              <span>·</span>
              <a href={assetUrls.resumePdf} target="_blank" rel="noopener noreferrer">
                Resume PDF ↗
              </a>
            </p>
          </div>
        </div>

        {/* Professional Summary */}
        <div className="section">
          <h2>Professional Summary</h2>
          <p>{personalInfo.summary}</p>
        </div>

        {/* Featured Project: Pustakam AI */}
        <div className="section" style={{ borderLeft: "4px solid var(--accent, #c8451a)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span className="lib-info-eyebrow" style={{ fontSize: "0.68rem", letterSpacing: "0.14em", color: "var(--accent, #c8451a)", fontWeight: 700, textTransform: "uppercase" }}>
                Featured Project
              </span>
              <h2 style={{ margin: "4px 0 2px" }}>{featuredProject.title}</h2>
              <p style={{ fontSize: "0.82rem", margin: "0 0 12px", opacity: 0.85, fontFamily: "var(--f-mono, monospace)" }}>
                {featuredProject.subtitle}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "4px 10px",
                  borderRadius: "3px",
                  background: "rgba(200, 69, 26, 0.12)",
                  color: "var(--accent, #c8451a)",
                  fontWeight: 700,
                  fontFamily: "var(--f-mono, monospace)",
                }}
              >
                ✨ {featuredProject.badge}
              </span>
              <a
                href={featuredProject.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="neo-button"
                style={{ padding: "0.35rem 0.8rem", fontSize: "0.72rem" }}
              >
                <i className="fas fa-desktop" /> Live Platform ↗
              </a>
            </div>
          </div>
          <ul className="experience-details" style={{ marginTop: "12px" }}>
            {featuredProject.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>

        {/* Experience */}
        <div className="section">
          <h2>Experience</h2>
          {experiences.map((experience) => (
            <div key={experience.title} className="experience-item">
              <div className="experience-header">
                <h3>{experience.title}</h3>
                <div className="experience-meta">
                  <span className="company">
                    <strong>{experience.company}</strong>
                  </span>
                  <span className="duration">{experience.duration}</span>
                </div>
              </div>
              <ul className="experience-details">
                {experience.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Key Projects */}
        <div className="section">
          <h2 id="projects">Key Projects</h2>
          {professionalProjects.map((project) => (
            <div key={project.title} className="project">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
                <h3 className="project-title" style={{ margin: "0 0 4px" }}>
                  <i className={project.icon} /> {project.title}
                </h3>
              </div>
              <p style={{ margin: "2px 0 6px", fontSize: "0.78rem", opacity: 0.8, fontFamily: "var(--f-mono, monospace)" }}>
                {project.stack}
              </p>
              <p className="project-description" style={{ margin: "6px 0" }}>{project.description}</p>
              <p style={{ margin: "6px 0" }}>
                <strong>Impact &amp; Key Insight:</strong> {project.contributions}
              </p>
              <details style={{ marginTop: "8px" }}>
                <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                  <strong>Tasks &amp; Methodology:</strong>
                </summary>
                <ul style={{ marginTop: "6px" }}>
                  {project.tasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>

        {/* Categorized Skills */}
        <div className="section">
          <h2>Skills &amp; Technical Stack</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "12px" }}>
            {skillsCategories.map((group) => (
              <div
                key={group.category}
                style={{
                  padding: "12px 14px",
                  borderRadius: "4px",
                  background: "rgba(0, 0, 0, 0.02)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                }}
              >
                <h4 style={{ margin: "0 0 8px", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85, fontFamily: "var(--f-mono, monospace)" }}>
                  {group.category}
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {group.skills.map((skill) => (
                    <span
                      key={skill}
                      className="skill-badge"
                      style={{ margin: 0, fontSize: "0.74rem", padding: "4px 9px", borderRadius: "3px" }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        {certifications.length > 0 ? (
          <div className="section">
            <h2>Certifications</h2>
            <ul>
              {certifications.map((certification) => (
                <li key={certification}>{certification}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Education */}
        <div className="section">
          <h2>Education</h2>
          <div className="experience-item" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
            <div className="experience-header">
              <h3>{education.degree}</h3>
              <div className="experience-meta">
                <span className="company">{education.institute}</span>
                <span className="duration">{education.duration}</span>
              </div>
            </div>
            <p style={{ margin: "8px 0 0" }}>
              CGPA: <strong>{education.cgpa}</strong>
            </p>
          </div>
        </div>

        {/* Beyond The Desk */}
        <div className="section">
          <h2>Beyond The Desk</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginTop: "10px" }}>
            {beyondTheDesk.map((item) => (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  padding: "14px",
                  borderRadius: "4px",
                  textDecoration: "none",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  background: "rgba(0, 0, 0, 0.015)",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <i className={item.icon} style={{ color: "var(--accent, #c8451a)" }} />
                  <strong style={{ fontSize: "0.9rem" }}>{item.title} ↗</strong>
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.75 }}>{item.desc}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Shipped & Side Projects */}
        <div className="section">
          <h2>Shipped &amp; Side Projects</h2>
          <div className="tabs">
            {personalProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`tab-button ${project.id === activeProjectId ? "active" : ""}`}
                onClick={() => setActiveProjectId(project.id)}
              >
                {project.label}
              </button>
            ))}
          </div>
          <div className="tab-content active">
            <div className="project-card">
              <h3>
                <i className={activeProject.icon} /> {activeProject.label}
              </h3>
              <p className="project-description">{activeProject.description}</p>
              <h4>Highlights:</h4>
              <ul>
                {activeProject.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {activeProject.links.length > 0 ? (
                <div className="project-links">
                  {activeProject.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="neo-button">
                      <i className={link.icon} /> {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Technical Summary / Key Metrics */}
        <div className="section">
          <h2>Technical Summary &amp; Key Highlights</h2>
          <ul>
            {technicalSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Explore Dashboards CTA */}
        <div className="section cta-section">
          <h2>Want to see more?</h2>
          <div>
            <h3>Explore My BI Dashboards</h3>
            <p>
              View interactive dashboards and Power BI reports built for operational and executive KPI visibility.
            </p>
            <div className="cta-buttons">
              <Link to="/dashboards" className="neo-button">
                <i className="fas fa-chart-bar" /> View Dashboards
              </Link>
            </div>
          </div>
        </div>

        <div className="section-divider">
          <p>
            <strong>Interested in working together?</strong>
          </p>
          <h3>Get in touch!</h3>
        </div>

        <div className="section">
          <h2 id="contact">Contact</h2>
          <p style={{ textAlign: "center" }}>
            Feel free to reach out if you&apos;d like to connect, discuss data / ML / GenAI roles, or just say hello!
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
            <a href="https://www.linkedin.com/in/tanmay-kalbande" target="_blank" rel="noreferrer" className="neo-button">
              <i className="fab fa-linkedin" /> LinkedIn
            </a>
            <a href="https://github.com/tanmay-kalbande" target="_blank" rel="noreferrer" className="neo-button">
              <i className="fab fa-github" /> GitHub
            </a>
          </div>
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            <a href="#top">Back to top</a>
          </p>
        </div>
      </div>

      <footer className="portfolio-footer">
        <div className="footer-content">
          <span>&copy; {new Date().getFullYear()} Tanmay Kalbande. All rights reserved.</span>
          <span className="hidden-mobile">Data Analyst · ML Practitioner · GenAI Engineer</span>
        </div>
      </footer>
    </div>
  );
}

