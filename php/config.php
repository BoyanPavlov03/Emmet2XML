<?php
/**
 * Конфигурация на приложението
 */

// Режим на разработка
define('DEBUG_MODE', true);

// База данни настройки
define('DB_TYPE', 'sqlite'); // 'sqlite' или 'mysql'
define('DB_PATH', __DIR__ . '/../data/emmet2xml.db');

// MySQL настройки (ако се използва)
define('DB_HOST', 'localhost');
define('DB_NAME', 'emmet2xml');
define('DB_USER', 'root');
define('DB_PASS', '');

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
