import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'Cache-Control': `s-maxage=${parseInt(import.meta.env.VITE_CACHE_DURATION || "3600")}, stale-while-revalidate=${parseInt(import.meta.env.VITE_CACHE_DURATION || "3600") * 2}`,
      'Vercel-CDN-Cache-Control': `s-maxage=${parseInt(import.meta.env.VITE_CACHE_DURATION || "3600")}, stale-while-revalidate=${parseInt(import.meta.env.VITE_CACHE_DURATION || "3600") * 2}`,
    },
  },
});

export default supabase;
