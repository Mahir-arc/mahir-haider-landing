import { getFreeModels, json } from "../_lib/openrouter.js";

export async function onRequestGet() {
  try {
    const models = await getFreeModels();
    return json({ models: [{ id: "openrouter/free", name: "OpenRouter Free Router (automatic)" }, ...models] }, 200, {
      "Cache-Control": "public, max-age=300"
    });
  } catch (_) {
    return json({ error: "Could not verify free models right now. Please try again later." }, 503);
  }
}
