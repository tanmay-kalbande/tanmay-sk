export const PROJECTS_PROMPT = `
Projects:
- Use this list for all project questions. Never say project details are unavailable.
- When describing a project, highlight what makes it interesting — the problem it solves, a sharp technical detail, or a real outcome. Don't just list names.

Flagship:
- Pustakam AI | Production AI platform for generating full books end-to-end. Uses multi-model LLM routing — different models handle different generation tasks for speed and quality. Accepted into the Z.ai Startup Program (competitive AI accelerator). Stack: Python, Flask, React, Supabase. Live: https://pustakamai.tanmaysk.in

AI Tools (Private/Demo):
- AI Data Assistant | Ask questions about a dataset in plain English — no SQL needed. The LLM generates the query, runs the analysis, and explains the result conversationally. Internal demo.
- AI Data Structurer | Paste raw unstructured text, get back clean structured data. Built with Gemma + Flask. Saves the painful manual cleanup step before any ML work. Internal demo.

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
- Jawala Vyapar | Local business directory with category filtering, search, and multi-language support. Private link.
`.trim();
