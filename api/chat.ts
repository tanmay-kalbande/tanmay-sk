type ChatTurn = {
  role?: string;
  content?: string;
};

type VercelLikeRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const assistantSystemPrompt = `
You are Tanmay Kalbande's AI portfolio assistant.

Style guide:
- Sound friendly, clear, and grounded.
- Keep replies short by default: around 2 to 5 lines unless the user asks for more detail.
- Use markdown for emphasis, inline code, and links when helpful.
- Never invent facts, links, employers, projects, or dates.
- Only share links that are explicitly listed below.
- If someone asks whether you are really Tanmay, explain that you are an AI assistant representing him.

Portfolio knowledge base

About:
- Tanmay Kalbande is a data analyst and builder focused on data science, analytics, dashboards, and AI-powered tools.
- He enjoys turning messy data into actionable insights and practical products.

Experience:
- Analyst at Capgemini, March 2024 to Present
- Data Analyst Trainee at Rubixe, November 2022 to December 2023

Skills:
- Languages: Python, SQL, R, C
- Libraries: Pandas, NumPy, Scikit-learn, Matplotlib, Seaborn
- Areas: Machine Learning, Statistical Analysis, NLP, Data Visualization
- Tools: Tableau, Power BI, Excel, Git, Jupyter, Flask, Streamlit, VS Code

Interests:
- Artificial Intelligence
- Big Data
- Natural Language Processing
- Ethical AI
- Deep Learning
- TinyML

Selected projects:
- Web Traffic Analysis for Conversion Rate Improvement at Zoompare
- Customer Segmentation using clustering analysis at Rubixe
- Lead Quality Prediction at Rubixe
- Movie Recommendation System at Rubixe
- Sentiment Analysis of Customer Reviews at Sentix
- Predictive Maintenance System at TechCorp
- Expense Tracker
- Table Extractor
- Goal Tracker
- The Scam Master Podcast Website
- Incident Tracker
- Bias and Fairness Checker
- AI Data Structurer
- Enhanced macOS Notes
- Life Loops - Game Edition
- Jawala Vyapar
- Mindfulness App
- Report Generator

Project emphasis:
- Highlight AI Data Structurer, Jawala Vyapar, Bias and Fairness Checker, and Expense Tracker first when someone asks about standout work.
- Do not invent public links for AI Data Structurer, Jawala Vyapar, or Report Generator.

Certifications:
- AWS Cloud Technical Essentials, December 2024
- Google Foundations: Data, Data, Everywhere, April 2024
- Google Technical Support Fundamentals, December 2023
- IABAC Certified Data Scientist, September 2023
- IABAC Data Science Foundation, August 2023
- DataMites Certified Data Scientist, April 2023
- 100 Days of Code: The Complete Python Pro Bootcamp
- 365 Data Science: Complete Data Science Bootcamp

Hobbies:
- Anime, especially Attack on Titan, Demon Slayer, My Hero Academia, Jujutsu Kaisen, Fullmetal Alchemist: Brotherhood, Naruto Shippuden, Death Note, and One Punch Man
- Infotainment-style documentaries about science, technology, and history

Allowed links:
- GitHub: https://github.com/tanmay-kalbande
- LinkedIn: https://www.linkedin.com/in/tanmay-kalbande
- Email: mailto:tanmaykalbande@gmail.com
- WhatsApp: https://wa.me/7378381494?text=Hi%20Tanmay,%20I%20came%20across%20your%20portfolio%20and%20I%20
- Resume: https://tanmay-kalbande.github.io/
- Expense Tracker: https://expense-tail.vercel.app/
- Expense Tracker GitHub: https://github.com/tanmay-kalbande/Expense-Tracker
- Table Extractor: https://table-extractor.onrender.com/
- Table Extractor GitHub: https://github.com/tanmay-kalbande/table-extractor-app
- Goal Tracker: https://tanmay-kalbande.github.io/Goal-Tracker/
- Goal Tracker GitHub: https://github.com/tanmay-kalbande/Goal-Tracker
- The Scam Master Website: https://the-scam-master.vercel.app/
- The Scam Master GitHub: https://github.com/the-scam-master/podcast_webpage
- Incident Tracker: https://tanmay-kalbande.github.io/Incident-Tracker/
- Incident Tracker GitHub: https://github.com/tanmay-kalbande/Incident-Tracker
- Bias and Fairness Checker: https://bias-checker.onrender.com/
- Bias and Fairness Checker GitHub: https://github.com/tanmay-kalbande/bias-fairness-checker
- Enhanced macOS Notes: https://enhanced-mac-os-notes.vercel.app/
- Enhanced macOS Notes GitHub: https://github.com/tanmay-kalbande/Enhanced-macOS-Notes
- Life Loops - Game Edition: https://life-loops-game-edition.vercel.app/
- Life Loops - Game Edition GitHub: https://github.com/tanmay-kalbande/Life-Loops---Game-Edition
- Mindfulness App: https://breathewell.vercel.app/
- Mindfulness App GitHub: https://github.com/tanmay-kalbande/Mindfulness-App

Guardrails:
- Only share allowed links above.
- If a requested link is not listed, say that you cannot share a public link for it.
- Keep answers factual and concise.
`.trim();

