import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import FastForwardIcon from "@mui/icons-material/FastForward";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import Forward10Icon from "@mui/icons-material/Forward10";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import HistoryIcon from "@mui/icons-material/History";
import MovieIcon from "@mui/icons-material/Movie";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay10Icon from "@mui/icons-material/Replay10";
import SearchIcon from "@mui/icons-material/Search";
import SourceIcon from "@mui/icons-material/Source";
import SpeedIcon from "@mui/icons-material/Speed";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { alpha, useTheme } from "@mui/material/styles";
import Hls from "hls.js";
import { defaultVideoData } from "../../lib/defaultVideoData";

interface VideoEpisode {
  name: string;
  url: string;
}

interface VideoItem {
  vod_id?: string;
  vod_name: string;
  vod_pic: string;
  vod_play_url: string;
  vod_remarks?: string;
  type_name?: string;
  vod_year?: string;
  vod_area?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_content?: string;
  sourceId: string;
  sourceName: string;
  episodes: VideoEpisode[];
}

interface VideoSource {
  id: string;
  name: string;
  searchUrl: string;
}

interface SearchHistoryItem {
  keyword: string;
  sourceId: string;
  sourceName: string;
  searchedAt: number;
}

interface ProgressRecord {
  id: string;
  sourceId: string;
  sourceName: string;
  videoName: string;
  poster: string;
  episodeName: string;
  episodeUrl: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

interface PlaybackContext {
  video: VideoItem;
  episode: VideoEpisode;
}

const SEARCH_HISTORY_STORAGE_KEY = "love-share-video-search-history";
const PROGRESS_STORAGE_KEY = "love-share-video-progress";
const SELECTED_SOURCE_STORAGE_KEY = "love-share-video-source";
const MAX_SEARCH_HISTORY = 10;
const MAX_PROGRESS_RECORDS = 5;
const PROGRESS_SAVE_INTERVAL = 5000;
const MIN_RESUME_SECONDS = 8;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (
  value: Record<string, unknown>,
  key: string,
  fallback = "",
) => {
  const rawValue = value[key];
  if (typeof rawValue === "string") return rawValue.trim();
  if (typeof rawValue === "number") return String(rawValue);
  return fallback;
};

const readStorageArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return [];

    const parsedValue: unknown = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error);
    return [];
  }
};

const writeStorageArray = <T,>(key: string, value: T[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key} to localStorage`, error);
  }
};

const readStorageValue = (key: string) => {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(key) || "";
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error);
    return "";
  }
};

const writeStorageValue = (key: string, value: string) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write ${key} to localStorage`, error);
  }
};

const normalizeSourceId = (name: string, index: number) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || `source-${index + 1}`;

const normalizeSource = (item: unknown, index: number): VideoSource | null => {
  if (!isRecord(item)) return null;

  const searchUrl = readString(item, "url") || readString(item, "searchUrl");
  if (!searchUrl) return null;

  const name = readString(item, "name", `片源 ${index + 1}`);
  const id = readString(item, "id", normalizeSourceId(name, index));

  return {
    id,
    name,
    searchUrl,
  };
};

const parseDelimitedSources = (rawValue: string): VideoSource[] =>
  rawValue
    .split(";")
    .map((entry, index) => {
      const [id, name, searchUrl] = entry.split("|").map((part) => part.trim());
      if (!searchUrl) return null;

      return {
        id: id || normalizeSourceId(name || searchUrl, index),
        name: name || `片源 ${index + 1}`,
        searchUrl,
      };
    })
    .filter((source): source is VideoSource => Boolean(source));

const withTemporaryBackupSource = (sources: VideoSource[]) => {
  if (sources.length !== 1) return sources;

  const source = sources[0];
  return [
    source,
    {
      id: `${source.id}-backup`,
      name: "备用源",
      searchUrl: source.searchUrl,
    },
  ];
};

const createVideoSources = (): VideoSource[] => {
  const configuredSources = import.meta.env.VITE_FILMTELEVISION_API_SOURCES;
  const fallbackUrl =
    import.meta.env.VITE_FILMTELEVISION_API_URL || "/api/vod?ac=videolist&wd=";

  if (configuredSources) {
    try {
      const parsedValue: unknown = JSON.parse(configuredSources);
      if (Array.isArray(parsedValue)) {
        const sources = parsedValue
          .map((item, index) => normalizeSource(item, index))
          .filter((source): source is VideoSource => Boolean(source));

        if (sources.length > 0) return withTemporaryBackupSource(sources);
      }
    } catch (error) {
      console.warn("Failed to parse VITE_FILMTELEVISION_API_SOURCES", error);

      const sources = parseDelimitedSources(configuredSources);
      if (sources.length > 0) return withTemporaryBackupSource(sources);
    }
  }

  return withTemporaryBackupSource([
    {
      id: "default",
      name: "默认源",
      searchUrl: fallbackUrl,
    },
  ]);
};

const VIDEO_SOURCES = createVideoSources();
const DEFAULT_VIDEO_SOURCE = VIDEO_SOURCES[0];
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

