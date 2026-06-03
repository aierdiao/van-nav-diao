package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

func GetDeploymentVersion() (string, error) {
	v := database.GetDeploymentVersion()
	return v, nil
}

func IncrementDeploymentVersion() (string, error) {
	return database.IncrementDeploymentVersion()
}

func GetSetting() (types.Setting, error) {
	return database.GetSettingRow()
}

func UpdateSetting(data types.Setting) error {
	err := database.UpdateSettingRow(data)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func UpdateLanguage(language string) error {
	err := database.UpdateSettingLanguage(language)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

// SyncDeploymentVersion 启动时同步部署版本号到数据库
func SyncDeploymentVersion(version string) {
	database.SyncDeploymentVersion(version)
}
