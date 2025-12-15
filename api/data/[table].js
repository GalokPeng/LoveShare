// /api/data/[table].js
import { createClient } from "@supabase/supabase-js";

// 从请求头获取Secret Key的辅助函数
const getSecretKeyFromHeader = (req) => {
  return (
    req.headers["x-supabase-secret-key"] ||
    req.headers["authorization"]?.replace("Bearer ", "")
  );
};

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-supabase-secret-key"
  );

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 从URL参数获取table参数 - 支持Vercel动态路由和本地开发
    let tableName = req.query.table;

    // 检查是否从路由参数获取（对于某些部署环境）
    if (!tableName && req.params && req.params.table) {
      tableName = req.params.table;
    }

    // 检查是否从URL路径获取（直接匹配）
    if (!tableName) {
      const urlPath = req.url.split("/");
      tableName = urlPath[urlPath.length - 1];
    }

    if (!tableName) {
      return res.status(400).json({ error: "Missing table parameter" });
    }

    // 从请求头获取Secret Key
    const secretKey = getSecretKeyFromHeader(req);
    if (!secretKey) {
      return res.status(401).json({ error: "Missing Secret Key" });
    }

    // 检查是否使用了匿名密钥，匿名密钥不能用于管理后台
    if (
      secretKey === process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
      secretKey === process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY
    ) {
      return res.status(401).json({ error: "匿名密钥不能用于管理后台" });
    }

    // 创建Supabase客户端
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      return res.status(500).json({ error: "Missing Supabase URL" });
    }

    const supabase = createClient(supabaseUrl, secretKey);

    // 处理GET请求 - 获取数据
    if (req.method === "GET") {
      // 从查询参数获取id（可选）
      const id = req.query.id;

      let query = supabase.from(tableName).select("*");

      if (id) {
        query = query.eq("id", id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return res.status(200).json(data);
    }

    // 处理POST请求 - 添加数据
    if (req.method === "POST") {
      const data = req.body;

      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid data" });
      }

      // 过滤掉空值字段，只提交有值的字段
      const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert([filteredData]);

      if (error) {
        throw error;
      }

      return res
        .status(201)
        .json(insertedData ? insertedData[0] : { success: true });
    }

    // 处理PUT请求 - 更新数据
    if (req.method === "PUT") {
      const { id, ...data } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }

      // 过滤掉空值字段，只提交有值的字段
      const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({ error: "No valid data to update" });
      }

      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update(filteredData)
        .eq("id", id)
        .select();

      if (error) {
        throw error;
      }

      return res
        .status(200)
        .json(updatedData ? updatedData[0] : { success: true });
    }

    // 处理DELETE请求 - 删除数据
    if (req.method === "DELETE") {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }

      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) {
        throw error;
      }

      return res.status(200).json({ success: true });
    }

    // 如果请求方法不支持
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error("数据操作失败:", error);
    return res.status(500).json({
      error: "操作失败",
      details: error.message,
      stack: error.stack,
    });
  }
}
