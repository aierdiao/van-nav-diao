package utils

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
)

func CheckErr(err error) {
	if err != nil {
		logger.LogError("捕获到错误：%s, 堆栈信息：%s", err, string(debug.Stack()))
	}
}

func CheckTxErr(err error, tx *sql.Tx) {
	if err != nil {
		logger.LogError("出现事务异常，回滚事务: %s, 堆栈信息：%s", err, string(debug.Stack()))
		err2 := tx.Rollback()
		CheckErr(err2)
	}
}

func In(target string, str_array []string) bool {
	for _, element := range str_array {
		if target == element {
			return true
		}
	}
	return false
}

func GetImgBase64FromUrl(url string) string {
	imgUrl := url
	//获取远端图片
	req, err := http.NewRequest("GET", imgUrl, nil)
	if err != nil {
		CheckErr(err)
		return ""
	}
	req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36")
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // codeql[go/disabled-certificate-check] - favicon 获取需兼容自签名证书
		},
		Timeout: 10 * time.Second,
	}
	res, err := client.Do(req)
	if err != nil {
		CheckErr(err)
		return ""
	}
	defer res.Body.Close()

	// 读取获取的[]byte数据（限制 5MB 防止 OOM）
	const maxImageSize = 5 * 1024 * 1024
	limitedReader := io.LimitReader(res.Body, maxImageSize+1)
	data, err := io.ReadAll(limitedReader)
	if err != nil || len(data) > maxImageSize {
		logger.LogError("图片过大或读取失败: %s", url)
		return ""
	}

	if optimized, ok := OptimizeIconBytes(data); ok {
		data = optimized
	}

	imageBase64 := base64.StdEncoding.EncodeToString(data)
	return imageBase64
}

func OptimizeIconBase64(value string) (string, bool) {
	data, err := base64.StdEncoding.DecodeString(value)
	if err != nil {
		return value, false
	}
	optimized, ok := OptimizeIconBytes(data)
	if !ok {
		return value, false
	}
	optimizedValue := base64.StdEncoding.EncodeToString(optimized)
	return optimizedValue, optimizedValue != value
}

func OptimizeIconBytes(data []byte) ([]byte, bool) {
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return data, false
	}
	const iconSize = 64
	bounds := src.Bounds()
	srcW := bounds.Dx()
	srcH := bounds.Dy()
	if srcW <= 0 || srcH <= 0 {
		return data, false
	}

	scale := float64(iconSize) / float64(srcW)
	if hScale := float64(iconSize) / float64(srcH); hScale < scale {
		scale = hScale
	}
	dstW := int(float64(srcW)*scale + 0.5)
	dstH := int(float64(srcH)*scale + 0.5)
	if dstW < 1 {
		dstW = 1
	}
	if dstH < 1 {
		dstH = 1
	}

	canvas := image.NewNRGBA(image.Rect(0, 0, iconSize, iconSize))
	drawTransparent(canvas)
	target := image.Rect((iconSize-dstW)/2, (iconSize-dstH)/2, (iconSize-dstW)/2+dstW, (iconSize-dstH)/2+dstH)
	scaleNearest(canvas, target, src, bounds)

	var buf bytes.Buffer
	if err := png.Encode(&buf, canvas); err != nil {
		return data, false
	}
	optimized := buf.Bytes()
	if len(optimized) >= len(data) && srcW <= iconSize && srcH <= iconSize {
		return data, false
	}
	return optimized, true
}

func drawTransparent(dst *image.NRGBA) {
	transparent := color.NRGBA{R: 255, G: 255, B: 255, A: 0}
	for y := dst.Bounds().Min.Y; y < dst.Bounds().Max.Y; y++ {
		for x := dst.Bounds().Min.X; x < dst.Bounds().Max.X; x++ {
			dst.SetNRGBA(x, y, transparent)
		}
	}
}

func scaleNearest(dst *image.NRGBA, target image.Rectangle, src image.Image, bounds image.Rectangle) {
	dstW := target.Dx()
	dstH := target.Dy()
	srcW := bounds.Dx()
	srcH := bounds.Dy()
	for y := 0; y < dstH; y++ {
		srcY := bounds.Min.Y + y*srcH/dstH
		for x := 0; x < dstW; x++ {
			srcX := bounds.Min.X + x*srcW/dstW
			dst.Set(target.Min.X+x, target.Min.Y+y, src.At(srcX, srcY))
		}
	}
}

func GetSuffixFromUrl(url string) string {
	suffix := url[strings.LastIndex(url, "."):]
	return suffix
}
func GetMIME(suffix string) string {
	var t string = "image/x-icon"
	if suffix == ".svg" {
		t = "image/svg+xml"
	}
	if suffix == ".png" {
		t = "image/png"
	}
	return t
}

func PathExistsOrCreate(path string) {
	_, err := os.Stat(path)
	if err == nil {
		return
	}
	os.Mkdir(path, os.ModePerm)
}

func GenerateId() int {
	// 生成一个随机 id，避免时间戳冲突
	b := make([]byte, 4)
	_, err := rand.Read(b)
	if err != nil {
		// 回退到时间戳（极少数情况）
		return int(time.Now().Unix())
	}
	// 确保正数
	id := int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])
	if id < 0 {
		id = -id
	}
	return id
}

func FilterHideTools(tools []types.Tool, cates []types.Catelog) []types.Tool {
	result := make([]types.Tool, 0)
	var hideCates []string
	// 提取出需要隐藏的分类
	for _, cate := range cates {
		if cate.Hide {
			hideCates = append(hideCates, cate.Name)
		}
	}
	// 过滤工具
	for _, tool := range tools {
		if !tool.Hide && !In(tool.Catelog, hideCates) {
			result = append(result, tool)
		}
	}
	return result
}

func FilterHideCates(cates []types.Catelog) []types.Catelog {
	result := make([]types.Catelog, 0)
	for _, cate := range cates {
		if !cate.Hide {
			result = append(result, cate)
		}
	}
	return result
}
