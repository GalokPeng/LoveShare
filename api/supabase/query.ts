import { createClient } from "@supabase/supabase-js";

// Vercel Node.js 运行时使用的是 handler(req, res) 签名，而不是 Edge Function 的 handler(req: Request) 签名
// 这是本地调试成功但 Vercel 部署失败的关键原因！
export default async function handler(req: any, res: any) {
  // 设置 CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-supabase-secret-key"
  );

  // 处理 OPTIONS 请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1. 服务端读取 Vercel 环境变量（同时支持带 VITE_ 前缀和不带 VITE_ 前缀的环境变量）
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    const cacheDuration = parseInt(process.env.CACHE_DURATION || process.env.VITE_CACHE_DURATION || "3600");

    // 校验配置
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase 配置缺失:", { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return res.status(500).json({ error: "Supabase 配置缺失" });
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
    const { method, url, query } = req;
    console.log("收到请求:", { method, url });
    
    // 在 Vercel Node.js 运行时中，查询参数在 req.query 中
    // 在 Express 本地开发中，查询参数也在 req.query 中
    // 我们不需要手动解析 URL，直接使用 req.query 即可！
    const tableName = query.table || "";
    const select = query.select || "*";
    const eq = query.eq || "";
    const eqValue = query.eqValue || "";
    const count = query.count || "";
    const rangeStart = query.rangeStart;
    const rangeEnd = query.rangeEnd;
    const or = query.or || "";
    const categoryTable = query.categoryTable || "";
    
    console.log("解析到的查询参数:", { 
      tableName, 
      categoryTable, 
      select, 
      eq, 
      eqValue, 
      count, 
      rangeStart, 
      rangeEnd, 
      or 
    });

    // 4. 构建查询
    const targetTable = tableName || categoryTable;
    if (!targetTable) {
      console.error("表名不能为空");
      return res.status(400).json({ error: "表名不能为空" });
    }
    
    let queryBuilder: any = supabase
      .from(targetTable)
      .select(select, count ? { count: count as "exact" } : {});
    console.log("查询构建完成，表名:", targetTable);

    // 添加等于过滤
    if (eq && eqValue) {
      queryBuilder = queryBuilder.eq(eq, eqValue);
      console.log("添加等于过滤:", { eq, eqValue });
    }

    // 添加 OR 过滤
    if (or) {
      queryBuilder = queryBuilder.or(or);
      console.log("添加 OR 过滤:", or);
    }

    // 添加范围过滤（分页）
    if (rangeStart !== undefined && rangeEnd !== undefined) {
      const start = parseInt(rangeStart);
      const end = parseInt(rangeEnd);
      queryBuilder = queryBuilder.range(start, end);
      console.log("添加范围过滤:", { start, end });
    }

    // 5. 执行查询
    console.log("开始执行查询...");
    const { data, error, count: resultCount } = await queryBuilder;
    console.log("查询执行完成:", { 
      dataLength: data ? data.length : 0, 
      hasError: !!error, 
      count: resultCount 
    });

    if (error) {
      console.error("查询执行错误:", error);
      throw error;
    }

    // 6. 返回数据给前端，使用 Node.js 的 res 对象
    console.log("准备返回响应...");
    
    // 设置缓存头
    res.setHeader("Cache-Control", `s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`);
    res.setHeader("Vercel-CDN-Cache-Control", `s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`);
    
    // 返回 JSON 响应
    res.status(200).json({ data, count: resultCount });
    console.log("响应已返回");
  } catch (err: any) {
    console.error("处理请求时发生错误:", err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
}