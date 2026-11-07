import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { presentations } from "../data/siteData";
import { setFavicon } from "../utils/setFavicon";
import "../styles/landing.css";

export default function PPTViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const pres = presentations.find((p) => p.slug === slug);

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setFavicon("/favicon.svg");
    document.documentElement.setAttribute("data-app-page", "landing-v5");
    document.title = pres
      ? `${pres.title} — Presentation`
      : "Presentation Not Found";
    const saved = window.localStorage.getItem("theme");
    const preferDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const t = preferDark ? "dark" : "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    return () => {
      document.documentElement.removeAttribute("data-app-page");
    };
  }, [pres]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  if (!pres) {
    return (
      <div className="lv5-shell">
        <div className="lp-bg-wrapper">
          <div className="lp-grain" />
        </div>
        <header className="lv5-nav">
          <div className="lv5-nav__brand">
            <Link
              to="/"
              className="lv5-nav__initials lv5-nav__easter"
              style={{ textDecoration: "none" }}
            >
              TK
            </Link>
          </div>
          <nav className="lv5-nav__links">
            <Link to="/" className="lv5-nav__link">
              ← HOME
            </Link>
          </nav>
        </header>
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
            position: "relative",
            zIndex: 2,
          }}
        >
          <p
            style={{
              color: "var(--ink-2)",
              fontFamily: "var(--f-mono)",
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
            }}
          >
            Presentation not found.
          </p>
          <Link to="/" className="lv5-btn lv5-btn--outline">
            ← Back to Home
          </Link>
        </main>
      </div>
    );
  }

  const fileUrl = `${window.location.origin}${pres.file}`;
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  return (
    <div className="lv5-shell">
      <header className="lv5-nav">
        <div className="lv5-nav__brand">
          <Link
            to="/"
            className="lv5-nav__initials lv5-nav__easter"
            style={{ textDecoration: "none" }}
          >
            TK
          </Link>
          <span className="lv5-nav__sep" aria-hidden="true">
            ·
          </span>
          <span className="lv5-nav__descriptor">PRESENTATION</span>
        </div>
        <nav className="lv5-nav__links">
          <Link to="/" className="lv5-nav__link">
            ← HOME
          </Link>
          <button
            className="lv5-nav__theme"
            onClick={() =>
              setTheme((t) => (t === "dark" ? "light" : "dark"))
            }
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </nav>
      </header>

      <main className="ppt-viewer__main">
        <div className="ppt-viewer__header">
          <div className="ppt-viewer__icon">
            <i className={pres.icon} />
          </div>
          <div>
            <h1 className="ppt-viewer__title">{pres.title}</h1>
            <p className="ppt-viewer__subtitle">{pres.subtitle}</p>
          </div>
        </div>
        <div className="ppt-viewer__frame-wrap">
          <iframe
            src={viewerUrl}
            className="ppt-viewer__frame"
            title={pres.title}
            allowFullScreen
          />
        </div>
      </main>

      <footer className="lv5-footer">
        <div className="lv5-footer__inner">
          <span className="lv5-footer__copy">
            © {new Date().getFullYear()} Tanmay Kalbande
          </span>
          <Link
            to="/"
            className="lv5-footer__social"
            style={{ textDecoration: "none", fontSize: "0.55rem", letterSpacing: "0.1em" }}
          >
            ← BACK TO PORTFOLIO
          </Link>
        </div>
      </footer>
    </div>
  );
}
