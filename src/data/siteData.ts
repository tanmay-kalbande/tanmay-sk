const profilePhoto = new URL("../../bits-and-bytes/resources/tanmay-portrait-landing.jpg", import.meta.url).href;
const resumePdf = "/assets/Tanmay_Kalbande_Resume.pdf";
const dashboardPhoto = new URL(
  "../../bits-and-bytes/dashboard_project/dashboard_screenshot/power_bi_screenshot_1.png",
  import.meta.url,
).href;
const dashboardFile = new URL(
  "../../bits-and-bytes/dashboard_project/dashboard/Data Wave Metrics in India.pbix",
  import.meta.url,
).href;

export const assetUrls = {
  profilePhoto,
  landingPortrait: profilePhoto,
  resumePdf,
  dashboardPhoto,
  dashboardFile,
};

export const personalInfo = {
  name: "Tanmay Kalbande",
  title: "Data Analyst · ML Practitioner · GenAI Engineer",
  location: "Bengaluru / Pune",
  phone: "+91 737-838-1494",
  email: "kalbandetanmay@gmail.com",
  website: "https://tanmaysk.in",
  linkedin: "https://linkedin.com/in/tanmay-kalbande",
  github: "https://github.com/tanmay-kalbande",
  summary:
    "Data Analyst and ML Practitioner with 2+ years of experience building predictive models, running statistical analyses, and designing BI dashboards for business stakeholders. Built a lead scoring model (85% accuracy, +23% sales conversion), customer segmentation clusters, a churn prediction model (AUC 0.82), cohort analyses, and Power BI/Tableau dashboards used by senior stakeholders. Outside of work, designed and shipped Pustakam AI, a GenAI platform with multi-provider LLM orchestration and secure API architecture, now used to generate roughly 22 million words (~30M tokens) of user content, and accepted into the Z.ai Startup Program. Comfortable with SQL and Python day to day, and with taking a problem from a stakeholder conversation through to a working dashboard, model, or pipeline.",
} as const;

export const socialLinks = [
  { href: "mailto:kalbandetanmay@gmail.com", label: "Email", icon: "fas fa-envelope" },
  { href: "https://linkedin.com/in/tanmay-kalbande", label: "LinkedIn Profile", icon: "fab fa-linkedin-in" },
  { href: "https://github.com/tanmay-kalbande", label: "GitHub Profile", icon: "fab fa-github" },
  { href: "https://medium.com/@tanmaykalbande", label: "Medium Blog", icon: "fab fa-medium" },
] as const;

export const landingStats = [
  { value: "2+", label: "Years Experience", icon: "fas fa-database" },
  { value: "85%", label: "Lead Scoring Accuracy", icon: "fas fa-brain" },
  { value: "8+", label: "Power BI Dashboards", icon: "fas fa-chart-line" },
  { value: "22M+", label: "Words Generated (Pustakam AI)", icon: "fas fa-robot" },
] as const;

export const assistantSuggestions = [
  {
    label: "Featured Project",
    icon: "✦",
    query: "Tell me about Pustakam AI and its multi-provider LLM orchestration.",
  },
  {
    label: "Skills & Stack",
    icon: "◈",
    query: "What technical skills does Tanmay bring across Data, ML, BI, and GenAI?",
  },
  {
    label: "Work Experience",
    icon: "◉",
    query: "Walk me through Tanmay's experience at Capgemini and Rubixe.",
  },
  {
    label: "Get in Touch",
    icon: "→",
    query: "How can I get in touch with Tanmay for opportunities or collaboration?",
  },
] as const;

