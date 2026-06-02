package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

func GetApiTokens() ([]types.Token, error) {
	return database.GetAllActiveApiTokens()
}

func GetUser(name string) (types.User, error) {
	return database.GetUserByName(name)
}

func AddApiTokenInDB(data types.Token) error {
	return database.InsertApiToken(data)
}

func UpdateUser(data types.UpdateUserDto) error {
	hashedPassword, err := utils.HashPassword(data.Password)
	if err != nil {
		return err
	}
	return database.UpdateUserNameAndPassword(int(data.Id), data.Name, hashedPassword)
}

func DeleteApiToken(id string) error {
	return database.DisableApiToken(id)
}

// UpgradeUserPassword 将旧版明文密码升级为 bcrypt 哈希
func UpgradeUserPassword(userId int, hashedPassword string) error {
	return database.UpdateUserPasswordById(userId, hashedPassword)
}

// ResetAdminPassword 重置管理员密码（main.go 入口层调用）
func ResetAdminPassword(newPassword string) error {
	hashed, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	return database.ResetAdminPassword(hashed)
}
