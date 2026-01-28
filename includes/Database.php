<?php
class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        $this->connect();
        $this->ensureTablesExist();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function connect() {
        try {
            if (DB_TYPE === 'sqlite') {
                $dbDir = dirname(DB_PATH);
                if (!is_dir($dbDir)) {
                    mkdir($dbDir, 0755, true);
                }
                $this->pdo = new PDO('sqlite:' . DB_PATH);
                $this->pdo->exec('PRAGMA foreign_keys = ON');
            } else {
                $dsn = "mysql:host=" . DB_HOST . ";charset=utf8mb4";
                $this->pdo = new PDO($dsn, DB_USER, DB_PASS);
                $this->pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $this->pdo->exec("USE `" . DB_NAME . "`");
            }
            
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                die("Database connection failed: " . $e->getMessage());
            }
            die("Database connection failed");
        }
    }
    
    private function ensureTablesExist() {
        if (!$this->tableExists('users')) {
            $this->initSchema();
        }
    }
    
    public function getPdo() {
        return $this->pdo;
    }
    
    public function query($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    public function queryOne($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }
    
    public function execute($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }
    
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    public function initSchema() {
        if (DB_TYPE === 'mysql') {
            $schemaFile = __DIR__ . '/../sql/schema_mysql.sql';
        } else {
            $schemaFile = __DIR__ . '/../sql/schema.sql';
        }
        
        if (file_exists($schemaFile)) {
            $sql = file_get_contents($schemaFile);
            
            if (DB_TYPE === 'mysql') {
                $sql = preg_replace('/--.*$/m', '', $sql);
                $statements = array_filter(array_map('trim', explode(';', $sql)));
                
                foreach ($statements as $statement) {
                    if (!empty($statement)) {
                        try {
                            $this->pdo->exec($statement);
                        } catch (PDOException $e) {
                            if (strpos($e->getMessage(), 'Duplicate') === false) {
                                if (DEBUG_MODE) {
                                    error_log("Schema error: " . $e->getMessage());
                                }
                            }
                        }
                    }
                }
            } else {
                $this->pdo->exec($sql);
            }
            return true;
        }
        return false;
    }
    
    public function tableExists($table) {
        try {
            if (DB_TYPE === 'sqlite') {
                $result = $this->queryOne(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    [$table]
                );
            } else {
                $result = $this->queryOne("SHOW TABLES LIKE ?", [$table]);
            }
            return $result !== false;
        } catch (Exception $e) {
            return false;
        }
    }
}
