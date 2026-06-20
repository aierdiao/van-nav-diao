package main

import (
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mereith/nav/logger"
)

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
			setStaticCacheHeaders(c, c.Request.URL.Path)
			fileserver.ServeHTTP(c.Writer, c.Request)
			c.Abort()
		} else {
			path := c.Request.URL.Path
			pathHasAPI := strings.HasPrefix(path, "/api/")
			if pathHasAPI {
				return
			} else {
				file, err := fs.Open("index.html")
				if err != nil {
					logger.LogError("文件不存在: %s", c.Request.URL.Path)
					return
				}
				defer file.Close()
				c.Header("Cache-Control", "no-cache")
				http.ServeContent(c.Writer, c.Request, "index.html", time.Time{}, file)
				c.Abort()
			}

		}
	}
}

func setStaticCacheHeaders(c *gin.Context, requestPath string) {
	ext := strings.ToLower(filepath.Ext(requestPath))
	if requestPath == "/" || ext == "" {
		c.Header("Cache-Control", "no-cache")
		return
	}
	switch ext {
	case ".js", ".css", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".woff", ".woff2":
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
	case ".html":
		c.Header("Cache-Control", "no-cache")
	}
}
