import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Status } from "./components/ui";
import Directory from "./pages/Directory";
import "./index.css";

const Admin = lazy(() => import("./pages/Admin"));
const Note = lazy(() => import("./pages/Note"));
const path = window.location.pathname.replace(/\/$/, "") || "/";
const note = /^\/article\/([\w-]+)(?:\.html)?$/.exec(path);

const page = path === "/" ? <Directory /> :
  /^\/admin(?:\/(links|categories|settings))?$/.test(path) ? <Admin /> :
  note ? <Note slug={note[1]} /> :
  <Status title="找不到这个页面" action={<a className="button primary" href="/">返回导航</a>} />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<Status title="正在加载…" loading />}>{page}</Suspense>
  </StrictMode>,
);