const buildSearchUrl = (source: VideoSource, keyword: string) => {
  const encodedKeyword = encodeURIComponent(keyword);

  if (source.searchUrl.includes("{keyword}")) {
    return source.searchUrl.replaceAll("{keyword}", encodedKeyword);
  }

  return `${source.searchUrl}${encodedKeyword}`;
};

// 外部 URL 自动走通用代理，避免跨域问题
const proxyUrl = (url: string) => {
  if (!url || url.startsWith("/")) return url;
  try {
    new URL(url);
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
};

const parsePlayUrl = (playUrl: string): VideoEpisode[] => {
  if (!playUrl) return [];

  return playUrl
    .split("#")
    .map((episode, index) => {
      const normalizedEpisode = episode.trim();
      if (!normalizedEpisode) return null;

      const separatorIndex = normalizedEpisode.indexOf("$");
      if (separatorIndex === -1) {
        return {
          name: `第 ${index + 1} 集`,
          url: normalizedEpisode,
        };
      }

      const name = normalizedEpisode.slice(0, separatorIndex).trim();
      const url = normalizedEpisode.slice(separatorIndex + 1).trim();
      if (!url) return null;

      return {
        name: name || `第 ${index + 1} 集`,
        url,
      };
    })
    .filter((episode): episode is VideoEpisode => Boolean(episode));
};

const normalizeVideoItem = (
  item: unknown,
  source: VideoSource,
): VideoItem | null => {
  if (!isRecord(item)) return null;

  const vodPlayUrl = readString(item, "vod_play_url");
  const episodes = parsePlayUrl(vodPlayUrl);
  if (episodes.length === 0) return null;

  return {
    vod_id: readString(item, "vod_id") || readString(item, "id"),
    vod_name: readString(item, "vod_name", "未命名影片"),
    vod_pic: readString(item, "vod_pic"),
    vod_play_url: vodPlayUrl,
    vod_remarks: readString(item, "vod_remarks"),
    type_name: readString(item, "type_name"),
    vod_year: readString(item, "vod_year"),
    vod_area: readString(item, "vod_area"),
    vod_actor: readString(item, "vod_actor"),
    vod_director: readString(item, "vod_director"),
    vod_content: readString(item, "vod_content"),
    sourceId: source.id,
    sourceName: source.name,
    episodes,
  };
};

const normalizeVideoResponse = (
  response: unknown,
  source: VideoSource,
): VideoItem[] => {
  const list =
    isRecord(response) && Array.isArray(response.list)
      ? response.list
      : Array.isArray(response)
        ? response
        : [];

  return list
    .map((item) => normalizeVideoItem(item, source))
    .filter((video): video is VideoItem => Boolean(video));
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const nextSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      nextSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(nextSeconds).padStart(2, "0")}`;
};

const formatUpdatedAt = (timestamp: number) =>
  new Date(timestamp).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getProgressId = (
  sourceId: string,
  videoName: string,
  episodeUrl: string,
) => `${sourceId}::${videoName}::${episodeUrl}`;

const getProgressPercent = (record: ProgressRecord) => {
  if (!record.duration || record.duration <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, (record.currentTime / record.duration) * 100),
  );
};

const fetchVideosFromSource = async (source: VideoSource, keyword: string) => {
  const response = await fetch(proxyUrl(buildSearchUrl(source, keyword)));
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data: unknown = await response.json();
  const videos = normalizeVideoResponse(data, source);
  if (videos.length === 0) {
    throw new Error("Empty API response");
  }

  return videos;
};

const normalizeComparableText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "");

const findMatchingVideo = (videos: VideoItem[], currentVideo: VideoItem) => {
  const currentName = normalizeComparableText(currentVideo.vod_name);

  return (
    videos.find(
      (video) => normalizeComparableText(video.vod_name) === currentName,
    ) ||
    videos.find((video) => {
      const candidateName = normalizeComparableText(video.vod_name);
      return (
        candidateName.includes(currentName) ||
        currentName.includes(candidateName)
      );
    }) ||
    videos[0]
  );
};

const findMatchingEpisode = (
  video: VideoItem,
  currentEpisode: VideoEpisode | undefined,
  currentEpisodeIndex: number,
) => {
  if (currentEpisode) {
    const currentName = normalizeComparableText(currentEpisode.name);
    const sameNameEpisode = video.episodes.find(
      (episode) => normalizeComparableText(episode.name) === currentName,
    );
    if (sameNameEpisode) return sameNameEpisode;
  }

  return video.episodes[currentEpisodeIndex] || video.episodes[0];
};

const VideoOnline: React.FC = () => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState(() => {
    const savedSourceId = readStorageValue(SELECTED_SOURCE_STORAGE_KEY);
    return (
      VIDEO_SOURCES.find((source) => source.id === savedSourceId)?.id ||
      DEFAULT_VIDEO_SOURCE.id
    );
  });
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() =>
    readStorageArray<SearchHistoryItem>(SEARCH_HISTORY_STORAGE_KEY).slice(
      0,
      MAX_SEARCH_HISTORY,
    ),
  );
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>(() =>
    readStorageArray<ProgressRecord>(PROGRESS_STORAGE_KEY)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_PROGRESS_RECORDS),
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState("");
  const [error, setError] = useState("");
  const [resumeNotice, setResumeNotice] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playbackRef = useRef<PlaybackContext | null>(null);
  const pendingResumeTimeRef = useRef<number | null>(null);
  const lastProgressSaveRef = useRef(0);
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const selectedSource = useMemo(
    () =>
      VIDEO_SOURCES.find((source) => source.id === selectedSourceId) ||
      DEFAULT_VIDEO_SOURCE,
    [selectedSourceId],
  );

  const selectedVideoIntro = useMemo(
    () => stripHtml(selectedVideo?.vod_content).slice(0, 180),
    [selectedVideo?.vod_content],
  );

  const resetPlayback = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.pause();
      videoElement.removeAttribute("src");
      videoElement.load();
    }

    playbackRef.current = null;
    pendingResumeTimeRef.current = null;
    setResumeNotice("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const applyResumePosition = useCallback(() => {
    const videoElement = videoRef.current;
    const resumeTime = pendingResumeTimeRef.current;
    if (!videoElement || !resumeTime || resumeTime < MIN_RESUME_SECONDS) return;

    const duration = Number.isFinite(videoElement.duration)
      ? videoElement.duration
      : 0;
    if (duration > 0 && resumeTime >= duration - 10) {
      pendingResumeTimeRef.current = null;
      return;
    }

    try {
      videoElement.currentTime = resumeTime;
      pendingResumeTimeRef.current = null;
      setResumeNotice(`已从 ${formatTime(resumeTime)} 继续播放`);
    } catch (error) {
      console.warn("Failed to resume video progress", error);
    }
  }, []);

  const addSearchHistory = useCallback(
    (keyword: string, source: VideoSource) => {
      const nextItem: SearchHistoryItem = {
        keyword,
        sourceId: source.id,
        sourceName: source.name,
        searchedAt: Date.now(),
      };

      setSearchHistory((previousHistory) => {
        const nextHistory = [
          nextItem,
          ...previousHistory.filter(
            (item) =>
              item.keyword !== keyword.trim() || item.sourceId !== source.id,
          ),
        ].slice(0, MAX_SEARCH_HISTORY);

        writeStorageArray(SEARCH_HISTORY_STORAGE_KEY, nextHistory);
        return nextHistory;
      });
    },
    [],
  );

  const playVideo = useCallback(
    (
      episode: VideoEpisode,
      video: VideoItem,
      options?: { resumeTime?: number; notice?: string },
    ) => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const progressId = getProgressId(
        video.sourceId,
        video.vod_name,
        episode.url,
      );
      const savedProgress = progressRecords.find(
        (record) => record.id === progressId,
      );
      const resumeTime =
        options?.resumeTime !== undefined &&
        Number.isFinite(options.resumeTime) &&
        options.resumeTime >= MIN_RESUME_SECONDS
          ? options.resumeTime
          : savedProgress?.currentTime;

      pendingResumeTimeRef.current =
        resumeTime && resumeTime >= MIN_RESUME_SECONDS ? resumeTime : null;
      playbackRef.current = { video, episode };
      lastProgressSaveRef.current = 0;

      setSelectedSourceId(video.sourceId);
      setSelectedVideo(video);
      setSelectedEpisode(episode.url);
      setResumeNotice(
        options?.notice
          ? options.notice
          : resumeTime && resumeTime >= MIN_RESUME_SECONDS
            ? `已找到上次进度 ${formatTime(resumeTime)}`
            : "",
      );

      videoElement.pause();
      videoElement.volume = volume;
      videoElement.muted = isMuted;
      videoElement.playbackRate = playbackRate;
      videoElement.removeAttribute("src");
      videoElement.load();

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(episode.url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          applyResumePosition();
          videoElement.play().catch(() => undefined);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setError("当前视频加载失败，请尝试切换分集或片源。");
          }
        });
        hlsRef.current = hls;
        return;
      }

      if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        const playWhenReady = () => {
          applyResumePosition();
          videoElement.play().catch(() => undefined);
        };

        videoElement.src = episode.url;
        videoElement.addEventListener("loadedmetadata", playWhenReady, {
          once: true,
        });
        videoElement.load();
        return;
      }

      setError("当前浏览器不支持 HLS 播放。");
    },
    [applyResumePosition, isMuted, playbackRate, progressRecords, volume],
  );

  const saveCurrentProgress = useCallback((force = false) => {
    const playback = playbackRef.current;
    const videoElement = videoRef.current;
    if (!playback || !videoElement) return;

    const currentTime = videoElement.currentTime;
    if (!Number.isFinite(currentTime) || currentTime < MIN_RESUME_SECONDS) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastProgressSaveRef.current < PROGRESS_SAVE_INTERVAL) {
      return;
    }

    lastProgressSaveRef.current = now;

    const duration = Number.isFinite(videoElement.duration)
      ? videoElement.duration
      : 0;
    const record: ProgressRecord = {
      id: getProgressId(
        playback.video.sourceId,
        playback.video.vod_name,
        playback.episode.url,
      ),
      sourceId: playback.video.sourceId,
      sourceName: playback.video.sourceName,
      videoName: playback.video.vod_name,
      poster: playback.video.vod_pic,
      episodeName: playback.episode.name,
      episodeUrl: playback.episode.url,
      currentTime,
      duration,
      updatedAt: now,
    };

    setProgressRecords((previousRecords) => {
      const nextRecords = [
        record,
        ...previousRecords.filter(
          (item) =>
            item.id !== record.id &&
            normalizeComparableText(item.videoName) !==
              normalizeComparableText(record.videoName),
        ),
      ].slice(0, MAX_PROGRESS_RECORDS);

      writeStorageArray(PROGRESS_STORAGE_KEY, nextRecords);
      return nextRecords;
    });
  }, []);

  const syncVideoTime = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    setCurrentTime(
      Number.isFinite(videoElement.currentTime) ? videoElement.currentTime : 0,
    );
    setDuration(
      Number.isFinite(videoElement.duration) ? videoElement.duration : 0,
    );
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    syncVideoTime();
    applyResumePosition();
  }, [applyResumePosition, syncVideoTime]);

  const togglePlay = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !selectedVideo) return;

    if (videoElement.paused) {
      videoElement.play().catch(() => undefined);
      return;
    }

    videoElement.pause();
  }, [selectedVideo]);

  const seekBy = useCallback((seconds: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const nextTime = Math.min(
      Math.max(videoElement.currentTime + seconds, 0),
      Number.isFinite(videoElement.duration)
        ? videoElement.duration
        : videoElement.currentTime + seconds,
    );

    videoElement.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const handleSeekChange = useCallback((_: Event, value: number | number[]) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const nextTime = Array.isArray(value) ? value[0] : value;
    videoElement.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const handleVolumeChange = useCallback(
    (_: Event, value: number | number[]) => {
      const videoElement = videoRef.current;
      const nextVolume = Array.isArray(value) ? value[0] : value;

      setVolume(nextVolume);
      setIsMuted(nextVolume === 0);

      if (videoElement) {
        videoElement.volume = nextVolume;
        videoElement.muted = nextVolume === 0;
      }
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const videoElement = videoRef.current;
    const nextMuted = !isMuted;

    setIsMuted(nextMuted);
    if (videoElement) {
      videoElement.muted = nextMuted;
      if (!nextMuted && volume === 0) {
        videoElement.volume = 0.8;
        setVolume(0.8);
      }
    }
  }, [isMuted, volume]);

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate =
      PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length] || 1;
    const videoElement = videoRef.current;

    setPlaybackRate(nextRate);
    if (videoElement) {
      videoElement.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const toggleFullscreen = useCallback(() => {
    const playerElement = playerContainerRef.current;
    if (!playerElement) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      return;
    }

    playerElement.requestFullscreen().catch(() => undefined);
  }, []);

  const CONTROLS_HIDE_DELAY = 3000;

  const startControlsHideTimer = useCallback(() => {
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
    }
    controlsHideTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_DELAY);
  }, [isPlaying]);

  const handlePlayerMouseMove = useCallback(() => {
    setShowControls(true);
    startControlsHideTimer();
  }, [startControlsHideTimer]);

  const handleSearch = useCallback(
    async (keywordOverride?: string, sourceOverride?: VideoSource) => {
      const keyword = (keywordOverride ?? searchTerm).trim();
      const source = sourceOverride ?? DEFAULT_VIDEO_SOURCE;
      if (!keyword) return;

      saveCurrentProgress(true);
      setSearchTerm(keyword);
      setSelectedSourceId(source.id);
      setIsSearching(true);
      setHasSearched(true);
      setError("");
      addSearchHistory(keyword, source);

      try {
        setVideoList(
          (await fetchVideosFromSource(source, keyword)).slice(0, 12),
        );
        resetPlayback();
        setSelectedVideo(null);
        setSelectedEpisode("");
      } catch (error) {
        console.error("Search error:", error);
        const fallbackVideos = normalizeVideoResponse(
          defaultVideoData,
          source,
        ).slice(0, 12);

        setError("接口请求失败，已临时展示本地备用片单。");
        setVideoList(fallbackVideos);
        resetPlayback();
        setSelectedVideo(null);
        setSelectedEpisode("");
      } finally {
        setIsSearching(false);
      }
    },
    [addSearchHistory, resetPlayback, saveCurrentProgress, searchTerm],
  );

  const handleHistoryClick = useCallback(
    (item: SearchHistoryItem) => {
      void handleSearch(item.keyword, DEFAULT_VIDEO_SOURCE);
    },
    [handleSearch],
  );

  const handleSwitchSource = useCallback(
    async (source: VideoSource) => {
      if (!selectedVideo || source.id === selectedVideo.sourceId) return;

      const currentEpisode =
        playbackRef.current?.episode ||
        selectedVideo.episodes.find(
          (episode) => episode.url === selectedEpisode,
        ) ||
        selectedVideo.episodes[0];
      const currentEpisodeIndex = Math.max(
        0,
        selectedVideo.episodes.findIndex(
          (episode) => episode.url === currentEpisode?.url,
        ),
      );
      const currentTime = Number.isFinite(videoRef.current?.currentTime)
        ? videoRef.current?.currentTime || 0
        : 0;

      saveCurrentProgress(true);
      setIsSwitchingSource(true);
      setError("");

      try {
        const videos = (
          await fetchVideosFromSource(source, selectedVideo.vod_name)
        ).slice(0, 12);
        const nextVideo = findMatchingVideo(videos, selectedVideo);
        const nextEpisode = nextVideo
          ? findMatchingEpisode(nextVideo, currentEpisode, currentEpisodeIndex)
          : undefined;

        if (!nextVideo || !nextEpisode) {
          throw new Error("No matching video or episode");
        }

        setSelectedSourceId(source.id);
        setHasSearched(true);
        setSearchTerm(selectedVideo.vod_name);
        setVideoList(videos);
        playVideo(nextEpisode, nextVideo, {
          resumeTime: currentTime,
          notice:
            currentTime >= MIN_RESUME_SECONDS
              ? `已切换到 ${source.name}，从 ${formatTime(
                  currentTime,
                )} 继续播放`
              : `已切换到 ${source.name}`,
        });
      } catch (error) {
        console.error("Switch source error:", error);
        setError(`未能从 ${source.name} 加载同名影片，请稍后再试。`);
      } finally {
        setIsSwitchingSource(false);
      }
    },
    [playVideo, saveCurrentProgress, selectedEpisode, selectedVideo],
  );

  const handleContinueWatching = useCallback(
    async (record: ProgressRecord) => {
      const source =
        VIDEO_SOURCES.find((candidate) => candidate.id === record.sourceId) ||
        selectedSource;

      setSelectedSourceId(source.id);
      setIsSearching(true);
      setError("");

      try {
        const videos = (
          await fetchVideosFromSource(source, record.videoName)
        ).slice(0, 12);
        const matchedVideo = findMatchingVideo(videos, {
          vod_name: record.videoName,
        } as VideoItem);

        if (!matchedVideo || matchedVideo.episodes.length === 0) {
          throw new Error("No matching video found");
        }

        // 在采集到的集数列表中查找对应的集
        let targetEpisode = matchedVideo.episodes.find(
          (ep) => ep.url === record.episodeUrl,
        );
        if (!targetEpisode) {
          // URL 不匹配时按名称模糊匹配
          targetEpisode = matchedVideo.episodes.find((ep) =>
            normalizeComparableText(ep.name).includes(
              normalizeComparableText(record.episodeName),
            ),
          );
        }
        if (!targetEpisode) {
          targetEpisode = matchedVideo.episodes[0];
        }

        setHasSearched(true);
        setVideoList(videos);
        playVideo(targetEpisode, matchedVideo, {
          resumeTime: record.currentTime,
          notice:
            record.currentTime >= MIN_RESUME_SECONDS
              ? `已从 ${formatTime(record.currentTime)} 继续播放`
              : "",
        });
      } catch (error) {
        console.error("Continue watching error:", error);
        setError("加载观看记录失败，请尝试手动搜索。");
      } finally {
        setIsSearching(false);
      }
    },
    [playVideo, selectedSource],
  );

  const handleCloseSearchResults = useCallback(() => {
    saveCurrentProgress(true);
    setHasSearched(false);
    setVideoList([]);
    setSearchTerm("");
    setSelectedVideo(null);
    setSelectedEpisode("");
    setError("");
    resetPlayback();
  }, [resetPlayback, saveCurrentProgress]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    writeStorageArray<SearchHistoryItem>(SEARCH_HISTORY_STORAGE_KEY, []);
  }, []);

  const clearProgressRecords = useCallback(() => {
    setProgressRecords([]);
    writeStorageArray<ProgressRecord>(PROGRESS_STORAGE_KEY, []);
  }, []);

  const findEpisodeProgress = useCallback(
    (video: VideoItem, episode: VideoEpisode) =>
      progressRecords.find(
        (record) =>
          record.id ===
          getProgressId(video.sourceId, video.vod_name, episode.url),
      ),
    [progressRecords],
  );

  useEffect(() => {
    writeStorageValue(SELECTED_SOURCE_STORAGE_KEY, selectedSource.id);
  }, [selectedSource.id]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.volume = volume;
    videoElement.muted = isMuted;
    videoElement.playbackRate = playbackRate;
  }, [isMuted, playbackRate, volume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === playerContainerRef.current,
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startControlsHideTimer();
    } else {
      setShowControls(true);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    }
    return () => {
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
      }
    };
  }, [isPlaying, startControlsHideTimer]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1440,
        mx: "auto",
        px: { xs: 1, sm: 1.5, md: 3 },
        py: { xs: 1, sm: 1.5, md: 2.5 },
      }}
    >
      <Stack spacing={2.5}>
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <VideoLibraryIcon color="primary" />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontSize: { xs: "1.5rem", sm: "1.8rem", md: "2.125rem" },
                  fontWeight: 700,
                }}
              >
                在线影视
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              请勿相信视频中的广告，搜索结果来自网络接口，仅供学习交流。
            </Typography>
          </Box>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 1,
            bgcolor: alpha(theme.palette.background.paper, 0.86),
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="搜索片名、演员或关键词"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSearch();
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="contained"
                onClick={() => void handleSearch()}
                disabled={isSearching}
                startIcon={
                  isSearching ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <SearchIcon />
                  )
                }
                sx={{ minWidth: { xs: "100%", md: 116 } }}
              >
                搜索
              </Button>
            </Stack>

            {searchHistory.length > 0 && (
              <>
                <Divider />
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ flexWrap: "wrap", rowGap: 1 }}
                >
                  <HistoryIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    最近搜索
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {searchHistory.map((item) => (
                      <Chip
                        key={`${item.sourceId}-${item.keyword}-${item.searchedAt}`}
                        label={
                          item.sourceId === selectedSource.id
                            ? item.keyword
                            : `${item.keyword} · ${item.sourceName}`
                        }
                        size="small"
                        variant="outlined"
                        onClick={() => handleHistoryClick(item)}
                        sx={{ borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                  <Tooltip title="清空搜索记录">
                    <IconButton
                      size="small"
                      onClick={clearSearchHistory}
                      aria-label="清空搜索记录"
                    >
                      <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>

        {error && (
          <Alert severity="warning" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: selectedVideo || !hasSearched ? "grid" : "none",
            gridTemplateColumns: selectedVideo
              ? { xs: "1fr", lg: "minmax(0, 1fr) 340px" }
              : "1fr",
            gap: { xs: 1.5, md: 2 },
            alignItems: "start",
          }}
        >
          <Stack spacing={2} sx={{ display: selectedVideo ? "flex" : "none" }}>
            <Paper
              ref={playerContainerRef}
              variant="outlined"
              onMouseMove={handlePlayerMouseMove}
              sx={{
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: "#050505",
                borderColor: alpha(theme.palette.common.white, 0.14),
                "&:fullscreen": {
                  borderRadius: 0,
                  border: 0,
                  width: "100vw",
                  height: "100vh",
                },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  aspectRatio: isFullscreen ? "auto" : "16 / 9",
                  height: isFullscreen ? "100vh" : "auto",
                }}
              >
                <video
                  ref={videoRef}
                  poster={selectedVideo?.vod_pic || undefined}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "contain",
                    backgroundColor: "#050505",
                  }}
                  onClick={togglePlay}
                  onDoubleClick={toggleFullscreen}
                  onLoadedMetadata={handleLoadedMetadata}
                  onDurationChange={syncVideoTime}
                  onPlay={() => setIsPlaying(true)}
                  onTimeUpdate={() => {
                    syncVideoTime();
                    saveCurrentProgress(false);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    saveCurrentProgress(true);
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    saveCurrentProgress(true);
                  }}
                />
                {selectedVideo && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      p: { xs: 0.75, sm: 1.25 },
                      color: theme.palette.common.white,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.86), rgba(0,0,0,0.35), rgba(0,0,0,0))",
                      opacity: showControls ? 1 : 0,
                      visibility: showControls ? "visible" : "hidden",
                      transition: "opacity 0.3s ease, visibility 0.3s ease",
                      pointerEvents: showControls ? "auto" : "none",
                    }}
                  >
                    <Slider
                      aria-label="播放进度"
                      size="small"
                      value={duration > 0 ? Math.min(currentTime, duration) : 0}
                      min={0}
                      max={duration || 0}
                      step={1}
                      disabled={!duration}
                      onChange={handleSeekChange}
                      sx={{
                        color: theme.palette.primary.light,
                        mb: { xs: 0, sm: 0.5 },
                        "& .MuiSlider-thumb": {
                          width: { xs: 12, sm: 14 },
                          height: { xs: 12, sm: 14 },
                        },
                      }}
                    />
                    <Stack
                      direction="row"
                      spacing={0}
                      alignItems="center"
                      sx={{
                        gap: { xs: 0.25, sm: 0.75 },
                        overflowX: "auto",
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": { display: "none" },
                      }}
                    >
                      <Tooltip title={isPlaying ? "暂停" : "播放"}>
                        <IconButton
                          size="small"
                          onClick={togglePlay}
                          aria-label={isPlaying ? "暂停" : "播放"}
                          sx={{
                            color: "inherit",
                            width: { xs: 34, sm: 38 },
                            height: { xs: 34, sm: 38 },
                          }}
                        >
                          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="后退 10 秒">
                        <IconButton
                          size="small"
                          onClick={() => seekBy(-10)}
                          aria-label="后退 10 秒"
                          sx={{
                            color: "inherit",
                            width: { xs: 34, sm: 38 },
                            height: { xs: 34, sm: 38 },
                          }}
                        >
                          <Replay10Icon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="前进 10 秒">
                        <IconButton
                          size="small"
                          onClick={() => seekBy(10)}
                          aria-label="前进 10 秒"
                          sx={{
                            color: "inherit",
                            width: { xs: 34, sm: 38 },
                            height: { xs: 34, sm: 38 },
                          }}
                        >
                          <Forward10Icon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="后退 30 秒">
                        <IconButton
                          size="small"
                          onClick={() => seekBy(-30)}
                          aria-label="后退 30 秒"
                          sx={{
                            color: "inherit",
                            display: { xs: "none", sm: "inline-flex" },
                            width: 38,
                            height: 38,
                          }}
                        >
                          <FastRewindIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="前进 30 秒">
                        <IconButton
                          size="small"
                          onClick={() => seekBy(30)}
                          aria-label="前进 30 秒"
                          sx={{
                            color: "inherit",
                            display: { xs: "none", sm: "inline-flex" },
                            width: 38,
                            height: 38,
                          }}
                        >
                          <FastForwardIcon />
                        </IconButton>
                      </Tooltip>
                      <Typography
                        variant="caption"
                        sx={{
                          minWidth: { xs: 86, sm: 108 },
                          whiteSpace: "nowrap",
                          fontSize: { xs: "0.68rem", sm: "0.75rem" },
                          color: alpha(theme.palette.common.white, 0.86),
                        }}
                      >
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 8 }} />
                      <Tooltip title={isMuted ? "取消静音" : "静音"}>
                        <IconButton
                          size="small"
                          onClick={toggleMute}
                          aria-label={isMuted ? "取消静音" : "静音"}
                          sx={{
                            color: "inherit",
                            width: { xs: 34, sm: 38 },
                            height: { xs: 34, sm: 38 },
                          }}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeOffIcon />
                          ) : (
                            <VolumeUpIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Slider
                        aria-label="音量"
                        size="small"
                        value={isMuted ? 0 : volume}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={handleVolumeChange}
                        sx={{
                          display: { xs: "none", sm: "block" },
                          width: 112,
                          color: theme.palette.primary.light,
                        }}
                      />
                      <Tooltip title="切换播放速度">
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<SpeedIcon />}
                          onClick={cyclePlaybackRate}
                          sx={{
                            minWidth: { xs: 54, sm: 76 },
                            color: "inherit",
                            textTransform: "none",
                            px: { xs: 0.5, sm: 1 },
                            "& .MuiButton-startIcon": {
                              display: { xs: "none", sm: "inherit" },
                            },
                          }}
                        >
                          {playbackRate}x
                        </Button>
                      </Tooltip>
                      <Tooltip title={isFullscreen ? "退出全屏" : "全屏"}>
                        <IconButton
                          size="small"
                          onClick={toggleFullscreen}
                          aria-label={isFullscreen ? "退出全屏" : "全屏"}
                          sx={{
                            color: "inherit",
                            width: { xs: 34, sm: 38 },
                            height: { xs: 34, sm: 38 },
                          }}
                        >
                          {isFullscreen ? (
                            <FullscreenExitIcon />
                          ) : (
                            <FullscreenIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                )}
                {!selectedVideo && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      color: alpha(theme.palette.common.white, 0.78),
                      textAlign: "center",
                      px: 2,
                    }}
                  >
                    <Stack spacing={1} alignItems="center">
                      <MovieIcon sx={{ fontSize: 46 }} />
                      <Typography variant="subtitle1">
                        搜索影片后开始播放
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Box>
            </Paper>

            {resumeNotice && (
              <Alert severity="info" onClose={() => setResumeNotice("")}>
                {resumeNotice}
              </Alert>
            )}

            {selectedVideo && (
              <Paper
                variant="outlined"
                sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 1 }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    spacing={{ xs: 1.25, sm: 2 }}
                    alignItems="flex-start"
                  >
                    {selectedVideo.vod_pic && (
                      <Box
                        component="img"
                        src={selectedVideo.vod_pic}
                        alt={selectedVideo.vod_name}
                        sx={{
                          width: { xs: 84, sm: 118 },
                          flexShrink: 0,
                          aspectRatio: "2 / 3",
                          objectFit: "cover",
                          borderRadius: 1,
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      />
                    )}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flexWrap: "wrap", rowGap: 1 }}
                      >
                        <Typography
                          variant="h5"
                          component="h2"
                          sx={{
                            fontSize: { xs: "1.1rem", sm: "1.5rem" },
                            fontWeight: 700,
                            minWidth: 0,
                          }}
                        >
                          {selectedVideo.vod_name}
                        </Typography>
                        {selectedVideo.vod_remarks && (
                          <Chip
                            label={selectedVideo.vod_remarks}
                            color="primary"
                            size="small"
                            sx={{ borderRadius: 1 }}
                          />
                        )}
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap", rowGap: 1, mt: 1 }}
                      >
                        <Chip
                          label={selectedVideo.sourceName}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                        {selectedVideo.type_name && (
                          <Chip
                            label={selectedVideo.type_name}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        )}
                        {selectedVideo.vod_year && (
                          <Chip
                            label={selectedVideo.vod_year}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        )}
                        {selectedVideo.vod_area && (
                          <Chip
                            label={selectedVideo.vod_area}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        )}
                      </Stack>
                      {selectedVideoIntro && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1.5 }}
                        >
                          {selectedVideoIntro}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {VIDEO_SOURCES.length > 1 && (
                    <Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 1.25 }}
                      >
                        <SourceIcon fontSize="small" color="primary" />
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700 }}
                        >
                          片源
                        </Typography>
                        {isSwitchingSource && (
                          <CircularProgress size={16} color="inherit" />
                        )}
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap", rowGap: 1 }}
                      >
                        {VIDEO_SOURCES.map((source) => {
                          const isActiveSource =
                            selectedVideo.sourceId === source.id;

                          return (
                            <Chip
                              key={source.id}
                              label={source.name}
                              color={isActiveSource ? "primary" : "default"}
                              variant={isActiveSource ? "filled" : "outlined"}
                              onClick={
                                isActiveSource || isSwitchingSource
                                  ? undefined
                                  : () => void handleSwitchSource(source)
                              }
                              disabled={isSwitchingSource && !isActiveSource}
                              clickable={!isSwitchingSource && !isActiveSource}
                              sx={{ borderRadius: 1 }}
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                  )}

                  <Divider />

                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: 1.25 }}
                    >
                      <PlayArrowIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        选集
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        共 {selectedVideo.episodes.length} 集
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        maxHeight: 180,
                        overflowY: "auto",
                        pr: 0.5,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap", rowGap: 1 }}
                      >
                        {selectedVideo.episodes.map((episode, index) => {
                          const episodeProgress = findEpisodeProgress(
                            selectedVideo,
                            episode,
                          );
                          const isSelected = selectedEpisode === episode.url;

                          return (
                            <Tooltip
                              key={`${episode.url}-${index}`}
                              title={
                                episodeProgress
                                  ? `上次看到 ${formatTime(
                                      episodeProgress.currentTime,
                                    )}`
                                  : ""
                              }
                            >
                              <Chip
                                icon={
                                  isSelected ? <PlayArrowIcon /> : undefined
                                }
                                label={episode.name}
                                color={isSelected ? "primary" : "default"}
                                variant={isSelected ? "filled" : "outlined"}
                                onClick={() =>
                                  playVideo(episode, selectedVideo)
                                }
                                clickable
                                sx={{ borderRadius: 1 }}
                              />
                            </Tooltip>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            )}
          </Stack>

          <Paper
            variant="outlined"
            sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 1 }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTimeIcon fontSize="small" color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                  继续观看
                </Typography>
                {progressRecords.length > 0 && (
                  <Tooltip title="清空观看记录">
                    <IconButton
                      size="small"
                      onClick={clearProgressRecords}
                      aria-label="清空观看记录"
                    >
                      <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>

              {progressRecords.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无观看记录
                </Typography>
              ) : (
                progressRecords.map((record) => (
                  <Box
                    key={record.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "58px minmax(0, 1fr)",
                      gap: 1.25,
                      p: 1,
                      borderRadius: 1,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 58,
                        aspectRatio: "2 / 3",
                        borderRadius: 1,
                        overflow: "hidden",
                        bgcolor: alpha(theme.palette.text.primary, 0.08),
                      }}
                    >
                      {record.poster ? (
                        <Box
                          component="img"
                          src={record.poster}
                          alt={record.videoName}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: "100%",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <MovieIcon fontSize="small" color="action" />
                        </Box>
                      )}
                    </Box>
                    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {record.videoName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {record.episodeName} · {formatTime(record.currentTime)}{" "}
                        · {record.sourceName}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getProgressPercent(record)}
                        sx={{ borderRadius: 1, height: 6 }}
                      />
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {formatUpdatedAt(record.updatedAt)}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleContinueWatching(record)}
                        >
                          继续
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          </Paper>
        </Box>

        {hasSearched && (
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                搜索结果
              </Typography>
              {videoList.length > 0 && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {videoList.length} 个结果
                  </Typography>
                  <Tooltip title="关闭搜索结果">
                    <IconButton
                      size="small"
                      onClick={handleCloseSearchResults}
                      aria-label="关闭搜索结果"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>

            {videoList.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 1,
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                <MovieIcon sx={{ fontSize: 38, mb: 1 }} />
                <Typography variant="body2">
                  输入关键词后显示匹配影片
                </Typography>
              </Paper>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(3, minmax(0, 1fr))",
                    md: "repeat(4, minmax(0, 1fr))",
                    lg: "repeat(6, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                {videoList.map((video, index) => (
                  <Card
                    key={video.vod_id || `${video.vod_name}-${index}`}
                    variant="outlined"
                    sx={{
                      borderRadius: 1,
                      overflow: "hidden",
                      height: "100%",
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        const firstEpisode = video.episodes[0];
                        if (firstEpisode) playVideo(firstEpisode, video);
                      }}
                      sx={{ height: "100%", alignItems: "stretch" }}
                    >
                      {video.vod_pic ? (
                        <CardMedia
                          component="img"
                          image={video.vod_pic}
                          alt={video.vod_name}
                          sx={{ aspectRatio: "2 / 3", objectFit: "cover" }}
                        />
                      ) : (
                        <Box
                          sx={{
                            aspectRatio: "2 / 3",
                            display: "grid",
                            placeItems: "center",
                            bgcolor: alpha(theme.palette.text.primary, 0.08),
                          }}
                        >
                          <MovieIcon color="action" />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1.25 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            minHeight: 40,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {video.vod_name}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}
                        >
                          <Chip
                            label={`${video.episodes.length} 集`}
                            size="small"
                            sx={{ borderRadius: 1 }}
                          />
                          {video.vod_remarks && (
                            <Chip
                              label={video.vod_remarks}
                              color="primary"
                              size="small"
                              sx={{ borderRadius: 1 }}
                            />
                          )}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default VideoOnline;
