# XAMPP Инсталация - Emmet2XML

## Бързо стартиране (3 стъпки)

### 1. Копирайте проекта
Копирайте цялата папка `Emmet2XML` в:
```
C:\xampp\htdocs\Emmet2XML\    (Windows)
/Applications/XAMPP/htdocs/Emmet2XML/    (macOS)
```

### 2. Стартирайте XAMPP
- Отворете XAMPP Control Panel
- Стартирайте **Apache** и **MySQL**

### 3. Отворете в браузър
```
http://localhost/Emmet2XML/
```

**Готово!** Базата данни се създава автоматично.

---

## Ръчна настройка (ако е нужно)

### Създаване на база данни в phpMyAdmin

1. Отворете http://localhost/phpmyadmin/
2. Кликнете **"New"** (вляво)
3. Въведете име: `emmet2xml`
4. Изберете **utf8mb4_unicode_ci**
5. Кликнете **"Create"**

### Импортиране на схемата

1. Изберете базата `emmet2xml`
2. Кликнете таб **"Import"**
3. Изберете файл: `sql/schema_mysql.sql`
4. Кликнете **"Go"**

---

## Конфигурация

Файл: `php/config.php`

```php
// За XAMPP използвайте:
define('DB_TYPE', 'mysql');
define('DB_HOST', 'localhost');
define('DB_NAME', 'emmet2xml');
define('DB_USER', 'root');
define('DB_PASS', '');  // XAMPP по подразбиране няма парола
```

### Ако имате парола за MySQL:
```php
define('DB_PASS', 'вашата_парола');
```

---

## Отстраняване на проблеми

### Грешка: "Database connection failed"
1. Проверете дали MySQL е стартиран в XAMPP
2. Проверете данните в `php/config.php`
3. Проверете дали базата `emmet2xml` съществува

### Грешка: "Access denied for user 'root'"
1. Проверете паролата в `php/config.php`
2. XAMPP по подразбиране: `DB_PASS = ''` (празна)

### Страницата е празна
1. Отворете XAMPP Control Panel
2. Уверете се че Apache е стартиран (зелен)
3. Проверете пътя: `htdocs/Emmet2XML/`

### Грешки в PHP
1. Отворете `php/config.php`
2. Уверете се че `DEBUG_MODE` е `true`
3. Презаредете страницата за да видите грешката

---

## Структура в htdocs

```
C:\xampp\htdocs\
└── Emmet2XML\
    ├── index.php
    ├── css\
    ├── js\
    ├── php\
    │   └── config.php  ← Настройки тук
    ├── includes\
    ├── sql\
    │   ├── schema.sql       (SQLite)
    │   └── schema_mysql.sql (MySQL/XAMPP)
    └── data\
```

---

## Превключване между SQLite и MySQL

### За SQLite (без XAMPP):
```php
define('DB_TYPE', 'sqlite');
```

### За MySQL (XAMPP):
```php
define('DB_TYPE', 'mysql');
```

---

## Примерни акаунти

Регистрирайте нов потребител или използвайте:
- Username: `demo`
- Password: `demo123`

*(Създайте го при първа регистрация)*
