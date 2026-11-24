const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)?.trim();

export const supabaseConfig = url && key && /^https?:\/\//i.test(url) && URL.canParse(url)
  ? { url: url.replace(/\/+$/, ""), key }
  : null;

export const needsDatabaseSetup = Boolean(url || key) && !supabaseConfig;
