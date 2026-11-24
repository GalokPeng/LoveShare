import { useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDelete, Modal } from "../../components/Modal";
import { Status } from "../../components/ui";
import { useResource } from "../../hooks/useResource";
import { adminError, deleteCategory, getCategories, saveCategory } from "../../lib/admin-data";
import { viewLabels, views } from "../../lib/model";
import type { Category, View } from "../../lib/model";

function CategoryEditor({ category, onClose, onSave }: {
  category: Category | null; onClose: () => void; onSave: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) { setError("请输入分类名称。"); return; }
    setError("");
    setBusy(true);
    try {
      await saveCategory({
        name,
        sort_order: Number(data.get("sort_order")),
        default_view: (data.get("default_view") || null) as View | null,
      }, category?.name);
      onSave();
    } catch (failure) {
      setError(adminError(failure, "保存分类失败，请重试。"));
      setBusy(false);
    }
  }

  return (
    <Modal title={category ? "编辑分类" : "添加分类"} onClose={onClose} busy={busy}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="modal-body form-grid">
          <label className="field span-two">分类名称<input name="name" required defaultValue={category?.name ?? ""} /></label>
          <label className="field">排序值<input type="number" name="sort_order" min={-2147483648} max={2147483647}
            defaultValue={category?.sort_order ?? 0} required /></label>
          <label className="field">默认呈现方式<select name="default_view" defaultValue={category?.default_view ?? ""}>
            <option value="">跟随全站</option>
            {views.map((view) => <option key={view} value={view}>{viewLabels[view]}</option>)}
          </select></label>
          <p className="field-help span-two">排序值越小越靠前。分类可优先使用全站已启用的呈现方式。</p>
          {error && <p className="error-message span-two" role="alert">{error}</p>}
        </div>
        <footer className="form-actions">
          <button type="button" className="button" disabled={busy} onClick={onClose}>取消</button>
          <button type="submit" className="button primary" disabled={busy}>{busy ? "正在保存…" : "保存分类"}</button>
        </footer>
      </form>
    </Modal>
  );
}

export function AdminCategories() {
  const categories = useResource(getCategories);
  const [editor, setEditor] = useState<{ category: Category | null }>();
  const [removing, setRemoving] = useState<Category>();
  const [notice, setNotice] = useState("");

  return (
    <>
      <header className="admin-heading">
        <div><h1>分类管理</h1><p>调整分类顺序和每个分类的默认视图。</p></div>
        <button className="button primary" type="button" onClick={() => {
          setNotice("");
          setEditor({ category: null });
        }}><Plus size={18} aria-hidden="true" />添加分类</button>
      </header>
      {notice && <p className="success-message" role="status">{notice}</p>}
      <section className="admin-panel">
        {categories.loading && <Status title="正在加载分类…" loading />}
        {categories.error && <Status title={categories.error} action={
          <button type="button" className="button" onClick={categories.reload}>重新加载</button>
        } />}
        {categories.data?.length === 0 && <Status title="还没有分类" description="添加分类后，可以在编辑链接时为网站归类。" />}
        {Boolean(categories.data?.length) && (
          <div className="table-scroll">
            <table className="data-table admin-table">
              <thead><tr><th scope="col">分类</th><th scope="col">排序</th><th scope="col">默认呈现方式</th><th scope="col">操作</th></tr></thead>
              <tbody>
                {categories.data?.map((category) => (
                  <tr key={category.name}>
                    <td><strong>{category.name}</strong></td><td>{category.sort_order}</td>
                    <td>{category.default_view ? viewLabels[category.default_view] : "跟随全站"}</td>
                    <td>
                      <div className="button-row">
                        <button type="button" className="icon-button" title="编辑" aria-label={`编辑 ${category.name}`}
                          onClick={() => { setNotice(""); setEditor({ category }); }}><Pencil size={16} aria-hidden="true" /></button>
                        <button type="button" className="icon-button delete-icon" title="删除" aria-label={`删除 ${category.name}`}
                          onClick={() => { setNotice(""); setRemoving(category); }}><Trash2 size={16} aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editor && <CategoryEditor category={editor.category} onClose={() => setEditor(undefined)} onSave={() => {
        setNotice(editor.category ? "分类已保存。" : "分类已添加。");
        setEditor(undefined);
        categories.reload();
      }} />}
      {removing && <ConfirmDelete title="删除分类" description={`删除「${removing.name}」后，该分类内的网站将移到「未分类」。`}
        onDelete={() => deleteCategory(removing.name)} onClose={() => setRemoving(undefined)} onSuccess={() => {
          setRemoving(undefined);
          setNotice("分类已删除，网站已移到「未分类」。");
          categories.reload();
        }} />}
    </>
  );
}
