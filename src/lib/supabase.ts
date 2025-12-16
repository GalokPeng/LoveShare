// 新的 supabase.ts 文件，只包含前端请求逻辑，不包含 Supabase 客户端初始化

// 前端请求封装，替代原来的 supabase 客户端
const supabaseApi = {
  from: (tableName: string) => {
    // 构建查询构建器对象，模拟原来的 supabase.from() 方法
    const queryBuilder = {
      select: (select: string, options?: { count?: 'exact' }) => {
        // 存储查询参数
        const params: Record<string, string> = {
          table: tableName,
          select,
        };

        if (options?.count) {
          params.count = options.count;
        }

        // 构建过滤方法
        const filterBuilder = {
          eq: (column: string, value: any) => {
            params.eq = column;
            params.eqValue = value;
            return filterBuilder;
          },
          or: (condition: string) => {
            params.or = condition;
            return filterBuilder;
          },
          range: (start: number, end: number) => {
            params.rangeStart = start.toString();
            params.rangeEnd = end.toString();
            return filterBuilder;
          },
          // 实现 single() 方法，用于获取单条数据
          async single() {
            try {
              // 构建 URL
              const url = new URL('/api/supabase/query', window.location.origin);
              
              // 添加查询参数
              Object.entries(params).forEach(([key, value]) => {
                if (value) {
                  url.searchParams.set(key, value);
                }
              });

              // 发送请求
              const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                throw new Error('请求失败');
              }

              const result = await response.json();
              return {
                data: result.data && result.data.length > 0 ? result.data[0] : null,
                count: result.count || 0,
                error: null,
              };
            } catch (err) {
              console.error('查询失败:', err);
              return {
                data: null,
                count: 0,
                error: err,
              };
            }
          },
          // 执行查询
          async execute() {
            try {
              // 构建 URL
              const url = new URL('/api/supabase/query', window.location.origin);
              
              // 添加查询参数
              Object.entries(params).forEach(([key, value]) => {
                if (value) {
                  url.searchParams.set(key, value);
                }
              });

              // 发送请求
              const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                throw new Error('请求失败');
              }

              const result = await response.json();
              return {
                data: result.data || [],
                count: result.count || 0,
                error: null,
              };
            } catch (err) {
              console.error('查询失败:', err);
              return {
                data: [],
                count: 0,
                error: err,
              };
            }
          },
          // 实现 then 方法，使 filterBuilder 可以被直接 await
          then: function(onFulfilled: any, onRejected: any) {
            return this.execute().then(onFulfilled, onRejected);
          },
          // 实现 catch 方法，使 filterBuilder 可以被直接 await
          catch: function(onRejected: any) {
            return this.execute().catch(onRejected);
          },
          // 实现 finally 方法，使 filterBuilder 可以被直接 await
          finally: function(onFinally: any) {
            return this.execute().finally(onFinally);
          },
        };

        return filterBuilder;
      },
    };

    return queryBuilder;
  },
  // 分类查询特殊处理
  getCategories: async (tableName: string, categoryColumn: string) => {
    try {
      const url = new URL('/api/supabase/query', window.location.origin);
      url.searchParams.set('categoryTable', `${tableName}_${categoryColumn}`);
      url.searchParams.set('select', categoryColumn);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const result = await response.json();
      return result.data || [];
    } catch (err) {
      console.error('获取分类失败:', err);
      return [];
    }
  },
};

export default supabaseApi;
