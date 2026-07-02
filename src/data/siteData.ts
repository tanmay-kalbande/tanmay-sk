const profilePhoto = new URL("../../bits-and-bytes/resources/tanmay-portrait-landing.jpg", import.meta.url).href;
const resumePdf = "https://tanmaysk.in/assets/tanmay-resume.pdf";
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
] as const;

export const assistantSuggestions = [
  {
    label: "Projects",
    icon: "✦",
    query: "What are some of Tanmay's coolest data science projects?",
  },
  {
    label: "Skills & Tools",
    icon: "◈",
    query: "What technical skills does Tanmay bring to data science?",
  },
  {
    label: "Get in Touch",
    icon: "→",
    query: "How can I get in touch with Tanmay for a collaboration?",
  },
  {
    label: "Experience",
    icon: "◉",
    query: "Tell me about Tanmay's professional experience and career.",
  },
] as const;

export const assistantQuickActions = [
  {
    icon: "⚡",
    label: "Standout projects",
    query: "What are Tanmay's most impressive standout projects?",
    description: "Best work & demos",
  },
  {
    icon: "🛠",
    label: "Tech stack",
    query: "What technical skills and tools does Tanmay use?",
    description: "Languages, libraries & tools",
  },
  {
    icon: "💼",
    label: "Work experience",
    query: "Walk me through Tanmay's professional experience at Capgemini and Rubixe.",
    description: "Career & roles",
  },
  {
    icon: "📫",
    label: "Hire / Contact",
    query: "How can I contact or hire Tanmay? Show me all contact options.",
    description: "Get in touch",
  },
  {
    icon: "🤖",
    label: "AI projects",
    query: "Tell me about Tanmay's AI-powered projects.",
    description: "ML & AI builds",
  },
] as const;

export const assistantWelcomeMessage =
  "Sharp answers on Tanmay's projects, skills, experience, and contact - clean, fast, and easy to scan ⚡";

export const technicalSummary = [
  "Data Analyst and ML Practitioner with 2+ years of experience building predictive models and running statistical analyses.",
  "Built a lead scoring model with 85% accuracy, boosting sales conversion by 23% and cutting outreach effort by 15 hrs/week.",
  "Developed churn prediction pipeline (AUC 0.82) identifying high-risk segments driving 60% of total churn.",
  "Built an ETL pipeline that cut manual entry errors by 40% and saved 10+ hours per week.",
  "Created 8+ Power BI dashboards across 3 units, delivering real-time KPI visibility to senior leadership.",
  "Designed A/B test (Variant B: 8.5% conversion lift, p < 0.01) and conducted cohort retention analysis.",
  "Based in Bengaluru / Pune (Open to Relocate).",
] as const;

export const toolSummary = [
  { label: "Languages", value: "Python (primary), SQL, R, JavaScript (basic)" },
  { label: "Analysis & ML", value: "Pandas, NumPy, Scikit-learn, XGBoost, Random Forest, K-Means, Statistical Testing, A/B Testing, Cohort Analysis" },
  { label: "Visualization", value: "Tableau, Power BI (DAX, Power Query), Matplotlib, Seaborn" },
  { label: "Databases & Cloud", value: "SQL Server, PostgreSQL, MySQL, Supabase, AWS (Certified), GCP" },
  { label: "Tools & Methodologies", value: "ETL Pipelines, Data Modelling, Git/GitHub, FastAPI, Streamlit, Excel" },
] as const;

export const experiences = [
  {
    title: "Data Analyst",
    company: "Capgemini",
    duration: "Apr 2024 - Present",
    details: [
      "Analysed incident and operational data in SQL to identify recurring failure patterns, enabling client teams to prioritise remediation and reduce repeat incidents across high-priority service tiers.",
      "Built ETL pipeline automating data cleaning and transformation workflows — reduced manual entry errors 40% and saved 10+ hours/week across the team.",
      "Designed and maintained 8+ Power BI dashboards (DAX, Power Query) across 3 business units, delivering real-time KPI visibility to senior leadership.",
      "Standardised metric definitions and reporting frameworks across cross-functional teams — cut manual data extraction time by 30% and improved data trust stakeholder-wide.",
    ],
  },
  {
    title: "Data Analyst Trainee",
    company: "Rubixe",
    duration: "Nov 2022 - Dec 2023",
    details: [
      "Built lead scoring model (Random Forest) achieving 85% accuracy — improved sales conversion by 23% and cut sales outreach effort by 15 hours/week.",
      "Developed K-Means customer segmentation model, producing actionable customer clusters that directly shaped targeted marketing strategy for business stakeholders.",
      "Built predictive maintenance models on sensor data to identify equipment failure patterns ahead of breakdowns — surfaced proactive intervention opportunities for operations teams.",
      "Designed Tableau dashboards translating ML outputs into clear business visuals for non-technical decision-makers.",
    ],
  },
] as const;

