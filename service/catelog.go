package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

func UpdateCatelog(data types.UpdateCatelogDto) error {
	oldName, err := database.GetCatelogNameById(data.Id)
	if err != nil {
		return err
	}
	err = database.UpdateCatelogWithTx(data.Id, oldName, data.Name, data.Slug, data.Sort, data.Hide)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func AddCatelog(data types.AddCatelogDto) error {
	err := database.InsertNewCatelog(data.Name, data.Slug, data.Sort, data.Hide)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func GetAllCatelog() ([]types.Catelog, error) {
	return database.GetAllCatelogs()
}

func DeleteCatelog(id string) error {
	err := database.DeleteCatelogById(id)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func GetAllTagSlugs() ([]types.TagSlug, error) {
	return database.GetAllTagSlugs()
}

func UpdateTagSlug(data types.UpdateTagSlugDto) error {
	err := database.UpsertTagSlug(data.Name, data.Slug)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}
