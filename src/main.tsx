import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App.tsx";

// 创建QueryClient实例，配置缓存时间
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: parseInt(import.meta.env.VITE_CACHE_DURATION || "60") * 1000, // 缓存时间（毫秒）
      gcTime: parseInt(import.meta.env.VITE_CACHE_DURATION || "60") * 1000, // 缓存保留时间（毫秒）
      refetchOnWindowFocus: false, // 窗口焦点恢复时不重新获取数据
      refetchOnReconnect: false, // 网络重连时不重新获取数据
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.VITE_VERCEL_ANALYTICS_IS_OPEN === "true" && (
        <Analytics />
      )}
    </QueryClientProvider>
  </StrictMode>
);