export const assistantQuickActions = [
  {
    icon: "⚡",
    label: "Standout projects",
    query: "What are Tanmay's most impressive standout projects across ML and GenAI?",
    description: "Pustakam AI, Churn, Lead Scoring",
  },
  {
    icon: "🛠",
    label: "Tech stack",
    query: "What technical skills and tools does Tanmay use?",
    description: "Python, SQL, Power BI, LLM APIs",
  },
  {
    icon: "💼",
    label: "Work experience",
    query: "Walk me through Tanmay's professional experience at Capgemini and Rubixe.",
    description: "Data Analyst & ML roles",
  },
  {
    icon: "📫",
    label: "Hire / Contact",
    query: "How can I contact or hire Tanmay? Show me all contact options.",
    description: "Email, LinkedIn, WhatsApp",
  },
  {
    icon: "🤖",
    label: "GenAI & LLMs",
    query: "Tell me about Tanmay's GenAI engineering work on Pustakam AI.",
    description: "LLM orchestration & APIs",
  },
] as const;

export const assistantWelcomeMessage =
  "Sharp answers on Tanmay's projects, skills, experience, and contact — clean, fast, and easy to scan ⚡";

export const technicalSummary = [
  "Data Analyst and ML Practitioner with 2+ years of experience in predictive modeling, statistical analysis, and BI dashboards.",
  "Built a lead scoring model (85% accuracy, +23% sales conversion) and cut sales outreach effort by 15 hrs/week.",
  "Developed a churn prediction pipeline (AUC 0.82) identifying 3 high-risk segments driving 60% of total churn.",
  "Built a Python-based ETL pipeline cutting manual entry errors by 40% and saving 10+ hours per week.",
  "Designed and maintained 8+ Power BI dashboards across 3 business units for real-time KPI visibility.",
  "Shipped Pustakam AI, a live GenAI platform generating ~22 million words (~30M tokens) across 7 LLM providers; accepted into Z.ai Startup Program.",
  "Standardised metric definitions across cross-functional teams, cutting manual data extraction time by 30%.",
  "Based in Bengaluru / Pune (Open to relocate).",
] as const;

export const skillsCategories = [
  {
    category: "Languages",
    skills: ["Python (primary)", "SQL", "R", "JavaScript"],
  },
  {
    category: "Analysis & ML",
    skills: [
      "Pandas",
      "NumPy",
      "Scikit-learn",
      "XGBoost",
      "Random Forest",
      "K-Means",
      "Regression",
      "Feature Engineering",
      "Statistical Testing",
      "A/B Testing",
      "Cohort Analysis",
    ],
  },
  {
    category: "Visualisation & BI",
    skills: ["Power BI (DAX, Power Query)", "Tableau", "Matplotlib", "Seaborn"],
  },
  {
    category: "AI / GenAI Engineering",
    skills: [
      "Multi-provider LLM API integration",
      "Prompt/context engineering",
      "Streaming (SSE)",
      "Rate-limit handling & fallback routing",
      "Secure API proxy design",
    ],
  },
  {
    category: "Databases & Backend",
    skills: ["SQL Server", "PostgreSQL", "MySQL", "Supabase (Auth, RPCs, JWT)", "Serverless functions"],
  },
  {
    category: "Cloud & Deployment",
    skills: ["AWS (Certified)", "GCP", "Vercel", "Jupyter", "Streamlit", "Git/GitHub", "FastAPI"],
  },
] as const;

export const toolSummary = [
  { label: "Languages", value: "Python (primary), SQL, R, JavaScript" },
  { label: "Analysis & ML", value: "Pandas, Scikit-learn, XGBoost, Random Forest, K-Means, Statistical & A/B Testing" },
  { label: "Visualisation & BI", value: "Power BI (DAX, Power Query), Tableau, Matplotlib, Seaborn" },
  { label: "AI / GenAI Engineering", value: "Multi-provider LLM APIs, Streaming (SSE), Fallback routing, Proxy design" },
  { label: "Databases & Backend", value: "SQL Server, PostgreSQL, MySQL, Supabase, Serverless functions" },
  { label: "Cloud & Deployment", value: "AWS (Certified), GCP, Vercel, Jupyter, Streamlit, Git/GitHub, FastAPI" },
] as const;

