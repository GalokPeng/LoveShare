import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Folder, LayoutGrid, List, Search, Settings2, Table2, X } from "lucide-react";
import { Brand, Status, ThemeSwitch } from "../components/ui";
import { LinkCollection } from "../components/LinkCollection";
import { categoryLabel, defaultSettings, messageOf, viewLabels } from "../lib/model";
import type { DirectoryPage, PageQuery, PublicCategory, View } from "../lib/model";
import { applyTheme, readPreference, readTheme, writePreference } from "../lib/preferences";
import { cachedPage, isDemo, loadPage, pageKey } from "../lib/public-data";

const viewIcons = { cards: LayoutGrid, list: List, table: Table2 };
const viewKey = "loveshare-view";
const firstParams = new URLSearchParams(window.location.search);
const initialText = firstParams.get("q")?.slice(0, 100) ?? "";
const initialCategory = firstParams.get("category");
const initialPage = Number(firstParams.get("page"));
type Result = { key: string; data?: DirectoryPage; error?: string };

function CategoryFilters({ categories, total, selected, onSelect }: {
  categories: PublicCategory[];
  total: number;
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  return (
    <nav className="filters" aria-label="导航分类">
      <span className="filter-label">分类</span>
      <button className="filter" type="button" aria-pressed={selected === null} onClick={() => onSelect(null)}>
        <LayoutGrid size={17} aria-hidden="true" /><span>全部网站</span><small>{total}</small>
      </button>
      {categories.map((category) => (
        <button key={category.name} className="filter" type="button"
          aria-pressed={selected === category.name} onClick={() => onSelect(category.name)}>
          <Folder size={17} aria-hidden="true" /><span>{categoryLabel(category.name)}</span><small>{category.count}</small>
        </button>
      ))}
    </nav>
  );
}

export default function Directory() {
  const [text, setText] = useState(initialText);
  const [search, setSearch] = useState(initialText.trim());
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [page, setPage] = useState(Number.isInteger(initialPage) && initialPage > 0 ? Math.min(initialPage, 10_000) : 1);
  const [lastResult, setLastResult] = useState<DirectoryPage | undefined>(() => cachedPage({ text: initialText.trim(), category: initialCategory, page })?.data);
  const [result, setResult] = useState<Result>();
  const [retry, setRetry] = useState(0);
  const [viewChoice, setViewChoice] = useState(readPreference.bind(null, viewKey));
  const searchField = useRef<HTMLInputElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const query = useMemo<PageQuery>(() => ({ text: search, category, page }), [search, category, page]);
  const key = pageKey(query);
  const cached = useMemo(() => cachedPage(query), [query]);
  const matching = result?.key === key ? result : undefined;
  const data = matching?.data ?? cached?.data;
  const pending = !matching && !cached;
  const settings = data?.settings ?? lastResult?.settings ?? defaultSettings;
  const categories = data?.categories ?? lastResult?.categories ?? [];
  const activeCategory = categories.find((entry) => entry.name === category);
  const enabled = settings.enabled_views;
  const preference = enabled.find((view) => view === viewChoice);
  const categoryView = enabled.find((view) => view === activeCategory?.default_view);
  const view = preference ?? categoryView ?? settings.default_view;
  const total = data?.all_count ?? lastResult?.all_count ?? 0;
  const currentPage = data?.page ?? page;
  const lastPage = Math.max(1, Math.ceil((data?.count ?? 0) / settings.page_size));

  useEffect(() => {
    if (cached && !retry && Date.now() - cached.savedAt < 20_000) return;
    const controller = new AbortController();
    void loadPage(query, controller.signal).then((next) => {
      if (controller.signal.aborted) return;
      setResult({ key, data: next });
      setLastResult(next);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setResult({ key, error: messageOf(error, "无法加载导航，请重试。") });
    });
    return () => controller.abort();
  }, [cached, key, query, retry]);

  useEffect(() => {
    if (text.trim() === search) return;
    const timer = window.setTimeout(() => {
      setSearch(text.trim());
      setPage(1);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [text, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category !== null) params.set("category", category);
    if (currentPage > 1) params.set("page", String(currentPage));
    window.history.replaceState(null, "", params.size ? `?${params}` : "/");
  }, [category, currentPage, search]);

  useEffect(() => {
    document.title = settings.site_title;
    applyTheme(readTheme() ?? settings.theme);
  }, [settings.site_title, settings.theme]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target;
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"))) return;
      event.preventDefault();
      searchField.current?.focus();
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function updateCategory(next: string | null) {
    if (category === next) return;
    setCategory(next);
    setSearch(text.trim());
    setPage(1);
  }

  function changePage(next: number) {
    setPage(next);
    resultsHeading.current?.focus();
    resultsHeading.current?.scrollIntoView({ block: "start" });
  }

  function clearSearch() {
    setText("");
    setSearch("");
    setPage(1);
    searchField.current?.focus();
  }

  const filters = (
    <CategoryFilters categories={categories} total={total} selected={category} onSelect={updateCategory} />
  );

  return (
    <>
      <a className="skip-link" href="#directory">跳到导航列表</a>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand title={settings.site_title} />
          <div className="header-actions">
            {isDemo && <span className="demo-label">示例目录</span>}
            <ThemeSwitch defaultTheme={settings.theme} />
            <a className="button header-admin" href="/admin"><Settings2 size={16} aria-hidden="true" />管理后台</a>
          </div>
        </div>
      </header>

      <main className="shell directory-shell">
        <section className="hero" aria-label="网站搜索">
          <div className="hero-art" aria-hidden="true"><i /><i /><i /><b /><span /><em /></div>
          <div className="hero-content">
            <h1>{settings.site_title}</h1>
            {settings.site_description && <p>{settings.site_description}</p>}
            <form className="directory-search" role="search" onSubmit={(event) => {
              event.preventDefault();
              setSearch(text.trim());
              setPage(1);
            }}>
              <Search size={21} aria-hidden="true" />
              <input ref={searchField} value={text} maxLength={100} type="search" aria-label="搜索网站"
                placeholder="搜索名称、简介或网址" onChange={(event) => setText(event.target.value)} />
              {text ? (
                <button className="icon-button clear-search" type="button" aria-label="清除搜索" onClick={clearSearch}>
                  <X size={18} aria-hidden="true" />
                </button>
              ) : <kbd aria-hidden="true">/</kbd>}
            </form>
          </div>
        </section>

        {settings.category_display === "top" && <div className="filters-top">{filters}</div>}
        <div className={`directory-layout ${settings.category_display === "sidebar" ? "with-sidebar" : ""}`}>
          {settings.category_display === "sidebar" && <aside className="filter-sidebar">{filters}</aside>}

          <section className="directory-results" id="directory" aria-busy={pending}>
            <div className="results-bar">
              <div className="results-title">
                <h2 ref={resultsHeading} tabIndex={-1}>
                  {search ? "搜索结果" : category === null ? "全部网站" : categoryLabel(category)}
                </h2>
                {data && <span role="status">{data.count} 个网站</span>}
                {settings.category_display === "hidden" && category !== null && (
                  <button type="button" className="button compact" onClick={() => updateCategory(null)}>清除分类</button>
                )}
              </div>
              {enabled.length > 1 && (
                <div className="view-picker" role="group" aria-label="呈现方式">
                  {enabled.map((mode: View) => {
                    const Icon = viewIcons[mode];
                    return (
                      <button key={mode} type="button" aria-pressed={mode === view} aria-label={viewLabels[mode]}
                        title={viewLabels[mode]} onClick={() => {
                          setViewChoice(mode);
                          writePreference(viewKey, mode);
                        }}>
                        <Icon size={16} aria-hidden="true" /><span>{viewLabels[mode]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {pending && (
              <div className="skeleton-grid" role="status" aria-label="正在加载网站">
                <span /><span /><span />
              </div>
            )}
            {matching?.error && (
              <Status title={matching.error}
                description={cached ? "下面显示最近一次成功加载的目录。" : undefined}
                action={<button className="button" type="button" onClick={() => {
                  setResult(undefined);
                  setRetry((attempt) => attempt + 1);
                }}>重新加载</button>} />
            )}
            {data?.links.length ? (
              <LinkCollection items={data.links} settings={settings} view={view} showCategory={category === null} />
            ) : data && (
              <Status title={search || category !== null ? "没有找到匹配的网站" : "目录还没有网站"}
                description={search || category !== null ? "试试其他关键词，或查看全部网站。" : "登录管理后台添加第一个链接。"}
                action={search || category !== null
                  ? <button className="button" type="button" onClick={() => { clearSearch(); setCategory(null); }}>查看全部</button>
                  : <a href="/admin" className="button">进入管理后台</a>} />
            )}
            {data && lastPage > 1 && (
              <nav className="pagination" aria-label="目录分页">
                <button type="button" className="button compact" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>
                  <ArrowLeft size={16} aria-hidden="true" />上一页
                </button>
                <span>第 {currentPage} / {lastPage} 页</span>
                <button type="button" className="button compact" disabled={currentPage >= lastPage} onClick={() => changePage(currentPage + 1)}>
                  下一页<ArrowRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
          </section>
        </div>
        <footer className="site-footer">{settings.site_title}</footer>
      </main>
    </>
  );
}
