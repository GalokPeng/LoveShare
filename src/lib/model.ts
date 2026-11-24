export const views = ["cards", "list", "table"] as const;
export type View = (typeof views)[number];

export const viewLabels: Record<View, string> = {
  cards: "卡片",
  list: "列表",
  table: "表格",
};

export type Theme = "light" | "dark" | "system";
export type CategoryDisplay = "sidebar" | "top" | "hidden";

export interface Settings {
  site_title: string;
  site_description: string;
  default_view: View;
  enabled_views: View[];
  theme: Theme;
  category_display: CategoryDisplay;
  show_icons: boolean;
  show_description: boolean;
  show_domain: boolean;
  open_in_new_tab: boolean;
  page_size: number;
}

export const defaultSettings: Settings = {
  site_title: "LoveShare 导航",
  site_description: "把常用网站、实用工具与学习资源放在一起。",
  default_view: "cards",
  enabled_views: [...views],
  theme: "system",
  category_display: "sidebar",
  show_icons: true,
  show_description: true,
  show_domain: true,
  open_in_new_tab: true,
  page_size: 24,
};

export interface LinkSummary {
  id: number;
  title: string | null;
  abstract: string | null;
  img: string | null;
  to_link: string | null;
  obj: string | null;
  to_article: boolean | null;
  slug: string | null;
  is_pinned: boolean;
}

export interface ManagedLink extends LinkSummary {
  sort_order: number;
  is_published: boolean;
}

export interface LinkDraft {
  title: string;
  abstract: string | null;
  img: string | null;
  to_link: string | null;
  obj: string | null;
  to_article: boolean;
  article: string | null;
  is_pinned: boolean;
  is_published: boolean;
  sort_order: number;
}

export interface Category {
  name: string;
  sort_order: number;
  default_view: View | null;
}

export interface PublicCategory extends Category {
  count: number;
}

export interface PageQuery {
  text: string;
  category: string | null;
  page: number;
}

export interface DirectoryPage {
  settings: Settings;
  categories: PublicCategory[];
  links: LinkSummary[];
  all_count: number;
  count: number;
  page: number;
}

export interface DirectoryNote {
  title: string | null;
  abstract: string | null;
  img: string | null;
  to_link: string | null;
  obj: string | null;
  article: string | null;
  site_title: string;
  theme: Theme;
  open_in_new_tab: boolean;
}

export function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol === "https:" || url.protocol === "http:") return url;
  } catch {
    return null;
  }
  return null;
}

export function linkTitle(value: string | null) {
  return value?.trim() || "未命名链接";
}

export function linkDomain(value: string | null) {
  return safeUrl(value)?.hostname.replace(/^www\./, "") ?? "";
}

export function categoryLabel(value: string | null) {
  return value?.trim() || "未分类";
}

export function messageOf(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
