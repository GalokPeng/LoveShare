import { needsDatabaseSetup, supabaseConfig } from "./config";
import type { DirectoryNote, DirectoryPage, PageQuery } from "./model";
import { readPreference, writePreference } from "./preferences";

type CacheEntry = { data: DirectoryPage; savedAt: number };
const pageCache = new Map<string, CacheEntry>();
const cacheKey = supabaseConfig ? `loveshare-directory-v1:${supabaseConfig.url}` : "";
const cacheLifetime = 20_000;
const storedLifetime = 5 * 60_000;

export const isDemo = !supabaseConfig && !needsDatabaseSetup;

export function pageKey(query: PageQuery) {
  return JSON.stringify([query.text, query.category, query.page]);
}

function isHome(query: PageQuery) {
  return !query.text && query.category === null && query.page === 1;
}

export function cachedPage(query: PageQuery) {
  const entry = pageCache.get(pageKey(query));
  if (entry && Date.now() - entry.savedAt < cacheLifetime) return entry;
  if (!cacheKey || !isHome(query)) return null;
  try {
    const stored = JSON.parse(readPreference(cacheKey) ?? "null") as CacheEntry | null;
    if (stored?.data?.settings && Date.now() - stored.savedAt < storedLifetime) return stored;
  } catch {
    return null;
  }
  return null;
}

async function request<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  if (!supabaseConfig) throw new Error("请检查 Supabase 项目 URL 和 Publishable Key。");
  const timeout = AbortSignal.timeout(12_000);
  const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: supabaseConfig.key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, timeout]),
  }).catch((error: unknown) => {
    if (signal.aborted) throw error;
    throw new Error(timeout.aborted ? "读取超时，请重试。" : "无法连接 Supabase，请检查网络后重试。");
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("导航表尚未初始化。请先在 Supabase 中运行建表 SQL。");
    throw new Error("无法读取导航数据，请检查 Supabase 配置后重试。");
  }
  return (await response.json()) as T;
}

export async function loadPage(query: PageQuery, signal: AbortSignal) {
  if (isDemo) {
    const { demoPage } = await import("./demo");
    return demoPage(query);
  }

  const data = await request<DirectoryPage>("navigation_page", {
    p_query: query.text,
    p_category: query.category,
    p_page: query.page,
  }, signal);

  const entry = { data, savedAt: Date.now() };
  pageCache.set(pageKey(query), entry);
  if (pageCache.size > 24) {
    const firstKey = pageCache.keys().next().value;
    if (firstKey !== undefined) pageCache.delete(firstKey);
  }
  if (cacheKey && isHome(query)) writePreference(cacheKey, JSON.stringify(entry));
  return data;
}

export function loadNote(slug: string, signal: AbortSignal) {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(slug) || isDemo) return Promise.resolve(null);
  return request<DirectoryNote | null>("navigation_note", { p_slug: slug }, signal);
}

export function invalidatePublicCache() {
  if (cacheKey) writePreference(cacheKey, "");
}
