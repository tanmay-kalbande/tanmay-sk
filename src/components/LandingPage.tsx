import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import AssistantChat from "./AssistantChat";
import { assetUrls, socialLinks, experiences, skills } from "../data/siteData";
import { getCachedLibraryStats, fetchLiveLibraryStats, LibrarySummaryStats } from "../lib/learning";
import { setFavicon } from "../utils/setFavicon";
import "../styles/landing.css";

type Tab = "home" | "assistant";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const line: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function useCounter(target: number, duration = 1400, decimals = 0) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const hasIntersected = useRef(false);
  const currentValRef = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animateTo = (fromVal: number, toVal: number) => {
      cancelAnimationFrame(raf.current);
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextVal = fromVal + (toVal - fromVal) * eased;
        const formatted = parseFloat(nextVal.toFixed(decimals));
        currentValRef.current = formatted;
        setValue(formatted);
        if (progress < 1) {
          raf.current = requestAnimationFrame(tick);
        } else {
          const finalVal = parseFloat(toVal.toFixed(decimals));
          setValue(finalVal);
          currentValRef.current = finalVal;
        }
      };
      raf.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasIntersected.current) {
          hasIntersected.current = true;
          animateTo(currentValRef.current, target);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);

    if (hasIntersected.current) {
      animateTo(currentValRef.current, target);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [target, duration, decimals]);

  return { ref, value };
}

function AnimStat({ target, suffix, label, decimals = 0 }: {
  target: number; suffix?: string; label: string; decimals?: number;
}) {
  const { ref, value } = useCounter(target, 1400, decimals);
  return (
    <div className="lv5-stat">
      <span className="lv5-stat__n" ref={ref}>
        {decimals ? value.toFixed(decimals) : Math.round(value)}{suffix ?? ""}
      </span>
      <span className="lv5-stat__l">{label}</span>
    </div>
  );
}



