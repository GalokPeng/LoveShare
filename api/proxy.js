export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: "Invalid url" });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).json({ error: "Invalid protocol" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        User-Agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: parsed.origin + "/",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log(`[proxy] → ${targetUrl} [${response.status}]`);

    let data: unknown;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500), _error: "non-json-response" };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("[proxy] Error:", message);
    return res
      .status(500)
      .json({ error: "Proxy request failed", details: message });
  }
}
