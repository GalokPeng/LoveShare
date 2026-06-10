import React from "react";
import { Box, Typography, Container, Paper, useTheme } from "@mui/material";

const Home: React.FC = () => {
  const theme = useTheme();

  // 系统名称
  const systemName = import.meta.env.VITE_SYSTEM_NAME;
  const homeIntro = import.meta.env.VITE_HOME_INTRO;
  const homeFooter = import.meta.env.VITE_HOME_FOOTER;

  return (
    <Box
      sx={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        py: { xs: 4, md: 8 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
            transition: "all var(--theme-transition-duration) ease",
            "&:hover": {
              boxShadow: "0 15px 40px rgba(0, 0, 0, 0.15)",
            },
            textAlign: "center",
          }}
        >
          {/* 系统标题 */}
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "2rem", md: "3rem" },
              mb: { xs: 3, md: 4 },
              color: theme.palette.primary.main,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {systemName}
          </Typography>
          {/* wechat qrcode */}
          <Box
            sx={{
              mt: 4,
              mb: 6,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src="/logo.png"
              alt="wechat qrcode"
              style={{ width: "239px" }}
            />
          </Box>
          {/* 系统简介 */}
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: "1rem", md: "1.125rem" },
              mb: { xs: 6, md: 8 },
              color: theme.palette.text.secondary,
              lineHeight: 1.6,
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {homeIntro}
          </Typography>

          {/* 底部信息 */}
          <Box
            sx={{
              mt: "auto",
              pt: 4,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: "0.875rem",
              }}
            >
              {homeFooter}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Home;
