import { getFreeModels, isSameOrigin, json } from "./lib/openrouter.js";

async function generate(request, env) {
  if (!isSameOrigin(request)) return json({ error: "Request origin rejected." }, 403);
  if (!env.OPENROUTER_API_KEY) return json({ error: "Set OPENROUTER_API_KEY as an encrypted Worker secret first." }, 503);

  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Send the request as application/json." }, 415);
  }
  let rawBody;
  try { rawBody = await request.text(); }
  catch (_) { return json({ error: "Could not read request body." }, 400); }
  if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) {
    return json({ error: "Request body is too large." }, 413);
  }

  let body;
  try { body = JSON.parse(rawBody); }
  catch (_) { return json({ error: "Invalid JSON request." }, 400); }

  const idea = body && body.idea;
  const model = body && body.model;
  if (typeof idea !== "string" || idea.trim().length < 5 || idea.length > 2000) {
    return json({ error: "Enter an idea between 5 and 2,000 characters." }, 400);
  }
  if (typeof model !== "string") return json({ error: "Choose a verified free model." }, 400);

  try {
    if (model !== "openrouter/free") {
      const freeModels = await getFreeModels();
      if (!freeModels.some(item => item.id === model)) {
        return json({ error: "That model is not currently verified as free. Choose another free model." }, 400);
      }
    }
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.OPENROUTER_API_KEY,
        "Content-Type": "application/json",
        "X-Title": "Mahir AI Video Studio"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a short-form video creative producer. Return a strong hook, a six-scene storyboard, voiceover, caption and hashtags. Keep concepts ethical and fictional; use clearly adult fictional people where relevant. Do not use covert subliminal influence or impersonate celebrities." },
          { role: "user", content: idea.trim() }
        ],
        temperature: 0.8
      }),
      signal: AbortSignal.timeout(60000)
    });
    const data = await upstream.json();
    if (!upstream.ok) return json({ error: (data.error && data.error.message) || "OpenRouter request failed." }, upstream.status);
    const output = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!output) return json({ error: "The selected model returned no text." }, 502);
    return json({ output });
  } catch (_) {
    return json({ error: "Could not verify or reach OpenRouter. No paid model fallback was used." }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiPath = url.pathname.replace(/\\/+$/, "").toLowerCase();
    if ((apiPath === "/api/models" || apiPath.endsWith("/api/models")) && request.method === "GET") {
      try {
        const models = await getFreeModels();
        return json({ models: [{ id: "openrouter/free", name: "OpenRouter Free Router (automatic)" }, ...models] }, 200, {
          "Cache-Control": "public, max-age=300"
        });
      } catch (_) {
        return json({ error: "Could not verify free models right now. Please try again later." }, 503);
      }
    }
    if ((apiPath === "/api/health" || apiPath.endsWith("/api/health")) && request.method === "GET") {
      return json({ ok: true, service: "mahir-video-studio", api: "worker-reached" });
    }
    if ((apiPath === "/api/generate" || apiPath.endsWith("/api/generate")) && request.method === "POST") return generate(request, env);
    if (apiPath.includes("/api/")) return json({ error: "API worker reached but route not found.", path: url.pathname }, 404);
    return env.ASSETS.fetch(request);
  }
};

// Deployment marker: keep API requests routed through this Worker before static assets.
