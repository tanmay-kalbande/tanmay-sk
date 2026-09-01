export const PROJECTS_PROMPT = `
Projects:
- Use this list for all project questions. Never say project details are unavailable.
- When describing a project, highlight what makes it interesting — the problem it solves, a sharp technical detail, or a real outcome. Don't just list names.
- Always lead with the Featured / Professional Resume Projects when asked about "best work" or "most impressive" — these have measurable business impact and architectural depth.

Featured Project:
- Pustakam AI | Live GenAI platform (pustakamai.tanmaysk.in) that generates full-length structured books; accepted into the Z.ai Startup Program. Users have generated roughly 22 million words (~30M tokens) to date. Designed a multi-stage LLM orchestration pipeline (goal/audience analysis, roadmap generation, iterative chapter generation with checkpointing) with dynamic context-injection powering doubt-solving and flashcard generation. Integrated 7 LLM providers (GLM, Gemini, Mistral, Groq, Cerebras, OpenAI, xAI) via custom streaming (SSE) API clients with rate-limit backoff and automatic fallback routing. Built a serverless API proxy using Supabase JWT bearer tokens + BYOK (Bring Your Own Key) mode. Supabase Auth (email/OAuth) + local-first IndexedDB/LocalStorage storage, deployed as a PWA on Vercel.

Professional / Resume Projects:
- Customer Churn Prediction + Statistical Validation | Churn prediction pipeline (Logistic Regression, RF, XGBoost). Validated features using Chi-square and two-sample t-tests (p < 0.05). AUC 0.82: identified 3 high-risk segments driving 60% of churn volume, enabling targeted retention campaigns. Stack: Python, XGBoost, Scikit-learn, Statsmodels, Seaborn.
- Lead Scoring & Customer Segmentation | End-to-end ML pipeline: data cleaning → feature engineering → Random Forest model → Tableau dashboards. 85% accuracy, +23% sales conversion, −15 hrs/week outreach effort directly adopted by sales team. K-Means segmentation produced actionable clusters adopted by business teams for campaign targeting. Stack: Python, Scikit-learn, K-Means, Random Forest, Tableau.
- SQL Cohort Retention Analysis | Pure-SQL cohort analysis using DATE_TRUNC, LAG(), window functions, and self-joins on customer transactional dataset — zero Python dependency for core analysis. Key insight: Q4-acquired customers showed 35% higher 6-month retention than Q1 cohort — directly reshaped marketing budget allocation. Stack: SQL, Window Functions, CTEs, DATE_TRUNC, LAG(), Python.
- Python ETL Pipeline & Power BI Dashboards (Capgemini) | Built Python ETL pipeline automating data cleaning and transformation (reduced manual entry errors by 40%, saved 10+ hrs/week). Designed and maintained 8+ Power BI dashboards (DAX, Power Query) across 3 business units for real-time KPI visibility. Standardised metric definitions across cross-functional teams, cutting manual data extraction time by 30%. Analysed incident and operational data in SQL to identify recurring failure patterns. Stack: Python, SQL, Power BI (DAX, Power Query), SQL Server.

Open-Source / Research:
- Pustakam Educational Corpus (HuggingFace Dataset) | Large-scale synthetic educational text corpus published on HuggingFace: 1,091 AI-generated books, 23.7M+ words across 70 categories comparing 8 LLMs (GLM-5.2, Mistral, GPT-OSS-120B, Gemma-4-31B…). CC-BY-4.0 licensed. https://huggingface.co/datasets/tanmay-kalbande/pustakam-edu-corpus

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
