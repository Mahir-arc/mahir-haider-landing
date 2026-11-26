export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders }
  });
}

export function hasZeroPricing(pricing) {
  if (!pricing || (Array.isArray(pricing.overrides) && pricing.overrides.length > 0)) return false;
  const fields = ["prompt", "completion", "request", "image", "web_search", "internal_reasoning", "input_cache_read", "input_cache_write"];
  return Number(pricing.prompt) === 0 &&
    Number(pricing.completion) === 0 &&
    fields.every(field => pricing[field] === undefined || Number(pricing[field]) === 0);
}

export async function getFreeModels() {
  const response = await fetch("https://openrouter.ai/api/v1/models?output_modalities=text", {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("OpenRouter model catalogue unavailable");
  const payload = await response.json();
  return (payload.data || [])
    .filter(model => typeof model.id === "string" && model.id.endsWith(":free") && hasZeroPricing(model.pricing))
    .map(model => ({ id: model.id, name: model.name || model.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch (_) { return false; }
}
