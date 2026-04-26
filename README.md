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
3. Optional: add `GEMINI_MODEL` if you want to override the default model.
4. Optional: add `GEMINI_MODEL_FALLBACK` for a backup model.
4. Deploy.

Default model:

- `gemma-4-31b-it`

Notes:

- The chat UI requests streamed responses by default.
- Gemma 4 is wired with native system instructions, and the backend strips thought-channel output before rendering replies.

## Local Structure

- `src/` frontend app
- `api/` backend serverless routes
- `shared/` shared prompt/config content
- `bits-and-bytes/` portfolio assets reused by the React app

## Notes

- The old standalone assistant app has been replaced by the unified React app flow.
- The assistant backend now lives in this repo as `api/chat.ts`.
