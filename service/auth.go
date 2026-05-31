package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

func GetApiTokens() []types.Token {
	sql_get_api_tokens := `
		SELECT id,name,value,disabled FROM nav_api_token WHERE disabled = 0;
		`
	results := make([]types.Token, 0)
	rows, err := database.DB.Query(sql_get_api_tokens)
	if err != nil {
		utils.CheckErr(err)
		return results
	}
	defer rows.Close()
	for rows.Next() {
		var token types.Token
		err = rows.Scan(&token.Id, &token.Name, &token.Value, &token.Disabled)
		utils.CheckErr(err)
		results = append(results, token)
	}
	return results
}

func GetUser(name string) types.User {
	sql_get_user := `
		SELECT id,name,password FROM nav_user WHERE name = ?;
		`
	var user types.User
	row := database.DB.QueryRow(sql_get_user, name)
	err := row.Scan(&user.Id, &user.Name, &user.Password)
	utils.CheckErr(err)
	return user
}

func AddApiTokenInDB(data types.Token) {
	sql_add_api_token := `
		INSERT INTO nav_api_token (id,name,value,disabled)
		VALUES (?,?,?,?);
		`
	stmt, err := database.DB.Prepare(sql_add_api_token)
	utils.CheckErr(err)

	res, err := stmt.Exec(data.Id, data.Name, data.Value, data.Disabled)
	utils.CheckErr(err)
	_, err = res.LastInsertId()
	utils.CheckErr(err)
}

func UpdateUser(data types.UpdateUserDto) {
	// 对密码进行哈希处理
	hashedPassword, err := utils.HashPassword(data.Password)
	if err != nil {
		utils.CheckErr(err)
		return
	}

	sql_update_user := `
		UPDATE nav_user
		SET name = ?, password = ?
		WHERE id = ?;
		`
	stmt, err := database.DB.Prepare(sql_update_user)
	utils.CheckErr(err)
	res, err := stmt.Exec(data.Name, hashedPassword, data.Id)
	utils.CheckErr(err)
	_, err = res.RowsAffected()
	utils.CheckErr(err)
}


func DeleteApiToken(id string) error {
	sql_delete_api_token := `
		UPDATE nav_api_token
		SET disabled = 1
		WHERE id = ?;
		`
	stmt, err := database.DB.Prepare(sql_delete_api_token)
	if err != nil {
		return err
	}
	defer stmt.Close()
	res, err := stmt.Exec(id)
	if err != nil {
		return err
	}
	_, err = res.RowsAffected()
	return err
}

// UpgradeUserPassword 将旧版明文密码升级为 bcrypt 哈希
func UpgradeUserPassword(userId int, hashedPassword string) {
	sql := `UPDATE nav_user SET password = ? WHERE id = ?;`
	stmt, err := database.DB.Prepare(sql)
	if err != nil {
		logger.LogError("升级密码失败: %s", err)
		return
	}
	defer stmt.Close()
	_, err = stmt.Exec(hashedPassword, userId)
	if err != nil {
		logger.LogError("升级密码失败: %s", err)
	}
}
