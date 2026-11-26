const express = require("express");
const path = require("path");
const app = express();
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.post("/api/generate", async (req, res) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(503).json({ error: "Set OPENROUTER_API_KEY in secure hosting settings first." });
  const idea = req.body && req.body.idea;
  const model = req.body && req.body.model;
  if (typeof idea !== "string" || idea.trim().length < 5 || idea.length > 2000) return res.status(400).json({ error: "Enter an idea between 5 and 2,000 characters." });
  if (typeof model !== "string" || !model.endsWith(":free")) return res.status(400).json({ error: "Only model IDs ending in :free are allowed. No paid fallback." });
  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json", "X-Title": "Mahir AI Video Studio" },
      body: JSON.stringify({ model, messages: [
        { role: "system", content: "You are a short-form video creative producer. Return a strong hook, a six-scene storyboard, voiceover, caption and hashtags. Keep concepts ethical and fictional; do not use covert subliminal influence or impersonate celebrities." },
        { role: "user", content: idea.trim() }
      ], temperature: 0.8 })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: (data.error && data.error.message) || "OpenRouter request failed." });
    const output = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!output) return res.status(502).json({ error: "The selected model returned no text." });
    res.json({ output });
  } catch (_) { res.status(500).json({ error: "Could not reach OpenRouter. Check the server connection." }); }
});
app.listen(Number(process.env.PORT || 3000));
