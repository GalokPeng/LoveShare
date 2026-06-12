import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
      // 通用代理中间件：/api/proxy?url=<目标URL> → 转发到任意地址
      {
        name: "api-proxy",
        configureServer(server) {
          server.middlewares.use("/api/proxy", async (req, res) => {
            const url = new URL(req.url || "", "http://localhost");
            const target = url.searchParams.get("url");

            if (!target) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing url parameter" }));
              return;
            }

            try {
              new URL(target); // 校验URL合法性
            } catch {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Invalid url" }));
              return;
            }

            try {
              const response = await fetch(target, {
                headers: {
                  Accept: "application/json, text/plain, */*",
                  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Referer: new URL(target).origin + "/",
                },
                redirect: "follow",
              });

              console.log(`[proxy] → ${target} [${response.status}]`);

              let data: unknown;
              const text = await response.text();
              try {
                data = JSON.parse(text);
              } catch {
                data = { raw: text.slice(0, 500), _error: "non-json-response" };
              }

              res.writeHead(response.status, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              });
              res.end(JSON.stringify(data));
            } catch (error) {
              console.error("[proxy] Error:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Proxy request failed",
                  details: (error as Error).message,
                }),
              );
            }
          });
        },
      },
    ],
    server: {
      proxy: {
        "/api/vod": {
          // 从env读取baseUrl
          target: env.VITE_FILMTELEVISION_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/vod/, env.VITE_FILMTELEVISION_API_PATH),
          secure: false,
        },
        "/api/auth": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
        "/api/data": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
        "/api/supabase": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
