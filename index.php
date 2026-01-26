<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>emmet2xml - Трансформатор</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="app-container">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <h1 class="logo">emmet<span>2</span>xml</h1>
            </div>
            <nav class="header-nav">
                <button class="nav-btn active" data-tab="transform">Трансформация</button>
                <button class="nav-btn" data-tab="statistics">Статистика</button>
                <button class="nav-btn" data-tab="analysis">Анализ</button>
                <button class="nav-btn" data-tab="history">История</button>
                <button class="nav-btn" data-tab="rules">Правила</button>
            </nav>
            <div class="header-right">
                <div id="auth-section">
                    <!-- Динамично съдържание за автентикация -->
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Transform Tab -->
            <section id="tab-transform" class="tab-content active">
                <div class="transform-container">
                    <!-- Настройки панел -->
                    <div class="settings-panel">
                        <h3>Настройки</h3>
                        
                        <div class="setting-group">
                            <label>Посока:</label>
                            <select id="transform-direction">
                                <option value="emmet2xml">Emmet → XML</option>
                                <option value="xml2emmet">XML → Emmet</option>
                            </select>
                        </div>
                        
                        <div class="setting-group">
                            <label>
                                <input type="checkbox" id="setting-values" checked>
                                Показвай стойности на елементи
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <label>
                                <input type="checkbox" id="setting-attributes" checked>
                                Показвай атрибути
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <label>
                                <input type="checkbox" id="setting-attr-values" checked>
                                Показвай стойности на атрибути
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <label>
                                <input type="checkbox" id="setting-self-closing" checked>
                                Self-closing тагове
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <label>Отстъп:</label>
                            <select id="setting-indent">
                                <option value="  ">2 интервала</option>
                                <option value="    ">4 интервала</option>
                                <option value="&#9;">Tab</option>
                            </select>
                        </div>
                    </div>

                    <!-- Редактори -->
                    <div class="editors-container">
                        <div class="editor-panel">
                            <div class="editor-header">
                                <h3 id="input-label">Emmet Вход</h3>
                                <button class="btn-small" id="btn-clear-input">Изчисти</button>
                            </div>
                            <textarea id="input-editor" placeholder="Въведи Emmet израз...
