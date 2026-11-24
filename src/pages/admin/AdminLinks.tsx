import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";
import { ConfirmDelete, Modal } from "../../components/Modal";
import { LinkIcon, Status } from "../../components/ui";
import { useResource } from "../../hooks/useResource";
import { adminError, adminLinks, adminPageSize, deleteLink, getCategories, getLinkArticle, saveLink } from "../../lib/admin-data";
import { categoryLabel, linkDomain, linkTitle, safeUrl } from "../../lib/model";
import type { Category, LinkDraft, ManagedLink } from "../../lib/model";

function LinkForm({ link, categories, article, onClose, onSave }: {
  link: ManagedLink | null; categories: Category[]; article: string | null;
  onClose: () => void; onSave: () => void;
}) {
  const [toNote, setToNote] = useState(link?.to_article === true);
  const [articleText, setArticleText] = useState(article ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    const title = value("title");
    const url = value("to_link");
    const image = value("img");
    if (!title) { setError("请输入网站名称。"); return; }
    if ((!toNote || url) && !safeUrl(url)) { setError("请输入有效的 HTTP 或 HTTPS 链接。"); return; }
    if (image && !safeUrl(image)) { setError("请输入有效的 HTTP 或 HTTPS 图标地址。"); return; }
    if (toNote && !articleText.trim() && !url) { setError("请输入站内说明正文或网站链接。"); return; }
    const draft: LinkDraft = {
      title,
      abstract: value("abstract") || null,
      img: image || null,
      to_link: url || null,
      obj: value("obj") || null,
      to_article: toNote,
      article: articleText.trim() || null,
      sort_order: Number(value("sort_order")),
      is_pinned: data.has("is_pinned"),
      is_published: data.has("is_published"),
    };
    setError("");
    setBusy(true);
    try {
      await saveLink(draft, link?.id);
      onSave();
    } catch (failure) {
      setError(adminError(failure, "保存失败，请重试。"));
      setBusy(false);
    }
  }

  return (
    <Modal title={link ? "编辑链接" : "添加链接"} onClose={onClose} busy={busy}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="modal-body form-grid">
          <label className="field span-two">网站名称<input name="title" required defaultValue={link?.title ?? ""} /></label>
          <label className="field">分类<select name="obj" defaultValue={link?.obj ?? ""}>
            <option value="">未分类</option>
            {categories.map((category) => <option key={category.name}>{category.name}</option>)}
          </select></label>
          <label className="field">排序值<input type="number" name="sort_order" min={-2147483648} max={2147483647}
            defaultValue={link?.sort_order ?? 0} required /><small className="field-help">数值越小越靠前，置顶优先。</small></label>
          <label className="field span-two">打开方式
            <select value={toNote ? "note" : "external"} onChange={(event) => setToNote(event.target.value === "note")}>
              <option value="external">直接访问网站</option><option value="note">先查看站内说明</option>
            </select>
          </label>
          <label className="field span-two">网站链接<input name="to_link" type="url" placeholder="https://"
            required={!toNote} defaultValue={link?.to_link ?? ""} /></label>
          <label className="field span-two">图标地址（可选）<input name="img" type="url"
            placeholder="https://" defaultValue={link?.img ?? ""} /></label>
          <label className="field span-two">简介（可选）<textarea name="abstract" rows={2} defaultValue={link?.abstract ?? ""} /></label>
          {toNote && <label className="field span-two">站内说明正文（支持 Markdown）
            <textarea rows={6} value={articleText} onChange={(event) => setArticleText(event.target.value)} />
          </label>}
          <div className="button-row span-two">
            <label className="check"><input type="checkbox" name="is_published" defaultChecked={link?.is_published ?? true} />公开展示</label>
            <label className="check"><input type="checkbox" name="is_pinned" defaultChecked={link?.is_pinned ?? false} />置顶</label>
          </div>
          {error && <p className="error-message span-two" role="alert">{error}</p>}
        </div>
        <footer className="form-actions">
          <button type="button" className="button" disabled={busy} onClick={onClose}>取消</button>
          <button type="submit" className="button primary" disabled={busy}>{busy ? "正在保存…" : "保存链接"}</button>
        </footer>
      </form>
    </Modal>
  );
}

function LinkEditor({ link, categories, onClose, onSave }: {
  link: ManagedLink | null; categories: Category[]; onClose: () => void; onSave: () => void;
}) {
  const request = useCallback((signal: AbortSignal) => (
    link ? getLinkArticle(link.id, signal) : Promise.resolve(null)
  ), [link]);
  const article = useResource(request);

  if (!link || article.data !== undefined) {
    return <LinkForm link={link} categories={categories} article={article.data ?? null} onClose={onClose} onSave={onSave} />;
  }

  return (
    <Modal title="编辑链接" onClose={onClose}>
      <Status title={article.error || "正在读取链接…"} loading={article.loading} action={article.error && (
        <button type="button" className="button" onClick={article.reload}>重试</button>
      )} />
    </Modal>
  );
}

