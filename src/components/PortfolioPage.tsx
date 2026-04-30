import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  assetUrls,
  certifications,
  experiences,
  interests,
  personalProjects,
  professionalProjects,
  skills,
  technicalSummary,
  toolSummary,
} from "../data/siteData";
import "../styles/landing.css";

type PersonalProjectId = (typeof personalProjects)[number]["id"];

export default function PortfolioPage() {
  const [activeProjectId, setActiveProjectId] = useState<PersonalProjectId>(personalProjects[0].id);

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "portfolio");
    document.title = "Tanmay Kalbande - Data Science Portfolio";
    // Disable context menu for "this page" as requested
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
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
            <h1>Tanmay Kalbande</h1>
            <h2>Data Analyst &amp; AI Builder</h2>
          </div>
          <div className="contact-info">
            <p>
              Email: <a href="mailto:kalbandetanmay@gmail.com">kalbandetanmay@gmail.com</a>
              <br />
              Phone: <a href="tel:7378381494">737-838-1494</a>
            </p>
            <p className="back-home-link">
              <Link to="/">Back Home</Link>
            </p>
          </div>
        </div>

        <div className="section">
          <h2>About Me</h2>
          <p>
            I&apos;m a data analyst and AI builder focused on turning messy data into clear decisions.
            My work spans analytics, machine learning, dashboards, and practical AI tools that solve
            real workflow problems.
          </p>
        </div>

        <div className="section">
          <h2>Technical Summary</h2>
          <ul>
            {technicalSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="section">
          <h2>Tools</h2>
          <ul>
            {toolSummary.map((item) => (
              <li key={item.label}>
                <strong>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
        </div>

        <div className="section">
          <h2>Experience</h2>
          {experiences.map((experience) => (
            <div key={experience.title} className="experience-item">
              <div className="experience-header">
                <h3>{experience.title}</h3>
                <div className="experience-meta">
                  <span className="company">{experience.company}</span>
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

        <div className="section">
          <h2>Skills</h2>
          {skills.map((skill) => (
            <span key={skill} className="skill-badge">
              {skill}
            </span>
          ))}
        </div>

        <div className="section">
          <h2>Interests</h2>
          {interests.map((interest) => (
            <span key={interest} className="interest-badge">
              {interest}
            </span>
          ))}
        </div>

        <div className="section">
          <h2 id="projects">Projects</h2>
          {professionalProjects.map((project) => (
            <div key={project.title} className="project">
              <h3 className="project-title">
                <i className={project.icon} /> {project.title}
              </h3>
              <p className="project-description">{project.description}</p>
              <p>
                <strong>Contributions:</strong> {project.contributions}
              </p>
              <details>
                <summary>
                  <strong>Tasks:</strong>
                </summary>
                <ul>
                  {project.tasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>

        <div className="section">
          <h2>Fun Projects</h2>
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
              <h4>Features:</h4>
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

        <div className="section">
          <h2>Certifications</h2>
          <ul>
            {certifications.map((certification) => (
              <li key={certification}>{certification}</li>
            ))}
          </ul>
        </div>

        <div className="section cta-section">
          <h2>Want to see more?</h2>
          <div>
            <h3>Explore My BI Dashboards</h3>
            <p>
              View a curated set of high-confidence dashboards built from the strongest available
              portfolio and Power BI data.
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
            Feel free to reach out if you&apos;d like to connect, discuss a project, or just say hello!
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
          <span className="hidden-mobile">Crafted with love and coffee</span>
        </div>
      </footer>
    </div>
  );
}
