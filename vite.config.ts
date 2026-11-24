import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function usesPrivilegedKey(key: string) {
  if (key.startsWith("sb_secret_")) return true;
  const [, payload] = key.split(".");
  if (!payload) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims?.role === "service_role";
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  if ([env.VITE_SUPABASE_PUBLISHABLE_KEY, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY]
    .some((key) => key && usesPrivilegedKey(key.trim()))) {
    throw new Error("前端配置必须使用 Supabase Publishable Key 或 anon key。");
  }
  const origin = URL.canParse(env.VITE_SUPABASE_URL ?? "")
    ? new URL(env.VITE_SUPABASE_URL).origin
    : null;

  return {
    plugins: [
      react(),
      {
        name: "supabase-preconnect",
        transformIndexHtml() {
          return origin && /^https?:\/\//.test(origin)
            ? [{ tag: "link", attrs: { rel: "preconnect", href: origin, crossorigin: "" } }]
            : [];
        },
      },
    ],
  };
});
