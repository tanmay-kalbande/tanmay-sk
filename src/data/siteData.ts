const profilePhoto = new URL("../../bits-and-bytes/resources/tanmay-portrait-landing.png", import.meta.url).href;
const resumePdf = "https://tanmay-eqdav6wyd-tanmays-projects-17b5602c.vercel.app/assets/tanmay-resume-DXrIQ_Zv.pdf";
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
  { href: "mailto:tanmaykalbande@gmail.com", label: "Email", icon: "fas fa-envelope" },
  { href: "https://linkedin.com/in/tanmay-kalbande", label: "LinkedIn Profile", icon: "fab fa-linkedin-in" },
  { href: "https://github.com/tanmay-kalbande", label: "GitHub Profile", icon: "fab fa-github" },
  { href: "https://medium.com/@tanmaykalbande", label: "Medium Blog", icon: "fab fa-medium" },
] as const;

export const landingStats = [
  { value: "2+", label: "Years Experience", icon: "fas fa-database" },
  { value: "9", label: "ML Projects Deployed", icon: "fas fa-brain" },
  { value: "4", label: "Industry Certifications", icon: "fas fa-chart-line" },
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
    icon: "🎓",
    label: "Certifications",
    query: "What certifications does Tanmay have?",
    description: "Credentials & courses",
  },
  {
    icon: "🤖",
    label: "AI projects",
    query: "Tell me about Tanmay's AI-powered projects.",
    description: "ML & AI builds",
  },
] as const;

export const assistantWelcomeMessage =
  "I'm Tanmay's AI assistant. Ask about projects, skills, experience, or how to reach him ⚡";

export const technicalSummary = [
  "Data analyst and ML practitioner with 2+ years of experience building predictive models and analyzing large datasets.",
  "Proven track record across customer segmentation, predictive maintenance, and lead scoring (85% accuracy).",
  "Hands-on experience across the end-to-end development of predictive modeling solutions.",
  "Proficient in Python with strong data analysis foundations in NumPy, Pandas, Scikit-learn, and Jupyter.",
  "Experienced independently building AI-powered tools like Pustakam (AI Book platform) and data structurers.",
  "Transforms complex findings into business decisions using Python, Pandas, SQL, and Tableau dashboards.",
  "Grounded in statistical concepts for practical, results-focused data analysis.",
] as const;

export const toolSummary = [
  { label: "Languages", value: "Python (primary), SQL, R, JavaScript (basic)" },
  { label: "Analysis & ML", value: "Pandas, NumPy, Scikit-learn, Random Forest, K-Means, NLP" },
  { label: "Visualization", value: "Tableau, Power BI, Matplotlib, Seaborn" },
  { label: "Databases & AI", value: "SQL Server, Supabase, Flask, LLM APIs" },
] as const;

export const experiences = [
  {
    title: "Data Analyst",
    company: "Capgemini",
    duration: "Apr 2024 - Present",
    details: [
      "Analyzed incident datasets to identify recurring problem categories and surface root causes.",
      "Presented data-driven findings to clients, contributing to a measurable reduction in repeat incidents.",
      "Built an AI-powered documentation formatter (Python + Flask) to automate manual work-note generation.",
      "Built a dual-agent validation tool to self-review knowledge base entries, improving documentation accuracy.",
    ],
  },
  {
    title: "Data Analyst Trainee",
    company: "Rubixe",
    duration: "Nov 2022 - Dec 2023",
    details: [
      "Built a lead scoring model achieving 85% accuracy, directly improving sales prioritization and outreach efficiency.",
      "Developed K-Means customer segmentation models for data-backed marketing strategy recommendations.",
      "Designed Tableau dashboards to communicate complex analytical findings to non-technical stakeholders.",
      "Built predictive maintenance models using Random Forest to identify equipment failure patterns from sensor data.",
    ],
  },
] as const;

