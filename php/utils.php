<?php
/**
 * Помощни функции
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../includes/Database.php';

/**
 * Връща JSON отговор
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Връща грешка като JSON
 */
function jsonError($message, $statusCode = 400) {
    jsonResponse(['success' => false, 'error' => $message], $statusCode);
}

/**
 * Връща успех като JSON
 */
function jsonSuccess($data = [], $message = 'Success') {
    jsonResponse(array_merge(['success' => true, 'message' => $message], $data));
}

/**
 * Взема данни от POST заявка (JSON или form-data)
 */
function getPostData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $json = file_get_contents('php://input');
        return json_decode($json, true) ?? [];
    }
    
    return $_POST;
}

/**
 * Валидира email
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Валидира потребителско име
 */
function isValidUsername($username) {
    $len = strlen($username);
    if ($len < USERNAME_MIN_LENGTH || $len > USERNAME_MAX_LENGTH) {
        return false;
    }
    return preg_match('/^[a-zA-Z0-9_]+$/', $username);
}

/**
 * Санитизира текст
 */
function sanitize($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * Проверява дали потребителят е логнат
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

/**
 * Връща ID на текущия потребител
 */
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Изисква логнат потребител
 */
function requireAuth() {
    if (!isLoggedIn()) {
        jsonError('Unauthorized', 401);
    }
}

/**
 * Инициализира базата данни ако е нужно
 */
function initDatabaseIfNeeded() {
    $db = Database::getInstance();
    if (!$db->tableExists('users')) {
        $db->initSchema();
    }
}
