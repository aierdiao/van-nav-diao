package utils

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"encoding/binary"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"os"
	"regexp"
	"runtime/debug"
	"strings"
	"time"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	xdraw "golang.org/x/image/draw"
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
	if IsSVG(data) {
		return OptimizeSVGBytes(data)
	}
	if pngData, ok := ExtractBestPNGFromICO(data); ok {
		if optimized, changed := OptimizeIconBytes(pngData); changed {
			return optimized, true
		}
		if len(pngData) < len(data) {
			return pngData, true
		}
	}

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
	xdraw.CatmullRom.Scale(canvas, target, src, bounds, xdraw.Over, nil)

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

func ExtractBestPNGFromICO(data []byte) ([]byte, bool) {
	if len(data) < 6 ||
		binary.LittleEndian.Uint16(data[0:2]) != 0 ||
		binary.LittleEndian.Uint16(data[2:4]) != 1 {
		return nil, false
	}

	count := int(binary.LittleEndian.Uint16(data[4:6]))
	if count <= 0 || len(data) < 6+count*16 {
		return nil, false
	}

	bestOffset := 0
	bestSize := 0
	bestArea := -1
	for i := 0; i < count; i++ {
		entry := 6 + i*16
		width := int(data[entry])
		height := int(data[entry+1])
		if width == 0 {
			width = 256
		}
		if height == 0 {
			height = 256
		}
		size := int(binary.LittleEndian.Uint32(data[entry+8 : entry+12]))
		offset := int(binary.LittleEndian.Uint32(data[entry+12 : entry+16]))
		if size <= 8 || offset < 0 || offset+size > len(data) {
			continue
		}
		chunk := data[offset : offset+size]
		if !bytes.HasPrefix(chunk, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}) {
			continue
		}
		area := width * height
		if area > bestArea {
			bestArea = area
			bestOffset = offset
			bestSize = size
		}
	}

	if bestSize == 0 {
		return nil, false
	}
	return data[bestOffset : bestOffset+bestSize], true
}

func IsSVG(data []byte) bool {
	sniffLen := len(data)
	if sniffLen > 512 {
		sniffLen = 512
	}
	sniff := strings.ToLower(strings.TrimSpace(string(data[:sniffLen])))
	return strings.HasPrefix(sniff, "<svg") ||
		strings.HasPrefix(sniff, "<?xml") && strings.Contains(sniff, "<svg") ||
		strings.Contains(sniff, "<svg ")
}

func OptimizeSVGBytes(data []byte) ([]byte, bool) {
	s := strings.TrimSpace(string(data))
	if s == "" {
		return data, false
	}

	commentPattern := regexp.MustCompile(`(?s)<!--.*?-->`)
	betweenTagsPattern := regexp.MustCompile(`>\s+<`)
	multiSpacePattern := regexp.MustCompile(`\s{2,}`)

	s = commentPattern.ReplaceAllString(s, "")
	s = betweenTagsPattern.ReplaceAllString(s, "><")
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\t", " ")
	s = multiSpacePattern.ReplaceAllString(s, " ")
	s = strings.TrimSpace(s)

	optimized := []byte(s)
	if len(optimized) >= len(data) {
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

func GetSuffixFromUrl(url string) string {
	idx := strings.LastIndex(url, ".")
	if idx < 0 {
		return ""
	}
	return url[idx:]
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
