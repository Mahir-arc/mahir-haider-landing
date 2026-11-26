# Mahir AI Video Studio

An isolated starter app for creating short-form video scripts and storyboards with OpenRouter.

## Safety and cost controls
- This project lives on `feature/mahir-ai-video-studio`, not `main`.
- No portfolio files are changed by this feature branch.
- Never commit a real API key. Set `OPENROUTER_API_KEY` only in secure hosting environment settings.
- The model picker loads OpenRouter's live text-model catalogue and lists only `:free` variants whose prompt, completion, request, image, web-search, reasoning and cache prices are zero.
- The official `openrouter/free` router is offered as well; OpenRouter documents it as routing requests to free models.
- The server checks selected model IDs against the live free catalogue before generation. It fails closed if pricing cannot be verified.
- No paid model fallback is implemented.
- The Node server has an in-memory request limiter. The Cloudflare Pages Functions version enforces same-origin browser requests but does not yet have a durable per-user rate limiter. Do not make the Cloudflare deployment public until platform-level rate limiting or Turnstile protection is configured.
- Free model availability and provider quotas can change. Free does not mean unlimited.

## Cloudflare Pages deployment (free plan)
This repository branch is prepared for Pages Functions, but it is not deployed.

1. In Cloudflare, create a Pages project connected to this GitHub repository.
2. Select branch `feature/mahir-ai-video-studio` (never change the portfolio's production branch).
3. Set the project root directory to `video-studio`.
4. Set the build command to empty / no build command, and the output directory to `public`.
5. Before public launch, configure Cloudflare rate limiting or Turnstile protection for `POST /api/generate`.
6. In Pages project settings, add an encrypted secret named `OPENROUTER_API_KEY`. Do not add the key to GitHub, source files, build variables, or chat.
7. Deploy only after reviewing the Pages preview and confirming that the portfolio production deployment still points to `main`.

Cloudflare Pages Functions read encrypted secrets through `context.env`. The API key is never sent to the browser.

## Run locally with Node.js
1. Use Node.js 18.17 or newer.
2. Run `npm install`.
3. Set `OPENROUTER_API_KEY` in your local environment (never in source code).
4. Run `npm start` and open the local address shown by the server.

## Current status
The app currently generates text scripts and storyboards; it does not yet render finished video files. The Cloudflare Pages adapter is committed, but hosting, secret configuration and rate-limit protection remain. No deployment or paid service has been enabled.
