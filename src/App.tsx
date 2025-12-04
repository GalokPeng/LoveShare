import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import supabase from "./lib/supabase";
import Layout from "./components/layout/Layout";
import { useTableContext } from "./contexts/TableContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TableProvider } from "./contexts/TableContext";
import TableView from "./components/features/TableView";
import CardView from "./components/features/CardView";
import NavigationCardView from "./components/features/NavigationCardView";
import VideoOnline from "./components/features/VideoOnline";
import SearchBar from "./components/common/SearchBar";
import Home from "./pages/Home";
import {
  Box,
  Pagination,
  Typography,
  Tooltip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

function Page() {
  // 使用上下文获取选中的表名和分类
  const { selectedTable, selectedCategory } = useTableContext();
  // 表配置
  const [tableConfig, setTableConfig] = useState<any>({});
  // 分类配置
  const [categoryCol, setCategoryCol] = useState<any>({});
  // 分类启用配置
  const [categoryEnable, setCategoryEnable] = useState<any>({});
  // 缩略显示字段配置
  const [showColThumb, setShowColThumb] = useState<any>({});
  // 视图配置：根据表名配置可用视图和默认视图
  const [viewConfig, setViewConfig] = useState<{
    [tableName: string]: string[];
  }>({});
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  // 每页显示数量 - 为navigation表格使用专属配置
  const pageSize =
    selectedTable === "navigation"
      ? parseInt(import.meta.env.VITE_NAVIGATION_PAGE_SIZE || "32")
      : parseInt(import.meta.env.VITE_SUPABASE_PAGE_SIZE || "8");
  // 视图模式：table 或 card
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState("");
  // 搜索配置：根据表名配置搜索字段
  const [searchConfig, setSearchConfig] = useState<{
    [tableName: string]: string[];
  }>({});

  // 解析环境变量中的配置
  useEffect(() => {
    try {
      // 解析表配置
      const tableDicString = import.meta.env.VITE_SUPABASE_TABLE_DIC;
      if (tableDicString) {
        const parsed = JSON.parse(tableDicString);
        setTableConfig(parsed);
      }

      // 解析分类列配置
      const categoryColString = import.meta.env
        .VITE_SUPABASE_TABLE_CATEGORY_COL;
      if (categoryColString) {
        const parsed = JSON.parse(categoryColString);
        setCategoryCol(parsed);
      }

      // 解析分类启用配置
      const categoryEnableString = import.meta.env
        .VITE_SUPABASE_TABLE_CATEGORY_ENABLE;
      if (categoryEnableString) {
        const parsed = JSON.parse(categoryEnableString);
        setCategoryEnable(parsed);
      }

      // 解析缩略显示字段配置
      const showColThumbString = import.meta.env
        .VITE_SUPABASE_TABLE_SHOW_COL_THUMB;
      if (showColThumbString) {
        const parsed = JSON.parse(showColThumbString);
        // 转换为更方便使用的格式，将逗号分隔的字符串转换为数组
        const formatted = Object.entries(parsed).reduce(
          (acc, [tableName, cols]) => {
            acc[tableName] = (cols as string[]).flatMap((col) =>
              col.split(",").map((c) => c.trim())
            );
            return acc;
          },
          {} as any
        );
        setShowColThumb(formatted);
      }

      // 解析视图配置
      const viewConfigString = import.meta.env.VITE_SUPABASE_TABLE_SHOW_VIEWS;
      if (viewConfigString) {
        const parsed = JSON.parse(viewConfigString);
        setViewConfig(parsed);
      }

      // 解析搜索配置
      const searchConfigString = import.meta.env
        .VITE_SUPABASE_TABLE_DEFAULT_SEARCH;
      if (searchConfigString) {
        const parsed = JSON.parse(searchConfigString);
        setSearchConfig(parsed);
      }
    } catch (error) {
      console.error("Failed to parse environment variables:", error);
    }
  }, []);

  // 监听表或分类变化，重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTable, selectedCategory]);

  // 监听表或视图配置变化，设置默认视图
  useEffect(() => {
    if (selectedTable && viewConfig[selectedTable]) {
      // 获取当前表的可用视图列表
      const availableViews = viewConfig[selectedTable];
      if (availableViews && availableViews.length > 0) {
        // 设置默认视图为第一个可用视图
        setViewMode(availableViews[0] as "table" | "card");
      }
    }
  }, [selectedTable, viewConfig]);

  // 使用React Query获取表数据，支持缓存和自动失效
  const { data: tableQueryData, isLoading } = useQuery({
    queryKey: [
      "tableData",
      selectedTable,
      selectedCategory,
      currentPage,
      searchTerm,
      searchConfig,
      categoryEnable,
      categoryCol,
      pageSize,
    ],
    queryFn: async () => {
      // 使用any类型简化查询构建，避免TypeScript复杂类型推断问题
      let queryBuilder: any = supabase
        .from(selectedTable)
        .select("*", { count: "exact" });

      // 如果启用了分类且选择了分类，则添加分类过滤
      const isCategoryEnabled = categoryEnable[selectedTable] || false;
      if (isCategoryEnabled && selectedCategory) {
        const categoryColumn = categoryCol[selectedTable];
        if (categoryColumn) {
          queryBuilder = queryBuilder.eq(categoryColumn, selectedCategory);
        }
      }

      // 添加搜索过滤
      if (searchTerm.trim()) {
        const searchFields = searchConfig[selectedTable] || [];
        if (searchFields.length > 0) {
          // 使用or查询，搜索所有配置的字段
          queryBuilder = queryBuilder.or(
            searchFields
              .map((field: string) => `${field}.ilike.%${searchTerm.trim()}%`)
              .join(",")
          );
        }
      }

      // 添加分页
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;
      queryBuilder = queryBuilder.range(start, end);

      // 执行查询
      const { data, count, error } = await queryBuilder;

      if (error) {
        console.error("Failed to fetch data:", error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
  });

  // 从查询结果中提取数据和总数
  const tableData = tableQueryData?.data || [];
  const totalCount = tableQueryData?.count || 0;

  // 处理页码变化
  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  // 处理单元格内容渲染
  const renderCellContent = (value: any, key: string) => {
    // 检查是否为HTTP链接
    const isHttpLink = typeof value === "string" && /^https?:\/\//i.test(value);

    // 获取当前表的缩略字段配置
    const thumbCols = showColThumb[selectedTable] || [];
    // 检查当前字段是否需要缩略显示
    const needThumbnail = thumbCols.includes(key);

    // 处理HTTP链接
    if (isHttpLink) {
      return (
        <Tooltip title={value}>
          <Box
            component="a"
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: "primary.main",
              textDecoration: "none",
              wordBreak: needThumbnail ? "break-all" : "break-word",
              display: "inline-block",
              maxWidth: needThumbnail ? "150px" : "auto",
              overflow: needThumbnail ? "hidden" : "visible",
              textOverflow: needThumbnail ? "ellipsis" : "clip",
              whiteSpace: needThumbnail ? "nowrap" : "normal",
            }}
          >
            {value}
          </Box>
        </Tooltip>
      );
    }

    // 处理普通文本
    const displayValue = typeof value === "string" ? value : String(value);

    if (needThumbnail) {
      return (
        <Tooltip title={displayValue}>
          <span
            style={{
              display: "inline-block",
              maxWidth: "150px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayValue}
          </span>
        </Tooltip>
      );
    }

    // 其他字段支持自动换行
    return (
      <span style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
        {displayValue}
      </span>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        minWidth: 0, // 确保内容能正确收缩
      }}
    >
      {/* 页面标题和视图切换 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* 页面标题 */}
        <Box>
          <Typography
            variant="h6"
            component="h2"
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              fontSize: "0.875rem",
            }}
          >
            {tableConfig[selectedTable]?.show_name || selectedTable}
            {selectedCategory && (
              <Typography
                component="span"
                variant="body1"
                sx={{
                  ml: 1,
                  color: "text.secondary",
                  fontSize: "0.875rem",
                  fontWeight: 300,
                }}
              >
                - 分类：{selectedCategory}
              </Typography>
            )}
          </Typography>
        </Box>

        {/* 视图切换按钮 */}
        {viewConfig[selectedTable] && viewConfig[selectedTable].length > 0 && (
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) {
                setViewMode(newMode);
              }
            }}
            aria-label="view mode"
            sx={{
              backgroundColor: "background.paper",
              borderRadius: "12px",
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: (theme) => theme.shadows[1],
              "& .MuiToggleButton-root": {
                borderRadius: "10px",
                px: 1,
                py: 0.5,
                fontWeight: 500,
                fontSize: "0.675rem",
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: (theme) => theme.palette.action.hover,
                },
              },
              "& .MuiToggleButton-root.Mui-selected": {
                backgroundColor: (theme) => theme.palette.action.selected,
                color: "primary.main",
                boxShadow: (theme) => theme.shadows[2],
                "&:hover": {
                  backgroundColor: (theme) => theme.palette.action.hover,
                },
              },
              "& .MuiToggleButton-root + .MuiToggleButton-root": {
                marginLeft: "4px",
              },
            }}
          >
            {viewConfig[selectedTable].map((view) => (
              <ToggleButton key={view} value={view} aria-label={`${view} view`}>
                {view === "table" ? "表格视图" : "卡片视图"}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      {/* 搜索栏 */}
      <Box sx={{ mb: 0, maxWidth: 600 }}>
        <SearchBar
          onSearch={setSearchTerm}
          placeholder={`搜索 ${
            tableConfig[selectedTable]?.show_name || selectedTable
          }...`}
        />
      </Box>

      {/* 内容区域 - 可滚动 */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          mb: 1,
          /* 隐藏滚动条但保持滚动功能 */
          "&::-webkit-scrollbar": {
            width: 0,
            height: 0,
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "transparent",
          },
          /* Firefox */
          scrollbarWidth: "none",
        }}
      >
        {/* 加载提示 */}
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "20px",
              marginBottom: "10px",
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="body1" sx={{ marginLeft: "10px" }}>
              加载中...
            </Typography>
          </Box>
        )}

        {tableData.length > 0 ? (
          viewMode === "table" ? (
            <TableView
              tableData={tableData}
              tableConfig={tableConfig}
              selectedTable={selectedTable}
              renderCellContent={renderCellContent}
            />
          ) : selectedTable === "navigation" ? (
            <NavigationCardView
              tableData={tableData}
              tableConfig={tableConfig}
              selectedTable={selectedTable}
              renderCellContent={renderCellContent}
            />
          ) : (
            <CardView
              tableData={tableData}
              tableConfig={tableConfig}
              selectedTable={selectedTable}
              renderCellContent={renderCellContent}
            />
          )
        ) : (
          !isLoading && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              暂无数据
            </Box>
          )
        )}
      </Box>

      {/* 分页组件 - 固定在底部 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 2,
          borderTop: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Pagination
          count={Math.ceil(totalCount / pageSize)}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
        />
      </Box>
    </Box>
  );
}

// 内容组件，根据选中的表决定渲染哪个页面
function Content() {
  const { selectedTable } = useTableContext();

  // 当选中的表是home（主页）时，渲染Home组件
  // 当选中的表是video-online（在线观影）时，渲染VideoOnline组件
  // 否则渲染Page组件
  if (selectedTable === "home") return <Home />;
  if (selectedTable === "video-online") return <VideoOnline />;
  return <Page />;
}

// 使用 Layout 组件包裹 Content 组件
function App() {
  return (
    <ThemeProvider>
      <TableProvider>
        <Layout>
          <Content />
        </Layout>
      </TableProvider>
    </ThemeProvider>
  );
}

export default App;
