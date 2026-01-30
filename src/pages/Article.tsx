import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import supabase from "../lib/supabase";
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Divider,
  CircularProgress,
  Button,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Article: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const theme = useTheme();
  const [articleData, setArticleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从数据库获取文章数据
  useEffect(() => {
    const fetchArticleData = async () => {
      if (!slug) {
        setError("文章不存在");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 解析slug，移除可能的.html后缀
        const cleanSlug = slug.replace(/\.html$/, "");

        // 从数据库获取数据
        const { data, error } = await supabase
          .from("navigation") // 假设数据存储在navigation表中
          .select("*")
          .eq("slug", cleanSlug)
          .single();

        if (error) {
          throw error;
        }

        setArticleData(data);
      } catch (err) {
        console.error("获取文章数据失败:", err);
        setError("获取文章数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [slug]);

  // 返回上一页
  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <CircularProgress size={60} color="primary" />
      </Box>
    );
  }

  if (error || !articleData) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
          padding: 2,
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          {error || "文章不存在"}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          返回上一页
        </Button>
      </Box>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        paddingY: 4,
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 返回按钮 */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 500,
          }}
        >
          返回
        </Button>
      </Box>

      {/* 文章卡片 */}
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: "auto",
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[3],
          transition: "box-shadow 0.3s ease",
          "&:hover": {
            boxShadow: theme.shadows[5],
          },
        }}
      >
        {/* 文章头部 */}
        <Box
          sx={{
            padding: { xs: 3, md: 5 },
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {/* 图标、标题、分类 */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              mb: 3,
            }}
          >
            {/* 图标 */}
            <Avatar
              src={articleData.img || undefined}
              alt={articleData.title}
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: 2,
                boxShadow: 4,
                bgcolor: theme.palette.primary.light,
                border: `3px solid ${theme.palette.background.paper}`,
                flexShrink: 0,
              }}
            >
              {!articleData.img && articleData.title?.charAt(0)?.toUpperCase()}
            </Avatar>

            {/* 标题和分类 */}
            <Box sx={{ flex: 1 }}>
              {/* 标题 */}
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.5rem", md: "2rem" },
                  lineHeight: 1.3,
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                {articleData.title || "无标题"}
              </Typography>

              {/* 分类标签 */}
              {articleData.obj && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{
                    borderRadius: 20,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    backgroundColor: theme.palette.primary.main,
                  }}
                  disabled
                >
                  {articleData.obj}
                </Button>
              )}
            </Box>
          </Box>

          {/* 摘要 */}
          {articleData.abstract && (
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: "1rem", md: "1.1rem" },
                lineHeight: 1.6,
                color: theme.palette.text.secondary,
                maxWidth: 800,
                margin: "0 auto",
                mb: 3,
                fontStyle: "italic",
              }}
            >
              {articleData.abstract}
            </Typography>
          )}

          <Divider />
        </Box>

        {/* 文章内容 */}
        <Box
          sx={{
            padding: { xs: 3, md: 6 },
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          {/* 文章正文 */}
          <Box
            sx={{
              fontSize: { xs: "1rem", md: "1.15rem" },
              lineHeight: 1.8,
              color: theme.palette.text.primary,
              textAlign: "justify",
              mb: 4,
              "& img": {
                maxWidth: "100%",
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
              {articleData.article || "暂无文章内容"}
            </ReactMarkdown>
          </Box>

          {/* 文章底部信息 */}
          <Box sx={{ mt: 5, textAlign: "center" }}>
            <Divider sx={{ mb: 3 }} />
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: "0.9rem",
              }}
            >
              文章ID: {articleData.id || slug}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Article;
