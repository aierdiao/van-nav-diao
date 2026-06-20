package utils

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
)

func RandomJWTKey() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		logger.LogError("生成随机密钥失败: %v", err)
		panic("无法生成安全的 JWT 密钥，请检查系统随机数生成器")
	}
	return hex.EncodeToString(bytes)
}

var jwtSecret []byte

const jwtSecretFile = "./data/jwt_secret"

func init() {
	// 优先使用环境变量
	if envKey := os.Getenv("JWT_SECRET"); envKey != "" {
		jwtSecret = []byte(envKey)
		logger.LogInfo("JWT 密钥已从环境变量加载")
		return
	}
	// 尝试从文件读取（重启后保持一致）
	if data, err := os.ReadFile(jwtSecretFile); err == nil && len(data) > 0 {
		jwtSecret = data
		logger.LogInfo("JWT 密钥已从文件加载")
		return
	}
	// 首次启动：生成随机密钥并持久化到文件
	key := RandomJWTKey()
	jwtSecret = []byte(key)
	if err := os.WriteFile(jwtSecretFile, jwtSecret, 0600); err != nil {
		logger.LogError("JWT 密钥持久化失败（重启后已有 token 将失效）: %v", err)
	} else {
		logger.LogInfo("JWT 密钥已生成并持久化到 %s", jwtSecretFile)
	}
}

func SignJWT(user types.User, tokenVersion int) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"name":    user.Name,
		"id":      user.Id,
		"version": tokenVersion,
		"exp":     time.Now().Add(time.Hour * 24 * 30).Unix(),
	})
	tokenString, err := token.SignedString([]byte(jwtSecret))
	return tokenString, err
}

func SignJWTForAPI(tokenName string, tokenId int) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"name": tokenName,
		"id":   tokenId,
		"exp":  time.Now().Add(time.Hour * 24 * 365).Unix(),
	})
	tokenString, err := token.SignedString([]byte(jwtSecret))
	return tokenString, err
}

func ParseJWT(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (i interface{}, e error) {
		return jwtSecret, nil
	})
	return token, err
}

func IsLogin(c *gin.Context) bool {
	rawToken := c.Request.Header.Get("Authorization")
	if rawToken == "" {
		return false
	}
	rawToken = strings.TrimPrefix(rawToken, "Bearer ")
	token, err := ParseJWT(rawToken)
	return err == nil && token.Valid
}