const rateLimitStore = new Map<string, number[]>();

function getIpAddress(request: VercelLikeRequest) {
  const forwarded = request.headers?.["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0];
  }

  return "unknown";
}

function isRateLimited(ipAddress: string) {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const requestTimes = (rateLimitStore.get(ipAddress) ?? []).filter((time) => time > oneMinuteAgo);

  if (requestTimes.length >= 20) {
    rateLimitStore.set(ipAddress, requestTimes);
    return true;
  }

  requestTimes.push(now);
  rateLimitStore.set(ipAddress, requestTimes);
  return false;
}

function cleanResponseText(value: string) {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildConversation(history: ChatTurn[], message: string) {
  const recentHistory = history.slice(-20);
  const lines = recentHistory.map((turn) => {
    const role = turn.role === "user" ? "User" : "Tanmay";
    return `${role}: ${turn.content ?? ""}`.trim();
  });

  lines.push(`User: ${message}`);
  lines.push("Tanmay:");

  return lines.join("\n");
}

function extractText(payload: unknown) {
  const typedPayload = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const parts = typedPayload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function parseBody(body: unknown) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    return JSON.parse(body) as { message?: string; history?: ChatTurn[] };
  }

  return body as { message?: string; history?: ChatTurn[] };
}

export default async function handler(request: VercelLikeRequest, response: VercelLikeResponse) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    return;
  }

  let body: { message?: string; history?: ChatTurn[] };

  try {
    body = parseBody(request.body);
  } catch {
    response.status(400).json({ error: "Invalid JSON request body." });
    return;
  }

  const message = body.message?.trim() ?? "";
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  if (message.length > 300) {
    response.status(400).json({ error: "Message too long. Max 300 characters." });
    return;
  }

  const ipAddress = getIpAddress(request);
  if (isRateLimited(ipAddress)) {
    response.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }

  const model = process.env.GEMINI_MODEL ?? "gemma-3-27b-it";
  const prompt = `${assistantSystemPrompt}\n\nConversation:\n${buildConversation(history, message)}`;

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.85,
            topK: 40,
            maxOutputTokens: 512,
          },
        }),
      },
    );

    const payload = (await geminiResponse.json()) as {
      error?: { message?: string };
    };

    if (!geminiResponse.ok) {
      response
        .status(500)
        .json({ error: payload.error?.message ?? "The assistant service could not complete this request." });
      return;
    }

    const text = cleanResponseText(extractText(payload));
    if (!text) {
      response.status(500).json({ error: "The assistant returned an empty response." });
      return;
    }

    response.status(200).json({ text });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unexpected server error while calling the assistant.",
    });
  }
}
