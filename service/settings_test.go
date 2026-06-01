package service

import (
	"testing"

	"github.com/mereith/nav/database"
)

func TestGetSettingIncludesLanguage(t *testing.T) {
	database.InitDB()
	setting := GetSetting()
	if setting.Language != "zh-CN" {
		t.Errorf("expected default language 'zh-CN', got '%s'", setting.Language)
	}
}

func TestUpdateSettingLanguage(t *testing.T) {
	database.InitDB()
	setting := GetSetting()
	// Save original
	origLang := setting.Language

	// Update to en-US
	setting.Language = "en-US"
	err := UpdateSetting(setting)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	updated := GetSetting()
	if updated.Language != "en-US" {
		t.Errorf("expected 'en-US', got '%s'", updated.Language)
	}

	// Restore
	setting.Language = origLang
	UpdateSetting(setting)
}

func TestLanguageWhitelistRejectsInvalid(t *testing.T) {
	database.InitDB()
	setting := GetSetting()
	origLang := setting.Language

	// Try invalid language
	setting.Language = "fr-FR"
	err := UpdateSetting(setting)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	updated := GetSetting()
	if updated.Language != "zh-CN" {
		t.Errorf("expected 'zh-CN' (whitelist fallback), got '%s'", updated.Language)
	}

	// Restore
	setting.Language = origLang
	UpdateSetting(setting)
}
