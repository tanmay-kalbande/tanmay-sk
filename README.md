# Tanmay Kalbande Portfolio

This repo now contains a single unified React + TypeScript portfolio app with:

- A React homepage matching the current portfolio landing UI
- A React portfolio route for data science work and certifications
- A React dashboards route for BI showcase content
- An integrated AI assistant experience
- A single TypeScript serverless backend at `api/chat.ts`

## Tech Stack

- Vite
- React
- TypeScript
- React Router
- Vercel serverless functions

## Vercel Setup

1. Import this repository into Vercel.
2. Add the environment variable `CEREBRAS_API_KEY`.
3. Set `CEREBRAS_MODEL=gpt-oss-120b`.
4. Add `GEMINI_API_KEY` for the Gemma backup path and classifier.
5. Set `GEMINI_MODEL=gemma-3-27b-it`.
6. Optionally set `GEMINI_MODEL_FALLBACK=gemma-4-31b-it` as a secondary Gemma backup.
7. Deploy.

Primary model:

- Cerebras `gpt-oss-120b`

Fallback model:

- Gemma `gemma-3-27b-it`
- Optional secondary Gemma fallback: `gemma-4-31b-it`

Notes:

- The chat UI requests streamed responses by default.
- Cerebras is the primary provider for the public portfolio assistant.
- If Cerebras has an issue before a response starts, the backend switches to Gemma and the chat UI shows a small fallback notice.
- The backend strips thought-channel output before rendering replies.
- The assistant prompt is tuned for concise Markdown answers that are easier to scan.

## Local Structure

- `src/` frontend app
- `api/` backend serverless routes
- `shared/` shared prompt/config content
- `bits-and-bytes/` portfolio assets reused by the React app

## Notes

- The old standalone assistant app has been replaced by the unified React app flow.
- The assistant backend now lives in this repo as `api/chat.ts`.
