import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App.tsx";

// 创建持久化存储
const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// 创建QueryClient实例，配置缓存时间
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: parseInt(import.meta.env.VITE_CACHE_DURATION || "3600") * 1000, // 缓存时间（毫秒），默认1小时
      gcTime:
        parseInt(import.meta.env.VITE_CACHE_DURATION || "3600") * 1000 * 24, // 缓存保留时间（毫秒），默认24小时
      refetchOnWindowFocus: false, // 窗口焦点恢复时不重新获取数据
      refetchOnReconnect: false, // 网络重连时不重新获取数据
      refetchOnMount: false, // 挂载组件时不重新获取数据，使用缓存
      retry: 0, // 失败时不重试
    },
  },
});

// 配置持久化缓存
persistQueryClient({
  queryClient,
  persister,
  maxAge: parseInt(import.meta.env.VITE_CACHE_DURATION || "3600") * 1000 * 24, // 缓存最大年龄
  buster: import.meta.env.VITE_CACHE_VERSION || "v1", // 缓存版本号，更改时会清除旧缓存
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
