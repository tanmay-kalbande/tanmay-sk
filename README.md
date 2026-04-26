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
2. Add the environment variable `GEMINI_API_KEY`.
3. Set `GEMINI_MODEL=gemma-3-27b-it`.
4. Set `GEMINI_MODEL_FALLBACK=gemma-4-31b-it`.
4. Deploy.

Default model:

- `gemma-3-27b-it`

Fallback model:

- `gemma-4-31b-it`

Notes:

- The chat UI requests streamed responses by default.
- Gemma 3 is the faster default for the public portfolio assistant.
- Gemma 4 is kept as a fallback, and the backend strips thought-channel output before rendering replies.
- The assistant prompt is tuned for concise Markdown answers that are easier to scan.

## Local Structure

- `src/` frontend app
- `api/` backend serverless routes
- `shared/` shared prompt/config content
- `bits-and-bytes/` portfolio assets reused by the React app

## Notes

- The old standalone assistant app has been replaced by the unified React app flow.
- The assistant backend now lives in this repo as `api/chat.ts`.
