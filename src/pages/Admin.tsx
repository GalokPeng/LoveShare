import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowUpRight, Folder, Link2, LogOut, PanelTop, Settings2, ShieldCheck } from "lucide-react";
import { Brand, Status, ThemeSwitch } from "../components/ui";
import { adminClient, adminError, canManage } from "../lib/admin-data";
import { defaultSettings } from "../lib/model";
import { applyTheme, readTheme } from "../lib/preferences";
import { AdminLinks } from "./admin/AdminLinks";
import { AdminCategories } from "./admin/AdminCategories";
import { AdminSettings } from "./admin/AdminSettings";
import "./admin.css";

const sections = [
  { id: "links", label: "链接管理", href: "/admin/links", icon: Link2 },
  { id: "categories", label: "分类管理", href: "/admin/categories", icon: Folder },
  { id: "settings", label: "呈现设置", href: "/admin/settings", icon: Settings2 },
] as const;
type Section = (typeof sections)[number]["id"];
const pathSection = window.location.pathname.split("/")[2];
const initialSection = sections.find((section) => section.id === pathSection)?.id ?? "links";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminClient) return;
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await adminClient.auth.signInWithPassword({ email: email.trim(), password });
      if (failure) {
        setError(failure.code === "invalid_credentials"
          ? "邮箱或密码有误，请检查后重试。"
          : adminError(failure, "登录失败，请重试。"));
      }
    } catch (failure) {
      setError(adminError(failure, "登录失败，请重试。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-panel">
      <span className="section-icon"><ShieldCheck size={25} aria-hidden="true" /></span>
      <h1>登录管理后台</h1>
      <p>使用你的 Supabase 管理员账号登录。</p>
      <form className="login-form" onSubmit={(event) => void submit(event)}>
        <label className="field">邮箱<input type="email" autoComplete="username" required value={email}
          onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field">密码<input type="password" autoComplete="current-password" required value={password}
          onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button type="submit" className="button primary" disabled={busy}>{busy ? "正在登录…" : "登录"}</button>
      </form>
    </section>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>();
  const [permission, setPermission] = useState<{ id: string; allowed?: boolean; error?: string }>();
  const [retry, setRetry] = useState(0);
  const [signOutError, setSignOutError] = useState("");
  const [section, setSection] = useState<Section>(initialSection);
  const userId = session?.user.id;

  useEffect(() => {
    document.title = "管理后台 · LoveShare 导航";
    applyTheme(readTheme() ?? defaultSettings.theme);

    function syncSection() {
      const name = window.location.pathname.split("/")[2];
      setSection(sections.find((item) => item.id === name)?.id ?? "links");
    }

    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  useEffect(() => {
    if (!adminClient) return;
    const { data } = adminClient.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void canManage(controller.signal).then((allowed) => {
      if (!controller.signal.aborted) setPermission({ id: userId, allowed });
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) {
        setPermission({ id: userId, error: adminError(failure, "无法验证管理员权限。") });
      }
    });
    return () => controller.abort();
  }, [userId, retry]);

  async function signOut() {
    if (!adminClient) return;
    setSignOutError("");
    try {
      const { error } = await adminClient.auth.signOut({ scope: "local" });
      if (error) throw error;
      setPermission(undefined);
    } catch (error) {
      setSignOutError(adminError(error, "退出失败，请重试。"));
    }
  }

  const currentPermission = permission?.id === userId ? permission : undefined;

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand title={defaultSettings.site_title} />
          <div className="header-actions">
            <ThemeSwitch defaultTheme={defaultSettings.theme} />
            <a className="button header-admin" href="/"><PanelTop size={16} aria-hidden="true" />查看导航</a>
          </div>
        </div>
      </header>
      {!adminClient && (
        <main className="shell">
          <Status title="配置 Supabase 后即可管理导航"
            description="在 Supabase SQL Editor 执行 supabase/schema.sql，设置项目 URL 和 Publishable Key，并添加管理员账号。" />
        </main>
      )}
      {adminClient && session === undefined && <main className="shell"><Status title="正在恢复登录…" loading /></main>}
      {adminClient && session === null && <main className="shell login-shell"><Login /></main>}

      {session && !currentPermission && <main className="shell"><Status title="正在验证管理员权限…" loading /></main>}
      {session && currentPermission && !currentPermission.allowed && (
        <main className="shell">
          <Status title={currentPermission.error || "这个账号还没有管理权限"}
            description={currentPermission.error ? undefined : "请将当前账号的用户 ID 加入 navigation_admins 表。"}
            action={<div className="button-row">
              {currentPermission.error && <button type="button" className="button" onClick={() => {
                setPermission(undefined);
                setRetry((count) => count + 1);
              }}>重试</button>}
              <button type="button" className="button" onClick={() => void signOut()}>退出登录</button>
            </div>} />
          {signOutError && <p className="error-message" role="alert">{signOutError}</p>}
        </main>
      )}

      {session && currentPermission?.allowed && (
        <main className="shell admin-shell">
          <aside className="admin-sidebar">
            <nav aria-label="后台菜单">
              {sections.map(({ id, label, href, icon: Icon }) => (
                <a key={id} href={href} aria-current={section === id ? "page" : undefined} onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  if (section !== id) {
                    window.history.pushState(null, "", href);
                    setSection(id);
                  }
                }}><Icon size={18} aria-hidden="true" />{label}</a>
              ))}
            </nav>
            <div className="admin-account">
              <span title={session.user.email}>{session.user.email}</span>
              <button type="button" className="icon-button" aria-label="退出登录" title="退出登录" onClick={() => void signOut()}>
                <LogOut size={17} aria-hidden="true" />
              </button>
            </div>
          </aside>
          <div className="admin-content">
            {signOutError && <p className="error-message" role="alert">{signOutError}</p>}
            {section === "links" && <AdminLinks />}
            {section === "categories" && <AdminCategories />}
            {section === "settings" && <AdminSettings />}
            <a className="admin-back" href="/">打开公开导航<ArrowUpRight size={14} aria-hidden="true" /></a>
          </div>
        </main>
      )}
    </>
  );
}
