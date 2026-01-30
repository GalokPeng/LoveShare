import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Switch,
  FormControlLabel,
  useTheme,
  Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuthContext } from "../../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import supabase from "../../lib/supabase";

interface DataEditorProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTable: string;
  initialData?: any;
}

const DataEditor: React.FC<DataEditorProps> = ({
  open,
  onClose,
  onSuccess,
  selectedTable,
  initialData,
}) => {
  const theme = useTheme();
  const { secretKey } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<any>({});
  const [tableConfig, setTableConfig] = useState<any>({});
  const [categoryCol, setCategoryCol] = useState<{
    [tableName: string]: string;
  }>({});
  const [categoryEnable, setCategoryEnable] = useState<{
    [tableName: string]: boolean;
  }>({});

  // 从环境变量获取配置
  useEffect(() => {
    try {
      if (selectedTable) {
        // 解析表配置
        const tableDic = JSON.parse(
          import.meta.env.VITE_SUPABASE_TABLE_DIC || "{}",
        );
        setTableConfig(tableDic[selectedTable] || {});

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
      }
    } catch (error) {
      console.error("Failed to parse environment variables:", error);
    }
  }, [selectedTable]);

  // 使用React Query获取分类数据
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
              // 使用getCategories方法获取分类数据
              const data = await supabase.getCategories(
                tableName,
                categoryColumn,
              );

              if (data) {
                // 提取分类值并去重
                const categoryValues = Array.from(
                  new Set(
                    data
                      .map((item: any) => String(item[categoryColumn]))
                      .filter(Boolean),
                  ),
                ) as string[];
                newCategories[tableName] = categoryValues;
              }
            } catch (error) {
              console.error(
                `Error fetching categories for ${tableName}:`,
                error,
              );
            }
          }
        }
      }

      return newCategories;
    },
  });

  // 初始化表单数据
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // 清空表单
      const emptyData: any = {};
      Object.keys(tableConfig).forEach((key) => {
        if (key !== "show_name") {
          emptyData[key] = "";
        }
      });
      setFormData(emptyData);
    }
  }, [initialData, tableConfig]);

  // 处理表单字段变化
  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | {
          target: { name: string; value: any };
        },
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!secretKey) {
      setError("认证信息丢失，请重新登录");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = `/api/data/${selectedTable}`;
      const method = initialData ? "PUT" : "POST";

      // 创建一个全新的body对象，只包含需要的字段
      const body: any = {};

      // 只复制tableConfig中定义的字段
      Object.keys(tableConfig).forEach((key) => {
        if (key !== "show_name" && formData[key] !== undefined) {
          body[key] = formData[key];
        }
      });

      // 添加id字段（如果是编辑模式）
      if (initialData && initialData.id) {
        body.id = initialData.id;
      }

      // 处理布尔值字段
      if (body.to_article !== undefined) {
        body.to_article = Boolean(body.to_article);
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-supabase-secret-key": secretKey,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || "操作失败");
      }

      // 成功，关闭弹窗并触发刷新
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    onClose();
    // 清空表单数据，准备下一次打开
    setFormData({});
    setError("");
  };

  // 过滤掉show_name字段，只显示需要编辑的字段
  const editableFields = Object.entries(tableConfig).filter(
    ([key]) => key !== "show_name",
  );

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: (theme) => theme.palette.primary.main,
          color: "white",
          fontWeight: 600,
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {initialData ? "编辑数据" : "添加数据"}
          </Typography>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{
              backgroundColor: "white",
              color: (theme) => theme.palette.primary.main,
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
              },
            }}
          >
            {loading ? "处理中..." : initialData ? "保存" : "添加"}
          </Button>
        </Box>
        <IconButton
          onClick={handleCancel}
          sx={{
            color: "white",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflowY: "auto" }}>
        <br />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading && initialData && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && (
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexDirection: "column",
            }}
          >
            {/* 第一行：标题、图标链接、分类 */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: 2,
              }}
            >
              {/* 标题字段 */}
              {editableFields.map(([key, label]: [string, any]) => {
                if (key === "title") {
                  return (
                    <Box key={key}>
                      <TextField
                        fullWidth
                        label={label}
                        name={key}
                        value={formData[key] || ""}
                        onChange={handleChange}
                        variant="outlined"
                      />
                    </Box>
                  );
                }
                return null;
              })}

              {/* 图标链接字段 */}
              {editableFields.map(([key, label]: [string, any]) => {
                if (key === "img") {
                  return (
                    <Box key={key}>
                      <TextField
                        fullWidth
                        label={label}
                        name={key}
                        value={formData[key] || ""}
                        onChange={handleChange}
                        variant="outlined"
                      />
                    </Box>
                  );
                }
                return null;
              })}

              {/* 分类字段 */}
              {editableFields.map(([key, label]: [string, any]) => {
                if (key === categoryCol[selectedTable]) {
                  const categoryColumn = categoryCol[selectedTable];
                  const isCategoryEnabled = categoryEnable[selectedTable];
                  const tableCategories = categories[selectedTable] || [];

                  if (isCategoryEnabled && categoryColumn) {
                    return (
                      <Box key={key}>
                        <Autocomplete
                          freeSolo
                          options={tableCategories}
                          value={formData[key] || ""}
                          onChange={(_, newValue) => {
                            handleChange({
                              target: {
                                name: key,
                                value: newValue,
                              },
                            });
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={label}
                              variant="outlined"
                              fullWidth
                            />
                          )}
                          sx={{ width: "100%" }}
                        />
                      </Box>
                    );
                  }
                }
                return null;
              })}
            </Box>

            {/* 第二行：简介 */}
            <Box>
              {/* 摘要字段 */}
              {editableFields.map(([key, label]: [string, any]) => {
                if (key === "abstract") {
                  return (
                    <Box key={key}>
                      <TextField
                        fullWidth
                        label={label}
                        name={key}
                        value={formData[key] || ""}
                        onChange={handleChange}
                        variant="outlined"
                      />
                    </Box>
                  );
                }
                return null;
              })}
            </Box>

            {/* 第三行：跳转链接、是否先跳转文章 */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 2,
              }}
            >
              {/* 跳转链接字段 */}
              {editableFields.map(([key, label]: [string, any]) => {
                if (key === "to_link") {
                  return (
                    <Box key={key}>
                      <TextField
                        fullWidth
                        label={label}
                        name={key}
                        value={formData[key] || ""}
                        onChange={handleChange}
                        variant="outlined"
                      />
                    </Box>
                  );
                }
                return null;
              })}

              {/* 是否先跳转文章页 */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.to_article || false}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          to_article: e.target.checked,
                        }))
                      }
                      name="to_article"
                    />
                  }
                  label="是否先跳转文章页"
                />
              </Box>
            </Box>

            {/* 第三行：Markdown编辑和预览 */}
            {editableFields.some(([key]) => key === "article") && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 3,
                  maxWidth: "100%",
                }}
              >
                {/* Markdown编辑 */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 600, fontSize: "0.9rem" }}
                  >
                    Markdown编辑
                  </Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <TextField
                      fullWidth
                      label="文章"
                      name="article"
                      value={formData.article || ""}
                      onChange={handleChange}
                      variant="outlined"
                      multiline
                      InputProps={{
                        sx: {
                          fontSize: "0.85rem",
                        },
                      }}
                    />
                  </Box>
                </Box>

                {/* Markdown预览 */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 600, fontSize: "0.9rem" }}
                  >
                    Markdown预览
                  </Typography>
                  <Box
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      p: 2,
                      bgcolor: theme.palette.background.paper,
                      fontSize: "0.85rem",
                      overflow: "auto",
                      minWidth: 0,
                      height: "100%",
                      "& img": {
                        maxWidth: "50%",
                        height: "auto",
                        borderRadius: 1,
                      },
                      "& table": {
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: 2,
                      },
                      "& th, & td": {
                        border: `1px solid ${theme.palette.divider}`,
                        padding: 1,
                        textAlign: "left",
                      },
                      "& th": {
                        backgroundColor: theme.palette.action.hover,
                        fontWeight: 600,
                      },
                      "& blockquote": {
                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                        paddingLeft: 2,
                        margin: "1rem 0",
                        fontStyle: "italic",
                        color: theme.palette.text.secondary,
                      },
                      "& pre": {
                        backgroundColor: theme.palette.action.selected,
                        padding: 2,
                        borderRadius: 1,
                        overflow: "auto",
                        marginBottom: 2,
                      },
                      "& code": {
                        fontFamily: "monospace",
                        backgroundColor: theme.palette.action.selected,
                        padding: "0.2rem 0.4rem",
                        borderRadius: 0.5,
                        fontSize: "0.9em",
                      },
                      "& pre code": {
                        backgroundColor: "transparent",
                        padding: 0,
                      },
                      "& ul, & ol": {
                        paddingLeft: 2,
                        marginBottom: 1,
                      },
                      "& li": {
                        marginBottom: 0.5,
                      },
                      "& h1, & h2, & h3, & h4, & h5, & h6": {
                        marginTop: 2,
                        marginBottom: 1,
                        fontWeight: 600,
                      },
                      "& h1": {
                        fontSize: "2em",
                        borderBottom: `2px solid ${theme.palette.primary.main}`,
                        paddingBottom: 0.5,
                      },
                      "& h2": {
                        fontSize: "1.5em",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        paddingBottom: 0.5,
                      },
                      "& hr": {
                        border: "none",
                        borderTop: `2px solid ${theme.palette.divider}`,
                        margin: "2rem 0",
                      },
                      "& a": {
                        color: theme.palette.primary.main,
                        textDecoration: "none",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      },
                      "& del": {
                        color: theme.palette.text.disabled,
                        textDecoration: "line-through",
                        opacity: 0.7,
                      },
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {formData.article || ""}
                    </ReactMarkdown>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DataEditor;