Примери:
div#main>ul.list>li.item*3{Item $}
table>tr*3>td*4
nav>ul>li*5>a[href=#]{Link $}"></textarea>
                        </div>
                        
                        <div class="transform-actions">
                            <button class="btn-primary" id="btn-transform">
                                Трансформирай →
                            </button>
                            <button class="btn-secondary" id="btn-swap">
                                ⇄ Размени
                            </button>
                        </div>
                        
                        <div class="editor-panel">
                            <div class="editor-header">
                                <h3 id="output-label">XML Изход</h3>
                                <button class="btn-small" id="btn-copy-output">Копирай</button>
                            </div>
                            <textarea id="output-editor" readonly placeholder="Резултатът ще се появи тук..."></textarea>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Statistics Tab -->
            <section id="tab-statistics" class="tab-content">
                <div class="statistics-container">
                    <div class="stats-input">
                        <h3>Въведи XML за анализ</h3>
                        <textarea id="stats-input" placeholder="Въведи XML код за анализ..."></textarea>
                        <button class="btn-primary" id="btn-analyze">Анализирай</button>
                    </div>
                    
                    <div class="stats-results" id="stats-results">
                        <!-- Резултатите ще се появят тук -->
                    </div>
                </div>
            </section>

            <!-- Analysis Tab -->
            <section id="tab-analysis" class="tab-content">
                <div class="analysis-container">
                    <div class="analysis-input-section">
                        <h3>Анализ на данни</h3>
                        <div class="analysis-format">
                            <label>Формат на входа:</label>
                            <select id="analysis-format">
                                <option value="xml">XML</option>
                                <option value="emmet">Emmet</option>
                            </select>
                        </div>
                        <textarea id="analysis-input" placeholder="Поддържани формати:

1. Таблици (<table>):
<table>
  <tr><th>Име</th><th>Оценка</th></tr>
  <tr><td>Иван</td><td>87</td></tr>
</table>

2. Списъци (<ul>/<ol>/<li>):
<ul>
  <li><name>Иван</name><score>87</score></li>
  <li><name>Мария</name><score>92</score></li>
</ul>

3. Структурирани данни (<list>/<item>):
<list>
  <item><name>Иван</name><score>87</score></item>
  <item><name>Мария</name><score>92</score></item>
</list>

4. Emmet формат:
table>tr>th{Име}+th{Оценка}^tr>td{Иван}+td{87}"></textarea>
                        <button class="btn-primary" id="btn-parse-table">Парсирай данните</button>
                    </div>
                    
                    <div class="analysis-controls" id="analysis-controls" style="display: none;">
                        <h3>Избор на колона</h3>
                        <div class="column-selector">
                            <label>Колона:</label>
                            <select id="column-select">
                                <option value="">-- Избери колона --</option>
                            </select>
                        </div>
                        <div class="column-info">
                            <span id="column-count"></span>
                        </div>
                    </div>
                    
                    <div class="analysis-results" id="analysis-results">
                        <h3>Данни от колоната</h3>
                        <div class="results-content" id="analysis-results-content">
                            <p class="empty-state">Въведи таблица и избери колона за анализ.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- History Tab -->
            <section id="tab-history" class="tab-content">
                <div class="history-container">
                    <div class="history-header">
                        <h3>История на трансформациите</h3>
                        <div class="history-filters">
                            <select id="history-filter-type">
                                <option value="all">Всички</option>
                                <option value="emmet">Emmet → XML</option>
                                <option value="xml">XML → Emmet</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="history-list" id="history-list">
                        <p class="empty-state">Влез в акаунта си за да видиш историята.</p>
                    </div>
                    
                    <div class="history-actions">
                        <button class="btn-secondary" id="btn-restore-settings">
                            Възстанови настройки
                        </button>
                        <button class="btn-secondary" id="btn-restore-data">
                            Възстанови данни
                        </button>
                        <button class="btn-primary" id="btn-restore-both">
                            Възстанови всичко
                        </button>
                    </div>
                </div>
            </section>

            <!-- Rules Tab -->
            <section id="tab-rules" class="tab-content">
                <div class="rules-container">
                    <div class="rules-editor">
                        <h3>Дефинирай правило за преструктуриране</h3>
                        
                        <div class="rule-input">
                            <label>Име на правилото:</label>
                            <input type="text" id="rule-name" placeholder="Напр: Размени елементи">
                        </div>
                        
                        <div class="rule-input">
                            <label>Шаблон (pattern):</label>
                            <input type="text" id="rule-pattern" placeholder="E1+E2">
                        </div>
                        
                        <div class="rule-input">
                            <label>Замяна (replacement):</label>
                            <input type="text" id="rule-replacement" placeholder="E2+E1">
                        </div>
                        
                        <button class="btn-primary" id="btn-save-rule">Запази правило</button>
                    </div>
                    
                    <div class="rules-list">
                        <h3>Запазени правила</h3>
                        <div id="rules-list">
                            <p class="empty-state">Няма запазени правила.</p>
                        </div>
                    </div>
                    
                    <div class="rules-test">
                        <h3>Тествай правило</h3>
                        <textarea id="rules-test-input" placeholder="Въведи XML за тестване..."></textarea>
                        <button class="btn-secondary" id="btn-apply-rules">Приложи правила</button>
                        <textarea id="rules-test-output" readonly placeholder="Резултат..."></textarea>
                    </div>
                </div>
            </section>
        </main>

        <!-- Auth Modal -->
        <div id="auth-modal" class="modal">
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <div class="auth-tabs">
                    <button class="auth-tab active" data-auth="login">Вход</button>
                    <button class="auth-tab" data-auth="register">Регистрация</button>
                </div>
                
                <!-- Login Form -->
                <form id="login-form" class="auth-form active">
                    <div class="form-group">
                        <label>Потребител:</label>
                        <input type="text" name="username" required minlength="3">
                    </div>
                    <div class="form-group">
                        <label>Парола:</label>
                        <input type="password" name="password" required minlength="6">
                    </div>
                    <button type="submit" class="btn-primary">Влез</button>
                    <p class="form-error" id="login-error"></p>
                </form>
                
                <!-- Register Form -->
                <form id="register-form" class="auth-form">
                    <div class="form-group">
                        <label>Потребител:</label>
                        <input type="text" name="username" required minlength="3" maxlength="50">
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Парола:</label>
                        <input type="password" name="password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Потвърди парола:</label>
                        <input type="password" name="password_confirm" required minlength="6">
                    </div>
                    <button type="submit" class="btn-primary">Регистрирай се</button>
                    <p class="form-error" id="register-error"></p>
                </form>
            </div>
        </div>
    </div>

    <script src="js/emmet-parser.js?v=1769417979"></script>
    <script src="js/xml-parser.js?v=1769417979"></script>
    <script src="js/transformer.js"></script>
    <script src="js/statistics.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
