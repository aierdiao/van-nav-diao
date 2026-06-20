package service

import (
	"sync"
	"time"

	"github.com/mereith/nav/types"
)

// ==================== 首页数据缓存 ====================
// GetAllHandler 是前端首页的核心数据源，每次页面加载触发 4 次 DB 查询。
// 使用进程内 5 秒 TTL 缓存，大幅降低 DB 负载。

var (
	allDataCache    *cachedAllData
	allDataCacheMu  sync.RWMutex
	allDataCacheAt  time.Time
	allDataCacheTTL = 5 * time.Second
)

type cachedAllData struct {
	Tools      []types.Tool
	Catelogs   []types.Catelog
	TagSlugs   []types.TagSlug
	Setting    types.Setting
	SiteConfig types.SiteConfig
}

// GetAllDataCached 带 5 秒 TTL 缓存的首页全量数据获取
func GetAllDataCached() (*cachedAllData, error) {
	// 快速路径：读锁检查缓存
	allDataCacheMu.RLock()
	if allDataCache != nil && time.Since(allDataCacheAt) < allDataCacheTTL {
		data := allDataCache
		allDataCacheMu.RUnlock()
		return data, nil
	}
	allDataCacheMu.RUnlock()

	// 慢路径：写锁加载
	allDataCacheMu.Lock()
	defer allDataCacheMu.Unlock()

	// double-check：另一个 goroutine 可能已完成加载
	if allDataCache != nil && time.Since(allDataCacheAt) < allDataCacheTTL {
		return allDataCache, nil
	}

	tools, err := GetAllTool()
	if err != nil {
		return nil, err
	}
	catelogs, err := GetAllCatelog()
	if err != nil {
		return nil, err
	}
	tagSlugs, err := GetAllTagSlugs()
	if err != nil {
		return nil, err
	}
	setting, err := GetSetting()
	if err != nil {
		return nil, err
	}
	siteConfig, err := GetSiteConfig()
	if err != nil {
		return nil, err
	}

	allDataCache = &cachedAllData{
		Tools:      tools,
		Catelogs:   catelogs,
		TagSlugs:   tagSlugs,
		Setting:    setting,
		SiteConfig: siteConfig,
	}
	allDataCacheAt = time.Now()
	return allDataCache, nil
}

// InvalidateAllDataCache 使首页缓存失效（在数据变更时调用）
func InvalidateAllDataCache() {
	allDataCacheMu.Lock()
	allDataCache = nil
	allDataCacheMu.Unlock()
}
