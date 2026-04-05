import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AssistantChat from "./AssistantChat";
import { assetUrls, landingStats, socialLinks } from "../data/siteData";

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "landing");
    document.title = "Tanmay Kalbande - Data, Dashboards, and AI Tools";

    const savedTheme = window.localStorage.getItem("theme");
    const preferredDark =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const nextTheme = preferredDark ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleAssistant() {
    if (window.innerWidth <= 768) {
      navigate("/assistant");
      return;
    }
    setIsAssistantOpen((current) => !current);
  }

  return (
    <div className="landing-shell">
      {/* ── Floating Navbar ── */}
      <nav className="landing-nav" id="landingNav">
        <span className="nav-brand">TK</span>
        <div className="nav-links">
          <Link to="/portfolio" className="nav-link">Portfolio</Link>
          <Link to="/dashboards" className="nav-link">Dashboards</Link>
          <Link to="/assistant" className="nav-link">Assistant</Link>
        </div>
        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            aria-label="Toggle dark or light mode"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            <i className={theme === "dark" ? "fas fa-sun" : "fas fa-moon"} />
          </button>
          <Link to="/portfolio" className="nav-cta">Get Started <i className="fas fa-arrow-right" /></Link>
        </div>
      </nav>

      {/* ── Assistant Modal ── */}
      {isAssistantOpen ? (
        <div className="chatbot-window open" id="chatbotWindow">
          <button
            type="button"
            className="close-chatbot"
            onClick={() => setIsAssistantOpen(false)}
            aria-label="Close AI assistant"
          >
            &times;
          </button>
          <AssistantChat variant="modal" />
        </div>
      ) : null}

      {/* ── Hero Container ── */}
      <main className="landing-main">
        <div className="landing-card">
          <div className="hero-grid">
            {/* ── Left Column ── */}
            <div className="hero-left">
              <div className="hero-badge">
                <span className="badge-dot" />
                Data Scientist &amp; AI Builder
                <i className="fas fa-arrow-right badge-arrow" />
              </div>

              <h1 className="hero-title">
                The smarter way to
                <br />
                <span className="hero-title-highlight">build with data</span>
              </h1>

              <p className="hero-description">
                From Data Analyst Trainee to building <strong>multi-agent AI
                systems</strong> in 1.8 years. Turning messy data into{" "}
                <strong>insights</strong> and creating tools that make work
                easier.
              </p>
              <p className="hero-description hero-description--mobile">
                Building multi-agent AI systems and turning messy data into insights ✨
              </p>

              <div className="hero-cta-group">
                <Link to="/portfolio" className="cta-primary" id="ctaPortfolio">
                  View Portfolio <i className="fas fa-chevron-right" />
                </Link>
                <a
                  href={assetUrls.resumePdf}
                  className="cta-secondary"
                  id="ctaResume"
                >
                  Download Resume <i className="fas fa-arrow-down" />
                </a>
              </div>

              <div className="hero-social-row">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="social-pill"
                    aria-label={link.label}
                  >
                    <i className={link.icon} />
                  </a>
                ))}
                <button
                  type="button"
                  className="social-pill social-pill--ai"
                  onClick={toggleAssistant}
                  aria-label="Open AI assistant"
                >
                  <i className="fas fa-robot" />
                </button>
              </div>
            </div>

            {/* ── Right Column ── */}
            <div className="hero-right">
              <div className="profile-showcase">
                <div className="showcase-portrait">
                  <img
                    src={assetUrls.landingPortrait}
                    alt="Tanmay Kalbande portrait"
                    className="portrait-img"
                  />
                  <div className="portrait-overlay">
                    <p className="portrait-overlay-kicker">Now Building</p>
                    <p className="portrait-overlay-text">
                      Data projects, dashboards &amp; AI tools that feel useful
                      on day one.
                    </p>
                  </div>
                </div>

                <div className="showcase-stats">
                  {landingStats.map((stat) => (
                    <div key={stat.label} className="mini-stat">
                      <span className="mini-stat-value">{stat.value}</span>
                      <span className="mini-stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>&copy; {new Date().getFullYear()} Tanmay Kalbande</span>
        <span className="footer-separator hidden-mobile">·</span>
        <span className="hidden-mobile">Crafted with React &amp; TypeScript</span>
      </footer>
    </div>
  );
}
