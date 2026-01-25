<?php
/**
 * Database wrapper клас
 * Поддържа SQLite и MySQL
 */

class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        $this->connect();
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
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                $this->pdo = new PDO($dsn, DB_USER, DB_PASS);
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
    
    public function getPdo() {
        return $this->pdo;
    }
    
    /**
     * Изпълнява SELECT заявка
     */
    public function query($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    /**
     * Връща един ред
     */
    public function queryOne($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }
    
    /**
     * Изпълнява INSERT/UPDATE/DELETE
     */
    public function execute($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }
    
    /**
     * Връща последния вмъкнат ID
     */
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Инициализира базата данни от schema.sql
     */
    public function initSchema() {
        $schemaFile = __DIR__ . '/../sql/schema.sql';
        if (file_exists($schemaFile)) {
            $sql = file_get_contents($schemaFile);
            $this->pdo->exec($sql);
            return true;
        }
        return false;
    }
    
    /**
     * Проверява дали таблица съществува
     */
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