export function AdminLinks() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState({ text: "", category: null as string | null, visibility: "", page: 1 });
  const [editor, setEditor] = useState<{ link: ManagedLink | null }>();
  const [removing, setRemoving] = useState<ManagedLink>();
  const [notice, setNotice] = useState("");
  const categories = useResource(getCategories);
  const request = useCallback((signal: AbortSignal) => adminLinks(query, signal), [query]);
  const links = useResource(request);
  const pageCount = Math.max(1, Math.ceil((links.data?.count ?? 0) / adminPageSize));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = text.trim();
      setQuery((current) => current.text === next ? current : { ...current, text: next, page: 1 });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [text]);

  function changePage(next: number) {
    setQuery((current) => ({ ...current, page: next }));
  }

  function confirmSaved() {
    setNotice(editor?.link ? "链接已保存。" : "链接已添加。");
    if (!editor?.link && query.page > 1) changePage(1);
    else links.reload();
    setEditor(undefined);
  }

  return (
    <>
      <header className="admin-heading">
        <div><h1>链接管理</h1><p>添加网站，维护分类、排序和公开状态。</p></div>
        <button className="button primary" type="button" disabled={!categories.data} onClick={() => {
          setNotice("");
          setEditor({ link: null });
        }}><Plus size={18} aria-hidden="true" />添加链接</button>
      </header>
      {notice && <p className="success-message" role="status">{notice}</p>}
      {categories.error && <Status title={categories.error} action={
        <button type="button" className="button" onClick={categories.reload}>重试加载分类</button>
      } />}
      <section className="admin-panel">
        <div className="admin-filters">
          <label className="admin-search"><Search size={17} aria-hidden="true" />
            <input type="search" aria-label="搜索链接名称" placeholder="搜索链接名称" value={text}
              onChange={(event) => setText(event.target.value)} />
          </label>
          <select aria-label="筛选分类" value={query.category === null ? "" : `category:${query.category}`} onChange={(event) => {
            const category = event.target.value ? event.target.value.slice("category:".length) : null;
            setQuery((current) => ({ ...current, category, page: 1 }));
          }}>
            <option value="">全部分类</option><option value="category:">未分类</option>
            {categories.data?.map((category) => <option value={`category:${category.name}`} key={category.name}>{category.name}</option>)}
          </select>
          <select aria-label="筛选公开状态" value={query.visibility} onChange={(event) => {
            const visibility = event.target.value;
            setQuery((current) => ({ ...current, visibility, page: 1 }));
          }}>
            <option value="">全部状态</option><option value="published">已公开</option><option value="draft">未公开</option>
          </select>
          {links.data && <span className="muted">共 {links.data.count} 条</span>}
        </div>
        {links.loading && <Status title="正在加载链接…" loading />}
        {links.error && <Status title={links.error} action={
          <button type="button" className="button" onClick={links.reload}>重新加载</button>
        } />}
        {links.data?.rows.length === 0 && <Status title="没有匹配的链接"
          description="调整筛选条件，或添加一个新链接。"
          action={query.page > 1 ? <button type="button" className="button" onClick={() => changePage(1)}>返回第一页</button> : undefined} />}
        {links.data && links.data.rows.length > 0 && (
          <div className="table-scroll">
            <table className="data-table admin-table">
              <thead><tr><th scope="col">网站</th><th scope="col">分类</th><th scope="col">状态</th><th scope="col">排序</th><th scope="col">操作</th></tr></thead>
              <tbody>
                {links.data.rows.map((link) => {
                  const title = linkTitle(link.title);
                  const destination = safeUrl(link.to_link)?.href;
                  return (
                    <tr key={link.id}>
                      <td>
                        <div className="admin-link">
                          <LinkIcon title={title} image={link.img} />
                          <div>
                            <strong>{title}{link.is_pinned && <Pin size={12} aria-label="置顶" />}</strong>
                            {destination && <a href={destination} target="_blank" rel="noopener noreferrer">
                              {linkDomain(link.to_link)}<ArrowUpRight size={12} aria-hidden="true" />
                            </a>}
                          </div>
                        </div>
                      </td>
                      <td>{categoryLabel(link.obj)}</td>
                      <td><span className={`state-label ${link.is_published ? "published" : ""}`}>{link.is_published ? "已公开" : "未公开"}</span></td>
                      <td>{link.sort_order}</td>
                      <td>
                        <div className="button-row">
                          <button type="button" className="icon-button" title="编辑" aria-label={`编辑 ${title}`}
                            disabled={!categories.data} onClick={() => { setNotice(""); setEditor({ link }); }}>
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button type="button" className="icon-button delete-icon" title="删除" aria-label={`删除 ${title}`}
                            onClick={() => { setNotice(""); setRemoving(link); }}>
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {links.data && pageCount > 1 && (
          <nav aria-label="后台分页" className="pagination">
            <button type="button" className="button compact" disabled={query.page <= 1} onClick={() => changePage(query.page - 1)}>
              <ArrowLeft size={16} aria-hidden="true" />上一页
            </button>
            <span>第 {query.page} / {pageCount} 页</span>
            <button type="button" className="button compact" disabled={query.page >= pageCount} onClick={() => changePage(query.page + 1)}>
              下一页<ArrowRight size={16} aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>
      {editor && categories.data && <LinkEditor link={editor.link} categories={categories.data}
        onClose={() => setEditor(undefined)} onSave={confirmSaved} />}
      {removing && <ConfirmDelete title="删除链接" description={`确认删除「${linkTitle(removing.title)}」？`}
        onDelete={() => deleteLink(removing.id)} onClose={() => setRemoving(undefined)} onSuccess={() => {
          setRemoving(undefined);
          setNotice("链接已删除。");
          if (links.data?.rows.length === 1 && query.page > 1) changePage(query.page - 1);
          else links.reload();
        }} />}
    </>
  );
}
