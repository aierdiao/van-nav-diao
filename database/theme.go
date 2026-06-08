package database

import (
	"encoding/json"
	"fmt"
)

// GetThemeConfig 获取主题配置
func GetThemeConfig() (map[string]interface{}, error) {
	query := `SELECT config_json FROM nav_theme_config WHERE id = 1`
	
	var configJSON string
	err := DB.QueryRow(query).Scan(&configJSON)
	if err != nil {
		// 如果不存在记录，返回空配置
		if err.Error() == "sql: no rows in result set" {
			return map[string]interface{}{}, nil
		}
		return nil, fmt.Errorf("查询主题配置失败: %w", err)
	}
	
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return nil, fmt.Errorf("解析主题配置JSON失败: %w", err)
	}
	
	return config, nil
}

// SaveThemeConfig 保存主题配置（UPSERT逻辑，强制id=1）
func SaveThemeConfig(config map[string]interface{}) error {
	configJSON, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("序列化主题配置失败: %w", err)
	}
	
	query := `INSERT INTO nav_theme_config (id, config_json, updated_at) 
              VALUES (1, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET 
              config_json = excluded.config_json,
              updated_at = excluded.updated_at`
	
	_, err = DB.Exec(query, string(configJSON))
	if err != nil {
		return fmt.Errorf("保存主题配置失败: %w", err)
	}
	
	return nil
}

// DeleteThemeConfig 删除主题配置（重置为默认）
func DeleteThemeConfig() error {
	query := `DELETE FROM nav_theme_config WHERE id = 1`
	_, err := DB.Exec(query)
	if err != nil {
		return fmt.Errorf("删除主题配置失败: %w", err)
	}
	return nil
}
