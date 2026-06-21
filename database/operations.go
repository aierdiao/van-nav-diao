package database

import (
	"database/sql"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

// ==================== API Token 内存缓存 ====================

var (
	apiTokenCache   sync.Map   // map[string]bool — 已启用的 token value 集合
	apiTokenLoaded  bool       // 缓存是否已加载
	apiTokenCacheMu sync.Mutex // 保护加载/失效操作
)

func normalizeSlugOrName(slug, name string) string {
	if cleaned := utils.Slugify(slug); cleaned != "" {
		return cleaned
	}
	if cleaned := utils.Slugify(name); cleaned != "" {
		return cleaned
	}
	return "item"
}

func uniqueCatelogSlugTx(tx *sql.Tx, desired string, excludeID int) (string, error) {
	base := desired
	if base == "" {
		base = "category"
	}
	for i := 0; ; i++ {
		candidate := base
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", base, i+1)
		}
		var count int
		err := tx.QueryRow(`SELECT COUNT(*) FROM nav_catelog WHERE slug = ? AND id != ?`, candidate, excludeID).Scan(&count)
		if err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
	}
}

func uniqueTagSlugTx(tx *sql.Tx, desired, name string) (string, error) {
	base := desired
	if base == "" {
		base = "tag"
	}
	for i := 0; ; i++ {
		candidate := base
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", base, i+1)
		}
		var count int
		err := tx.QueryRow(`SELECT COUNT(*) FROM nav_tag_slug WHERE slug = ? AND lower(name) != lower(?)`, candidate, name).Scan(&count)
		if err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
	}
}

// loadApiTokenCache 从数据库全量加载已启用的 Token 到内存
func loadApiTokenCache() {
	apiTokenCacheMu.Lock()
	defer apiTokenCacheMu.Unlock()
	// double-check: 可能另一个 goroutine 已经加载完毕
	if apiTokenLoaded {
		return
	}
	tokens, err := GetAllActiveApiTokens()
	if err != nil {
		logger.LogError("加载 Token 缓存失败: %v", err)
		return
	}
	// 清空旧缓存
	apiTokenCache = sync.Map{}
	for _, t := range tokens {
		apiTokenCache.Store(t.Value, true)
	}
	apiTokenLoaded = true
}

// InvalidateApiTokenCache 使 Token 缓存失效（在增删 Token 后调用）
func InvalidateApiTokenCache() {
	apiTokenCacheMu.Lock()
	defer apiTokenCacheMu.Unlock()
	apiTokenLoaded = false
	apiTokenCache = sync.Map{}
}

func HasApiToken(token string) bool {
	if !apiTokenLoaded {
		loadApiTokenCache()
	}
	_, ok := apiTokenCache.Load(token)
	return ok
}

// ==================== 搜索引擎相关操作 ====================

// 获取所有搜索引擎（按排序）
func GetAllSearchEngines() ([]types.SearchEngine, error) {
	sql := `SELECT id, name, urlTemplate, logo, sort, enabled, COALESCE(description, '') FROM nav_search_engine ORDER BY sort ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var engines = make([]types.SearchEngine, 0)
	for rows.Next() {
		var engine types.SearchEngine
		err := rows.Scan(&engine.Id, &engine.Name, &engine.UrlTemplate, &engine.Logo, &engine.Sort, &engine.Enabled, &engine.Description)
		if err != nil {
			return nil, err
		}
		engines = append(engines, engine)
	}
	return engines, nil
}

// 获取启用的搜索引擎（按排序）
func GetEnabledSearchEngines() ([]types.SearchEngine, error) {
	sql := `SELECT id, name, urlTemplate, logo, sort, enabled, COALESCE(description, '') FROM nav_search_engine WHERE enabled = 1 ORDER BY sort ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var engines = make([]types.SearchEngine, 0)
	for rows.Next() {
		var engine types.SearchEngine
		err := rows.Scan(&engine.Id, &engine.Name, &engine.UrlTemplate, &engine.Logo, &engine.Sort, &engine.Enabled, &engine.Description)
		if err != nil {
			return nil, err
		}
		engines = append(engines, engine)
	}
	return engines, nil
}

