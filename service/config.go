package service

import (
	"time"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

// ExportFullConfig 导出所有配置
func ExportFullConfig() (*types.ExportConfigResponse, error) {
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

	searchEngines, err := database.GetAllSearchEngines()
	if err != nil {
		return nil, err
	}

	tokens, err := database.GetAllTokens()
	if err != nil {
		return nil, err
	}

	settings, err := database.GetAllSettings()
	if err != nil {
		return nil, err
	}

	siteConfig, err := database.GetSiteConfigAsMap()
	if err != nil {
		return nil, err
	}

	return &types.ExportConfigResponse{
		ExportTime:    time.Now().Format("2006-01-02T15:04:05Z"),
		Version:       "1.0",
		Tools:         tools,
		Catelogs:      catelogs,
		TagSlugs:      tagSlugs,
		SearchEngines: searchEngines,
		ApiTokens:     tokens,
		Settings:      settings,
		SiteConfig:    siteConfig,
	}, nil
}

// ImportFullConfig 导入全量配置
func ImportFullConfig(req types.ImportConfigRequest) types.ImportConfigResponse {
	result := types.ImportConfigResponse{
		Success: true,
		Errors:  make([]string, 0),
	}

	// 1. 导入分类（事务内先清空再插入）
	if err := database.InsertCatelogs(req.Catelogs); err != nil {
		result.Success = false
		result.Errors = append(result.Errors, "导入分类失败: "+err.Error())
		return result
	}
	result.CatelogsImported = len(req.Catelogs)

	// 2. 导入工具（事务内先清空再插入）
	if err := database.InsertTools(req.Tools); err != nil {
		result.Success = false
		result.Errors = append(result.Errors, "导入工具失败: "+err.Error())
		return result
	}
	result.ToolsImported = len(req.Tools)

	if len(req.TagSlugs) > 0 {
		if err := database.InsertTagSlugs(req.TagSlugs); err != nil {
			result.Success = false
			result.Errors = append(result.Errors, "导入标签 URL 失败: "+err.Error())
			return result
		}
		if err := database.EnsureTagSlugsFromTools(); err != nil {
			result.Errors = append(result.Errors, "补全标签 URL 失败: "+err.Error())
		}
		tagSlugs, _ := database.GetAllTagSlugs()
		result.TagSlugsImported = len(tagSlugs)
	} else if err := database.EnsureTagSlugsFromTools(); err != nil {
		result.Errors = append(result.Errors, "生成标签 URL 失败: "+err.Error())
	} else {
		tagSlugs, _ := database.GetAllTagSlugs()
		result.TagSlugsImported = len(tagSlugs)
	}

	// 3. 导入搜索引擎（事务内先清空再插入）
	if err := database.InsertSearchEngines(req.SearchEngines); err != nil {
		result.Success = false
		result.Errors = append(result.Errors, "导入搜索引擎失败: "+err.Error())
		return result
	}
	result.SearchEnginesImported = len(req.SearchEngines)

	// 4. 导入 API Token（按name去重）
	for _, token := range req.ApiTokens {
		if database.TokenExists(token.Name) {
			result.ApiTokensSkipped++
			continue
		}
		if err := database.InsertToken(token); err != nil {
			result.Errors = append(result.Errors, "导入Token '"+token.Name+"' 失败: "+err.Error())
			continue
		}
		result.ApiTokensImported++
	}

	// 5. 导入设置（合并更新）
	for key, value := range req.Settings {
		updated, err := database.UpdateSettingField(key, value)
		if err != nil {
			result.Errors = append(result.Errors, "更新设置 '"+key+"' 失败: "+err.Error())
			continue
		}
		if updated {
			result.SettingsUpdated++
		}
	}

	// 6. 导入网站配置（直接替换）
	if req.SiteConfig != nil && len(req.SiteConfig) > 0 {
		if err := database.UpdateSiteConfigFromMap(req.SiteConfig); err != nil {
			result.Errors = append(result.Errors, "更新网站配置失败: "+err.Error())
		} else {
			result.SiteConfigUpdated = 1
		}
	}

	if len(result.Errors) > 0 {
		result.Success = false
		result.Message = "部分导入完成，但有错误"
	} else {
		result.Message = "全部导入成功"
	}

	InvalidateAllDataCache()
	return result
}

// OrganizeDeadLinks 先检测再整理失效链接
func OrganizeDeadLinks() (int, []types.Tool, []types.Catelog, types.Setting, types.SiteConfig, error) {
	// 先检测所有链接刷新 is_alive
	CheckAllLinks()

	affected, err := database.OrganizeDeadLinks()
	if err != nil {
		return 0, nil, nil, types.Setting{}, types.SiteConfig{}, err
	}
	InvalidateAllDataCache()

	tools, err := GetAllTool()
	if err != nil {
		return 0, nil, nil, types.Setting{}, types.SiteConfig{}, err
	}
	catelogs, err := GetAllCatelog()
	if err != nil {
		return 0, nil, nil, types.Setting{}, types.SiteConfig{}, err
	}
	setting, err := GetSetting()
	if err != nil {
		return 0, nil, nil, types.Setting{}, types.SiteConfig{}, err
	}
	siteConfig, err := GetSiteConfig()
	if err != nil {
		return 0, nil, nil, types.Setting{}, types.SiteConfig{}, err
	}

	return affected, tools, catelogs, setting, siteConfig, nil
}
