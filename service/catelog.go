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
	return database.UpdateCatelogWithTx(data.Id, oldName, data.Name, data.Sort, data.Hide)
}

func AddCatelog(data types.AddCatelogDto) error {
	return database.InsertNewCatelog(data.Name, data.Sort, data.Hide)
}

func GetAllCatelog() ([]types.Catelog, error) {
	return database.GetAllCatelogs()
}

func DeleteCatelog(id string) error {
	return database.DeleteCatelogById(id)
}
