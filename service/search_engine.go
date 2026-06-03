package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

func GetAllSearchEngines() ([]types.SearchEngine, error) {
	return database.GetAllSearchEngines()
}

func GetEnabledSearchEngines() ([]types.SearchEngine, error) {
	return database.GetEnabledSearchEngines()
}

func AddSearchEngine(engine types.SearchEngine) (int64, error) {
	id, err := database.AddSearchEngine(engine)
	if err != nil {
		return 0, err
	}
	InvalidateAllDataCache()
	// 更新图片缓存
	if engine.Logo != "" {
		go UpdateImg(engine.Logo)
	}
	return id, nil
}

func UpdateSearchEngine(engine types.SearchEngine) error {
	err := database.UpdateSearchEngine(engine)
	if err != nil {
		return err
	}
	InvalidateAllDataCache()
	// 更新图片缓存
	if engine.Logo != "" {
		go UpdateImg(engine.Logo)
	}
	return nil
}

func DeleteSearchEngine(id int) error {
	err := database.DeleteSearchEngine(id)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func UpdateSearchEngineSort(sortData []struct {
	Id   int `json:"id"`
	Sort int `json:"sort"`
}) error {
	err := database.UpdateSearchEngineSort(sortData)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func UpdateCatelogSort(sortData []struct {
	Id   int `json:"id"`
	Sort int `json:"sort"`
}) error {
	err := database.UpdateCatelogSort(sortData)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}
