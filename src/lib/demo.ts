import { defaultSettings } from "./model";
import type { DirectoryPage, LinkSummary, PageQuery } from "./model";

const groups = [
  { name: "开发工具", entries: [
    ["GitHub", "托管代码、协作开发和发现开源项目。", "https://github.com"],
    ["Supabase", "基于 PostgreSQL 的开源后端服务。", "https://supabase.com"],
    ["Vercel", "部署和预览前端项目。", "https://vercel.com"],
    ["CodePen", "在线编写和预览前端代码片段。", "https://codepen.io"],
  ] },
  { name: "设计灵感", entries: [
    ["Figma", "在线设计、制作原型与协作。", "https://www.figma.com"],
    ["Unsplash", "浏览可下载的高质量摄影作品。", "https://unsplash.com"],
    ["Coolors", "生成、收藏与预览配色方案。", "https://coolors.co"],
    ["Google Fonts", "查找并比较开源字体。", "https://fonts.google.com"],
  ] },
  { name: "学习资料", entries: [
    ["MDN Web Docs", "查阅 HTML、CSS 和 JavaScript 文档。", "https://developer.mozilla.org/zh-CN/"],
    ["React", "学习 React 组件、状态和 Hooks。", "https://zh-hans.react.dev"],
    ["TypeScript", "查找 TypeScript 语法与类型指南。", "https://www.typescriptlang.org/docs/"],
  ] },
  { name: "效率工具", entries: [
    ["Excalidraw", "手绘风格的在线白板。", "https://excalidraw.com"],
    ["Notion", "管理笔记、文档和协作项目。", "https://www.notion.com"],
    ["Photopea", "在浏览器中打开并编辑图像。", "https://www.photopea.com"],
  ] },
];

let nextId = 1;
const links: LinkSummary[] = groups.flatMap((group) => group.entries.map(([title, abstract, url]) => {
  const id = nextId++;
  return {
    id, title, abstract, to_link: url, obj: group.name, img: null, slug: null,
    to_article: false,
    is_pinned: id === 1 || title === "Figma" || title === "MDN Web Docs",
  };
})).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.id - b.id);

export function demoPage(query: PageQuery): DirectoryPage {
  const search = query.text.trim().toLowerCase();
  const filtered = links.filter((link) => (
    (query.category === null || link.obj === query.category) &&
    [link.title, link.abstract, link.to_link, link.obj].some((value) => value?.toLowerCase().includes(search))
  ));
  const page = Math.min(query.page, Math.max(1, Math.ceil(filtered.length / defaultSettings.page_size)));
  return {
    settings: defaultSettings,
    categories: groups.map((group, index) => (
      { name: group.name, sort_order: index, default_view: null, count: group.entries.length }
    )),
    links: filtered.slice((page - 1) * defaultSettings.page_size, page * defaultSettings.page_size),
    all_count: links.length,
    count: filtered.length,
    page,
  };
}
