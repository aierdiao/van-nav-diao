package service

import (
	"testing"

	"github.com/mereith/nav/database"
)

func TestGetSettingIncludesLanguage(t *testing.T) {
	database.InitDB()
	setting, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if setting.Language != "zh-CN" {
		t.Errorf("expected default language 'zh-CN', got '%s'", setting.Language)
	}
}

func TestUpdateSettingLanguage(t *testing.T) {
	database.InitDB()
	setting, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	// Save original
	origLang := setting.Language

	// Update to en-US
	setting.Language = "en-US"
	err = UpdateSetting(setting)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	updated, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if updated.Language != "en-US" {
		t.Errorf("expected 'en-US', got '%s'", updated.Language)
	}

	// Restore
	setting.Language = origLang
	UpdateSetting(setting)
}

func TestLanguageWhitelistRejectsInvalid(t *testing.T) {
	database.InitDB()
	setting, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	origLang := setting.Language

	// Try invalid language
	setting.Language = "fr-FR"
	err = UpdateSetting(setting)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	updated, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if updated.Language != "zh-CN" {
		t.Errorf("expected 'zh-CN' (whitelist fallback), got '%s'", updated.Language)
	}

	// Restore
	setting.Language = origLang
	UpdateSetting(setting)
}
