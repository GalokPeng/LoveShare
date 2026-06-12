import type { NextApiRequest, NextApiResponse } from "next";

// Vercel Serverless Function 最大执行时间为 10s（免费版）或 60s（Pro），
// 这里设置 fetch 超时为 25s，留出足够余量
const FETCH_TIMEOUT_MS = 25_000;

export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
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
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: parsed.origin + "/",
        },
        redirect: "follow",
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : String(fetchError ?? "Unknown fetch error");
      console.error(`[proxy] Fetch failed for ${targetUrl}:`, message);

      // 区分超时和其他网络错误
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return res.status(504).json({
          error: "Target server timeout",
          details: `Request to ${parsed.hostname} timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        });
      }

      return res.status(502).json({
        error: "Target server unreachable",
        details: message,
      });
    }

    clearTimeout(timeout);
    console.log(`[proxy] → ${targetUrl} [${response.status}]`);

    // 透传目标服务器的响应
    const text = await response.text();

    let data: unknown;
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