// 添加搜索引擎
func AddSearchEngine(engine types.SearchEngine) (int64, error) {
	var maxSort int
	err := DB.QueryRow(`SELECT COALESCE(MAX(sort), 0) FROM nav_search_engine`).Scan(&maxSort)
	if err != nil {
		return 0, err
	}

	sql := `INSERT INTO nav_search_engine (name, urlTemplate, logo, sort, enabled, description) VALUES (?, ?, ?, ?, ?, ?)`
	stmt, err := DB.Prepare(sql)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	result, err := stmt.Exec(engine.Name, engine.UrlTemplate, engine.Logo, maxSort+1, engine.Enabled, engine.Description)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// 更新搜索引擎
func UpdateSearchEngine(engine types.SearchEngine) error {
	sql := `UPDATE nav_search_engine SET name = ?, urlTemplate = ?, logo = ?, enabled = ?, description = ? WHERE id = ?`
	stmt, err := DB.Prepare(sql)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(engine.Name, engine.UrlTemplate, engine.Logo, engine.Enabled, engine.Description, engine.Id)
	return err
}

// 删除搜索引擎
func DeleteSearchEngine(id int) error {
	sql := `DELETE FROM nav_search_engine WHERE id = ?`
	stmt, err := DB.Prepare(sql)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(id)
	return err
}

// 更新搜索引擎排序
func UpdateSearchEngineSort(sortData []struct {
	Id   int `json:"id"`
	Sort int `json:"sort"`
}) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`UPDATE nav_search_engine SET sort = ? WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range sortData {
		_, err = stmt.Exec(item.Sort, item.Id)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// 更新分类排序
func UpdateCatelogSort(sortData []struct {
	Id   int `json:"id"`
	Sort int `json:"sort"`
}) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`UPDATE nav_catelog SET sort = ? WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range sortData {
		_, err = stmt.Exec(item.Sort, item.Id)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ==================== 导入导出相关数据库操作 ====================

// 获取所有 API Token
func GetAllTokens() ([]types.Token, error) {
	sql := `SELECT id, name, value, disabled FROM nav_api_token ORDER BY id ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens = make([]types.Token, 0)
	for rows.Next() {
		var token types.Token
		err := rows.Scan(&token.Id, &token.Name, &token.Value, &token.Disabled)
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	return tokens, nil
}

// 获取所有分类
func GetAllCatelogs() ([]types.Catelog, error) {
	sql := `SELECT id, name, COALESCE(slug, ''), sort, hide, COALESCE(metaTitle,''), COALESCE(metaDescription,''), COALESCE(metaKeywords,''), COALESCE(ogImage,'') FROM nav_catelog ORDER BY sort ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var catelogs = make([]types.Catelog, 0)
	for rows.Next() {
		var catelog types.Catelog
		var hide interface{}
		var sort interface{}
		err := rows.Scan(&catelog.Id, &catelog.Name, &catelog.Slug, &sort, &hide, &catelog.MetaTitle, &catelog.MetaDescription, &catelog.MetaKeywords, &catelog.OgImage)
		if err != nil {
			return nil, err
		}
		if hide == nil {
			catelog.Hide = false
		} else {
			catelog.Hide = hide.(int64) == 1
		}
		if sort == nil {
			catelog.Sort = 0
		} else {
			catelog.Sort = int(sort.(int64))
		}
		catelogs = append(catelogs, catelog)
	}
	return catelogs, nil
}

// 获取所有设置（键值对形式）
func GetAllSettings() (map[string]string, error) {
	sql := `SELECT id, favicon, title, logo192, logo512, hideAdmin, hideGithub, hideToggleJumpTarget, jumpTargetBlank, showSearchEngine, pcColumnCount, deployment_version, language, COALESCE(customCss,''), COALESCE(metaTitle,''), COALESCE(metaDescription,''), COALESCE(metaKeywords,''), COALESCE(ogImage,'') FROM nav_setting ORDER BY id ASC LIMIT 1`
	row := DB.QueryRow(sql)

	var setting types.Setting
	var hideGithub, hideAdmin, hideToggleJumpTarget, jumpTargetBlank, showSearchEngine interface{}
	var pcColumnCount interface{}
	var deploymentVersion, language, customCss, metaTitle, metaDescription, metaKeywords, ogImage string
	err := row.Scan(&setting.Id, &setting.Favicon, &setting.Title, &setting.Logo192, &setting.Logo512, &hideAdmin, &hideGithub, &hideToggleJumpTarget, &jumpTargetBlank, &showSearchEngine, &pcColumnCount, &deploymentVersion, &language, &customCss, &metaTitle, &metaDescription, &metaKeywords, &ogImage)
	if err != nil {
		return make(map[string]string), nil
	}

	settings := make(map[string]string)
	settings["favicon"] = setting.Favicon
	settings["title"] = setting.Title
	settings["logo192"] = setting.Logo192
	settings["logo512"] = setting.Logo512

	if hideAdmin != nil {
		if hideAdmin.(int64) == 1 {
			settings["hideAdmin"] = "true"
		} else {
			settings["hideAdmin"] = "false"
		}
	} else {
		settings["hideAdmin"] = "false"
	}
	if hideGithub != nil {
		if hideGithub.(int64) == 1 {
			settings["hideGithub"] = "true"
		} else {
			settings["hideGithub"] = "false"
		}
	} else {
		settings["hideGithub"] = "false"
	}
	if hideToggleJumpTarget != nil {
		if hideToggleJumpTarget.(int64) == 1 {
			settings["hideToggleJumpTarget"] = "true"
		} else {
			settings["hideToggleJumpTarget"] = "false"
		}
	} else {
		settings["hideToggleJumpTarget"] = "false"
	}
	if jumpTargetBlank != nil {
		if jumpTargetBlank.(int64) == 1 {
			settings["jumpTargetBlank"] = "true"
		} else {
			settings["jumpTargetBlank"] = "false"
		}
	} else {
		settings["jumpTargetBlank"] = "true"
	}
	// 搜索引擎显示开关
	if showSearchEngine != nil {
		if showSearchEngine.(int64) == 1 {
			settings["showSearchEngine"] = "true"
		} else {
			settings["showSearchEngine"] = "false"
		}
	} else {
		settings["showSearchEngine"] = "true"
	}
	// PC 端列数
	if pcColumnCount != nil {
		settings["pcColumnCount"] = fmt.Sprintf("%d", pcColumnCount.(int64))
	} else {
		settings["pcColumnCount"] = "3"
	}
	if customCss != "" {
		settings["customCss"] = customCss
	}
	settings["language"] = language
	settings["deploymentVersion"] = deploymentVersion
	settings["metaTitle"] = metaTitle
	settings["metaDescription"] = metaDescription
	settings["metaKeywords"] = metaKeywords
	settings["ogImage"] = ogImage

	return settings, nil
}

// 删除所有工具
func DeleteAllTools() error {
	_, err := DB.Exec(`DELETE FROM nav_table`)
	return err
}

// 删除所有分类
func DeleteAllCatelogs() error {
	_, err := DB.Exec(`DELETE FROM nav_catelog`)
	return err
}

// 删除所有搜索引擎
func DeleteAllSearchEngines() error {
	_, err := DB.Exec(`DELETE FROM nav_search_engine`)
	return err
}

// 批量插入工具（在事务内先清空再插入，避免 WAL 可见性问题）
func InsertTools(tools []types.Tool) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 在同一事务内先清空
	if _, err := tx.Exec(`DELETE FROM nav_table`); err != nil {
		return err
	}

	stmt, err := tx.Prepare(`INSERT INTO nav_table (name, url, logo, catelog, tags, desc, sort, catelog_sort, hide) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, tool := range tools {
		hide := 0
		if tool.Hide {
			hide = 1
		}
		_, err := stmt.Exec(tool.Name, tool.Url, tool.Logo, tool.Catelog, tool.Tags, tool.Desc, tool.Sort, tool.CatelogSort, hide)
		if err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return EnsureTagSlugsFromTools()
}

// 批量插入分类（在事务内先清空再插入，避免 WAL 可见性问题）
func InsertCatelogs(catelogs []types.Catelog) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 在同一事务内先清空
	if _, err := tx.Exec(`DELETE FROM nav_catelog`); err != nil {
		return err
	}

	stmt, err := tx.Prepare(`INSERT INTO nav_catelog (name, slug, sort, hide, metaTitle, metaDescription, metaKeywords, ogImage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, catelog := range catelogs {
		hide := 0
		if catelog.Hide {
			hide = 1
		}
		slug, err := uniqueCatelogSlugTx(tx, normalizeSlugOrName(catelog.Slug, catelog.Name), 0)
		if err != nil {
			return err
		}
		_, err = stmt.Exec(catelog.Name, slug, catelog.Sort, hide, catelog.MetaTitle, catelog.MetaDescription, catelog.MetaKeywords, catelog.OgImage)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// 批量插入搜索引擎（在事务内先清空再插入，避免 WAL 可见性问题）
func InsertSearchEngines(engines []types.SearchEngine) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 在同一事务内先清空
	if _, err := tx.Exec(`DELETE FROM nav_search_engine`); err != nil {
		return err
	}

	stmt, err := tx.Prepare(`INSERT INTO nav_search_engine (name, urlTemplate, logo, sort, enabled, description) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, engine := range engines {
		enabled := 1
		if !engine.Enabled {
			enabled = 0
		}
		_, err := stmt.Exec(engine.Name, engine.UrlTemplate, engine.Logo, engine.Sort, enabled, engine.Description)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// 检查 Token 是否存在
func TokenExists(name string) bool {
	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM nav_api_token WHERE name = ?`, name).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

// 插入 Token
func InsertToken(token types.Token) error {
	_, err := DB.Exec(`INSERT INTO nav_api_token (name, value, disabled) VALUES (?, ?, ?)`, token.Name, token.Value, token.Disabled)
	return err
}

// 更新设置字段，返回该字段是否属于当前版本支持的设置项。
func UpdateSettingField(key string, value string) (bool, error) {
	var sql string
	switch key {
	case "favicon":
		sql = `UPDATE nav_setting SET favicon = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "title":
		sql = `UPDATE nav_setting SET title = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "logo192":
		sql = `UPDATE nav_setting SET logo192 = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "logo512":
		sql = `UPDATE nav_setting SET logo512 = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "hideAdmin":
		sql = `UPDATE nav_setting SET hideAdmin = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "hideGithub":
		sql = `UPDATE nav_setting SET hideGithub = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "hideToggleJumpTarget":
		sql = `UPDATE nav_setting SET hideToggleJumpTarget = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "jumpTargetBlank":
		sql = `UPDATE nav_setting SET jumpTargetBlank = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "showSearchEngine":
		sql = `UPDATE nav_setting SET showSearchEngine = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "pcColumnCount":
		sql = `UPDATE nav_setting SET pcColumnCount = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "customCss":
		sql = `UPDATE nav_setting SET customCss = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "language":
		sql = `UPDATE nav_setting SET language = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "deploymentVersion":
		sql = `UPDATE nav_setting SET deployment_version = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "metaTitle":
		sql = `UPDATE nav_setting SET metaTitle = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "metaDescription":
		sql = `UPDATE nav_setting SET metaDescription = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "metaKeywords":
		sql = `UPDATE nav_setting SET metaKeywords = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "ogImage":
		sql = `UPDATE nav_setting SET ogImage = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	default:
		return false, nil
	}

	var val interface{}
	if value == "true" {
		val = 1
	} else if value == "false" {
		val = 0
	} else {
		val = value
	}

	_, err := DB.Exec(sql, val)
	return true, err
}

// GetSiteConfigAsMap 获取网站配置为 map
func GetSiteConfigAsMap() (map[string]interface{}, error) {
	sql := `SELECT id, noImageMode, compactMode, faviconApiEnabled, COALESCE(faviconApiTemplate, '') FROM nav_site_config ORDER BY id ASC LIMIT 1`
	row := DB.QueryRow(sql)

	var id int
	var noImageMode, compactMode, faviconApiEnabled interface{}
	var faviconApiTemplate string
	err := row.Scan(&id, &noImageMode, &compactMode, &faviconApiEnabled, &faviconApiTemplate)
	if err != nil {
		return make(map[string]interface{}), nil
	}

	cfg := make(map[string]interface{})
	cfg["id"] = id

	if noImageMode == nil {
		cfg["noImageMode"] = false
	} else {
		cfg["noImageMode"] = noImageMode.(int64) == 1
	}
	if compactMode == nil {
		cfg["compactMode"] = false
	} else {
		cfg["compactMode"] = compactMode.(int64) == 1
	}
	if faviconApiEnabled == nil {
		cfg["faviconApiEnabled"] = false
	} else {
		cfg["faviconApiEnabled"] = faviconApiEnabled.(int64) == 1
	}
	cfg["faviconApiTemplate"] = faviconApiTemplate

	return cfg, nil
}

// UpdateSiteConfigFromMap 从 map 更新网站配置
func UpdateSiteConfigFromMap(cfg map[string]interface{}) error {
	sql := `UPDATE nav_site_config SET noImageMode = ?, compactMode = ?, faviconApiEnabled = ?, faviconApiTemplate = ? WHERE id = (SELECT id FROM nav_site_config ORDER BY id ASC LIMIT 1)`

	toBool := func(v interface{}) int {
		switch val := v.(type) {
		case bool:
			if val {
				return 1
			}
			return 0
		case float64:
			if val != 0 {
				return 1
			}
			return 0
		case string:
			if val == "true" || val == "1" {
				return 1
			}
			return 0
		default:
			return 0
		}
	}

	noImageMode := toBool(cfg["noImageMode"])
	compactMode := toBool(cfg["compactMode"])
	faviconApiEnabled := toBool(cfg["faviconApiEnabled"])
	faviconApiTemplate := ""
	if v, ok := cfg["faviconApiTemplate"].(string); ok {
		faviconApiTemplate = v
	}

	_, err := DB.Exec(sql, noImageMode, compactMode, faviconApiEnabled, faviconApiTemplate)
	return err
}

// ==================== 部署版本相关操作 ====================

// ==================== 网站健康检测相关操作 ====================

// GetAllToolsForCheck 获取所有工具的 id、url、title（用于健康检测）
func GetAllToolsForCheck() ([]struct {
	Id    int
	Url   string
	Title string
}, error) {
	rows, err := DB.Query(`SELECT id, url, name FROM nav_table`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tools []struct {
		Id    int
		Url   string
		Title string
	}
	for rows.Next() {
		var t struct {
			Id    int
			Url   string
			Title string
		}
		if err := rows.Scan(&t.Id, &t.Url, &t.Title); err != nil {
			return nil, err
		}
		tools = append(tools, t)
	}
	return tools, nil
}

// UpdateLinkHealth 更新单条链接的健康状态
func UpdateLinkHealth(id int, alive bool) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	aliveInt := 0
	if alive {
		aliveInt = 1
	}
	_, err := DB.Exec(`UPDATE nav_table SET is_alive = ?, last_checked = ? WHERE id = ?`, aliveInt, now, id)
	return err
}

// BatchUpdateLinkHealth 批量更新链接健康状态（单次事务，替代 N 次独立 UPDATE）
func BatchUpdateLinkHealth(updates []struct {
	Id    int
	Alive bool
}) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`UPDATE nav_table SET is_alive = ?, last_checked = ? WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	now := time.Now().Format("2006-01-02 15:04:05")
	for _, u := range updates {
		aliveInt := 0
		if u.Alive {
			aliveInt = 1
		}
		if _, err := stmt.Exec(aliveInt, now, u.Id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// OrganizeDeadLinks 将失效链接的 sort 值设为最大值，使其排在末尾
func OrganizeDeadLinks() (int, error) {
	var maxSort int
	err := DB.QueryRow(`SELECT COALESCE(MAX(sort), 0) FROM nav_table`).Scan(&maxSort)
	if err != nil {
		return 0, err
	}
	newSort := maxSort + 100000
	result, err := DB.Exec(`UPDATE nav_table SET sort = ? WHERE is_alive = 0`, newSort)
	if err != nil {
		return 0, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(affected), nil
}

// GetDeploymentVersion 获取当前部署版本号
func GetDeploymentVersion() string {
	var version string
	err := DB.QueryRow(`SELECT COALESCE(deployment_version, '') FROM nav_setting ORDER BY id ASC LIMIT 1`).Scan(&version)
	if err != nil {
		return ""
	}
	if version == "" {
		return ""
	}
	return version
}

// IncrementDeploymentVersion 递增部署版本号（构建号 +1）
func IncrementDeploymentVersion() (string, error) {
	current := GetDeploymentVersion()

	// 解析版本号 v主版本.次版本.修订版本.构建号
	// 格式: v1.13.1.1 -> parts: [v1, 13, 1, 1]
	if current == "" || !strings.HasPrefix(current, "v") {
		// 无版本信息或格式异常，使用默认版本
		current = "v1.13.1.1"
	}

	parts := strings.Split(current, ".")
	if len(parts) != 4 {
		// 格式异常，重置为初始版本
		current = "v1.13.1.1"
		parts = strings.Split(current, ".")
	}

	// 递增构建号（最后一部分）
	buildNum, err := strconv.Atoi(parts[3])
	if err != nil {
		buildNum = 1
	}
	buildNum++

	newVersion := fmt.Sprintf("%s.%s.%s.%d", parts[0], parts[1], parts[2], buildNum)

	// 更新数据库
	_, err = DB.Exec(`UPDATE nav_setting SET deployment_version = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`, newVersion)
	if err != nil {
		return current, err
	}

	return newVersion, nil
}

// ==================== 重构新增：用户与认证操作 ====================

// GetUserByName 根据用户名查询用户
func GetUserByName(name string) (types.User, error) {
	var user types.User
	err := DB.QueryRow(`SELECT id, name, password FROM nav_user WHERE name = ?`, name).Scan(&user.Id, &user.Name, &user.Password)
	return user, err
}

// GetAllActiveApiTokens 获取所有未禁用的 API Token
func GetAllActiveApiTokens() ([]types.Token, error) {
	rows, err := DB.Query(`SELECT id, name, value, disabled FROM nav_api_token WHERE disabled = 0`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results = make([]types.Token, 0)
	for rows.Next() {
		var token types.Token
		if err := rows.Scan(&token.Id, &token.Name, &token.Value, &token.Disabled); err != nil {
			return nil, err
		}
		results = append(results, token)
	}
	return results, nil
}

// InsertApiToken 插入一条 API Token
func InsertApiToken(token types.Token) error {
	_, err := DB.Exec(`INSERT INTO nav_api_token (id, name, value, disabled) VALUES (?, ?, ?, ?)`,
		token.Id, token.Name, token.Value, token.Disabled)
	if err == nil {
		InvalidateApiTokenCache()
	}
	return err
}

// UpdateUserNameAndPassword 更新用户名和密码
func UpdateUserNameAndPassword(id int, name string, hashedPassword string) error {
	_, err := DB.Exec(`UPDATE nav_user SET name = ?, password = ?, token_version = COALESCE(token_version, 1) + 1 WHERE id = ?`, name, hashedPassword, id)
	return err
}

// DisableApiToken 软删除 API Token（设为 disabled）
func DisableApiToken(id string) error {
	_, err := DB.Exec(`UPDATE nav_api_token SET disabled = 1 WHERE id = ?`, id)
	if err == nil {
		InvalidateApiTokenCache()
	}
	return err
}

// UpdateUserPasswordById 更新指定用户的密码
func UpdateUserPasswordById(userId int, hashedPassword string) error {
	_, err := DB.Exec(`UPDATE nav_user SET password = ?, token_version = COALESCE(token_version, 1) + 1 WHERE id = ?`, hashedPassword, userId)
	return err
}

// ResetAdminPassword 重置管理员密码（main.go 专用）
func ResetAdminPassword(hashedPassword string) error {
	_, err := DB.Exec(`UPDATE nav_user SET password = ?, token_version = COALESCE(token_version, 1) + 1 WHERE id = (SELECT id FROM nav_user ORDER BY id ASC LIMIT 1)`, hashedPassword)
	return err
}

// GetUserTokenVersion returns the current login token version for a user.
func GetUserTokenVersion(uid int) int {
	var version int
	err := DB.QueryRow(`SELECT COALESCE(token_version, 1) FROM nav_user WHERE id = ?`, uid).Scan(&version)
	if err != nil {
		return 1
	}
	return version
}

// IncrementUserTokenVersion revokes existing login JWTs for the user.
func IncrementUserTokenVersion(uid int) error {
	_, err := DB.Exec(`UPDATE nav_user SET token_version = COALESCE(token_version, 1) + 1 WHERE id = ?`, uid)
	return err
}

// ==================== 重构新增：工具 CRUD 操作 ====================

// GetAllToolRows 查询所有工具（按 sort 排序）
func GetAllToolRows() ([]types.Tool, error) {
	rows, err := DB.Query(`SELECT id, name, url, logo, catelog, COALESCE(tags, ''), desc, sort, catelog_sort, hide, is_alive, last_checked FROM nav_table ORDER BY sort`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results = make([]types.Tool, 0)
	for rows.Next() {
		var tool types.Tool
		var hide, sortVal, catelogSortVal, isAlive, lastChecked interface{}
		if err := rows.Scan(&tool.Id, &tool.Name, &tool.Url, &tool.Logo, &tool.Catelog, &tool.Tags, &tool.Desc, &sortVal, &catelogSortVal, &hide, &isAlive, &lastChecked); err != nil {
			return nil, err
		}
		tool.Hide = hide != nil && hide.(int64) != 0
		if sortVal != nil {
			tool.Sort = int(sortVal.(int64))
		}
		if catelogSortVal != nil {
			tool.CatelogSort = int(catelogSortVal.(int64))
		}
		if isAlive == nil {
			alive := true
			tool.IsAlive = &alive
		} else {
			alive := isAlive.(int64) == 1
			tool.IsAlive = &alive
		}
		if lastChecked != nil {
			if t, ok := lastChecked.(time.Time); ok {
				tool.LastChecked = t.Format("2006-01-02 15:04:05")
			}
		}
		results = append(results, tool)
	}
	return results, nil
}

// InsertToolRow 插入一条工具记录，返回新 ID
func InsertToolRow(data types.AddToolDto) (int64, error) {
	tx, err := DB.Begin()
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()
	result, err := tx.Exec(`INSERT INTO nav_table (name, url, logo, catelog, tags, desc, sort, catelog_sort, hide) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		data.Name, data.Url, data.Logo, data.Catelog, data.Tags, data.Desc, data.Sort, data.CatelogSort, data.Hide)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

// UpdateToolRow 全字段更新工具
func UpdateToolRow(data types.UpdateToolDto) error {
	_, err := DB.Exec(`UPDATE nav_table SET name = ?, url = ?, logo = ?, catelog = ?, tags = ?, desc = ?, sort = ?, catelog_sort = ?, hide = ? WHERE id = ?`,
		data.Name, data.Url, data.Logo, data.Catelog, data.Tags, data.Desc, data.Sort, data.CatelogSort, data.Hide, data.Id)
	return err
}

// DeleteToolWithImage 删除工具并清理关联图片缓存
func DeleteToolWithImage(id string) error {
	numberId, convErr := strconv.Atoi(id)
	if convErr != nil {
		return convErr
	}
	// 先查询 logo（在删除之前），再删除工具，最后清理图片缓存
	var logo string
	err := DB.QueryRow(`SELECT logo FROM nav_table WHERE id = ?`, numberId).Scan(&logo)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	_, err = DB.Exec(`DELETE FROM nav_table WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if logo != "" {
		urlEncoded := url.QueryEscape(logo)
		DB.Exec(`DELETE FROM nav_img WHERE url = ?`, urlEncoded)
	}
	return nil
}

// GetToolLogoUrl 获取工具的 logo URL
func GetToolLogoUrl(id int) (string, error) {
	var logo string
	err := DB.QueryRow(`SELECT logo FROM nav_table WHERE id = ?`, id).Scan(&logo)
	return logo, err
}

// UpdateToolLogoUrl 更新工具的 logo URL
func UpdateToolLogoUrl(id int64, logo string) error {
	_, err := DB.Exec(`UPDATE nav_table SET logo = ? WHERE id = ?`, logo, id)
	return err
}

// UpdateToolSortBatch 批量更新工具排序
func UpdateToolSortBatch(updates []types.UpdateToolsSortDto, catelog string) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	query := `UPDATE nav_table SET sort = ? WHERE id = ?`
	if catelog != "" {
		query = `UPDATE nav_table SET catelog_sort = ? WHERE id = ?`
	}
	stmt, err := tx.Prepare(query)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()
	for _, u := range updates {
		value := u.Sort
		if catelog != "" && u.CatelogSort > 0 {
			value = u.CatelogSort
		}
		if _, err := stmt.Exec(value, u.Id); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

// GetToolMaxSort 获取工具表最大排序值
func GetToolMaxSort() (int, error) {
	var maxSort int
	err := DB.QueryRow(`SELECT COALESCE(MAX(sort), 0) FROM nav_table`).Scan(&maxSort)
	return maxSort, err
}

// UpdateToolDescription 仅更新工具描述
func UpdateToolDescription(id int, desc string) error {
	_, err := DB.Exec(`UPDATE nav_table SET desc = ? WHERE id = ?`, desc, id)
	return err
}

// ==================== 重构新增：分类 CRUD 操作 ====================

// GetCatelogNameById 根据 ID 查询分类名称
func GetCatelogNameById(id int) (string, error) {
	var name string
	err := DB.QueryRow(`SELECT name FROM nav_catelog WHERE id = ?`, id).Scan(&name)
	return name, err
}

// UpdateCatelogWithTx 在事务内更新分类并联动更新工具表的分类名
func UpdateCatelogWithTx(id int, oldName, newName, slug string, sort int, hide bool) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()
	nextSlug, err := uniqueCatelogSlugTx(tx, normalizeSlugOrName(slug, newName), id)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(`UPDATE nav_catelog SET name = ?, slug = ?, sort = ?, hide = ? WHERE id = ?`, newName, nextSlug, sort, hide, id); err != nil {
		return err
	}
	if oldName != newName {
		if _, err = tx.Exec(`UPDATE nav_table SET catelog = ? WHERE catelog = ?`, newName, oldName); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// InsertNewCatelog 插入新分类（先查重）
func InsertNewCatelog(name string, slug string, sort int, hide bool) error {
	if name == "" || strings.TrimSpace(name) == "" {
		return nil
	}
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var count int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM nav_catelog WHERE name = ?`, name).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil // 已存在，跳过
	}
	nextSlug, err := uniqueCatelogSlugTx(tx, normalizeSlugOrName(slug, name), 0)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`INSERT INTO nav_catelog (name, slug, sort, hide) VALUES (?, ?, ?, ?)`, name, nextSlug, sort, hide)
	if err != nil {
		return err
	}
	return tx.Commit()
}

// DeleteCatelogById 删除指定分类
func DeleteCatelogById(id string) error {
	_, err := DB.Exec(`DELETE FROM nav_catelog WHERE id = ?`, id)
	return err
}

func GetAllTagSlugs() ([]types.TagSlug, error) {
	rows, err := DB.Query(`SELECT id, name, slug, COALESCE(metaTitle,''), COALESCE(metaDescription,''), COALESCE(metaKeywords,''), COALESCE(ogImage,'') FROM nav_tag_slug ORDER BY lower(name) ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results = make([]types.TagSlug, 0)
	for rows.Next() {
		var tag types.TagSlug
		if err := rows.Scan(&tag.Id, &tag.Name, &tag.Slug, &tag.MetaTitle, &tag.MetaDescription, &tag.MetaKeywords, &tag.OgImage); err != nil {
			return nil, err
		}
		results = append(results, tag)
	}
	return results, nil
}

func UpdateCatelogSeoFields(id int, metaTitle, metaDesc, metaKeywords, ogImage string) error {
	_, err := DB.Exec(`UPDATE nav_catelog SET metaTitle=?, metaDescription=?, metaKeywords=?, ogImage=? WHERE id=?`,
		metaTitle, metaDesc, metaKeywords, ogImage, id)
	return err
}

func UpdateTagSlugSeoFields(name, metaTitle, metaDesc, metaKeywords, ogImage string) error {
	_, err := DB.Exec(`UPDATE nav_tag_slug SET metaTitle=?, metaDescription=?, metaKeywords=?, ogImage=? WHERE lower(name)=lower(?)`,
		metaTitle, metaDesc, metaKeywords, ogImage, name)
	return err
}

func InsertTagSlugs(tags []types.TagSlug) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM nav_tag_slug`); err != nil {
		return err
	}
	stmt, err := tx.Prepare(`INSERT INTO nav_tag_slug (name, slug, metaTitle, metaDescription, metaKeywords, ogImage) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, tag := range tags {
		name := strings.TrimSpace(tag.Name)
		if name == "" {
			continue
		}
		slug, err := uniqueTagSlugTx(tx, normalizeSlugOrName(tag.Slug, name), name)
		if err != nil {
			return err
		}
		if _, err = stmt.Exec(name, slug, tag.MetaTitle, tag.MetaDescription, tag.MetaKeywords, tag.OgImage); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func UpsertTagSlug(name string, slug string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	nextSlug, err := uniqueTagSlugTx(tx, normalizeSlugOrName(slug, name), name)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(`INSERT INTO nav_tag_slug (name, slug) VALUES (?, ?)
		ON CONFLICT(name) DO UPDATE SET slug = excluded.slug`, name, nextSlug); err != nil {
		return err
	}
	return tx.Commit()
}

func EnsureTagSlugsFromTools() error {
	rows, err := DB.Query(`SELECT COALESCE(tags, '') FROM nav_table WHERE tags IS NOT NULL AND TRIM(tags) != '';`)
	if err != nil {
		return err
	}
	defer rows.Close()

	seen := make(map[string]string)
	for rows.Next() {
		var tags string
		if err := rows.Scan(&tags); err != nil {
			return err
		}
		for _, tag := range strings.Split(strings.ReplaceAll(tags, "，", ","), ",") {
			name := strings.TrimSpace(tag)
			if name != "" {
				seen[strings.ToLower(name)] = name
			}
		}
	}
	for _, name := range seen {
		var count int
		if err := DB.QueryRow(`SELECT COUNT(*) FROM nav_tag_slug WHERE lower(name) = lower(?)`, name).Scan(&count); err != nil {
			return err
		}
		if count == 0 {
			if err := UpsertTagSlug(name, ""); err != nil {
				return err
			}
		}
	}
	return nil
}

// ==================== 重构新增：设置操作 ====================

// GetSettingRow 查询设置行（含 NULL 安全转换）
func GetSettingRow() (types.Setting, error) {
	var s types.Setting
	var hideAdmin, hideGithub, hideToggleJumpTarget, jumpTargetBlank, showSearchEngine, pcColumnCount interface{}
	var deploymentVersion, language, customCss, metaTitle, metaDescription, metaKeywords, ogImage string
	err := DB.QueryRow(`SELECT id, favicon, title, logo192, logo512, hideAdmin, hideGithub, hideToggleJumpTarget, jumpTargetBlank, showSearchEngine, pcColumnCount, COALESCE(deployment_version,''), COALESCE(language,'zh-CN'), COALESCE(customCss,''), COALESCE(metaTitle,''), COALESCE(metaDescription,''), COALESCE(metaKeywords,''), COALESCE(ogImage,'') FROM nav_setting ORDER BY id ASC LIMIT 1`).Scan(
		&s.Id, &s.Favicon, &s.Title, &s.Logo192, &s.Logo512,
		&hideAdmin, &hideGithub, &hideToggleJumpTarget, &jumpTargetBlank,
		&showSearchEngine, &pcColumnCount, &deploymentVersion, &language, &customCss,
		&metaTitle, &metaDescription, &metaKeywords, &ogImage,
	)
	if err != nil {
		return types.Setting{
			Id: 1, Favicon: "favicon.ico", Title: "Van Nav", Logo192: "logo192.png", Logo512: "logo512.png",
			JumpTargetBlank: true, ShowSearchEngine: true, PcColumnCount: 3,
		}, err
	}
	s.HideAdmin = hideAdmin != nil && hideAdmin.(int64) != 0
	s.HideGithub = hideGithub != nil && hideGithub.(int64) != 0
	s.HideToggleJumpTarget = hideToggleJumpTarget != nil && hideToggleJumpTarget.(int64) != 0
	s.JumpTargetBlank = jumpTargetBlank == nil || jumpTargetBlank.(int64) != 0
	s.ShowSearchEngine = showSearchEngine == nil || showSearchEngine.(int64) != 0
	if pcColumnCount != nil {
		s.PcColumnCount = int(pcColumnCount.(int64))
	} else {
		s.PcColumnCount = 3
	}
	s.DeploymentVersion = deploymentVersion
	s.Language = language
	s.CustomCss = customCss
	s.MetaTitle = metaTitle
	s.MetaDescription = metaDescription
	s.MetaKeywords = metaKeywords
	s.OgImage = ogImage
	return s, nil
}

// UpdateSettingRow 更新设置行
func UpdateSettingRow(data types.Setting) error {
	lang := data.Language
	if lang != "zh-CN" && lang != "en-US" {
		lang = "zh-CN"
	}
	_, err := DB.Exec(`UPDATE nav_setting SET favicon=?, title=?, logo192=?, logo512=?, hideAdmin=?, hideGithub=?, hideToggleJumpTarget=?, jumpTargetBlank=?, showSearchEngine=?, pcColumnCount=?, language=?, customCss=?, metaTitle=?, metaDescription=?, metaKeywords=?, ogImage=? WHERE id=(SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`,
		data.Favicon, data.Title, data.Logo192, data.Logo512,
		data.HideAdmin, data.HideGithub, data.HideToggleJumpTarget, data.JumpTargetBlank,
		data.ShowSearchEngine, data.PcColumnCount, lang, data.CustomCss,
		data.MetaTitle, data.MetaDescription, data.MetaKeywords, data.OgImage)
	return err
}

// UpdateSettingLanguage 仅更新语言设置
func UpdateSettingLanguage(language string) error {
	_, err := DB.Exec(`UPDATE nav_setting SET language = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`, language)
	return err
}

// SyncDeploymentVersion 启动时同步部署版本号
func SyncDeploymentVersion(version string) {
	var dbVersion string
	err := DB.QueryRow(`SELECT deployment_version FROM nav_setting WHERE id = 1`).Scan(&dbVersion)
	if err != nil || dbVersion == "" {
		if _, err := DB.Exec(`UPDATE nav_setting SET deployment_version = ? WHERE id = 1`, version); err != nil {
			logger.LogError("同步部署版本号失败: %s", err)
		} else {
			logger.LogInfo("部署版本号已初始化: %s", version)
		}
		return
	}
	if dbVersion != version {
		if _, err := DB.Exec(`UPDATE nav_setting SET deployment_version = ? WHERE id = 1`, version); err != nil {
			logger.LogError("更新部署版本号失败: %s", err)
		} else {
			logger.LogInfo("部署版本号已更新: %s → %s", dbVersion, version)
		}
	}
}

// ==================== 重构新增：站点配置操作 ====================

// GetSiteConfigRow 查询站点配置行（含 NULL 安全转换）
func GetSiteConfigRow() (types.SiteConfig, error) {
	var cfg types.SiteConfig
	var noImageMode, compactMode, faviconApiEnabled interface{}
	var faviconApiTemplate interface{}
	err := DB.QueryRow(`SELECT id, noImageMode, compactMode, faviconApiEnabled, COALESCE(faviconApiTemplate, 'https://favicon.im/{domain}') FROM nav_site_config ORDER BY id ASC LIMIT 1`).Scan(
		&cfg.Id, &noImageMode, &compactMode, &faviconApiEnabled, &faviconApiTemplate,
	)
	if err != nil {
		return types.SiteConfig{Id: 1, FaviconApiEnabled: true, FaviconApiTemplate: "https://favicon.im/{domain}"}, err
	}
	cfg.NoImageMode = noImageMode != nil && noImageMode.(int64) != 0
	cfg.CompactMode = compactMode != nil && compactMode.(int64) != 0
	cfg.FaviconApiEnabled = faviconApiEnabled != nil && faviconApiEnabled.(int64) != 0
	if faviconApiTemplate != nil {
		cfg.FaviconApiTemplate = faviconApiTemplate.(string)
	} else {
		cfg.FaviconApiTemplate = "https://favicon.im/{domain}"
	}
	return cfg, nil
}

// UpdateSiteConfigRow 更新站点配置行
func UpdateSiteConfigRow(data types.SiteConfig) error {
	_, err := DB.Exec(`UPDATE nav_site_config SET noImageMode=?, compactMode=?, faviconApiEnabled=?, faviconApiTemplate=? WHERE id=(SELECT id FROM nav_site_config ORDER BY id ASC LIMIT 1)`,
		data.NoImageMode, data.CompactMode, data.FaviconApiEnabled, data.FaviconApiTemplate)
	return err
}

// ==================== 重构新增：图片缓存操作 ====================

// GetImageByUrl 根据 URL 查询图片缓存
func GetImageByUrl(urlEncoded string) (types.Img, bool, error) {
	var img types.Img
	err := DB.QueryRow(`SELECT id, url, value FROM nav_img WHERE url = ?`, urlEncoded).Scan(&img.Id, &img.Url, &img.Value)
	if err != nil {
		return types.Img{}, false, nil
	}
	return img, true, nil
}

// InsertImage 插入或更新图片缓存
func InsertImage(urlEncoded, base64Value string) error {
	_, err := DB.Exec(`
		INSERT INTO nav_img (url, value) VALUES (?, ?)
		ON CONFLICT(url) DO UPDATE SET value = excluded.value
		WHERE nav_img.value != excluded.value
	`, urlEncoded, base64Value)
	return err
}

// DeleteImageByUrl 删除指定 URL 的图片缓存
func DeleteImageByUrl(urlEncoded string) error {
	_, err := DB.Exec(`DELETE FROM nav_img WHERE url = ?`, urlEncoded)
	return err
}

// ==================== 重构新增：备份配置操作 ====================

// GetEncryptionKeyFromDB 从数据库获取加密密钥
func GetEncryptionKeyFromDB() (string, error) {
	var key string
	err := DB.QueryRow(`SELECT encryption_key FROM nav_backup_config ORDER BY id ASC LIMIT 1`).Scan(&key)
	if err != nil {
		return "", nil
	}
	return key, nil
}

// SaveEncryptionKeyToDB 保存加密密钥到数据库
func SaveEncryptionKeyToDB(key string) error {
	var count int
	if err := DB.QueryRow("SELECT COUNT(*) FROM nav_backup_config;").Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		_, err := DB.Exec(`INSERT INTO nav_backup_config (encryption_key, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))`, key)
		return err
	}
	_, err := DB.Exec(`UPDATE nav_backup_config SET encryption_key = ?, updated_at = datetime('now') WHERE id = (SELECT id FROM nav_backup_config ORDER BY id ASC LIMIT 1)`, key)
	return err
}

// GetBackupConfigRow 查询备份配置行
func GetBackupConfigRow() (*types.BackupConfig, error) {
	var c types.BackupConfig
	err := DB.QueryRow(`SELECT id, COALESCE(webdav_url,''), COALESCE(username,''), COALESCE(password,''), COALESCE(backup_dir,''), COALESCE(schedule_type,''), COALESCE(schedule_time,''), COALESCE(cron_expr,''), COALESCE(retention_type,''), COALESCE(retention_value,0), COALESCE(last_backup_time,''), COALESCE(last_backup_status,''), COALESCE(enabled,0), COALESCE(created_at,''), COALESCE(updated_at,'') FROM nav_backup_config ORDER BY id ASC LIMIT 1`).Scan(
		&c.ID, &c.WebDAVURL, &c.Username, &c.Password, &c.BackupDir,
		&c.ScheduleType, &c.ScheduleTime, &c.CronExpr, &c.RetentionType,
		&c.RetentionValue, &c.LastBackupTime, &c.LastBackupStatus,
		&c.Enabled, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return &types.BackupConfig{}, nil
	}
	return &c, nil
}

// UpsertBackupConfig 插入或更新备份配置
func UpsertBackupConfig(config *types.BackupConfig, encryptedPassword string) error {
	var count int
	if err := DB.QueryRow("SELECT COUNT(*) FROM nav_backup_config;").Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		_, err := DB.Exec(`INSERT INTO nav_backup_config (webdav_url, username, password, backup_dir, schedule_type, schedule_time, cron_expr, retention_type, retention_value, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
			config.WebDAVURL, config.Username, encryptedPassword, config.BackupDir,
			config.ScheduleType, config.ScheduleTime, config.CronExpr,
			config.RetentionType, config.RetentionValue, config.Enabled)
		return err
	}
	_, err := DB.Exec(`UPDATE nav_backup_config SET webdav_url=?, username=?, password=?, backup_dir=?, schedule_type=?, schedule_time=?, cron_expr=?, retention_type=?, retention_value=?, enabled=?, updated_at=datetime('now') WHERE id=(SELECT id FROM nav_backup_config ORDER BY id ASC LIMIT 1)`,
		config.WebDAVURL, config.Username, encryptedPassword, config.BackupDir,
		config.ScheduleType, config.ScheduleTime, config.CronExpr,
		config.RetentionType, config.RetentionValue, config.Enabled)
	return err
}

// UpdateBackupStatus 更新备份状态
func UpdateBackupStatus(backupTime, status string) error {
	_, err := DB.Exec(`UPDATE nav_backup_config SET last_backup_time = ?, last_backup_status = ? WHERE id = (SELECT id FROM nav_backup_config ORDER BY id ASC LIMIT 1)`, backupTime, status)
	return err
}

// CheckpointWAL 执行 WAL checkpoint
func CheckpointWAL() error {
	_, err := DB.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
	return err
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	return DB.Close()
}

// ReopenDB 重新打开数据库连接（备份恢复后使用）
func ReopenDB(dbPath string) error {
	newDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}
	DB = newDB
	return nil
}
