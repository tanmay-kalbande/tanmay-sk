const profilePhoto = new URL("../../bits-and-bytes/resources/tanmay-portrait-landing.png", import.meta.url).href;
const resumePdf = new URL("../../bits-and-bytes/resources/tanmay-resume.pdf", import.meta.url).href;
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
  { value: "1.8+", label: "Years Experience", icon: "fas fa-database" },
  { value: "9", label: "ML Projects Deployed", icon: "fas fa-brain" },
  { value: "4", label: "Industry Certifications", icon: "fas fa-chart-line" },
] as const;

export const assistantSuggestions = [
  {
    label: "Coolest Projects",
    query: "What are some of Tanmay's coolest data science projects?",
  },
  {
    label: "Technical Skills",
    query: "What technical skills does Tanmay bring to data science?",
  },
  {
    label: "Contact Tanmay",
    query: "How can I get in touch with Tanmay for a collaboration?",
  },
] as const;

export const assistantWelcomeMessage =
  "Hi! I'm an AI assistant representing **Tanmay Kalbande**.\n\nAsk me about his [projects](https://github.com/tanmay-kalbande?tab=repositories), skills, experience, or hobbies!";

export const technicalSummary = [
  "Hands-on experience across the end-to-end development of predictive modeling solutions.",
  "Proficient in Python with strong data analysis foundations in NumPy, Pandas, Scikit-learn, and Jupyter.",
  "Comfortable working with SQL Server, with some exposure to Spark.",
  "Familiar with supervised and unsupervised learning, deep learning, neural networks, and NLP.",
  "Strong troubleshooting, analytical thinking, and problem-solving habits.",
  "Experienced in data visualization with Matplotlib, Seaborn, Tableau, Power BI, and Excel.",
  "Grounded in statistical concepts for practical data analysis.",
  "Exposure to big data technologies such as Hadoop and Spark.",
  "Awareness of ethical AI considerations in development and deployment.",
] as const;

export const toolSummary = [
  { label: "Languages", value: "SQL, R, C, Python" },
  { label: "Databases", value: "SQL Server, Spark" },
  { label: "IDE", value: "PyCharm, VS Code, Atom, Jupyter Notebooks" },
  { label: "BI Tool", value: "Excel, Tableau, Power BI" },
] as const;

export const experiences = [
  {
    title: "Analyst",
    company: "Capgemini",
    duration: "March 2024 - Present",
    details: [
      "Utilized advanced analytical techniques to derive actionable insights from complex datasets.",
      "Collaborated with cross-functional teams to translate data findings into business strategies.",
      "Designed and implemented interactive dashboards for visualizing key metrics.",
    ],
  },
  {
    title: "Data Analyst Trainee",
    company: "Rubixe",
    duration: "Nov 2022 - Dec 2023",
    details: [
      "Worked with teams to gather, clean, and organize data from various sources.",
      "Explored data patterns and trends to shape practical strategies.",
      "Created clear reports and interactive visualizations.",
    ],
  },
] as const;

export const skills = [
  "Python",
  "R",
  "SQL",
  "Machine Learning",
  "Statistical Analysis",
  "Data Visualization",
] as const;

export const interests = [
  "Artificial Intelligence",
  "Big Data",
  "Natural Language Processing",
  "Ethical AI",
  "Deep Learning",
  "TinyML",
] as const;

export const professionalProjects = [
  {
    title: "Web Traffic Analysis for Conversion Rate Improvement - Zoompare",
    icon: "fas fa-chart-line",
    description:
      "Analyzed website traffic data to identify patterns and optimize conversion rates using Python and Google Analytics.",
    contributions:
      "Performed web traffic analysis, implemented A/B testing, and aligned findings with engineering teams.",
    tasks: [
      "Extracted data from the Google Analytics API.",
      "Designed funnel analysis.",
      "Proposed page optimizations.",
    ],
  },
  {
    title: "Customer Segmentation using Clustering Analysis - Rubixe",
    icon: "fas fa-users",
    description:
      "Applied clustering analysis to customer data and visualized resulting segments using Python.",
    contributions:
      "Defined preprocessing steps, implemented K-means clustering, and evaluated distinct customer segments.",
    tasks: [
      "Defined data preprocessing steps for clustering analysis.",
      "Implemented the K-means clustering algorithm for segmentation.",
      "Evaluated and visualized distinct customer segments.",
    ],
  },
  {
    title: "Lead Quality Prediction - Rubixe",
    icon: "fas fa-bullseye",
    description:
      "Explored data and utilized multiple models to predict lead quality for sales prioritization.",
    contributions:
      "Prepared the data, experimented with multiple models, and identified the top-performing approach.",
    tasks: [
      "Prepared data for model training.",
      "Tested logistic regression, random forest, and other machine learning models.",
      "Evaluated model performance and selected the best-performing option.",
    ],
  },
  {
    title: "Movie Recommendation System - Rubixe",
    icon: "fas fa-film",
    description:
      "Developed a collaborative filtering-based recommendation system for personalized movie suggestions.",
    contributions:
      "Built collaborative filtering models and compared multiple recommendation algorithms.",
    tasks: [
      "Built collaborative filtering models for recommendations.",
      "Compared different recommendation algorithms.",
      "Integrated the recommendation system into the wider platform workflow.",
    ],
  },
  {
    title: "Sentiment Analysis of Customer Reviews - Sentix",
    icon: "fas fa-comment",
    description:
      "Analyzed customer-review sentiment using natural language processing techniques.",
    contributions: "Developed the sentiment model and implemented NLP-driven text analysis.",
    tasks: [
      "Collected and preprocessed customer review data.",
      "Trained and tested sentiment analysis models.",
      "Prepared the solution for real-time review analysis.",
    ],
  },
  {
    title: "Predictive Maintenance System - TechCorp",
    icon: "fas fa-tools",
    description:
      "Built a predictive maintenance system to anticipate equipment failures and support proactive maintenance.",
    contributions:
      "Developed the predictive maintenance model and connected it to existing maintenance workflows.",
    tasks: [
      "Collected industrial equipment sensor data.",
      "Developed machine-learning-driven predictive maintenance algorithms.",
      "Implemented monitoring and alerting support for maintenance teams.",
    ],
  },
] as const;

export const personalProjects = [
  {
    id: "project1",
    label: "Expense Tracker",
    icon: "fas fa-money-bill-wave",
    description:
      "A web application for tracking personal expenses with data visualization and CSV import/export functionality.",
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
      "A sleek AI-powered web tool to detect potential bias in text and suggest inclusive language improvements.",
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
    id: "project7",
    label: "AI Data Structurer [AI]",
    icon: "fas fa-database",
    description:
      "An AI-powered web app that transforms unstructured data into organized formats using Flask and Gemma.",
    features: [
      "Automated data organization",
      "Copy-to-clipboard support",
      "Responsive design for desktop and mobile",
    ],
    links: [],
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
  {
    id: "project12",
    label: "Report Generator [AI]",
    icon: "fas fa-file-alt",
    description:
      "An AI-powered tool to capture data and generate decision-making insights for business workflows.",
    features: ["Data capture and analysis", "Automated insight generation", "Business decision support"],
    links: [],
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
