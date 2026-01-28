-- emmet2xml Database Schema
-- MySQL compatible (XAMPP)

-- Създаване на база данни (изпълни ръчно в phpMyAdmin ако е нужно)
-- CREATE DATABASE IF NOT EXISTS emmet2xml CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE emmet2xml;

-- Потребители
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- История на трансформациите
CREATE TABLE IF NOT EXISTS transformations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    input_type ENUM('emmet', 'xml') NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Запазени настройки (presets)
CREATE TABLE IF NOT EXISTS settings_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    settings_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Правила за преструктуриране
CREATE TABLE IF NOT EXISTS refactor_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    pattern TEXT NOT NULL,
    replacement TEXT NOT NULL,
    enabled TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Индекси за по-бързи заявки
CREATE INDEX idx_transformations_user ON transformations(user_id);
CREATE INDEX idx_transformations_date ON transformations(created_at);
CREATE INDEX idx_presets_user ON settings_presets(user_id);
CREATE INDEX idx_rules_user ON refactor_rules(user_id);
