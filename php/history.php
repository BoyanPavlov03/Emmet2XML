<?php
/**
 * API за история на трансформациите
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
    case 'get':
        requireAuth();
        handleGet($data);
        break;
    case 'delete':
        requireAuth();
        handleDelete($data);
        break;
    default:
        jsonError('Invalid action', 400);
}

/**
 * Запазва нова трансформация
 */
function handleSave($data) {
    $inputType = $data['input_type'] ?? '';
    $inputData = $data['input_data'] ?? '';
    $outputData = $data['output_data'] ?? '';
    $settings = $data['settings'] ?? [];
    
    if (empty($inputType) || empty($inputData)) {
        jsonError('Missing required fields');
    }
    
    if (!in_array($inputType, ['emmet', 'xml'])) {
        jsonError('Invalid input type');
    }
    
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    $db->execute(
        "INSERT INTO transformations (user_id, input_type, input_data, output_data, settings_json) 
         VALUES (?, ?, ?, ?, ?)",
        [$userId, $inputType, $inputData, $outputData, json_encode($settings)]
    );
    
    $id = $db->lastInsertId();
    
    jsonSuccess(['id' => $id], 'Transformation saved');
}

/**
 * Връща списък с трансформации
 */
function handleList() {
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    $type = $_GET['type'] ?? 'all';
    $limit = min((int)($_GET['limit'] ?? 50), 100);
    $offset = (int)($_GET['offset'] ?? 0);
    
    $sql = "SELECT id, input_type, input_data, output_data, settings_json, created_at 
            FROM transformations 
            WHERE user_id = ?";
    $params = [$userId];
    
    if ($type !== 'all' && in_array($type, ['emmet', 'xml'])) {
        $sql .= " AND input_type = ?";
        $params[] = $type;
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $items = $db->query($sql, $params);
    
    // Декодираме settings_json
    foreach ($items as &$item) {
        $item['settings'] = json_decode($item['settings_json'], true);
        unset($item['settings_json']);
    }
    
    // Броим общо записи
    $countSql = "SELECT COUNT(*) as total FROM transformations WHERE user_id = ?";
    $countParams = [$userId];
    if ($type !== 'all' && in_array($type, ['emmet', 'xml'])) {
        $countSql .= " AND input_type = ?";
        $countParams[] = $type;
    }
    $total = $db->queryOne($countSql, $countParams)['total'];
    
    jsonSuccess([
        'items' => $items,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

/**
 * Връща единична трансформация
 */
function handleGet($data) {
    $id = $data['id'] ?? $_GET['id'] ?? 0;
    
    if (!$id) {
        jsonError('Missing ID');
    }
    
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    $item = $db->queryOne(
        "SELECT id, input_type, input_data, output_data, settings_json, created_at 
         FROM transformations 
         WHERE id = ? AND user_id = ?",
        [$id, $userId]
    );
    
    if (!$item) {
        jsonError('Not found', 404);
    }
    
    $item['settings'] = json_decode($item['settings_json'], true);
    unset($item['settings_json']);
    
    jsonSuccess(['item' => $item]);
}

/**
 * Изтрива трансформация
 */
function handleDelete($data) {
    $id = $data['id'] ?? 0;
    
    if (!$id) {
        jsonError('Missing ID');
    }
    
    $db = Database::getInstance();
    $userId = getCurrentUserId();
    
    $db->execute(
        "DELETE FROM transformations WHERE id = ? AND user_id = ?",
        [$id, $userId]
    );
    
    jsonSuccess([], 'Deleted');
}
