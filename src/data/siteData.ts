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
  "Data Analyst based in Noida with 2+ years of experience in predictive modeling and SQL.",
  "Built a lead scoring model with 85% accuracy, boosting sales conversion by 23% and cutting outreach effort by 15 hrs/week.",
  "Developed churn prediction pipeline (AUC 0.82) identifying high-risk segments driving 60% of total churn.",
  "Built an ETL pipeline that cut manual entry errors by 40% and saved 10+ hours per week.",
  "Created 8+ Power BI dashboards across 3 units, delivering real-time KPI visibility.",
  "Developed K-Means segmentation and Tableau dashboards for stakeholder-ready insights.",
  "Open to relocate anywhere in India.",
] as const;

export const toolSummary = [
  { label: "Languages", value: "Python, SQL, R" },
  { label: "Analysis & ML", value: "Pandas, Scikit-learn, XGBoost, Regression, K-Means" },
  { label: "Visualization", value: "Tableau, Power BI, Matplotlib" },
  { label: "Analytics", value: "ETL pipelines, cohort analysis, KPI dashboards, customer segmentation" },
] as const;

export const experiences = [
  {
    title: "Data Analyst",
    company: "Capgemini",
    duration: "Apr 2024 - Present",
    details: [
      "Analyzed incident data via SQL, uncovering failure patterns to prioritize remediation.",
      "Built an ETL pipeline, cutting manual entry errors by 40% and saving 10+ hours per week.",
      "Created 8+ Power BI dashboards (DAX, Power Query) across 3 units, delivering real-time KPI visibility.",
      "Standardised metric definitions across cross-functional teams — reduced manual data extraction time by 30%.",
    ],
  },
  {
    title: "Data Analyst Trainee",
    company: "Rubixe",
    duration: "Nov 2022 - Dec 2023",
    details: [
      "Built a lead scoring model (Random Forest) achieving 85% accuracy, raising sales conversion by 23% and cutting outreach effort by 15 hrs/week.",
      "Developed K-Means customer segmentation, enabling targeted marketing recommendations.",
      "Built predictive maintenance models on sensor data to identify equipment failure patterns ahead of breakdowns.",
      "Designed Tableau dashboards to clearly present analytical insights to stakeholders.",
    ],
  },
] as const;

export const skills = [
  "Predictive Modeling",
  "Data Analysis",
  "Python & SQL",
  "Tableau & Power BI",
  "ETL Pipelines",
  "K-Means Segmentation",
  "XGBoost / Regression",
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
    title: "Lead Quality Prediction & Scoring - Rubixe",
    icon: "fas fa-bullseye",
    description: "Built an end-to-end ML pipeline delivering 85% accurate lead scoring.",
    contributions: "Boosted sales conversion by 23% and delivered actionable customer clusters through Tableau.",
    tasks: [
      "Cleaned and engineered features from raw sales lead data.",
      "Trained and evaluated Logistic Regression and Random Forest models.",
      "Deployed scoring algorithms for sales team usage.",
    ],
  },
  {
    title: "Customer Segmentation via K-Means Analysis - Rubixe",
    icon: "fas fa-users",
    description: "Developed K-Means segmentation for targeted marketing recommendations.",
    contributions: "Enabled data-backed marketing strategy recommendations for business stakeholders.",
    tasks: [
      "Preprocessed transaction and user data for clustering.",
      "Implemented the K-Means algorithm to find distinct customer groups.",
      "Designed Tableau dashboards to present insights clearly.",
    ],
  },
  {
    title: "SQL Cohort Analysis",
    icon: "fas fa-database",
    description: "Used SQL-driven cohort analysis to examine retention behavior.",
    contributions: "Revealed 35% higher 6-month retention for Q4 acquisitions.",
    tasks: [
      "Built SQL cohorts for acquisition-period analysis.",
      "Compared 6-month retention patterns.",
      "Converted retention findings into stakeholder-ready insights.",
    ],
  },
  {
    title: "ETL Pipeline & KPI Dashboards - Capgemini",
    icon: "fas fa-chart-line",
    description: "Built ETL and Power BI reporting workflows for operational visibility.",
    contributions: "Cut manual entry errors by 40%, saved 10+ hours per week, and created 8+ dashboards across 3 units.",
    tasks: [
      "Analyzed incident data with SQL.",
      "Built an ETL pipeline for cleaner reporting inputs.",
      "Created real-time KPI dashboards in Power BI.",
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