export const experiences = [
  {
    title: "Data Analyst",
    company: "Capgemini, Noida",
    duration: "Apr 2024 - Present",
    type: "Full-time",
    details: [
      "Built a Python-based ETL/reporting pipeline automating data cleaning and transformation: reduced manual entry errors by 40% and saved 10+ hours/week across the team.",
      "Designed and maintained 8+ Power BI dashboards (DAX, Power Query) across 3 business units, translating business requirements into data models and delivering real-time KPI visibility to senior leadership.",
      "Standardised metric definitions and reporting frameworks across cross-functional teams: cut manual data extraction time by 30% and improved data trust stakeholder-wide.",
      "Analysed incident and operational data in SQL to identify recurring failure patterns, enabling client teams to prioritise remediation across high-priority service tiers.",
    ],
  },
  {
    title: "Data Analyst Trainee",
    company: "Rubixe, Nagpur",
    duration: "Nov 2022 - Dec 2023",
    type: "Full-time",
    details: [
      "Built lead scoring model (Random Forest) achieving 85% accuracy: improved sales conversion by +23% and cut sales outreach effort by 15 hours/week.",
      "Developed K-Means customer segmentation model producing actionable clusters that directly shaped targeted marketing strategy for business stakeholders.",
      "Built predictive maintenance models on sensor data to identify equipment failure patterns ahead of breakdowns: surfaced proactive intervention opportunities.",
      "Designed Tableau dashboards translating ML outputs into clear business visuals for non-technical decision-makers.",
    ],
  },
] as const;

export const skills = [
  "Python & SQL",
  "Predictive Modeling",
  "Power BI & Tableau",
  "ETL Pipelines",
  "GenAI & LLM Orchestration",
  "K-Means Clustering",
  "XGBoost & Random Forest",
  "Statistical & A/B Testing",
  "Cohort Analysis",
  "Supabase & Cloud",
] as const;

export const interests = [
  "Predictive Analytics",
  "Generative AI & LLM Systems",
  "Business Impact & Conversion Optimization",
  "BI Dashboard Architecture",
  "Statistical Modeling",
] as const;

export const featuredProject = {
  title: "Pustakam AI",
  subtitle: "GenAI Platform · React · Supabase · Multi-provider LLM APIs · Vercel",
  badge: "Accepted into Z.ai Startup Program",
  liveUrl: "https://pustakamai.tanmaysk.in",
  description:
    "Live GenAI platform that generates full-length structured books, now used to generate roughly 22 million words (~30M tokens) of user content.",
  highlights: [
    "Built and shipped a live GenAI platform (pustakamai.tanmaysk.in) that generates full-length structured books; accepted into the Z.ai Startup Program.",
    "Users have generated roughly 22 million words (~30 million tokens) of content on the platform to date.",
    "Designed a multi-stage LLM orchestration pipeline (goal/audience analysis, roadmap generation, iterative chapter generation with checkpointing), with dynamic context-injection powering study features like doubt-solving and flashcard generation.",
    "Integrated 7 LLM providers (GLM, Gemini, Mistral, Groq, Cerebras, OpenAI, xAI) through custom streaming (SSE) API clients, with rate-limit backoff and automatic fallback routing between providers.",
    "Built a serverless API proxy (browser -> proxy -> LLM provider) using Supabase JWT bearer tokens so platform API keys stay off the client, plus a BYOK (Bring Your Own Key) mode for users who want to use their own keys.",
    "Set up Supabase Auth (email/OAuth) with React session-based route protection, and a local-first architecture (IndexedDB, LocalStorage) for large payload storage; deployed as a PWA on Vercel.",
  ],
} as const;

