<?php
/**
 * API за автентикация
 * Endpoints: register, login, logout, check
 */

require_once __DIR__ . '/utils.php';

// Инициализираме базата данни
initDatabaseIfNeeded();

// Определяме action от URL или POST
$action = $_GET['action'] ?? '';
$data = getPostData();

switch ($action) {
    case 'register':
        handleRegister($data);
        break;
    case 'login':
        handleLogin($data);
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        handleCheck();
        break;
    default:
        jsonError('Invalid action', 400);
}

/**
 * Регистрация на нов потребител
 */
function handleRegister($data) {
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $passwordConfirm = $data['password_confirm'] ?? '';
    
    // Валидация
    if (empty($username) || empty($email) || empty($password)) {
        jsonError('Всички полета са задължителни');
    }
    
    if (!isValidUsername($username)) {
        jsonError('Невалидно потребителско име (3-50 символа, само букви, цифри и _)');
    }
    
    if (!isValidEmail($email)) {
        jsonError('Невалиден email адрес');
    }
    
    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        jsonError('Паролата трябва да е поне ' . PASSWORD_MIN_LENGTH . ' символа');
    }
    
    if ($password !== $passwordConfirm) {
        jsonError('Паролите не съвпадат');
    }
    
    $db = Database::getInstance();
    
    // Проверка за съществуващ потребител
    $existing = $db->queryOne(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        [$username, $email]
    );
    
    if ($existing) {
        jsonError('Потребител с това име или email вече съществува');
    }
    
    // Хеширане на парола и запис
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    $db->execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        [$username, $email, $passwordHash]
    );
    
    $userId = $db->lastInsertId();
    
    // Автоматичен login след регистрация
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;
    
    jsonSuccess([
        'user' => [
            'id' => $userId,
            'username' => $username,
            'email' => $email
        ]
    ], 'Регистрацията е успешна');
}

/**
 * Вход в системата
 */
function handleLogin($data) {
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        jsonError('Въведи потребител и парола');
    }
    
    $db = Database::getInstance();
    
    $user = $db->queryOne(
        "SELECT id, username, email, password_hash FROM users WHERE username = ?",
        [$username]
    );
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonError('Грешно потребителско име или парола');
    }
    
    // Записваме в сесията
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    
    jsonSuccess([
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email']
        ]
    ], 'Успешен вход');
}

/**
 * Изход от системата
 */
function handleLogout() {
    session_destroy();
    jsonSuccess([], 'Успешен изход');
}

/**
 * Проверка на автентикация
 */
function handleCheck() {
    if (isLoggedIn()) {
        $db = Database::getInstance();
        $user = $db->queryOne(
            "SELECT id, username, email FROM users WHERE id = ?",
            [getCurrentUserId()]
        );
        
        if ($user) {
            jsonSuccess(['user' => $user, 'loggedIn' => true]);
        }
    }
    
    jsonSuccess(['loggedIn' => false]);
}
