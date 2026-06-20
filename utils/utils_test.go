package utils

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/png"
	"testing"
)

func TestOptimizeSVGBytes(t *testing.T) {
	input := []byte(`
		<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
			<!-- comment -->
			<path d="M0 0h32v32H0z" />
		</svg>
	`)

	optimized, changed := OptimizeIconBytes(input)
	if !changed {
		t.Fatal("expected svg to be optimized")
	}
	if bytes.Contains(optimized, []byte("comment")) {
		t.Fatalf("expected svg comments to be removed: %s", optimized)
	}
	if !bytes.HasPrefix(optimized, []byte("<svg")) {
		t.Fatalf("expected optimized svg output, got: %s", optimized)
	}
}

func TestOptimizeIconBytesExtractsPNGFromICO(t *testing.T) {
	pngData := makeTestPNG(t, 256, 128)
	icoData := makeTestICO(t, pngData, 256, 128)

	optimized, changed := OptimizeIconBytes(icoData)
	if !changed {
		t.Fatal("expected ico to be optimized")
	}

	decoded, err := png.Decode(bytes.NewReader(optimized))
	if err != nil {
		t.Fatalf("expected optimized ico to become png: %v", err)
	}
	if got := decoded.Bounds().Dx(); got != 64 {
		t.Fatalf("expected optimized width 64, got %d", got)
	}
	if got := decoded.Bounds().Dy(); got != 64 {
		t.Fatalf("expected optimized height 64, got %d", got)
	}
}

func makeTestPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.SetNRGBA(x, y, color.NRGBA{R: uint8(x), G: uint8(y), B: 180, A: 255})
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func makeTestICO(t *testing.T, pngData []byte, width, height int) []byte {
	t.Helper()
	const headerSize = 6
	const entrySize = 16
	offset := headerSize + entrySize

	buf := make([]byte, offset+len(pngData))
	binary.LittleEndian.PutUint16(buf[0:2], 0)
	binary.LittleEndian.PutUint16(buf[2:4], 1)
	binary.LittleEndian.PutUint16(buf[4:6], 1)
	buf[6] = byte(width)
	buf[7] = byte(height)
	buf[8] = 0
	buf[9] = 0
	binary.LittleEndian.PutUint16(buf[10:12], 1)
	binary.LittleEndian.PutUint16(buf[12:14], 32)
	binary.LittleEndian.PutUint32(buf[14:18], uint32(len(pngData)))
	binary.LittleEndian.PutUint32(buf[18:22], uint32(offset))
	copy(buf[offset:], pngData)
	return buf
}
