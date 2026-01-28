<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../includes/Database.php';

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError($message, $statusCode = 400) {
    jsonResponse(['success' => false, 'error' => $message], $statusCode);
}

function jsonSuccess($data = [], $message = 'Success') {
    jsonResponse(array_merge(['success' => true, 'message' => $message], $data));
}

function getPostData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $json = file_get_contents('php://input');
        return json_decode($json, true) ?? [];
    }
    
    return $_POST;
}

function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function isValidUsername($username) {
    $len = strlen($username);
    if ($len < USERNAME_MIN_LENGTH || $len > USERNAME_MAX_LENGTH) {
        return false;
    }
    return preg_match('/^[a-zA-Z0-9_]+$/', $username);
}

function sanitize($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

function requireAuth() {
    if (!isLoggedIn()) {
        jsonError('Unauthorized', 401);
    }
}

function initDatabaseIfNeeded() {
    $db = Database::getInstance();
    if (!$db->tableExists('users')) {
        $db->initSchema();
    }
}
