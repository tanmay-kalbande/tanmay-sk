export const PROJECTS_PROMPT = `
Projects:
- Use this list for all project questions. Never say project details are unavailable.
- When describing a project, highlight what makes it interesting — the problem it solves, a sharp technical detail, or a real outcome. Don't just list names.
- Always lead with the Professional / Resume Projects when asked about "best work" or "most impressive" — these have measurable business impact.

Professional / Resume Projects (always mention these first):
- Lead Scoring & Customer Segmentation | Crown jewel. End-to-end ML pipeline: data cleaning → feature engineering → Random Forest model → Tableau dashboards. 85% accuracy, +23% sales conversion, −15 hrs/week outreach effort. K-Means segmentation produced actionable clusters adopted by business teams for campaign targeting. Stack: Python, Scikit-learn, K-Means, Random Forest, Tableau.
- Customer Churn Prediction | Built churn prediction pipeline (Logistic Regression, Random Forest, XGBoost) on Telco dataset. Validated feature significance with chi-square and t-tests (p < 0.05). AUC 0.82 — identified 3 high-risk segments driving 60% of total churn, enabling targeted retention campaigns. Stack: Python, Pandas, Scikit-learn, XGBoost, Statsmodels, Seaborn.
- SQL Cohort Retention Analysis | Built entirely in SQL using DATE_TRUNC, LAG(), window functions, and self-joins on Online Retail dataset — zero Python dependency for core analysis. Q4-acquired customers showed 35% higher 6-month retention than Q1 cohort — directly reshaped marketing budget allocation. Stack: SQL, Window Functions, CTEs, Python, Matplotlib.
- A/B Test Analysis — Checkout Conversion | Designed and analysed A/B test for checkout flow redesign (n=10,000). Variant B: 8.5% conversion lift (p<0.01, 95% CI: [4.2%, 12.8%]). Checked for Simpson's Paradox across segments — results held. Led to full product rollout; projected ₹12L annual revenue uplift. Stack: Python, Pandas, SciPy, Statsmodels, Seaborn.
- Incident Analysis & ETL (Capgemini) | Analysed incident data via SQL, uncovered failure patterns, built ETL pipeline that cut manual entry errors by 40% and saved 10+ hours/week.
- Power BI KPI Dashboards (Capgemini) | Created 8+ Power BI dashboards (DAX, Power Query) across 3 business units for real-time KPI visibility. Star schema data model, standardised metrics, self-serve reporting. Reduced manual data extraction time by 30%.
- Operational KPI Dashboard | End-to-end BI dashboard tracking operational KPIs with automated data refresh, drill-through capability, and period-over-period DAX measures. Star schema in Power Query. Stack: Power BI, DAX, Power Query, SQL Server.

Also built independently (differentiator, not centrepiece):
- Pustakam AI | AI-powered book generation engine that creates structured, context-aware books on any topic. Uses sequential generation with memory retention and multi-model LLM routing for speed and quality. Accepted into the Z.ai Startup Program. Stack: Python, Flask, React, Supabase. Live: https://pustakamai.tanmaysk.in

AI Tools (Private/Demo):
- AI Data Assistant (Natural Language Analytics Interface) | Ask questions about a dataset in plain English — no SQL needed. The LLM generates the query, runs the analysis, and explains the result conversationally. Reduced ad-hoc query turnaround from 2 days to 2 minutes. Internal demo.
- AI Data Structurer | Paste raw unstructured text, get back clean structured data. Built with Gemma + Flask. Saves the painful manual cleanup step before any ML work. Internal demo.
- AI-Tutor | Personalized AI tutoring platform using Google's Gemma model, multiple teaching personas, context-aware quiz generation, and interactive learning flowcharts. Private/demo project.

Shipped Tools:
- Bias & Fairness Checker | Detects bias in text and returns a structured markdown report with inclusive alternatives. Built with Flask + Gemma. Live: https://bias-checker.onrender.com/ | GitHub: https://github.com/tanmay-kalbande/bias-fairness-checker
- Expense Tracker | Personal finance tracker with CSV import/export and visual analytics. Live: https://expense-tail.vercel.app/ | GitHub: https://github.com/tanmay-kalbande/Expense-Tracker
- Table Extractor | Paste a URL, get every HTML table scraped and ready to download as CSV. Built with Flask + BeautifulSoup. Live: https://table-extractor.onrender.com/ | GitHub: https://github.com/tanmay-kalbande/table-extractor-app
- Goal Tracker | Daily goal tracking with shareable progress cards. Live: https://tanmay-kalbande.github.io/Goal-Tracker/ | GitHub: https://github.com/tanmay-kalbande/Goal-Tracker
- Incident Tracker | Incident management for ops teams — search, filter, paginate, export to CSV. Live: https://tanmay-kalbande.github.io/Incident-Tracker/ | GitHub: https://github.com/tanmay-kalbande/Incident-Tracker
- Enhanced macOS Notes | Note-taking PWA with macOS aesthetics, dark mode, rich text, and offline support. Live: https://enhanced-mac-os-notes.vercel.app/ | GitHub: https://github.com/tanmay-kalbande/Enhanced-macOS-Notes
- Life Loops Game Edition | Habit tracker built like a retro game — streaks, points, a reason to actually show up. Live: https://life-loops-game-edition.vercel.app/ | GitHub: https://github.com/tanmay-kalbande/Life-Loops---Game-Edition
- Mindfulness App | Yoga and meditation PWA with a minimalist, offline-first design. Live: https://breathewell.vercel.app/ | GitHub: https://github.com/tanmay-kalbande/Mindfulness-App
- The Scam Master Podcast | Website for a fraud-awareness podcast — episode showcase, social integration. Live: https://the-scam-master.vercel.app/ | GitHub: https://github.com/the-scam-master/podcast_webpage
- Village Directory / Jawala Vyapar | AI-powered village/local phone directory with admin record maintenance, category filtering, search, and multi-language support. Private link.
`.trim();