export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [tab, setTab] = useState<Tab>("home");
  const [dir, setDir] = useState(1);
  const [libStats, setLibStats] = useState<LibrarySummaryStats>(getCachedLibraryStats);

  useEffect(() => {
    let active = true;
    fetchLiveLibraryStats().then((live) => {
      if (active) {
        setLibStats(live);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const corpusStat = useMemo(() => {
    const totalWords = libStats.totalWords;
    const inMillions = totalWords / 1_000_000;
    const rounded = parseFloat(inMillions.toFixed(1));
    const decimals = rounded % 1 === 0 ? 0 : 1;
    return { target: rounded, decimals };
  }, [libStats.totalWords]);


  useEffect(() => {
    setFavicon('/favicon.svg');
    document.documentElement.setAttribute("data-app-page", "landing-v5");
    document.title = "Tanmay Kalbande — Data Analyst";
    const saved = window.localStorage.getItem("theme");
    const preferDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const t = preferDark ? "dark" : "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    return () => {
      document.documentElement.removeAttribute("data-app-page");
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setDir(t === "assistant" ? 1 : -1);
    setTab(t);
  };

  const role = experiences[0];

  return (
    <div className="lv5-shell">
      <div className="lp-bg-wrapper">
        <div className="lp-grain"></div>
        <div className="lp-orb lp-orb-a"></div>
        <div className="lp-orb lp-orb-b"></div>
        <div className="lp-orb lp-orb-c"></div>
      </div>
      <header className="lv5-nav">
        <div className="lv5-nav__brand">
          <span className="lv5-nav__initials">TK</span>
          <span className="lv5-nav__sep" aria-hidden="true">·</span>
          <span className="lv5-nav__descriptor">DATA &amp; AI</span>
        </div>
        <nav className="lv5-nav__links">
          <Link to="/portfolio" className="lv5-nav__link">WORK</Link>
          <a
            href="https://dashlint.tanmaysk.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="lv5-nav__link lv5-hide-sm"
          >
            DASHLINT MCP ↗
          </a>
          <Link to="/dashboards" className="lv5-nav__link lv5-hide-sm">DASHBOARDS</Link>
          <Link to="/library" className="lv5-nav__link">LIBRARY</Link>
          <button
            className={`lv5-nav__cta ${tab === "assistant" ? "is-open" : ""}`}
            onClick={() => switchTab(tab === "assistant" ? "home" : "assistant")}
          >
            {tab === "assistant" ? "✕ CLOSE" : "ASK AI"}
          </button>
          <button
            className="lv5-nav__theme"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </nav>
      </header>

      <main className={`lv5-main${tab === "assistant" ? " lv5-main--chat" : ""}`}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={tab}
            custom={dir}
            initial={{ opacity: 0, x: dir * 44, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, x: dir * -44, filter: "blur(6px)", transition: { duration: 0.2 } }}
            className={`lv5-content${tab === "assistant" ? " lv5-content--chat" : ""}`}
          >
            {tab === "home" ? (
              <motion.div className="lv5-hero" variants={container} initial="hidden" animate="show">
                <motion.div variants={line} className="lv5-nameblock">
                  <h1 className="lv5-name">
                    <span className="lv5-name__first">TANMAY</span>
                    <span className="lv5-name__last">KALBANDE</span>
                  </h1>
                  <div className="lv5-nameblock__rule" />
                </motion.div>

                <motion.div variants={line} className="lv5-identity">
                  <span>Data Analyst</span>
                  <span className="lv5-sep" aria-hidden="true">·</span>
                  <span>Noida, IN</span>
                  <span className="lv5-sep" aria-hidden="true">·</span>
                  <span className="lv5-open">
                    <span className="lv5-open__dot" />
                    Open to Work
                  </span>
                  <span className="lv5-sep lv5-hide-sm" aria-hidden="true">·</span>
                  <a
                    href="https://dashlint.tanmaysk.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lv5-mcp-pill lv5-hide-sm"
                    title="DashLint MCP Server — AI Dashboard Orchestration"
                  >
                    <span className="lv5-mcp-pill__pulse" />
                    <span>MCP: DASHLINT</span>
                    <span className="lv5-mcp-pill__arrow">↗</span>
                  </a>
                </motion.div>

                <motion.p variants={line} className="lv5-tagline">
                  Turning raw data into <em>decisions that matter.</em>
                </motion.p>

                <motion.div variants={line} className="lv5-cta">
                  <Link to="/portfolio" className="lv5-btn lv5-btn--fill">View Work</Link>
                  <a
                    href="https://dashlint.tanmaysk.in/"
                    className="lv5-btn lv5-btn--accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fas fa-server" aria-hidden="true" /> DashLint MCP ↗
                  </a>
                  <button className="lv5-btn lv5-btn--outline" onClick={() => switchTab("assistant")}>Ask AI ↗</button>
                  <a href={assetUrls.resumePdf} className="lv5-btn lv5-btn--ghost" target="_blank" rel="noopener noreferrer">Resume ↗</a>
                </motion.div>

                <motion.div variants={line} className="lv5-statsbar">
                  <AnimStat target={2} suffix="+" label="YRS EXP" decimals={0} />
                  <div className="lv5-vr" />
                  <AnimStat target={85} suffix="%" label="LEAD ACCURACY" />
                  <div className="lv5-vr" />
                  <AnimStat target={8} suffix="+" label="DASHBOARDS" />
                  <div className="lv5-vr" />
                  <AnimStat target={corpusStat.target} suffix="M+" label="WORDS CORPUS" decimals={corpusStat.decimals} />
                  <div className="lv5-vr" />
                  <div className="lv5-stat lv5-stat--role">
                    <span className="lv5-stat__n">{role.company}</span>
                    <span className="lv5-stat__l">SINCE {role.duration.split(" ")[1]}</span>
                  </div>
                  <div className="lv5-vr lv5-hide-sm" />
                  <div className="lv5-stat lv5-stat--chips lv5-hide-sm">
                    {skills.slice(0, 3).map((s) => (
                      <span key={s} className="lv5-chip">{s}</span>
                    ))}
                    <span className="lv5-chip lv5-chip--dim">+more</span>
                  </div>
                </motion.div>



                <motion.div variants={line} className="lv5-socials">
                  {socialLinks.map((l) => (
                    <a key={l.href} href={l.href} className="lv5-social" aria-label={l.label} target="_blank" rel="noopener noreferrer">
                      <i className={l.icon} />
                    </a>
                  ))}
                  <a
                    href="https://dashlint.tanmaysk.in/"
                    className="lv5-social"
                    aria-label="DashLint MCP Server"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="DashLint MCP — AI Dashboard Orchestration Server"
                  >
                    <i className="fas fa-server" />
                  </a>
                  <a
                    href="https://huggingface.co/datasets/tanmay-kalbande/pustakam-edu-corpus"
                    className="lv5-social"
                    aria-label="HuggingFace Dataset"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Pustakam Educational Corpus on HuggingFace"
                  >
                    🤗
                  </a>
                </motion.div>
              </motion.div>
            ) : (
              <div className="lv5-chat">
                <AssistantChat variant="modal" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="lv5-footer">
        <div className="lv5-footer__inner">
          <span className="lv5-footer__status">
            <span className="lv5-footer__dot" />
            Available for work
          </span>
          <span className="lv5-footer__copy">© {new Date().getFullYear()} Tanmay Kalbande</span>
          <div className="lv5-footer__socials">
            {socialLinks.map((l) => (
              <a key={l.href} href={l.href} className="lv5-footer__social" aria-label={l.label} target="_blank" rel="noopener noreferrer">
                <i className={l.icon} />
              </a>
            ))}
            <a
              href="https://dashlint.tanmaysk.in/"
              className="lv5-footer__social"
              aria-label="DashLint MCP Server"
              target="_blank"
              rel="noopener noreferrer"
              title="DashLint MCP Server"
            >
              <i className="fas fa-server" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
