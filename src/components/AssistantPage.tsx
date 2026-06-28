import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AssistantChat from "./AssistantChat";

export default function AssistantPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "assistant-v2");
    document.title = "Tanmay Kalbande — AI Assistant";
    const saved = window.localStorage.getItem("theme");
    const dark  = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const t     = dark ? "dark" : "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="assistant-shell-v2">
      {/* Top bar */}
      <header className="assistant-topbar">
        <Link to="/" className="assistant-topbar__back" aria-label="Back">
          <i className="fas fa-arrow-left" />
          <span>Home</span>
        </Link>

        <div className="asst-brand">
          <span className="asst-brand__dot" />
          <span className="asst-brand__label">AI ASSISTANT</span>
        </div>

        <button
          type="button"
          className="assistant-topbar__theme"
          aria-label="Toggle theme"
          onClick={() => setTheme((c) => (c === "dark" ? "light" : "dark"))}
        >
          <i className={theme === "dark" ? "fas fa-sun" : "fas fa-moon"} />
        </button>
      </header>

      {/* Chat — centred, never squishes on big screens */}
      <main className="assistant-main-v2">
        <AssistantChat variant="page" />
      </main>
    </div>
  );
}
