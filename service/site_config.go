package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

func GetSiteConfig() (types.SiteConfig, error) {
	return database.GetSiteConfigRow()
}

func UpdateSiteConfig(data types.SiteConfig) error {
	err := database.UpdateSiteConfigRow(data)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}