export const professionalProjects = [
  {
    title: "Customer Churn Prediction + Statistical Validation",
    icon: "fas fa-user-slash",
    stack: "Python · XGBoost · Scikit-learn · Statsmodels · Seaborn",
    description: "Churn pipeline (Logistic Regression, RF, XGBoost). Chi-square + t-tests (p < 0.05) for feature validation.",
    contributions: "AUC 0.82: identified 3 high-risk segments driving 60% of churn volume, enabling targeted retention campaigns.",
    tasks: [
      "Built end-to-end churn prediction pipeline evaluating Logistic Regression, Random Forest, and XGBoost.",
      "Performed chi-square and two-sample t-tests (p < 0.05) for rigorous statistical feature validation.",
      "Identified top 3 high-risk customer segments responsible for 60% of total churn volume.",
      "Delivered data-backed retention intervention strategy adopted by customer success teams.",
    ],
  },
  {
    title: "Lead Scoring & Customer Segmentation",
    icon: "fas fa-bullseye",
    stack: "Python · Scikit-learn · K-Means · Random Forest · Tableau",
    description: "End-to-end ML pipeline: data cleaning, feature engineering, model training, Tableau presentation.",
    contributions: "Lead scoring (Random Forest): 85% accuracy, +23% sales conversion, -15 hrs/week outreach saved: directly adopted by sales team.",
    tasks: [
      "Cleaned and engineered predictive features from raw sales lead data.",
      "Trained and evaluated Logistic Regression and Random Forest models achieving 85% accuracy.",
      "Implemented K-Means segmentation to produce actionable customer clusters for targeted marketing.",
      "Designed Tableau dashboards translating ML outputs into clear visuals for sales stakeholders.",
    ],
  },
  {
    title: "SQL Cohort Retention Analysis",
    icon: "fas fa-database",
    stack: "SQL · Window Functions · CTEs · DATE_TRUNC · LAG() · Python",
    description: "Pure-SQL cohort analysis using DATE_TRUNC, LAG(), and self-joins: zero Python dependency for core analysis.",
    contributions: "Key insight: Q4-acquired customers showed 35% higher 6-month retention than Q1: directly reshaped marketing budget allocation.",
    tasks: [
      "Constructed modular SQL queries with CTEs, DATE_TRUNC, LAG(), and window functions for acquisition-period cohort tracking.",
      "Analyzed customer behavioral drop-offs and retention curves over 12 rolling months.",
      "Uncovered that Q4 cohorts maintained 35% higher 6-month retention compared to Q1.",
      "Presented actionable budget reallocation recommendations to marketing leadership.",
    ],
  },
  {
    title: "Python ETL Pipeline & 8+ Power BI Dashboards - Capgemini",
    icon: "fas fa-chart-line",
    stack: "Python · SQL · Power BI (DAX, Power Query) · SQL Server",
    description: "Automated ETL cleaning pipeline & 8+ executive dashboards across 3 business units for real-time KPI visibility.",
    contributions: "Cut manual entry errors by 40%, saved 10+ hours per week, and reduced manual extraction time by 30%.",
    tasks: [
      "Developed Python automation scripts to ingest, clean, and validate daily operational datasets.",
      "Architected star-schema data models in Power BI using advanced DAX calculations and Power Query M.",
      "Standardised metric definitions and reporting frameworks across cross-functional teams.",
      "Analysed incident and operational data in SQL to identify recurring failure patterns and prioritise remediation.",
    ],
  },
] as const;

