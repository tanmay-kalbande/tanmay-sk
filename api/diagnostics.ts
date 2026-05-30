type VercelLikeRequest = {
  method?: string;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    CEREBRAS_API_KEY_PRESENT: Boolean(process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_KEY || process.env.CEREBRAS_TOKEN || process.env.CEREBRAS_API_TOKEN),
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL ?? "not set",
    GEMINI_API_KEY_PRESENT: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "not set",
    NODE_ENV: process.env.NODE_ENV ?? "not set",
  });
}
