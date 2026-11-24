import type { ReactNode } from "react";
import { ArrowUpRight, ChevronRight, Pin } from "lucide-react";
import { categoryLabel, linkDomain, linkTitle, safeUrl } from "../lib/model";
import type { LinkSummary, Settings, View } from "../lib/model";
import { LinkIcon } from "./ui";

function LinkTarget({ item, settings, children, className }: {
  item: LinkSummary; settings: Settings; children: ReactNode; className: string;
}) {
  const note = item.to_article && item.slug;
  const href = note ? `/article/${encodeURIComponent(note)}` : safeUrl(item.to_link)?.href;

  if (!href) return <div className={`${className} unavailable`}>{children}</div>;

  const blank = !note && settings.open_in_new_tab;
  return (
    <a className={className} href={href} target={blank ? "_blank" : undefined}
      rel={blank ? "noopener noreferrer" : undefined}>
      {children}
    </a>
  );
}

function Destination({ item }: { item: LinkSummary }) {
  if (item.to_article && item.slug) return <ChevronRight size={17} aria-hidden="true" />;
  if (safeUrl(item.to_link)) return <ArrowUpRight size={17} aria-hidden="true" />;
  return <small>地址待补充</small>;
}

function LinkName({ item, settings }: { item: LinkSummary; settings: Settings }) {
  const title = linkTitle(item.title);
  return (
    <>
      {settings.show_icons && <LinkIcon title={title} image={item.img} />}
      <span className="link-title">{title}</span>
      {item.is_pinned && <Pin className="link-pin" size={13} aria-label="置顶" />}
    </>
  );
}

export function LinkCollection({ items, settings, view, showCategory }: {
  items: LinkSummary[]; settings: Settings; view: View; showCategory: boolean;
}) {
  if (view === "table") {
    return (
      <div className="table-scroll">
        <table className="data-table link-table">
          <thead><tr>
            <th scope="col">网站</th>
            {settings.show_description && <th scope="col">简介</th>}
            {showCategory && <th scope="col">分类</th>}
            {settings.show_domain && <th scope="col">域名</th>}
          </tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <LinkTarget item={item} settings={settings} className="table-link">
                    <LinkName item={item} settings={settings} />
                    <Destination item={item} />
                  </LinkTarget>
                </td>
                {settings.show_description && <td>{item.abstract || "—"}</td>}
                {showCategory && <td>{categoryLabel(item.obj)}</td>}
                {settings.show_domain && <td>{(item.to_article && item.slug ? "站内" : linkDomain(item.to_link)) || "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ul className={`link-collection ${view}`}>
      {items.map((item) => {
        const domain = item.to_article && item.slug ? "站内说明" : linkDomain(item.to_link);
        return (
          <li key={item.id}>
            <LinkTarget item={item} settings={settings} className="link-entry">
              <span className="link-name"><LinkName item={item} settings={settings} /></span>
              {settings.show_description && item.abstract && <span className="link-description">{item.abstract}</span>}
              {(settings.show_domain && domain || showCategory) && (
                <span className="link-meta">
                  {settings.show_domain && domain && <span>{domain}</span>}
                  {showCategory && <span className="category-tag">{categoryLabel(item.obj)}</span>}
                </span>
              )}
              <span className="link-destination"><Destination item={item} /></span>
            </LinkTarget>
          </li>
        );
      })}
    </ul>
  );
}
