export default async function handler(req, res) {
  try {
    const apiBaseUrl = process.env.VITE_FILMTELEVISION_API_BASE_URL;
    const apiPath = process.env.VITE_FILMTELEVISION_API_PATH;

    // 构建查询字符串
    const queryString = req.url.split("?")[1] || "";

    // 构建完整的API URL
    const fullUrl = `${apiBaseUrl}${apiPath}${
      queryString ? `?${queryString}` : ""
    }`;

    // 转发请求到目标API
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        // 可以添加其他必要的 headers
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    // 获取响应数据
    const data = await response.json();

    // 设置CORS头
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // 返回响应
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
