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
	return database.UpdateSettingRow(data)
}

func UpdateLanguage(language string) error {
	return database.UpdateSettingLanguage(language)
}

// SyncDeploymentVersion 启动时同步部署版本号到数据库
func SyncDeploymentVersion(version string) {
	database.SyncDeploymentVersion(version)
}
