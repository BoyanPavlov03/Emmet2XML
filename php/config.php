<?php
define('DEBUG_MODE', true);

define('DB_TYPE', 'mysql');

define('DB_PATH', __DIR__ . '/../data/emmet2xml.db');

define('DB_HOST', 'localhost');
define('DB_NAME', 'emmet2xml');
define('DB_USER', 'root');
define('DB_PASS', '');

define('SESSION_LIFETIME', 3600 * 24);

define('PASSWORD_MIN_LENGTH', 6);
define('USERNAME_MIN_LENGTH', 3);
define('USERNAME_MAX_LENGTH', 50);

define('DEFAULT_SETTINGS', json_encode([
    'indent' => '  ',
    'showValues' => true,
    'showAttributes' => true,
    'showAttrValues' => true,
    'selfClosing' => true
]));

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

date_default_timezone_set('Europe/Sofia');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
