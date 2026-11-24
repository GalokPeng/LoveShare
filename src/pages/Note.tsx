import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brand, LinkIcon, Status } from "../components/ui";
import { categoryLabel, defaultSettings, linkTitle, messageOf, safeUrl } from "../lib/model";
import type { DirectoryNote } from "../lib/model";
import { applyTheme, readTheme } from "../lib/preferences";
import { loadNote } from "../lib/public-data";

export default function Note({ slug }: { slug: string }) {
  const [note, setNote] = useState<DirectoryNote | null>();
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void loadNote(slug, controller.signal).then((next) => {
      if (controller.signal.aborted) return;
      setNote(next);
      if (next) {
        document.title = `${linkTitle(next.title)} · ${next.site_title}`;
        applyTheme(readTheme() ?? next.theme);
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setFailure(messageOf(error, "无法读取站内说明。"));
    });
    return () => controller.abort();
  }, [slug, retry]);

  const destination = safeUrl(note?.to_link)?.href;

  return (
    <>
      <header className="site-header"><div className="shell header-inner"><Brand title={note?.site_title ?? defaultSettings.site_title} /></div></header>
      <main className="shell note-shell">
        <a className="button" href="/"><ArrowLeft size={17} aria-hidden="true" />返回导航</a>
        {failure && <Status title={failure} action={<button type="button" className="button" onClick={() => {
          setFailure("");
          setRetry((count) => count + 1);
        }}>重新加载</button>} />}
        {!failure && note === undefined && <Status title="正在读取说明…" loading />}
        {note === null && <Status title="找不到这条站内说明" />}
        {note && (
          <article className="note">
            <header>
              <LinkIcon title={linkTitle(note.title)} image={note.img} />
              <div><span className="category-tag">{categoryLabel(note.obj)}</span><h1>{linkTitle(note.title)}</h1></div>
            </header>
            {note.abstract && <p className="note-summary">{note.abstract}</p>}
            {note.article && <div className="markdown"><Markdown remarkPlugins={[remarkGfm]}>{note.article}</Markdown></div>}
            {destination && <a className="button primary" href={destination}
              target={note.open_in_new_tab ? "_blank" : undefined} rel={note.open_in_new_tab ? "noopener noreferrer" : undefined}>
              访问网站<ArrowUpRight size={17} aria-hidden="true" />
            </a>}
          </article>
        )}
      </main>
    </>
  );
}
