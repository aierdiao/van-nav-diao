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

		if database.HasApiToken(rawToken) {
			c.Set("username", "apiToken")
			c.Set("uid", 1)
			c.Next()
			return
		}

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
			uidFloat, ok := claims["id"].(float64)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{
					"success":      false,
					"errorMessage": "未登录",
				})
				c.Abort()
				return
			}
			uid := int(uidFloat)
			expectedVersion := database.GetUserTokenVersion(uid)
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
