export const RESUME_PROMPT = `
Resume:

Profile / Professional Summary:
- Data Analyst and ML Practitioner with 2+ years of experience building predictive models, running statistical analyses, and designing BI dashboards for business stakeholders.
- Built a lead scoring model (85% accuracy, +23% sales conversion), customer segmentation clusters, a churn prediction model (AUC 0.82), cohort analyses, and Power BI/Tableau dashboards used by senior stakeholders.
- Outside of work, designed and shipped Pustakam AI, a GenAI platform with multi-provider LLM orchestration and secure API architecture, now used to generate roughly 22 million words (~30M tokens) of user content, and accepted into the Z.ai Startup Program.
- Comfortable with SQL and Python day to day, and with taking a problem from a stakeholder conversation through to a working dashboard, model, or pipeline.
- Location: Bengaluru / Pune (Open to relocate anywhere in India)
- Contact: +91 737-838-1494 | kalbandetanmay@gmail.com | tanmaysk.in | linkedin.com/in/tanmay-kalbande | github.com/tanmay-kalbande

Featured Project: Pustakam AI
- GenAI Platform · React · Supabase · Multi-provider LLM APIs · Vercel (pustakamai.tanmaysk.in)
- Built and shipped a live GenAI platform that generates full-length structured books; accepted into the Z.ai Startup Program.
- Users have generated roughly 22 million words (~30 million tokens) of content on the platform to date.
- Designed a multi-stage LLM orchestration pipeline (goal/audience analysis, roadmap generation, iterative chapter generation with checkpointing), with dynamic context-injection powering study features like doubt-solving and flashcard generation.
- Integrated 7 LLM providers (GLM, Gemini, Mistral, Groq, Cerebras, OpenAI, xAI) through custom streaming (SSE) API clients, with rate-limit backoff and automatic fallback routing between providers.
- Built a serverless API proxy (browser -> proxy -> LLM provider) using Supabase JWT bearer tokens so platform API keys stay off the client, plus a BYOK (Bring Your Own Key) mode for users who want to use their own keys.
- Set up Supabase Auth (email/OAuth) with React session-based route protection, and a local-first architecture (IndexedDB, LocalStorage) for large payload storage; deployed as a PWA on Vercel.

Experience:
Capgemini | Data Analyst | Noida | Apr 2024 – Present (Full-time)
- Built a Python-based ETL/reporting pipeline automating data cleaning and transformation: reduced manual entry errors by 40% and saved 10+ hours/week across the team.
- Designed and maintained 8+ Power BI dashboards (DAX, Power Query) across 3 business units, translating business requirements into data models and delivering real-time KPI visibility to senior leadership.
- Standardised metric definitions and reporting frameworks across cross-functional teams: cut manual data extraction time by 30% and improved data trust stakeholder-wide.
- Analysed incident and operational data in SQL to identify recurring failure patterns, enabling client teams to prioritise remediation across high-priority service tiers.

Rubixe | Data Analyst Trainee | Nagpur | Nov 2022 – Dec 2023 (Full-time)
- Built lead scoring model (Random Forest) achieving 85% accuracy: improved sales conversion by +23% and cut sales outreach effort by 15 hours/week.
- Developed K-Means customer segmentation model producing actionable clusters that directly shaped targeted marketing strategy for business stakeholders.
- Built predictive maintenance models on sensor data to identify equipment failure patterns ahead of breakdowns: surfaced proactive intervention opportunities.
- Designed Tableau dashboards translating ML outputs into clear business visuals for non-technical decision-makers.

Other Projects:
- Customer Churn Prediction + Statistical Validation: Python · XGBoost · Scikit-learn · Statsmodels · Seaborn. Churn pipeline (Logistic Regression, RF, XGBoost). Chi-square + t-tests (p < 0.05) for feature validation. AUC 0.82: identified 3 high-risk segments driving 60% of churn volume, enabling targeted retention campaigns.
- Lead Scoring & Customer Segmentation: Python · Scikit-learn · K-Means · Random Forest · Tableau. End-to-end ML pipeline: data cleaning, feature engineering, model training, Tableau presentation. Lead scoring (Random Forest): 85% accuracy, +23% sales conversion, -15 hrs/week outreach saved: directly adopted by sales team.
- SQL Cohort Retention Analysis: SQL · Window Functions · CTEs · DATE_TRUNC · LAG() · Python. Pure-SQL cohort analysis using DATE_TRUNC, LAG(), and self-joins: zero Python dependency for core analysis. Key insight: Q4-acquired customers showed 35% higher 6-month retention than Q1: directly reshaped marketing budget allocation.

Skills:
- Languages: Python (primary) · SQL · R · JavaScript
- Analysis & ML: Pandas · NumPy · Scikit-learn · XGBoost · Random Forest · K-Means · Regression · Feature Engineering · Statistical Testing · A/B Testing · Cohort Analysis
- Visualisation & BI: Power BI (DAX, Power Query) · Tableau · Matplotlib · Seaborn
- AI / GenAI Engineering: Multi-provider LLM API integration · Prompt/context engineering · Streaming (SSE) · Rate-limit handling & fallback routing · Secure API proxy design
- Databases & Backend: SQL Server · PostgreSQL · MySQL · Supabase (Auth, RPCs, JWT) · Serverless functions
- Cloud & Deployment: AWS (Certified) · GCP · Vercel · Jupyter · Streamlit · Git/GitHub · FastAPI

Education:
- B.E. Mechanical Engineering — Prof. Ram Meghe Institute of Technology & Research, Amravati University (2019–2022) · CGPA 9.3 / 10.0

Certifications:
- AWS Cloud Technical Essentials — Amazon Web Services (Dec 2024)
- Certified Data Scientist — IABAC (Sep 2023)
- Google Data Analytics Foundations — Google (2024)
- DataMites Data Science Bootcamp (2023)

Beyond The Desk:
- Public GitHub with data analysis notebooks, ML pipelines, and automation scripts: github.com/tanmay-kalbande
- Portfolio blog documenting analytical methodologies: tanmaysk.in
`.trim();
