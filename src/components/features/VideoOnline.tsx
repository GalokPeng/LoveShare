import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Input,
  Button,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Alert,
} from "@mui/material";
import Hls from "hls.js";
import { defaultVideoData } from "../../lib/defaultVideoData";

interface VideoItem {
  vod_name: string;
  vod_pic: string;
  vod_play_url: string;
  episodes: Array<{ name: string; url: string }>;
}

const VideoOnline: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // 解析vod_play_url为集数列表
  const parsePlayUrl = (
    playUrl: string
  ): Array<{ name: string; url: string }> => {
    return playUrl.split("#").map((episode) => {
      const [name, url] = episode.split("$");
      return { name, url };
    });
  };

  // 搜索视频
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setError(""); // 清空之前的错误信息
    try {
      const response = await fetch(
        `${import.meta.env.VITE_FILMTELEVISION_API_URL}${encodeURIComponent(
          searchTerm.trim()
        )}`
      );
      const data = await response.json();

      if (data.list && Array.isArray(data.list)) {
        // 获取前三个数据并解析
        const videos = data.list.slice(0, 3).map((item: any) => ({
          vod_name: item.vod_name,
          vod_pic: item.vod_pic,
          vod_play_url: item.vod_play_url,
          episodes: parsePlayUrl(item.vod_play_url),
        }));

        setVideoList(videos);

        // 默认选中第一个视频和第一集
        if (videos.length > 0) {
          setSelectedVideo(videos[0]);
          if (videos[0].episodes.length > 0) {
            setSelectedEpisode(videos[0].episodes[0].url);
            playVideo(videos[0].episodes[0].url);
          }
        }
      } else {
        // API返回格式不正确，使用默认数据
        throw new Error("Invalid API response format");
      }
    } catch (error) {
      console.error("Search error:", error);
      // 设置错误信息
      setError("API请求失败，正在使用默认视频数据");
      // API请求失败，使用默认视频数据
      const videos = defaultVideoData.list.map((item: any) => ({
        vod_name: item.vod_name,
        vod_pic: item.vod_pic,
        vod_play_url: item.vod_play_url,
        episodes: parsePlayUrl(item.vod_play_url),
      }));

      setVideoList(videos);

      // 默认选中第一个视频和第一集
      if (videos.length > 0) {
        setSelectedVideo(videos[0]);
        if (videos[0].episodes.length > 0) {
          setSelectedEpisode(videos[0].episodes[0].url);
          playVideo(videos[0].episodes[0].url);
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  // 播放视频
  const playVideo = (url: string) => {
    if (!videoRef.current) return;

    // 停止当前播放
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setSelectedEpisode(url);

    // 检查浏览器是否支持HLS
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play();
      });
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari原生支持HLS
      videoRef.current.src = url;
      videoRef.current.play();
    }
  };

  // 组件卸载时清理HLS实例
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  return (
    <Box sx={{ padding: 2, maxWidth: 1200, margin: "0 auto" }}>
      {/* 居中加粗 提示不要相信视频中的广告 */}
      <Typography variant="body2" sx={{ marginBottom: 2, fontWeight: 600 }}>
        请不要相信视频中的广告，视频搜索均来自网络，仅供学习和 entertainment
        purposes。
      </Typography>
      {/* 搜索区域 */}
      <Box sx={{ display: "flex", gap: 2, marginBottom: 3 }}>
        <Input
          placeholder="输入你想看的..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? <CircularProgress size={24} /> : "搜索"}
        </Button>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="warning" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* 视频播放器 */}
      <Box sx={{ marginBottom: 3 }}>
        <Box
          sx={{
            position: "relative",
            paddingTop: "56.25%",
            backgroundColor: "#000",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
            controls
          />
        </Box>
      </Box>

      {/* 视频信息和集数 */}
      {selectedVideo && (
        <Box
          sx={{
            marginBottom: 3,
            transition:
              "background-color var(--theme-transition-duration) ease",
          }}
        >
          <Card
            sx={{
              marginBottom: 2,
              transition:
                "background-color var(--theme-transition-duration) ease",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{ marginBottom: 1 }}
                >
                  {selectedVideo.vod_name}
                </Typography>
                <Box sx={{ marginTop: 2 }}>
                  <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
                    集数列表：
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 120,
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      "&::-webkit-scrollbar": { display: "none" },
                      position: "relative",
                      // 底部渐变遮罩，提示可继续滚动
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 24,
                        background:
                          "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.6))",
                        pointerEvents: "none",
                      },
                    }}
                  >
                    <Box
                      sx={{ display: "flex", flexWrap: "wrap", gap: 1, pb: 1 }}
                    >
                      {selectedVideo.episodes.map((episode, index) => (
                        <Chip
                          key={index}
                          label={episode.name}
                          onClick={() => playVideo(episode.url)}
                          color={
                            selectedEpisode === episode.url
                              ? "primary"
                              : "default"
                          }
                          clickable
                          sx={{ margin: "2px" }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Box>
          </Card>
        </Box>
      )}

      {/* 搜索结果列表 */}
      {videoList.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ marginBottom: 2 }}>
            搜索结果
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
              transition:
                "background-color var(--theme-transition-duration) ease",
            }}
          >
            {videoList.map((video, index) => (
              <Card
                key={index}
                onClick={() => {
                  setSelectedVideo(video);
                  if (video.episodes.length > 0) {
                    playVideo(video.episodes[0].url);
                  }
                }}
                sx={{
                  cursor: "pointer",
                  // 边框
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  transition:
                    "background-color var(--theme-transition-duration) ease",
                }}
              >
                <CardMedia
                  component="img"
                  height="388"
                  image={video.vod_pic}
                  alt={video.vod_name}
                  // 等比例缩放图片
                  sx={{ objectFit: "contain" }}
                />
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {video.vod_name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ marginTop: 1 }}
                  >
                    {video.episodes.length} 集
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VideoOnline;
