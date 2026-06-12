package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/utils"
)

func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		rawToken := c.Request.Header.Get("Authorization")
		if rawToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success":      false,
				"errorMessage": "未登录",
			})
			c.Abort()
			return
		}

		if strings.HasPrefix(rawToken, "Bearer ") {
			rawToken = strings.TrimPrefix(rawToken, "Bearer ")
		}

		// API Token 走独立通道，不验证 version（不受密码修改影响）
		if database.HasApiToken(rawToken) {
			c.Set("username", "apiToken")
			c.Set("uid", 1)
			c.Next()
			return
		}

		// 普通登录 Token 走这里，验证 version
		token, err := utils.ParseJWT(rawToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success":      false,
				"errorMessage": "未登录",
			})
			c.Abort()
			return
		}
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			uid := int(claims["id"].(float64))
			expectedVersion := database.GetUserTokenVersion(uid)
			// 兼容旧 token（无 version 字段视为 version=1）
			claimVersion := 1
			if v, ok := claims["version"].(float64); ok {
				claimVersion = int(v)
			}
			if claimVersion != expectedVersion {
				c.JSON(http.StatusUnauthorized, gin.H{
					"success":      false,
					"errorMessage": "会话已过期，请重新登录",
				})
				c.Abort()
				return
			}
			c.Set("username", claims["name"])
			c.Set("uid", uid)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success":      false,
				"errorMessage": "未登录",
			})
			c.Abort()
			return
		}
	}
}
