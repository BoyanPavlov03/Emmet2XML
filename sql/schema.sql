-- emmet2xml Database Schema
-- SQLite compatible

-- Потребители
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- История на трансформациите
CREATE TABLE IF NOT EXISTS transformations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    input_type VARCHAR(10) NOT NULL CHECK(input_type IN ('emmet', 'xml')),
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Запазени настройки (presets)
CREATE TABLE IF NOT EXISTS settings_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    settings_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Правила за преструктуриране
CREATE TABLE IF NOT EXISTS refactor_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    pattern TEXT NOT NULL,
    replacement TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индекси за по-бързи заявки
CREATE INDEX IF NOT EXISTS idx_transformations_user ON transformations(user_id);
CREATE INDEX IF NOT EXISTS idx_transformations_date ON transformations(created_at);
CREATE INDEX IF NOT EXISTS idx_presets_user ON settings_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user ON refactor_rules(user_id);
