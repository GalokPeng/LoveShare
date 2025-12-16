import { createClient } from "@supabase/supabase-js";

export default async function handler(req: Request) {
  try {
    // 1. 服务端读取 Vercel 环境变量（不再用 import.meta.env，改用 process.env）
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    const cacheDuration = parseInt(process.env.CACHE_DURATION || "3600");

    // 校验配置
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase 配置缺失" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. 服务端初始化 Supabase 客户端（复用你的缓存头逻辑）
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          "Cache-Control": `s-maxage=${cacheDuration}, stale-while-revalidate=${
            cacheDuration * 2
          }`,
          "Vercel-CDN-Cache-Control": `s-maxage=${cacheDuration}, stale-while-revalidate=${
            cacheDuration * 2
          }`,
        },
      },
    });

    // 3. 解析请求参数
    const { method, url } = req;
    // 在 Vercel Node.js 运行时中，req.url 是完整的 URL
    // 在 Vercel 边缘函数中，req.url 只包含路径和查询参数
    // 使用 URL 对象来可靠地解析查询参数
    let searchParams;
    try {
      // 尝试解析完整 URL
      const urlObj = new URL(url);
      searchParams = urlObj.searchParams;
    } catch {
      // 如果解析失败，尝试解析路径和查询参数
      const queryString = url.split("?")[1] || "";
      searchParams = new URLSearchParams(queryString);
    }
    const tableName = searchParams.get("table") || "";
    const select = searchParams.get("select") || "*";
    const eq = searchParams.get("eq") || "";
    const eqValue = searchParams.get("eqValue") || "";
    const count = searchParams.get("count") || "";
    const rangeStart = searchParams.get("rangeStart");
    const rangeEnd = searchParams.get("rangeEnd");
    const or = searchParams.get("or") || "";
    const categoryTable = searchParams.get("categoryTable") || "";

    // 4. 构建查询
    let queryBuilder: any = supabase
      .from(tableName || categoryTable)
      .select(select, count ? { count: count as "exact" } : {});

    // 添加等于过滤
    if (eq && eqValue) {
      queryBuilder = queryBuilder.eq(eq, eqValue);
    }

    // 添加 OR 过滤
    if (or) {
      queryBuilder = queryBuilder.or(or);
    }

    // 添加范围过滤（分页）
    if (rangeStart !== null && rangeEnd !== null) {
      queryBuilder = queryBuilder.range(
        parseInt(rangeStart),
        parseInt(rangeEnd)
      );
    }

    // 5. 执行查询
    const { data, error, count: resultCount } = await queryBuilder;

    if (error) throw error;

    // 6. 返回数据给前端
    return new Response(JSON.stringify({ data, count: resultCount }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // 透传缓存头（和你原逻辑一致）
        "Cache-Control": `s-maxage=${cacheDuration}, stale-while-revalidate=${
          cacheDuration * 2
        }`,
        "Vercel-CDN-Cache-Control": `s-maxage=${cacheDuration}, stale-while-revalidate=${
          cacheDuration * 2
        }`,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
