<?php
/**
 * API за трансформации (server-side)
 * Може да се използва за по-сложни операции
 */

require_once __DIR__ . '/utils.php';

initDatabaseIfNeeded();

$action = $_GET['action'] ?? '';
$data = getPostData();

switch ($action) {
    case 'transform':
        handleTransform($data);
        break;
    case 'extract-table':
        handleExtractTable($data);
        break;
    case 'extract-list':
        handleExtractList($data);
        break;
    case 'statistics':
        handleStatistics($data);
        break;
    default:
        jsonError('Invalid action', 400);
}

/**
 * Основна трансформация (за бъдещо разширение)
 */
function handleTransform($data) {
    // За сега трансформациите се правят на клиента
    // Този endpoint може да се използва за сложни операции
    jsonSuccess(['message' => 'Use client-side transformation']);
}

/**
 * Извлича данни от таблица
 */
function handleExtractTable($data) {
    $xml = $data['xml'] ?? '';
    
    if (empty($xml)) {
        jsonError('Missing XML input');
    }
    
    // Използваме вградения DOM парсер на PHP
    libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $doc->loadHTML('<?xml encoding="UTF-8">' . $xml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    
    $tables = $doc->getElementsByTagName('table');
    $result = [];
    
    foreach ($tables as $table) {
        $tableData = [
            'headers' => [],
            'rows' => []
        ];
        
        // Find headers
        $thead = $table->getElementsByTagName('thead')->item(0);
        if ($thead) {
            $ths = $thead->getElementsByTagName('th');
            foreach ($ths as $th) {
                $tableData['headers'][] = trim($th->textContent);
            }
        }
        
        // Find rows
        $rows = $table->getElementsByTagName('tr');
        foreach ($rows as $row) {
            $rowData = [];
            $cells = $row->getElementsByTagName('td');
            
            if ($cells->length === 0) {
                // Try th if no td (header row)
                $cells = $row->getElementsByTagName('th');
                if ($cells->length > 0 && empty($tableData['headers'])) {
                    foreach ($cells as $cell) {
                        $tableData['headers'][] = trim($cell->textContent);
                    }
                    continue;
                }
            }
            
            foreach ($cells as $cell) {
                $rowData[] = trim($cell->textContent);
            }
            
            if (!empty($rowData)) {
                $tableData['rows'][] = $rowData;
            }
        }
        
        $result[] = $tableData;
    }
    
    jsonSuccess(['tables' => $result]);
}

/**
 * Извлича данни от списъци
 */
function handleExtractList($data) {
    $xml = $data['xml'] ?? '';
    
    if (empty($xml)) {
        jsonError('Missing XML input');
    }
    
    libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $doc->loadHTML('<?xml encoding="UTF-8">' . $xml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    
    $result = [];
    
    // Find ul and ol
    foreach (['ul', 'ol'] as $listType) {
        $lists = $doc->getElementsByTagName($listType);
        foreach ($lists as $list) {
            $listData = [
                'type' => $listType,
                'items' => []
            ];
            
            $items = $list->getElementsByTagName('li');
            foreach ($items as $item) {
                // Get direct text content (not nested lists)
                $text = '';
                foreach ($item->childNodes as $child) {
                    if ($child->nodeType === XML_TEXT_NODE) {
                        $text .= $child->textContent;
                    }
                }
                $listData['items'][] = trim($text);
            }
            
            $result[] = $listData;
        }
    }
    
    jsonSuccess(['lists' => $result]);
}

/**
 * Статистика на документ
 */
function handleStatistics($data) {
    $xml = $data['xml'] ?? '';
    
    if (empty($xml)) {
        jsonError('Missing XML input');
    }
    
    libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $doc->loadHTML('<?xml encoding="UTF-8">' . $xml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    
    $stats = [
        'totalElements' => 0,
        'elements' => [],
        'classes' => [],
        'attributes' => [],
        'maxDepth' => 0
    ];
    
    $analyzeNode = function($node, $depth = 0) use (&$analyzeNode, &$stats) {
        if ($node->nodeType !== XML_ELEMENT_NODE) return;
        
        $stats['totalElements']++;
        $stats['maxDepth'] = max($stats['maxDepth'], $depth);
        
        $tagName = strtolower($node->tagName);
        $stats['elements'][$tagName] = ($stats['elements'][$tagName] ?? 0) + 1;
        
        // Attributes
        if ($node->hasAttributes()) {
            foreach ($node->attributes as $attr) {
                $stats['attributes'][$attr->name] = ($stats['attributes'][$attr->name] ?? 0) + 1;
                
                // Classes
                if ($attr->name === 'class') {
                    $classes = preg_split('/\s+/', $attr->value);
                    foreach ($classes as $class) {
                        if ($class) {
                            $stats['classes'][$class] = ($stats['classes'][$class] ?? 0) + 1;
                        }
                    }
                }
            }
        }
        
        // Children
        foreach ($node->childNodes as $child) {
            $analyzeNode($child, $depth + 1);
        }
    };
    
    $analyzeNode($doc->documentElement);
    
    // Sort by count
    arsort($stats['elements']);
    arsort($stats['classes']);
    arsort($stats['attributes']);
    
    jsonSuccess(['statistics' => $stats]);
}
