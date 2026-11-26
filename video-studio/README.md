# Mahir AI Video Studio

An isolated starter app for creating short-form video scripts and storyboards with OpenRouter.

## Safety and cost controls
- This project lives on `feature/mahir-ai-video-studio`, not `main`.
- No portfolio files are changed by this feature branch.
- Never commit a real API key. Set `OPENROUTER_API_KEY` only in secure hosting environment settings.
- The model picker loads OpenRouter's live text-model catalogue and lists only `:free` variants whose prompt and completion prices are both zero.
- The official `openrouter/free` router is also offered; OpenRouter documents it as routing to free models.
- The server checks selected model IDs against the live free catalogue before generation. It fails closed if pricing cannot be verified.
- No paid model fallback is implemented.
- Generation is rate-limited to 10 requests per 15 minutes per client IP; model-list requests are separately limited.
- Free model availability and provider quotas can change. Free does not mean unlimited.

## Run locally
1. Use Node.js 18.17 or newer.
2. Run `npm install`.
3. Set `OPENROUTER_API_KEY` in your local environment (never in source code).
4. Run `npm start` and open the local address shown by the server.

## Current status
This is a script/storyboard generator starter, not a finished video renderer. Hosting and secure secret configuration are still required before online generation can run. Do not deploy publicly until the hosting platform's proxy/IP behavior and rate limits have been checked.
