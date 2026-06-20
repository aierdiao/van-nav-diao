package utils

import (
	"strings"
	"unicode"

	"github.com/mozillazg/go-pinyin"
)

func Slugify(input string) string {
	text := strings.TrimSpace(input)
	if text == "" {
		return ""
	}

	args := pinyin.NewArgs()
	args.Style = pinyin.Normal
	args.Heteronym = false

	var b strings.Builder
	lastDash := false

	writeDash := func() {
		if b.Len() > 0 && !lastDash {
			b.WriteByte('-')
			lastDash = true
		}
	}

	for _, r := range text {
		if r <= unicode.MaxASCII {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
				b.WriteRune(r)
				lastDash = false
				continue
			}
			if r >= 'A' && r <= 'Z' {
				b.WriteRune(unicode.ToLower(r))
				lastDash = false
				continue
			}
			writeDash()
			continue
		}

		parts := pinyin.SinglePinyin(r, args)
		if len(parts) > 0 && parts[0] != "" {
			if b.Len() > 0 && !lastDash {
				b.WriteByte('-')
			}
			b.WriteString(parts[0])
			lastDash = false
			continue
		}
		writeDash()
	}

	return strings.Trim(b.String(), "-")
}