export const skills = [
  "Predictive Modeling",
  "Data Analysis",
  "Python & SQL",
  "Tableau & Power BI",
  "Statistical Thinking",
  "Machine Learning",
  "R / NLP / Feature Engineering",
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
    description: "Built a predictive lead scoring model achieving 85% accuracy for sales prioritization.",
    contributions: "Directly improved sales team prioritization and outreach efficiency.",
    tasks: [
      "Cleaned and engineered features from raw sales lead data.",
      "Trained and evaluated Logistic Regression and Random Forest models.",
      "Deployed scoring algorithms for sales team usage.",
    ],
  },
  {
    title: "Customer Segmentation via K-Means Analysis - Rubixe",
    icon: "fas fa-users",
    description: "Developed K-Means customer segmentation model for transaction segmentations.",
    contributions: "Enabled data-backed marketing strategy recommendations for business stakeholders.",
    tasks: [
      "Preprocessed transaction and user data for clustering.",
      "Implemented the K-Means algorithm to find distinct customer groups.",
      "Designed Tableau dashboards to present insights clearly.",
    ],
  },
  {
    title: "Predictive Maintenance System - Rubixe",
    icon: "fas fa-tools",
    description: "Built predictive maintenance models using Random Forest to anticipate equipment failures.",
    contributions: "Discovered failure patterns from sensor data ahead of breakdowns.",
    tasks: [
      "Analyzed historical IoT/sensor data.",
      "Trained predictive maintenance models.",
      "Implemented proactive alerting support.",
    ],
  },
  {
    title: "Web Traffic Analysis for Conversion Rate Improvement - Zoompare",
    icon: "fas fa-chart-line",
    description: "Analyzed website traffic data to identify patterns and optimize conversion rates using Python.",
    contributions: "Performed web traffic analysis and implemented A/B testing.",
    tasks: [
      "Extracted data from the Google Analytics API.",
      "Designed funnel analysis.",
      "Proposed page optimizations.",
    ],
  },
] as const;

export const personalProjects = [
  {
    id: "project0",
    label: "Pustakam Injin [Flagship AI]",
    icon: "fas fa-book",
    description: "Production AI platform for book generation using multi-model LLM routing. Accepted into Z.ai Startup Program.",
    features: [
      "End-to-end product development",
      "Python, Flask, React, Supabase",
      "Multi-agent LLM routing",
    ],
    links: [
      { label: "Live Demo", href: "https://pustakamai.tanmaysk.in", icon: "fas fa-desktop" },
    ],
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
    label: "Jawala Vyapar",
    icon: "fas fa-address-book",
    description:
      "An online phone directory for local businesses with category filtering, search, and multi-language support.",
    features: ["Category filtering and search", "Mobile-first responsive design", "Multi-language support"],
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
  "AWS Cloud Technical Essentials - Amazon Web Services (AWS), Issued Dec 2024",
  "Foundations: Data, Data, Everywhere - Google, Issued Apr 2024",
  "Technical Support Fundamentals - Google, Issued Dec 2023",
  "Certified Data Scientist - IABAC, Issued Sep 2023",
  "Data Science Foundation - IABAC, Issued Aug 2023",
  "Certified Data Scientist Certification - DataMites, Issued Apr 2023",
  "100 Days of Code: The Complete Python Pro Bootcamp - London App Brewery",
  "The Data Science Course Complete Data Science Bootcamp - 365 Data Science",
] as const;


export const dashboardProjects = [
  {
    title: "Power BI Dashboard: Data Wave Metrics in India",
    description:
      "Explore key wireless data usage and ARPU metrics in India across quarters for revenue, consumption, and tariff insights.",
    points: [
      "Analyze wireless data usage and ARPU metrics across quarters.",
      "Review revenue and data-consumption trends over time.",
      "Understand tariff variations and their impact.",
    ],
    screenshot: dashboardPhoto,
    screenshotLabel: "Quarterly Metrics Overview",
    downloadHref: dashboardFile,
  },
] as const;
