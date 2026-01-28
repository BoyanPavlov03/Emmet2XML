<?php
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
    case 'toggle':
        requireAuth();
        handleToggle($data);
        break;
    case 'delete':
        requireAuth();
        handleDelete($data);
        break;
    default:
        jsonError('Invalid action', 400);
}

function handleSave($data) {
    $name = trim($data['name'] ?? '');
    $pattern = trim($data['pattern'] ?? '');
    $replacement = trim($data['replacement'] ?? '');
    
    if (empty($name) || empty($pattern) || empty($replacement)) {
        jsonError('All fields are required');
    }
    
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    ensureEnabledColumn($db);
    
    $db->execute(
        "INSERT INTO refactor_rules (user_id, name, pattern, replacement, enabled) VALUES (?, ?, ?, ?, 1)",
        [$userId, $name, $pattern, $replacement]
    );
    
    $id = $db->lastInsertId();
    
    jsonSuccess(['id' => $id, 'enabled' => true], 'Rule saved');
}

function ensureEnabledColumn($db) {
    try {
        if (DB_TYPE === 'mysql') {
            $result = $db->query("SHOW COLUMNS FROM refactor_rules LIKE 'enabled'");
            if (empty($result)) {
                $db->execute("ALTER TABLE refactor_rules ADD COLUMN enabled TINYINT(1) DEFAULT 1");
            }
        } else {
            $result = $db->query("PRAGMA table_info(refactor_rules)");
            $hasEnabled = false;
            foreach ($result as $col) {
                if ($col['name'] === 'enabled') $hasEnabled = true;
            }
            if (!$hasEnabled) {
                $db->execute("ALTER TABLE refactor_rules ADD COLUMN enabled INTEGER DEFAULT 1");
            }
        }
    } catch (Exception $e) {}
}

function handleList() {
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    ensureEnabledColumn($db);
    
    $items = $db->query(
        "SELECT id, name, pattern, replacement, enabled, created_at 
         FROM refactor_rules 
         WHERE user_id = ? 
         ORDER BY created_at DESC",
        [$userId]
    );
    
    foreach ($items as &$item) {
        $item['enabled'] = (bool) ($item['enabled'] ?? 1);
    }
    
    jsonSuccess(['items' => $items]);
}

function handleToggle($data) {
    $id = $data['id'] ?? 0;
    $enabled = isset($data['enabled']) ? ($data['enabled'] ? 1 : 0) : null;
    
    if (!$id || $enabled === null) {
        jsonError('Missing ID or enabled state');
    }
    
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    ensureEnabledColumn($db);
    
    $db->execute(
        "UPDATE refactor_rules SET enabled = ? WHERE id = ? AND user_id = ?",
        [$enabled, $id, $userId]
    );
    
    jsonSuccess(['enabled' => (bool) $enabled], 'Rule updated');
}

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