export const personalProjects = [
  {
    id: "project0",
    label: "Pustakam AI [Featured]",
    icon: "fas fa-book",
    description: "Live GenAI book platform generating 22M+ words (~30M tokens) with multi-stage LLM orchestration across 7 providers. Accepted into Z.ai Startup Program.",
    features: [
      "Multi-stage LLM pipeline (Roadmap -> Iterative Chapters -> Checkpointing)",
      "7 LLM providers (GLM, Gemini, Mistral, Groq, Cerebras, OpenAI, xAI) with fallback routing",
      "Serverless API proxy with JWT auth + BYOK (Bring Your Own Key) mode",
      "Dynamic context-injection for interactive doubt-solving and flashcards",
      "Local-first IndexedDB storage + PWA on Vercel",
    ],
    links: [
      { label: "Live Platform", href: "https://pustakamai.tanmaysk.in", icon: "fas fa-desktop" },
    ],
  },
  {
    id: "project_hf_dataset",
    label: "Pustakam Edu Corpus [HuggingFace]",
    icon: "fas fa-database",
    description:
      "Published a large-scale synthetic educational corpus on HuggingFace: 1,091 AI-generated books, 23.7M+ words across 70 categories, comparing 8 LLMs on structured educational content generation.",
    features: [
      "1,091 books · 23.7M words · 10,892 chapters",
      "8 LLMs compared (GLM-5.2, Mistral, GPT-OSS-120B, Gemma-4-31B…)",
      "Rich metadata: Flesch-Kincaid, Type-Token Ratio, model provenance",
      "3 configs: book_metadata · chapters · books_full (Parquet)",
      "CC-BY-4.0 licensed · Open for NLP & readability research",
    ],
    links: [
      {
        label: "HuggingFace Dataset",
        href: "https://huggingface.co/datasets/tanmay-kalbande/pustakam-edu-corpus",
        icon: "fas fa-database",
      },
      {
        label: "GitHub",
        href: "https://github.com/tanmay-kalbande",
        icon: "fab fa-github",
      },
    ],
  },
  {
    id: "project6",
    label: "Bias & Fairness Checker [AI]",
    icon: "fas fa-robot",
    description:
      "A sleek AI-powered web tool for detecting bias in text and suggesting inclusive language improvements.",
    features: [
      "Structured bias analysis reports",
      "Real-time model status updates",
      "Responsive interface with Markdown rendering",
      "Built with Flask and Gemma",
    ],
    links: [
      { label: "Live Demo", href: "https://bias-checker.onrender.com/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/bias-fairness-checker", icon: "fab fa-github" },
    ],
  },
  {
    id: "project1",
    label: "Expense Tracker",
    icon: "fas fa-money-bill-wave",
    description:
      "A web application for tracking personal expenses with data visualization and CSV I/O functionality.",
    features: [
      "Expense management",
      "Data visualization",
      "CSV import and export",
      "User-friendly interface",
    ],
    links: [
      { label: "Live Demo", href: "https://expense-tail.vercel.app/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/Expense-Tracker", icon: "fab fa-github" },
    ],
  },
  {
    id: "project2",
    label: "Table Extractor",
    icon: "fas fa-table",
    description: "A Flask web app for extracting tables from web pages using BeautifulSoup and DataTables.",
    features: ["Table extraction", "Dynamic table rendering", "CSV download", "Responsive design"],
    links: [
      { label: "Live Demo", href: "https://table-extractor.onrender.com/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/table-extractor-app", icon: "fab fa-github" },
    ],
  },
  {
    id: "project3",
    label: "Goal Tracker",
    icon: "fas fa-bullseye",
    description: "Goal Tracker helps users achieve goals one day at a time.",
    features: ["Daily goal tracking", "Custom goals", "Progress visualization", "Shareable progress"],
    links: [
      { label: "Live Demo", href: "https://tanmay-kalbande.github.io/Goal-Tracker/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/Goal-Tracker", icon: "fab fa-github" },
    ],
  },
  {
    id: "project4",
    label: "The Scam Master Podcast",
    icon: "fas fa-microphone-alt",
    description:
      "A website for a podcast that exposes fraudsters and provides guidance on staying safe online.",
    features: [
      "Engaging hero section",
      "Platform accessibility",
      "Latest episodes showcase",
      "Social media integration",
    ],
    links: [
      { label: "Website", href: "https://the-scam-master.vercel.app/", icon: "fas fa-globe" },
      { label: "Instagram", href: "https://www.instagram.com/the_scam_master/", icon: "fab fa-instagram" },
      { label: "GitHub", href: "https://github.com/the-scam-master/podcast_webpage", icon: "fab fa-github" },
    ],
  },
  {
    id: "project5",
    label: "Incident Tracker",
    icon: "fas fa-exclamation-triangle",
    description: "A tool to record, track, and manage incidents efficiently within a company.",
    features: [
      "Add incidents with key operational details",
      "Search and filter incidents",
      "Pagination through incident history",
      "CSV export and import",
      "Professional interface",
    ],
    links: [
      { label: "Live Demo", href: "https://tanmay-kalbande.github.io/Incident-Tracker/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/Incident-Tracker", icon: "fab fa-github" },
    ],
  },
  {
    id: "project8",
    label: "Enhanced macOS Notes",
    icon: "fas fa-sticky-note",
    description:
      "A web-based note-taking app inspired by macOS aesthetics, with dark mode, rich text formatting, and PWA support.",
    features: [
      "Dark mode and rich text formatting",
      "Local storage and search",
      "PWA support for mobile and offline use",
    ],
    links: [
      { label: "Live Demo", href: "https://enhanced-mac-os-notes.vercel.app/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/Enhanced-macOS-Notes", icon: "fab fa-github" },
    ],
  },
  {
    id: "project9",
    label: "Life Loops - Game Edition",
    icon: "fas fa-gamepad",
    description:
      "A gamified habit-tracking web app with a retro-style point system designed to encourage positive habits.",
    features: ["Gamified habit tracking", "Retro-styled UI", "Responsive design"],
    links: [
      { label: "Live Demo", href: "https://life-loops-game-edition.vercel.app/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/Life-Loops---Game-Edition", icon: "fab fa-github" },
    ],
  },
  {
    id: "project11",
    label: "Mindfulness App",
    icon: "fas fa-brain",
    description:
      "A simple mindfulness web app with yoga and meditation guides and a soothing minimalist design.",
    features: ["Yoga and meditation tips", "Minimalist interface", "PWA support for offline access"],
    links: [
      { label: "Live Demo", href: "https://breathewell.vercel.app/", icon: "fas fa-desktop" },
      { label: "GitHub", href: "https://github.com/tanmay-kalbande/Mindfulness-App", icon: "fab fa-github" },
    ],
  },
] as const;

