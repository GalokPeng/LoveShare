import React from "react";
import { Paper, Box, Typography } from "@mui/material";

interface CardViewProps {
  tableData: any[];
  tableConfig: any;
  selectedTable: string;
  renderCellContent: (value: any, key: string) => React.ReactNode;
}

const CardView: React.FC<CardViewProps> = ({
  tableData,
  tableConfig,
  selectedTable,
  renderCellContent,
}) => {
  // 获取当前表的配置
  const currentTableConfig = tableConfig[selectedTable] || {};

  // 过滤掉不需要显示的列
  const visibleColumns = Object.entries(currentTableConfig).filter(
    ([key]) =>
      !import.meta.env.VITE_SUPABASE_TABLE_NOT_SHOW_COL.split(",")
        .map((s: string) => s.trim())
        .includes(key)
  );

  // 解析卡片翻转配置
  const cardFlipConfig = JSON.parse(
    import.meta.env.VITE_SUPABASE_TABLE_CARD_FLIP || "{}"
  );
  const isFlipEnabled = selectedTable in cardFlipConfig;
  const [imgField, keywordField] = isFlipEnabled
    ? cardFlipConfig[selectedTable]
    : [];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(auto-fill, minmax(140px, 1fr))",
          sm: "repeat(auto-fill, minmax(260px, 1fr))",
          md: "repeat(auto-fill, minmax(320px, 1fr))",
        },
        gap: {
          xs: 2,
          md: 3,
        },
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {tableData.map((row, index) => (
        <Box
          key={index}
          sx={{
            perspective: "1000px",
            height: {
              xs: "320px",
              md: "400px",
            },
            position: "relative",
            cursor: "pointer",
            "&:hover > div": {
              transform: "rotateY(180deg)",
            },
          }}
        >
          <Box
            sx={{
              width: "100%",
              height: "100%",
              position: "relative",
              transformStyle: "preserve-3d",
              transition: "transform 0.6s ease",
            }}
          >
            {/* 卡片正面 */}
            <Paper
              sx={{
                position: "absolute",
                width: "100%",
                height: "100%",
                backfaceVisibility: "hidden",
                borderRadius: 2,
                boxShadow: 2,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                backgroundColor: "background.paper",
              }}
            >
              {isFlipEnabled ? (
                <>
                  <Box
                    sx={{
                      flex: 1,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      component="img"
                      src={
                        row[imgField] ||
                        import.meta.env
                          .VITE_SUPABASE_TABLE_CARD_FLIP_DEFAULT_IMG
                      }
                      alt={row[keywordField] || ""}
                      loading="lazy"
                      fetchPriority="auto"
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "opacity 0.3s ease",
                        opacity: 1,
                        "&:loading": {
                          opacity: 0.5,
                        },
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        padding: 2,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          color: "white",
                          fontWeight: 600,
                          textAlign: "center",
                          fontSize: {
                            xs: "0.875rem",
                            md: "1.25rem",
                          },
                          lineHeight: {
                            xs: 1.3,
                            md: 1.5,
                          },
                        }}
                      >
                        {row[keywordField] || ""}
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    p: {
                      xs: 2,
                      md: 3,
                    },
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {visibleColumns.map(([key, label], colIndex) => (
                    <Box
                      key={key}
                      sx={{
                        mb: colIndex < visibleColumns.length - 1 ? 2 : 0,
                        wordBreak: "break-word",
                        paddingBottom:
                          colIndex < visibleColumns.length - 1 ? 1 : 0,
                        borderBottom:
                          colIndex < visibleColumns.length - 1
                            ? (theme) => `1px solid ${theme.palette.divider}`
                            : "none",
                        transition:
                          "border-color var(--theme-transition-duration) ease",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          color: "text.secondary",
                          mb: {
                            xs: 0.5,
                            md: 0.75,
                          },
                          fontSize: {
                            xs: "0.75rem",
                            md: "0.85rem",
                          },
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {String(label)}:
                      </Typography>
                      <Box
                        sx={{
                          ml: 0,
                          fontSize: {
                            xs: "0.85rem",
                            md: "0.95rem",
                          },
                          lineHeight: 1.5,
                        }}
                      >
                        {renderCellContent(row[key], key)}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* 卡片背面 */}
            {isFlipEnabled && (
              <Paper
                sx={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  borderRadius: 2,
                  boxShadow: 2,
                  transform: "rotateY(180deg)",
                  backgroundColor: "background.paper",
                  padding: {
                    xs: 2,
                    md: 3,
                  },
                  overflow: "auto",
                }}
              >
                {visibleColumns.map(([key, label], colIndex) => (
                  <Box
                    key={key}
                    sx={{
                      mb: colIndex < visibleColumns.length - 1 ? 2 : 0,
                      wordBreak: "break-word",
                      paddingBottom:
                        colIndex < visibleColumns.length - 1 ? 1 : 0,
                      borderBottom:
                        colIndex < visibleColumns.length - 1
                          ? (theme) => `1px solid ${theme.palette.divider}`
                          : "none",
                      transition:
                        "border-color var(--theme-transition-duration) ease",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        mb: 0.75,
                        fontSize: "0.85rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {String(label)}:
                    </Typography>
                    <Box
                      sx={{
                        ml: 0,
                        fontSize: "0.785rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {renderCellContent(row[key], key)}
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default CardView;
