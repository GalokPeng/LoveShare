import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Toolbar,
  Divider,
  useMediaQuery,
  useTheme,
  Collapse,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

import supabase from "../../lib/supabase";

interface TableConfig {
  show_name: string;
  [key: string]: string;
}

interface TableDic {
  [tableName: string]: TableConfig;
}

interface CategoryConfig {
  [tableName: string]: string;
}

interface CategoryEnableConfig {
  [tableName: string]: boolean;
}

interface SidebarProps {
  selectedTable: string;
  selectedCategory: string | null;
  onTableSelect: (tableName: string, category?: string | null) => void;
  isOpen: boolean;
  toggleMenu: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedTable,
  selectedCategory,
  onTableSelect,
  isOpen,
  toggleMenu,
}) => {
  const [tableDic, setTableDic] = useState<TableDic>({});
  const [categoryCol, setCategoryCol] = useState<CategoryConfig>({});
  const [categoryEnable, setCategoryEnable] = useState<CategoryEnableConfig>(
    {}
  );
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  // 解析环境变量中的配置
  useEffect(() => {
    try {
      // 解析表配置
      const tableDicString = import.meta.env.VITE_SUPABASE_TABLE_DIC;
      if (tableDicString) {
        const parsed = JSON.parse(tableDicString);
        setTableDic(parsed);
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
    } catch (error) {
      console.error("Failed to parse environment variables:", error);
    }
  }, []);

  // 使用React Query获取分类数据，支持缓存
  const { data: categories = {} } = useQuery({
    queryKey: ["categories", categoryEnable, categoryCol],
    queryFn: async () => {
      const newCategories: { [tableName: string]: string[] } = {};

      // 遍历所有启用分类的表
      for (const [tableName, isEnabled] of Object.entries(categoryEnable)) {
        if (isEnabled) {
          const categoryColumn = categoryCol[tableName];
          if (categoryColumn) {
            try {
              // 使用新的 getCategories 方法获取分类数据
              const data = await supabase.getCategories(tableName, categoryColumn);
              
              if (data) {
                // 提取分类值并去重，添加类型断言
                const categoryValues = Array.from(
                  new Set(
                    data
                      .map((item: any) => String(item[categoryColumn]))
                      .filter(Boolean)
                  )
                ) as string[];
                newCategories[tableName] = categoryValues;
              }
            } catch (error) {
              console.error(
                `Error fetching categories for ${tableName}:`,
                error
              );
            }
          }
        }
      }

      return newCategories;
    },
  });

  // 切换子菜单展开/折叠
  const handleToggle = (tableName: string) => {
    setExpandedTable(expandedTable === tableName ? null : tableName);
  };

  // 处理菜单项点击
  const handleListItemClick = (tableName: string, category?: string | null) => {
    onTableSelect(tableName, category);
    // 只有手机端点击后关闭菜单，桌面端保持打开状态
    if (isMobile) {
      toggleMenu();
    }
  };

  // 侧边栏宽度
  const drawerWidth = 230;
  const collapsedDrawerWidth = 60;

  return (
    <>
      {/* 侧边菜单栏 */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isOpen}
        onClose={toggleMenu}
        sx={{
          width: isMobile
            ? drawerWidth
            : isOpen
            ? drawerWidth
            : collapsedDrawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile
              ? drawerWidth
              : isOpen
              ? drawerWidth
              : collapsedDrawerWidth,
            boxSizing: "border-box",
            transition:
              "width 0.5s ease, background-color var(--theme-transition-duration) ease, border-color var(--theme-transition-duration) ease, box-shadow var(--theme-transition-duration) ease",
            backgroundColor: muiTheme.palette.background.paper,
            borderRight: `1px solid ${muiTheme.palette.divider}`,
            boxShadow: 1,
            // 确保侧边栏从Header下方开始，不覆盖导航栏
            top: isMobile ? 0 : "73px",
            height: isMobile ? "100%" : "calc(100% - 64px)",
            // 隐藏滚动条但保持滚动功能
            overflowY: "auto",
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE and Edge
            // 增强的WebKit滚动条隐藏样式，确保在Chrome中完全隐藏
            "&::-webkit-scrollbar": {
              display: "none",
              width: 0,
              height: 0,
            },
            "&::-webkit-scrollbar-track": {
              display: "none",
            },
            "&::-webkit-scrollbar-thumb": {
              display: "none",
            },
          },
        }}
      >
        {/* 侧边栏头部 - 仅桌面端显示 */}
        {!isMobile && (
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: [1],
              backgroundColor: muiTheme.palette.background.paper,
              borderBottom: `1px solid ${muiTheme.palette.divider}`,
              transition:
                "background-color var(--theme-transition-duration) ease, border-color var(--theme-transition-duration) ease",
            }}
          >
            <IconButton
              onClick={toggleMenu}
              sx={{
                "&:hover": {
                  backgroundColor: muiTheme.palette.action.hover,
                },
              }}
            >
              {muiTheme.direction === "rtl" ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </Toolbar>
        )}

        <Divider
          sx={{
            backgroundColor: muiTheme.palette.divider,
            my: 0,
            transition:
              "background-color var(--theme-transition-duration) ease",
          }}
        />

        {/* 侧边栏菜单 */}
        <List
          sx={{
            backgroundColor: muiTheme.palette.background.paper,
            py: 1,
            transition:
              "background-color var(--theme-transition-duration) ease",
          }}
        >
          {/* 主页菜单项 */}
          <ListItem disablePadding sx={{ display: "block" }}>
            <ListItemButton
              selected={selectedTable === "home"}
              onClick={() => handleListItemClick("home", null)}
              sx={{
                minHeight: 48,
                justifyContent: isOpen ? "space-between" : "center",
                px: isOpen ? 2.5 : 1,
                borderRadius: isOpen ? "8px" : "12px",
                margin: "4px 8px",
                "&.Mui-selected": {
                  backgroundColor: muiTheme.palette.action.selected,
                  "&:hover": {
                    backgroundColor: muiTheme.palette.action.hover,
                  },
                },
                "&:hover": {
                  backgroundColor: muiTheme.palette.action.hover,
                },
                transition: "all var(--theme-transition-duration) ease",
              }}
            >
              <ListItemText
                primary={isOpen ? "主页" : "主页".slice(0, 2)}
                primaryTypographyProps={{
                  noWrap: true,
                  sx: {
                    fontWeight: selectedTable === "home" ? 600 : 400,
                    color:
                      selectedTable === "home"
                        ? "primary.main"
                        : "text.primary",
                    fontSize: isOpen ? "0.95rem" : "0.7rem",
                    textAlign: "center",
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* 在线观影菜单项 */}
          <ListItem disablePadding sx={{ display: "block" }}>
            <ListItemButton
              selected={selectedTable === "video-online"}
              onClick={() => handleListItemClick("video-online", null)}
              sx={{
                minHeight: 48,
                justifyContent: isOpen ? "space-between" : "center",
                px: isOpen ? 2.5 : 1,
                borderRadius: isOpen ? "8px" : "12px",
                margin: "4px 8px",
                "&.Mui-selected": {
                  backgroundColor: muiTheme.palette.action.selected,
                  "&:hover": {
                    backgroundColor: muiTheme.palette.action.hover,
                  },
                },
                "&:hover": {
                  backgroundColor: muiTheme.palette.action.hover,
                },
                transition: "all var(--theme-transition-duration) ease",
              }}
            >
              <ListItemText
                primary={isOpen ? "在线观影" : "在线观影".slice(0, 2)}
                primaryTypographyProps={{
                  noWrap: true,
                  sx: {
                    fontWeight: selectedTable === "video-online" ? 600 : 400,
                    color:
                      selectedTable === "video-online"
                        ? "primary.main"
                        : "text.primary",
                    fontSize: isOpen ? "0.95rem" : "0.7rem",
                    textAlign: "center",
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* 其他表菜单项 */}
          {Object.entries(tableDic).map(([tableName, config]) => {
            const isCategoryEnabled = categoryEnable[tableName] || false;
            const hasCategories = categories[tableName]?.length > 0;
            const isSelected = selectedTable === tableName && !selectedCategory;

            // navigation表格特殊处理：将分类直接放在侧边栏上
            if (
              tableName === "navigation" &&
              isCategoryEnabled &&
              hasCategories
            ) {
              // 先渲染navigation主项
              return (
                <React.Fragment key={tableName}>
                  {/* navigation主项 */}
                  <ListItem disablePadding sx={{ display: "block" }}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => handleListItemClick(tableName, null)}
                      sx={{
                        minHeight: 48,
                        justifyContent: isOpen ? "initial" : "center",
                        px: isOpen ? 2.5 : 1,
                        borderRadius: isOpen ? "8px" : "12px",
                        margin: "4px 8px",
                        "&.Mui-selected": {
                          backgroundColor: muiTheme.palette.action.selected,
                          "&:hover": {
                            backgroundColor: muiTheme.palette.action.hover,
                          },
                        },
                        "&:hover": {
                          backgroundColor: muiTheme.palette.action.hover,
                        },
                        transition:
                          "background-color var(--theme-transition-duration) ease",
                      }}
                    >
                      <ListItemText
                        primary={
                          isOpen
                            ? config.show_name
                            : config.show_name.slice(0, 2)
                        }
                        primaryTypographyProps={{
                          noWrap: true,
                          sx: {
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? "primary.main" : "text.primary",
                            fontSize: isOpen ? "0.95rem" : "0.7rem",
                            textAlign: "center",
                            lineHeight: 1.2,
                            letterSpacing: "-0.02em",
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>

                  {/* navigation分类直接显示在侧边栏，不使用子菜单 */}
                  {categories[tableName]?.map((category) => {
                    const isCategorySelected =
                      selectedTable === tableName &&
                      selectedCategory === category;
                    return (
                      <ListItem key={`${tableName}-${category}`} disablePadding>
                        <ListItemButton
                          selected={isCategorySelected}
                          onClick={() =>
                            handleListItemClick(tableName, category)
                          }
                          sx={{
                            pl: isOpen ? 2.5 : 1,
                            pr: isOpen ? 2.5 : 1,
                            minHeight: 48,
                            justifyContent: isOpen ? "initial" : "center",
                            borderRadius: isOpen ? "8px" : "12px",
                            margin: "4px 8px",
                            backgroundColor: muiTheme.palette.background.paper,
                            "&.Mui-selected": {
                              backgroundColor: muiTheme.palette.action.selected,
                              "&:hover": {
                                backgroundColor: muiTheme.palette.action.hover,
                              },
                            },
                            "&:hover": {
                              backgroundColor: muiTheme.palette.action.hover,
                            },
                            transition:
                              "background-color var(--theme-transition-duration) ease",
                          }}
                        >
                          <ListItemText
                            primary={isOpen ? category : category.slice(0, 2)}
                            primaryTypographyProps={{
                              noWrap: true,
                              sx: {
                                fontSize: isOpen ? "0.9rem" : "0.7rem",
                                fontWeight: isCategorySelected ? 600 : 400,
                                color: isCategorySelected
                                  ? "primary.main"
                                  : "text.primary",
                                textAlign: "center",
                                lineHeight: 1.2,
                                letterSpacing: "-0.02em",
                                whiteSpace: "nowrap",
                                overflow: "visible",
                                // 添加左侧缩进指示器
                                paddingLeft: isOpen ? "16px" : "0px",
                                borderLeft: isOpen
                                  ? `3px solid ${muiTheme.palette.primary.main}`
                                  : "none",
                              },
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </React.Fragment>
              );
            }

            // 其他表格保持原有逻辑
            return (
              <React.Fragment key={tableName}>
                <ListItem disablePadding sx={{ display: "block" }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleListItemClick(tableName, null)}
                    sx={{
                      minHeight: 48,
                      justifyContent: isOpen ? "space-between" : "center",
                      px: isOpen ? 2.5 : 1,
                      borderRadius: isOpen ? "8px" : "12px",
                      margin: "4px 8px",
                      "&.Mui-selected": {
                        backgroundColor: muiTheme.palette.action.selected,
                        "&:hover": {
                          backgroundColor: muiTheme.palette.action.hover,
                        },
                      },
                      "&:hover": {
                        backgroundColor: muiTheme.palette.action.hover,
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <ListItemText
                      primary={
                        isOpen ? config.show_name : config.show_name.slice(0, 2)
                      }
                      primaryTypographyProps={{
                        noWrap: true,
                        sx: {
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "primary.main" : "text.primary",
                          fontSize: isOpen ? "0.95rem" : "0.7rem",
                          textAlign: "center",
                          lineHeight: 1.2,
                          letterSpacing: "-0.02em",
                        },
                      }}
                    />
                    {isCategoryEnabled && hasCategories && isOpen && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(tableName);
                        }}
                        sx={{
                          "&:hover": {
                            backgroundColor: muiTheme.palette.action.hover,
                          },
                          color: muiTheme.palette.text.secondary,
                        }}
                      >
                        {expandedTable === tableName ? (
                          <ExpandLess />
                        ) : (
                          <ExpandMore />
                        )}
                      </IconButton>
                    )}
                  </ListItemButton>
                </ListItem>

                {/* 子菜单 - 分类列表 */}
                {isCategoryEnabled && hasCategories && (
                  <Collapse
                    in={expandedTable === tableName}
                    timeout="auto"
                    unmountOnExit
                    sx={{
                      backgroundColor: muiTheme.palette.background.paper,
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    <List
                      component="div"
                      disablePadding
                      sx={{
                        pl: isOpen ? 1 : 0,
                        backgroundColor: muiTheme.palette.background.paper,
                        transition:
                          "background-color var(--theme-transition-duration) ease",
                      }}
                    >
                      {categories[tableName]?.map((category) => {
                        const isCategorySelected =
                          selectedTable === tableName &&
                          selectedCategory === category;
                        return (
                          <ListItem key={category} disablePadding>
                            <ListItemButton
                              selected={isCategorySelected}
                              onClick={() =>
                                handleListItemClick(tableName, category)
                              }
                              sx={{
                                pl: isOpen ? 5 : 1,
                                pr: isOpen ? 2.5 : 1,
                                minHeight: 40,
                                justifyContent: isOpen ? "initial" : "center",
                                borderRadius: isOpen ? "8px" : "12px",
                                margin: "2px 8px",
                                "&.Mui-selected": {
                                  backgroundColor:
                                    muiTheme.palette.action.selected,
                                  "&:hover": {
                                    backgroundColor:
                                      muiTheme.palette.action.hover,
                                  },
                                },
                                "&:hover": {
                                  backgroundColor:
                                    muiTheme.palette.action.hover,
                                },
                                transition: "all 0.3s ease",
                              }}
                            >
                              <ListItemText
                                primary={
                                  isOpen ? category : category.slice(0, 2)
                                }
                                primaryTypographyProps={{
                                  noWrap: true,
                                  sx: {
                                    fontSize: isOpen ? "0.85rem" : "0.7rem",
                                    fontWeight: isCategorySelected ? 600 : 400,
                                    color: isCategorySelected
                                      ? "primary.main"
                                      : "text.primary",
                                    textAlign: "center",
                                    lineHeight: 1.2,
                                    letterSpacing: "-0.02em",
                                    whiteSpace: "nowrap",
                                    overflow: "visible",
                                  },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Drawer>
    </>
  );
};

export default Sidebar;
