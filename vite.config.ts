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
