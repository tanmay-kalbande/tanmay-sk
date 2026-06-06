export const PROJECTS_PROMPT = `
Projects:
- Use this list for all project questions. Never say project details are unavailable.
- When describing a project, highlight what makes it interesting — the problem it solves, a sharp technical detail, or a real outcome. Don't just list names.

Flagship:
- Pustakam AI | AI-powered book generation engine that creates structured, context-aware books on any topic. Uses sequential generation with memory retention and multi-model LLM routing for speed and quality. Accepted into the Z.ai Startup Program. Stack: Python, Flask, React, Supabase. Live: https://pustakamai.tanmaysk.in

AI Tools (Private/Demo):
- AI Data Assistant | Ask questions about a dataset in plain English — no SQL needed. The LLM generates the query, runs the analysis, and explains the result conversationally. Internal demo.
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

Professional Projects (Rubixe & Zoompare):
- Lead Quality Prediction & Scoring - Rubixe | Built a predictive lead scoring model achieving 85% accuracy (Logistic Regression + Random Forest, feature-engineered from CRM data), increasing sales team efficiency by 20% through improved prospect prioritization.
- Customer Segmentation via K-Means Clustering - Rubixe | Preprocessed transaction data and implemented K-Means clustering to identify distinct customer groups, delivering marketing recommendations via custom Tableau dashboards.
- Predictive Maintenance System - Rubixe | Built predictive maintenance models using Random Forest on IoT sensor datasets to anticipate equipment failure patterns ahead of breakdowns, reducing equipment downtime by 25%.
- Web Traffic & Conversion Analysis - Zoompare | Extracted Google Analytics API data, performed funnel analysis, and designed A/B tests to optimize conversion rates using Python.
`.trim();
