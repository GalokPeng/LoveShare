import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import { messageOf, views } from "./model";
import type { Category, LinkDraft, ManagedLink, Settings } from "./model";
import { invalidatePublicCache } from "./public-data";

export const adminClient = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.key)
  : null;

const linkFields = "id,title,abstract,img,to_link,obj,to_article,slug,is_pinned,sort_order,is_published";
export const adminPageSize = 20;

function client() {
  if (!adminClient) throw new Error("请先完成 Supabase 配置。");
  return adminClient;
}

function requireWrite(data: unknown, error: unknown) {
  if (error) throw error;
  if (!data) throw new Error("未能保存，记录可能已变更或管理员权限已失效。");
  invalidatePublicCache();
}

export function adminError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "23505") return "这个名称已存在，请使用其他名称。";
    if (error.code === "23503") return "所选分类已变更，请刷新页面后重试。";
    if (error.code === "42501") return "当前账号没有权限执行此操作。";
    if (error.code === "23514") return "有设置值超出允许范围，请检查后重试。";
  }
  return messageOf(error, fallback);
}

export async function canManage(signal: AbortSignal) {
  const { data, error } = await client().rpc("navigation_is_admin").abortSignal(signal);
  if (error) throw error;
  return data === true;
}

export async function adminLinks(query: { text: string; category: string | null; visibility: string; page: number }, signal: AbortSignal) {
  const first = (query.page - 1) * adminPageSize;
  let request = client().from("navigation").select(linkFields, { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: false })
    .range(first, first + adminPageSize - 1);

  if (query.text) request = request.ilike("title", `%${query.text.replace(/[\\%_]/g, "\\$&")}%`);
  if (query.category === "") request = request.is("obj", null);
  if (query.category) request = request.eq("obj", query.category);
  if (query.visibility) request = request.eq("is_published", query.visibility === "published");

  const { data, count, error } = await request.abortSignal(signal);
  if (error?.code === "PGRST103" && query.page > 1) return { rows: [], count: count ?? 0 };
  if (error) throw error;
  return { rows: data as ManagedLink[], count: count ?? 0 };
}

export async function getLinkArticle(id: number, signal: AbortSignal) {
  const { data, error } = await client().from("navigation").select("article").eq("id", id).abortSignal(signal).single();
  if (error) throw error;
  return data.article as string | null;
}

export async function saveLink(draft: LinkDraft, id?: number) {
  const table = client().from("navigation");
  const request = id === undefined ? table.insert(draft) : table.update(draft).eq("id", id);
  const { data, error } = await request.select("id").maybeSingle();
  requireWrite(data, error);
}

export async function deleteLink(id: number) {
  const { data, error } = await client().from("navigation").delete().eq("id", id).select("id").maybeSingle();
  requireWrite(data, error);
}

export async function getCategories(signal: AbortSignal) {
  const { data, error } = await client().from("navigation_categories").select("name,sort_order,default_view")
    .order("sort_order").order("name").abortSignal(signal);
  if (error) throw error;
  return data as Category[];
}

export async function saveCategory(category: Category, originalName?: string) {
  const table = client().from("navigation_categories");
  const request = originalName === undefined ? table.insert(category) : table.update(category).eq("name", originalName);
  const { data, error } = await request.select("name").maybeSingle();
  requireWrite(data, error);
}

export async function deleteCategory(name: string) {
  const { data, error } = await client().from("navigation_categories").delete().eq("name", name).select("name").maybeSingle();
  requireWrite(data, error);
}

export async function getSettings(signal: AbortSignal) {
  const { data, error } = await client().from("navigation_settings")
    .select("site_title,site_description,default_view,enabled_views,theme,category_display,show_icons,show_description,show_domain,open_in_new_tab,page_size")
    .eq("id", 1).abortSignal(signal).single();
  if (error) throw error;
  return data as Settings;
}

export async function saveSettings(settings: Settings) {
  const { data, error } = await client().from("navigation_settings")
    .update({ ...settings, enabled_views: views.filter((view) => settings.enabled_views.includes(view)) })
    .eq("id", 1).select("id").maybeSingle();
  requireWrite(data, error);
}

export async function getPreviewLinks(signal: AbortSignal) {
  const { data, error } = await client().from("navigation").select(linkFields).eq("is_published", true)
    .order("is_pinned", { ascending: false }).order("sort_order").order("id", { ascending: false })
    .limit(3).abortSignal(signal);
  if (error) throw error;
  return data as ManagedLink[];
}
