<?php
/**
 * API за правила за преструктуриране
 */

require_once __DIR__ . '/utils.php';

initDatabaseIfNeeded();

$action = $_GET['action'] ?? '';
$data = getPostData();

switch ($action) {
    case 'save':
        requireAuth();
        handleSave($data);
        break;
    case 'list':
        requireAuth();
        handleList();
        break;
    case 'delete':
        requireAuth();
        handleDelete($data);
        break;
    default:
        jsonError('Invalid action', 400);
}

/**
 * Запазва ново правило
 */
function handleSave($data) {
    $name = trim($data['name'] ?? '');
    $pattern = trim($data['pattern'] ?? '');
    $replacement = trim($data['replacement'] ?? '');
    
    if (empty($name) || empty($pattern) || empty($replacement)) {
        jsonError('All fields are required');
    }
    
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    $db->execute(
        "INSERT INTO refactor_rules (user_id, name, pattern, replacement) VALUES (?, ?, ?, ?)",
        [$userId, $name, $pattern, $replacement]
    );
    
    $id = $db->lastInsertId();
    
    jsonSuccess(['id' => $id], 'Rule saved');
}

/**
 * Връща списък с правила
 */
function handleList() {
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    $items = $db->query(
        "SELECT id, name, pattern, replacement, created_at 
         FROM refactor_rules 
         WHERE user_id = ? 
         ORDER BY created_at DESC",
        [$userId]
    );
    
    jsonSuccess(['items' => $items]);
}

/**
 * Изтрива правило
 */
function handleDelete($data) {
    $id = $data['id'] ?? 0;
    
    if (!$id) {
        jsonError('Missing ID');
    }
    
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    $db->execute(
        "DELETE FROM refactor_rules WHERE id = ? AND user_id = ?",
        [$id, $userId]
    );
    
    jsonSuccess([], 'Deleted');
}
