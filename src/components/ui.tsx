import { useState } from "react";
import type { ReactNode } from "react";
import { Compass, Link2, LoaderCircle, Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, readTheme, themeKey, writePreference } from "../lib/preferences";
import { safeUrl } from "../lib/model";
import type { Theme } from "../lib/model";

export function Brand({ title }: { title: string }) {
  return (
    <a className="brand" href="/">
      <span className="brand-mark"><Compass size={22} aria-hidden="true" /></span>
      <span>{title}</span>
    </a>
  );
}

export function ThemeSwitch({ defaultTheme }: { defaultTheme: Theme }) {
  const [selection, setSelection] = useState(readTheme);
  const theme = selection ?? defaultTheme;
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const label = { system: "跟随系统", light: "浅色", dark: "深色" };

  return (
    <button className="icon-button" type="button" aria-label={`切换到${label[next]}主题`}
      title={`当前主题：${label[theme]}`}
      onClick={() => {
        setSelection(next);
        applyTheme(next);
        writePreference(themeKey, next);
      }}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export function Status({ title, description, action, loading = false }: {
  title: string; description?: string; action?: ReactNode; loading?: boolean;
}) {
  return (
    <div className="status" role="status">
      {loading && <LoaderCircle size={24} className="spinner" aria-hidden="true" />}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function LinkIcon({ title, image, identity = title }: { title: string; image?: string | null; identity?: string }) {
  const src = safeUrl(image)?.href;
  const [failed, setFailed] = useState<string>();
  const tones = ["blue", "green", "orchid", "orange", "red", "slate"];
  const token = Array.from(identity).reduce((hash, character) => hash + (character.codePointAt(0) ?? 0), 0);
  const letter = Array.from(title.trim())[0]?.toUpperCase();

  return (
    <span className={`link-icon tone-${tones[token % tones.length]}`} aria-hidden="true">
      {letter || <Link2 size={19} />}
      {src && src !== failed && (
        <img src={src} alt="" width="40" height="40" loading="lazy" decoding="async"
          referrerPolicy="no-referrer" onError={() => setFailed(src)} />
      )}
    </span>
  );
}
