import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Eye, LayoutGrid, List, Table2 } from "lucide-react";
import { LinkCollection } from "../../components/LinkCollection";
import { Status } from "../../components/ui";
import { useResource } from "../../hooks/useResource";
import { adminError, getPreviewLinks, getSettings, saveSettings } from "../../lib/admin-data";
import { demoPage } from "../../lib/demo";
import { viewLabels, views } from "../../lib/model";
import type { Settings, Theme, View } from "../../lib/model";

const icons = { cards: LayoutGrid, list: List, table: Table2 };
const sample = demoPage({ text: "", category: null, page: 1 }).links.slice(0, 3);
const toggleFields = [
  { key: "show_icons", label: "显示网站图标" },
  { key: "show_description", label: "显示网站简介" },
  { key: "show_domain", label: "显示网站域名" },
  { key: "open_in_new_tab", label: "在新标签页打开外部链接" },
] as const;

function SettingsForm({ initial }: { initial: Settings }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [previewChoice, setPreviewChoice] = useState<View>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const preview = useResource(getPreviewLinks);
  const previewView = previewChoice && draft.enabled_views.includes(previewChoice) ? previewChoice : draft.default_view;
  const previewItems = preview.data?.length ? preview.data : sample;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function toggleView(view: View) {
    setDraft((current) => {
      const selected = current.enabled_views.includes(view);
      const enabled = views.filter((item) => item === view ? !selected : current.enabled_views.includes(item));
      if (!enabled.length) return current;
      return {
        ...current,
        enabled_views: enabled,
        default_view: enabled.includes(current.default_view) ? current.default_view : enabled[0],
      };
    });
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...draft, site_title: draft.site_title.trim(), site_description: draft.site_description.trim() };
    if (!next.site_title) { setError("请输入站点名称。"); return; }
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await saveSettings(next);
      setSaved(next);
      setDraft(next);
      setNotice("呈现设置已保存。");
    } catch (failure) {
      setError(adminError(failure, "保存设置失败，请重试。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="settings-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="admin-panel settings-section" disabled={busy}>
          <legend>站点信息</legend>
          <div className="form-grid">
            <label className="field">站点名称<input value={draft.site_title} maxLength={60} required
              onChange={(event) => change("site_title", event.target.value)} /></label>
            <label className="field">默认主题<select value={draft.theme} onChange={(event) => change("theme", event.target.value as Theme)}>
              <option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option>
            </select></label>
            <label className="field span-two">站点简介<textarea value={draft.site_description} rows={2} maxLength={240}
              onChange={(event) => change("site_description", event.target.value)} /></label>
          </div>
        </fieldset>

        <fieldset className="admin-panel settings-section" disabled={busy}>
          <legend>目录布局</legend>
          <p className="field-help">选择访客可以使用的视图，至少启用一种。</p>
          <div className="mode-options" role="group" aria-label="启用的呈现方式">
            {views.map((view) => {
              const selected = draft.enabled_views.includes(view);
              const Icon = icons[view];
              return <label className="mode-choice" key={view}>
                <input type="checkbox" checked={selected} disabled={selected && draft.enabled_views.length === 1}
                  onChange={() => toggleView(view)} />
                <Icon size={21} aria-hidden="true" /><span>{viewLabels[view]}</span>
                {selected && <Check size={17} className="mode-check" aria-hidden="true" />}
              </label>;
            })}
          </div>

          <div className="form-grid">
            <label className="field">默认呈现方式<select value={draft.default_view}
              onChange={(event) => change("default_view", event.target.value as View)}>
              {draft.enabled_views.map((view) => <option key={view} value={view}>{viewLabels[view]}</option>)}
            </select></label>
            <label className="field">分类入口<select value={draft.category_display}
              onChange={(event) => change("category_display", event.target.value as Settings["category_display"])}>
              <option value="sidebar">侧边栏</option><option value="top">顶部横排</option><option value="hidden">隐藏筛选入口</option>
            </select></label>
            <label className="field">每页网站数量<select value={draft.page_size}
              onChange={(event) => change("page_size", Number(event.target.value))}>
              {[12, 24, 36, 60].map((count) => <option key={count} value={count}>{count}</option>)}
            </select></label>
          </div>

          <div className="settings-toggles">
            {toggleFields.map(({ key, label }) => <label className="check" key={key}>
              <input type="checkbox" checked={draft[key]} onChange={(event) => change(key, event.target.checked)} />{label}
            </label>)}
          </div>
        </fieldset>

        <div className="settings-actions">
          {error && <p className="error-message" role="alert">{error}</p>}
          {notice && <p className="success-message" role="status">{notice}</p>}
          <button type="submit" className="button primary" disabled={busy || !dirty}>
            {busy ? "正在保存…" : "保存设置"}
          </button>
        </div>
      </form>

      <section className="admin-panel preview-panel" aria-labelledby="preview-heading">
        <div className="preview-header">
          <h2 id="preview-heading"><Eye size={19} aria-hidden="true" />目录预览</h2>
          <div className="view-picker" role="group" aria-label="预览呈现方式">
            {draft.enabled_views.map((mode) => <button key={mode} type="button" aria-pressed={mode === previewView}
              onClick={() => setPreviewChoice(mode)}>{viewLabels[mode]}</button>)}
          </div>
        </div>
        <div inert>
          <LinkCollection items={previewItems} settings={draft} view={previewView} showCategory />
        </div>
      </section>
    </>
  );
}

export function AdminSettings() {
  const settings = useResource(getSettings);
  return (
    <>
      <header className="admin-heading">
        <div><h1>呈现设置</h1><p>调整访客看到的目录布局和站点信息。</p></div>
      </header>
      {settings.loading && <Status title="正在加载设置…" loading />}
      {settings.error && <Status title={settings.error} action={
        <button className="button" type="button" onClick={settings.reload}>重新加载</button>
      } />}
      {settings.data && <SettingsForm initial={settings.data} />}
    </>
  );
}
