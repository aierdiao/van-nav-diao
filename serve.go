package main

import (
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mereith/nav/logger"
)

// 编译时注入的构建时间戳，用于 index.html 的 Last-Modified
// go build -ldflags "-X main.Version=v2.3.0 -X main.buildTime=2025-06-07T00:00:00Z"
var buildTime string

// getBuildTime 解析 buildTime 字符串，失败则回退到固定基准时间
func getBuildTime() time.Time {
	if buildTime != "" {
		if t, err := time.Parse(time.RFC3339, buildTime); err == nil {
			return t
		}
	}
	// 回退：固定基准时间，保证 If-Modified-Since 协商链路可用
	return time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
}

// cacheControlWriter 包装 http.ResponseWriter，在 WriteHeader 前注入 Cache-Control
type cacheControlWriter struct {
	http.ResponseWriter
	wroteHeader bool
	urlPath     string
}

func (w *cacheControlWriter) WriteHeader(code int) {
	if !w.wroteHeader {
		w.Header().Set("Cache-Control", resolveCacheControl(w.urlPath))
		w.wroteHeader = true
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *cacheControlWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}

// resolveCacheControl 根据 URL 路径返回差异化缓存策略
func resolveCacheControl(urlPath string) string {
	// 1. 带哈希的不可变资产（/static/js/, /static/css/）
	if strings.HasPrefix(urlPath, "/static/js/") || strings.HasPrefix(urlPath, "/static/css/") {
		return "public, max-age=31536000, immutable"
	}

	// 2. 公共静态媒体资源
	ext := strings.ToLower(path.Ext(urlPath))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".ico", ".webp", ".svg":
		return "public, max-age=2592000"
	}

	// 3. 其他常规静态文件（.json, .txt 等）
	return "public, max-age=86400"
}

type ServeFileSystem interface {
	http.FileSystem
	Exists(prefix string, path string) bool
}

func Serve(urlPrefix string, fs ServeFileSystem) gin.HandlerFunc {
	fileserver := http.FileServer(fs)
	if urlPrefix != "" {
		fileserver = http.StripPrefix(urlPrefix, fileserver)
	}
	return func(c *gin.Context) {
		if fs.Exists(urlPrefix, c.Request.URL.Path) {
			// 路径 1：静态文件存在 → 包装 Writer 注入缓存头后直出
			w := &cacheControlWriter{
				ResponseWriter: c.Writer,
				urlPath:        c.Request.URL.Path,
			}
			fileserver.ServeHTTP(w, c.Request)
			c.Abort()
		} else {
			p := c.Request.URL.Path
			pathHasAPI := strings.Contains(p, "/api") && !strings.Contains(p, "/api-token")
			if pathHasAPI {
				return
			}
			// 路径 2：SPA 回退 → 返回 index.html + no-cache + 固定 modtime
			file, err := fs.Open("index.html")
			if err != nil {
				logger.LogError("文件不存在: %s", c.Request.URL.Path)
				return
			}
			defer file.Close()
			c.Header("Cache-Control", "no-cache")
			http.ServeContent(c.Writer, c.Request, "index.html", getBuildTime(), file)
			c.Abort()
		}
	}
}
