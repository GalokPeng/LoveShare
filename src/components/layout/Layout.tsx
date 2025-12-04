import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Box, Paper } from "@mui/material";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useTableContext } from "../../contexts/TableContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // 菜单开关状态
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // 从主题上下文获取主题和切换函数
  const { isDarkMode, toggleDarkMode } = useThemeContext();

  // 从表上下文获取表相关状态
  const { selectedTable, selectedCategory, setSelectedTable } =
    useTableContext();

  // 切换菜单开关
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* 顶部导航栏 - 优先显示，不被侧边栏覆盖 */}
      <Header
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        toggleMenu={toggleMenu}
      />

      {/* 主要内容区域，包含侧边栏和内容 */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* 侧边栏 */}
        <Sidebar
          selectedTable={selectedTable}
          selectedCategory={selectedCategory}
          onTableSelect={setSelectedTable}
          isOpen={isMenuOpen}
          toggleMenu={toggleMenu}
        />

        {/* 内容区域 */}
        <Paper
          sx={{
            flex: 1,
            p: { xs: 2, md: 4 },
            overflowY: "auto",
            overflowX: "hidden",
            margin: { xs: 1, md: 2 },
            borderRadius: 2,
            boxShadow: 2,
            width: "100%",
            boxSizing: "border-box",
            backgroundColor: (theme) => theme.palette.background.paper,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            transition:
              "background-color var(--theme-transition-duration) ease, border-color var(--theme-transition-duration) ease",
            minWidth: 0, // 确保内容能正确收缩
            // 隐藏滚动条但保持滚动功能
            "&::-webkit-scrollbar": {
              width: 0,
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "transparent",
            },
            scrollbarWidth: "none",
          }}
          elevation={3}
        >
          {children}
        </Paper>
      </Box>
    </Box>
  );
};

export default Layout;
