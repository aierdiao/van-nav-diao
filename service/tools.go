package service

import (
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

// addToolMutex 保护 AddTool 操作的并发安全
var addToolMutex sync.Mutex

type ImportToolsResult struct {
	Imported   int
	Skipped    int
	Categories []string
}

func ImportTools(data []types.Tool) ImportToolsResult {
	var catelogs []string
	imported := 0
	skipped := 0

	// 开启事务，将所有数据库写入合并为一次批量提交
	tx, err := database.DB.Begin()
	if err != nil {
		utils.CheckErr(err)
		return ImportToolsResult{Imported: 0, Skipped: len(data), Categories: nil}
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 在事务内准备工具插入语句
	sql_add_tool := `
		INSERT OR IGNORE INTO nav_table (id, name, catelog, url, logo, desc, sort, hide)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?);
		`
	stmt, err := tx.Prepare(sql_add_tool)
	if err != nil {
		utils.CheckErr(err)
		return ImportToolsResult{Imported: 0, Skipped: len(data), Categories: nil}
	}
	defer stmt.Close()

	// 在事务内准备分类插入语句
	sql_add_catelog := `
		INSERT OR IGNORE INTO nav_catelog (name, sort, hide)
		VALUES (?, 0, 0);
		`
	catelogStmt, err := tx.Prepare(sql_add_catelog)
	if err != nil {
		utils.CheckErr(err)
		return ImportToolsResult{Imported: 0, Skipped: len(data), Categories: nil}
	}
	defer catelogStmt.Close()

	for _, v := range data {
		// 过滤掉空分类，只收集有效的分类名称
		if v.Catelog != "" && strings.TrimSpace(v.Catelog) != "" && !utils.In(v.Catelog, catelogs) {
			catelogs = append(catelogs, v.Catelog)
		}
		res, err := stmt.Exec(v.Id, v.Name, v.Catelog, v.Url, v.Logo, v.Desc, v.Sort, v.Hide)
		if err != nil {
			utils.CheckErr(err)
			skipped++
			continue
		}
		affected, _ := res.RowsAffected()
		if affected > 0 {
			imported++
		} else {
			skipped++
		}
	}

	// 在同一事务内批量插入分类
	for _, catelog := range catelogs {
		_, err = catelogStmt.Exec(catelog)
		if err != nil {
			utils.CheckErr(err)
		}
	}

	// 提交事务
	if err = tx.Commit(); err != nil {
		utils.CheckErr(err)
		return ImportToolsResult{Imported: 0, Skipped: len(data), Categories: catelogs}
	}

	// 异步转存所有图片，不阻塞入库主线程
	go func() {
		for _, v := range data {
			UpdateImg(v.Logo)
		}
	}()

	return ImportToolsResult{
		Imported:   imported,
		Skipped:    skipped,
		Categories: catelogs,
	}
}

func UpdateTool(data types.UpdateToolDto) {
	// 除了更新工具本身之外，也要更新 img 表
	sql_update_tool := `
		UPDATE nav_table
		SET name = ?, url = ?, logo = ?, catelog = ?, desc = ?, sort = ?, hide = ?
		WHERE id = ?;
		`
	stmt, err := database.DB.Prepare(sql_update_tool)
	utils.CheckErr(err)
	res, err := stmt.Exec(data.Name, data.Url, data.Logo, data.Catelog, data.Desc, data.Sort, data.Hide, data.Id)
	utils.CheckErr(err)
	_, err = res.RowsAffected()
	utils.CheckErr(err)
	// 更新 img（异步，不阻塞响应）
	if data.Logo != "" {
		go UpdateImg(data.Logo)
	}
}

func AddTool(data types.AddToolDto) (int64, error) {
	// 使用包级互斥锁保护数据库操作
	addToolMutex.Lock()
	defer addToolMutex.Unlock()

	tx, err := database.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	sql_add_tool := `
		INSERT INTO nav_table (name, url, logo, catelog, desc, sort, hide)
		VALUES (?, ?, ?, ?, ?, ?, ?);
		`
	stmt, err := tx.Prepare(sql_add_tool)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	res, err := stmt.Exec(data.Name, data.Url, data.Logo, data.Catelog, data.Desc, data.Sort, data.Hide)
	if err != nil {
		return 0, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	err = tx.Commit()
	if err != nil {
		return 0, err
	}
	logger.LogInfo("新增工具: %s", data.Name)

	// 在事务完成后再异步更新图片（异步，不阻塞响应）
	if data.Logo != "" {
		go UpdateImg(data.Logo)
	}

	return id, nil
}

func GetAllTool() []types.Tool {
	sql_get_all := `
		SELECT id,name,url,logo,catelog,desc,sort,hide,is_alive,last_checked FROM nav_table order by sort;
		`
	results := make([]types.Tool, 0)
	rows, err := database.DB.Query(sql_get_all)
	if err != nil {
		utils.CheckErr(err)
		return results
	}
	defer rows.Close()
	for rows.Next() {
		var tool types.Tool
		var hide interface{}
		var sort interface{}
		var isAlive interface{}
		var lastChecked interface{}
		err = rows.Scan(&tool.Id, &tool.Name, &tool.Url, &tool.Logo, &tool.Catelog, &tool.Desc, &sort, &hide, &isAlive, &lastChecked)
		if hide == nil {
			tool.Hide = false
		} else {
			if hide.(int64) == 0 {
				tool.Hide = false
			} else {
				tool.Hide = true
			}
		}
		if sort == nil {
			tool.Sort = 0
		} else {
			i64 := sort.(int64)
			tool.Sort = int(i64)
		}
		// is_alive: NULL 或 1 表示正常，0 表示失效
		if isAlive == nil {
			alive := true
			tool.IsAlive = &alive
		} else {
			alive := isAlive.(int64) == 1
			tool.IsAlive = &alive
		}
		// last_checked: NULL 表示从未检测
		if lastChecked != nil {
			if t, ok := lastChecked.(time.Time); ok {
				tool.LastChecked = t.Format("2006-01-02 15:04:05")
			}
		}
		utils.CheckErr(err)
		results = append(results, tool)
	}
	return results
}

func GetToolLogoUrlById(id int) string {
	sql_get_tool := `
		SELECT logo FROM nav_table WHERE id=?;
		`
	rows, err := database.DB.Query(sql_get_tool, id)
	if err != nil {
		utils.CheckErr(err)
		return ""
	}
	defer rows.Close()
	var tool types.Tool
	for rows.Next() {
		err = rows.Scan(&tool.Logo)
		utils.CheckErr(err)
	}
	return tool.Logo
}

func UpdateToolIcon(id int64, logo string) {
	sql_update_tool := `
		UPDATE nav_table SET logo=? WHERE id=?;
		`
	_, err := database.DB.Exec(sql_update_tool, logo, id)
	utils.CheckErr(err)
	UpdateImg(logo)
}
func UpdateToolsSort(updates []types.UpdateToolsSortDto) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}

	sql := `UPDATE nav_table SET sort = ? WHERE id = ?`
	stmt, err := tx.Prepare(sql)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	for _, update := range updates {
		_, err = stmt.Exec(update.Sort, update.Id)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// GetMaxSort 获取工具表最大排序值
func GetMaxSort() (int, error) {
	sql := `SELECT COALESCE(MAX(sort), 0) FROM nav_table`
	var maxSort int
	err := database.DB.QueryRow(sql).Scan(&maxSort)
	if err != nil {
		return 0, err
	}
	return maxSort, nil
}


func DeleteTool(id string) error {
	sql_delete_tool := `DELETE FROM nav_table WHERE id = ?;`
	stmt, err := database.DB.Prepare(sql_delete_tool)
	if err != nil {
		return err
	}
	defer stmt.Close()
	res, err := stmt.Exec(id)
	if err != nil {
		return err
	}
	_, err = res.RowsAffected()
	if err != nil {
		return err
	}

	// 删除关联的 logo 图片缓存
	numberId, err := strconv.Atoi(id)
	if err != nil {
		return nil // 工具已删除，图片清理失败非致命
	}
	url1 := GetToolLogoUrlById(numberId)
	if url1 != "" {
		urlEncoded := url.QueryEscape(url1)
		sql_delete_img := `DELETE FROM nav_img WHERE url = ?;`
		imgStmt, err := database.DB.Prepare(sql_delete_img)
		if err != nil {
			return nil
		}
		defer imgStmt.Close()
		_, _ = imgStmt.Exec(urlEncoded)
	}
	return nil
}

func UpdateToolDesc(id int, desc string) error {
	sql := `UPDATE nav_table SET desc = ? WHERE id = ?`
	_, err := database.DB.Exec(sql, desc, id)
	return err
}