export const certifications = [
  "AWS Cloud Technical Essentials — Amazon Web Services (Dec 2024)",
  "Certified Data Scientist — IABAC (Sep 2023)",
  "Google Data Analytics Foundations — Google (2024)",
  "DataMites Data Science Bootcamp (2023)",
] as const;

export const education = {
  degree: "B.E. Mechanical Engineering",
  institute: "Prof. Ram Meghe Institute of Technology & Research, Amravati University",
  duration: "2019 – 2022",
  cgpa: "9.3 / 10.0",
} as const;

export const beyondTheDesk = [
  {
    title: "Public GitHub",
    desc: "Data analysis notebooks, ML pipelines, and automation scripts",
    href: "https://github.com/tanmay-kalbande",
    icon: "fab fa-github",
  },
  {
    title: "Portfolio Blog",
    desc: "Documenting analytical methodologies and GenAI architecture",
    href: "https://tanmaysk.in",
    icon: "fas fa-globe",
  },
] as const;

export const dashboardProjects = [
  {
    title: "Power BI Dashboard: Data Wave Metrics in India",
    description:
      "Power BI report for India wireless data usage, tariff per GB, derived quarterly revenue, and consumption trends using the data.gov.in source noted inside the PBIX.",
    points: [
      "Analyze wireless data usage and tariff movement from 2017 to 2022.",
      "Review quarterly data consumption in petabytes.",
      "Read quarterly revenue as a derived usage-and-tariff metric.",
    ],
    screenshot: dashboardPhoto,
    screenshotLabel: "Quarterly Metrics Overview",
    downloadHref: dashboardFile,
  },
] as const;

