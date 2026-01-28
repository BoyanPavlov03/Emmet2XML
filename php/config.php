<?php
/**
 * Конфигурация на приложението
 * 
 * ИНСТРУКЦИИ ЗА XAMPP:
 * 1. Сменете DB_TYPE на 'mysql'
 * 2. Създайте база данни 'emmet2xml' в phpMyAdmin
 * 3. Импортирайте sql/schema_mysql.sql
 */

// Режим на разработка
define('DEBUG_MODE', true);

// ============================================================
// БАЗА ДАННИ - Изберете 'sqlite' или 'mysql'
// ============================================================
define('DB_TYPE', 'mysql'); // 'sqlite' или 'mysql'

// SQLite настройки (ако DB_TYPE = 'sqlite')
define('DB_PATH', __DIR__ . '/../data/emmet2xml.db');

// MySQL/XAMPP настройки (ако DB_TYPE = 'mysql')
define('DB_HOST', 'localhost');
define('DB_NAME', 'emmet2xml');
define('DB_USER', 'root');
define('DB_PASS', ''); // XAMPP по подразбиране няма парола

// Сесия настройки
define('SESSION_LIFETIME', 3600 * 24); // 24 часа

// Сигурност
define('PASSWORD_MIN_LENGTH', 6);
define('USERNAME_MIN_LENGTH', 3);
define('USERNAME_MAX_LENGTH', 50);

// Настройки по подразбиране за трансформация
define('DEFAULT_SETTINGS', json_encode([
    'indent' => '  ',           // Отстъп
    'showValues' => true,       // Показване на стойности
    'showAttributes' => true,   // Показване на атрибути
    'showAttrValues' => true,   // Показване на стойности на атрибути
    'selfClosing' => true       // Self-closing тагове
]));

// Грешки
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Времева зона
date_default_timezone_set('Europe/Sofia');

// Стартиране на сесия
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