export const skills = [
  "Predictive Modeling",
  "Data Analysis & SQL",
  "A/B Testing & Statistics",
  "Tableau & Power BI",
  "ETL & Data Pipelines",
  "Customer Segmentation",
  "XGBoost / Random Forest",
] as const;

export const interests = [
  "Predictive Analytics",
  "Business Impact",
  "Large Language Models",
  "Generative AI",
  "Dashboard Design",
] as const;

export const professionalProjects = [
  {
    title: "Lead Scoring & Customer Segmentation",
    icon: "fas fa-bullseye",
    description: "Built an end-to-end ML pipeline delivering 85% accurate lead scoring and actionable customer clusters.",
    contributions: "Boosted sales conversion by 23% and reduced sales outreach effort by 15 hours/week.",
    tasks: [
      "Cleaned and engineered features from raw sales lead data using Python and Pandas.",
      "Trained and evaluated Logistic Regression and Random Forest models achieving 85% accuracy.",
      "Developed K-Means customer segmentation to produce actionable customer clusters presented via Tableau dashboards.",
    ],
  },
  {
    title: "SQL Cohort Retention Analysis",
    icon: "fas fa-database",
    description: "Conducted pure-SQL cohort analysis to examine customer retention behavior.",
    contributions: "Revealed 35% higher 6-month retention for Q4 acquisitions, reshaping marketing budget allocation.",
    tasks: [
      "Built SQL cohorts using DATE_TRUNC, LAG(), self-joins, Window Functions, and CTEs.",
      "Analyzed and compared 6-month retention patterns across acquisition periods.",
      "Visualized retention curves with Python and Matplotlib, converting findings into stakeholder insights.",
    ],
  },
  {
    title: "Customer Churn Prediction & Statistical Validation",
    icon: "fas fa-user-minus",
    description: "Developed a churn prediction pipeline (Logistic Regression, Random Forest, XGBoost) with statistical validation.",
    contributions: "Achieved an AUC of 0.82, successfully identifying high-risk segments driving 60% of total churn volume.",
    tasks: [
      "Built end-to-end churn prediction pipeline using Python and Scikit-learn.",
      "Applied Chi-square and t-tests (p < 0.05) using Statsmodels for feature validation.",
      "Identified top churn-driving customer segments and presented insights using Seaborn visualization.",
    ],
  },
  {
    title: "A/B Test — Checkout Conversion",
    icon: "fas fa-vial",
    description: "Analyzed an A/B test on checkout conversion (n=10,000) to project revenue impact.",
    contributions: "Detected an 8.5% conversion lift with statistical significance, projecting a ₹12L annual revenue uplift.",
    tasks: [
      "Analyzed experimental results using Python, Pandas, SciPy, and Statsmodels.",
      "Conducted hypothesis testing verifying Variant B lift (p < 0.01, 95% CI: [4.2%, 12.8%]).",
      "Performed Simpson's Paradox validation checks to ensure statistical integrity of the segments.",
    ],
  },
] as const;

export const personalProjects = [
  {
    id: "project0",
    label: "Pustakam AI [Flagship]",
    icon: "fas fa-book",
    description: "AI-powered book generation engine that creates structured, context-aware books on any topic. Accepted into the Z.ai Startup Program.",
    features: [
      "Sequential generation with memory retention",
      "Python, Flask, React, Supabase",
      "Multi-model LLM routing",
    ],
    links: [
      { label: "Live Demo", href: "https://pustakamai.tanmaysk.in", icon: "fas fa-desktop" },
    ],
  },
  {
    id: "project_tutor",
    label: "AI-Tutor",
    icon: "fas fa-graduation-cap",
    description:
      "Personalized AI tutoring platform using Google's Gemma model with teaching personas, quizzes, and learning flowcharts.",
    features: ["Multiple teaching personas", "Context-aware quiz generation", "Interactive learning flowcharts"],
    links: [],
  },
  {
    id: "project_analyst",
    label: "AI Data Assistant",
    icon: "fas fa-robot",
    description: "Conversational analytics system. users interrogate datasets in plain English automatically.",
    features: ["LLM Backend", "Automated Insights", "No SQL required for users"],
    links: [],
  },
  {
    id: "project_structurer",
    label: "AI Data Structurer",
    icon: "fas fa-database",
    description: "Transforms raw unstructured data into clean, organized formats using Gemma and Flask.",
    features: ["Automated data parsing", "Reduces manual prep time", "Accelerates downstream ML tasks"],
    links: [],
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
    id: "project10",
    label: "Village Directory / Jawala Vyapar",
    icon: "fas fa-address-book",
    description:
      "AI-powered village/local phone directory with admin record maintenance, fast search, and multi-language support.",
    features: ["Admin portal for record maintenance", "Category filtering and search", "Multi-language support"],
    links: [],
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
