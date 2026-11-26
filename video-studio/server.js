const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public")));

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Studio limit reached for now. Please wait 15 minutes before trying again." }
});
const modelsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

let freeModelsCache = { at: 0, models: [] };
async function getFreeModels() {
  if (Date.now() - freeModelsCache.at < 5 * 60 * 1000 && freeModelsCache.models.length) {
    return freeModelsCache.models;
  }
  const response = await fetch("https://openrouter.ai/api/v1/models?output_modalities=text", {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("OpenRouter model catalogue is temporarily unavailable.");
  const payload = await response.json();
  const models = (payload.data || [])
    .filter(model =>
      typeof model.id === "string" &&
      model.id.endsWith(":free") &&
      model.pricing &&
      Number(model.pricing.prompt) === 0 &&
      Number(model.pricing.completion) === 0
    )
    .map(model => ({ id: model.id, name: model.name || model.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  freeModelsCache = { at: Date.now(), models };
  return models;
}

app.get("/api/models", modelsLimiter, async (_req, res) => {
  try {
    const models = await getFreeModels();
    res.set("Cache-Control", "public, max-age=300");
    res.json({ models: [{ id: "openrouter/free", name: "OpenRouter Free Router (automatic)" }, ...models] });
  } catch (_) {
    res.status(503).json({ error: "Could not verify free models right now. Please try again later." });
  }
});

app.post("/api/generate", generateLimiter, async (req, res) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(503).json({ error: "Set OPENROUTER_API_KEY in secure hosting settings first." });
  const idea = req.body && req.body.idea;
  const model = req.body && req.body.model;
  if (typeof idea !== "string" || idea.trim().length < 5 || idea.length > 2000) {
    return res.status(400).json({ error: "Enter an idea between 5 and 2,000 characters." });
  }
  if (typeof model !== "string") return res.status(400).json({ error: "Choose a verified free model." });

  try {
    if (model !== "openrouter/free") {
      const freeModels = await getFreeModels();
      if (!freeModels.some(item => item.id === model)) {
        return res.status(400).json({ error: "That model is not currently verified as free. Choose another free model." });
      }
    }
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "X-Title": "Mahir AI Video Studio"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a short-form video creative producer. Return a strong hook, a six-scene storyboard, voiceover, caption and hashtags. Keep concepts ethical and fictional; use clearly adult fictional people where relevant. Do not use covert subliminal influence or impersonate celebrities."
          },
          { role: "user", content: idea.trim() }
        ],
        temperature: 0.8
      }),
      signal: AbortSignal.timeout(60000)
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: (data.error && data.error.message) || "OpenRouter request failed." });
    const output = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!output) return res.status(502).json({ error: "The selected model returned no text." });
    res.json({ output });
  } catch (_) {
    res.status(503).json({ error: "Could not verify or reach OpenRouter. No paid model fallback was used." });
  }
});

app.listen(Number(process.env.PORT || 3000));
