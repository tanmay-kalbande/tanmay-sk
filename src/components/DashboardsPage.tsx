import { useEffect } from "react";
import { Link } from "react-router-dom";
import { assetUrls, dashboardProjects } from "../data/siteData";

export default function DashboardsPage() {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "portfolio");
    document.title = "Tanmay Kalbande - Power BI & Tableau Dashboards";
  }, []);

  return (
    <div className="portfolio-shell">
      <div className="portfolio-container">
        <div className="portfolio-header">
          <div className="logo">
            <img src={assetUrls.profilePhoto} alt="Tanmay Kalbande profile" />
          </div>
          <div className="header-text">
            <h1>Tanmay - Power BI & Tableau Dashboards</h1>
            <h2>Data Visualization Portfolio</h2>
          </div>
          <div className="contact-info">
            <p>
              Email: <a href="mailto:kalbandetanmay@gmail.com">kalbandetanmay@gmail.com</a>
              <br />
              Phone: 737-838-1494
            </p>
            <p className="back-home-link">
              <Link to="/portfolio">Back to Portfolio</Link>
            </p>
          </div>
        </div>

        <div className="section">
          <h2>Power BI & Tableau Dashboards</h2>
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
                <img src={project.screenshot} alt={project.title} className="project-screenshot" />
                <p className="project-link">
                  <a href={project.downloadHref} target="_blank" rel="noreferrer" className="download-button">
                    Download Power BI Dashboard
                  </a>
                </p>
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
