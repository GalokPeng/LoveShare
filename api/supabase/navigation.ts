import { createClient } from '@supabase/supabase-js';

// 边缘函数配置
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    // 1. 服务端读取 Vercel 环境变量（不再用 import.meta.env，改用 process.env）
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    const cacheDuration = parseInt(process.env.CACHE_DURATION || '3600');

    // 校验配置
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase 配置缺失' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. 服务端初始化 Supabase 客户端（复用你的缓存头逻辑）
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'Cache-Control': `s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
          'Vercel-CDN-Cache-Control': `s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
        },
      },
    });

    // 3. 执行你的业务查询（这里替换为你实际要查的表/字段，示例用 navigation）
    // 如果你是查 filmtelevision_obj，就改成 from('filmtelevision_obj').select('obj')
    const { data, error } = await supabase
      .from('navigation') // 替换为你的实际表名
      .select('*'); // 替换为你的实际字段

    if (error) throw error;

    // 4. 返回数据给前端
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 透传缓存头（和你原逻辑一致）
        'Cache-Control': `s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
        'Vercel-CDN-Cache-Control': `s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}