/**
 * Главно приложение - свързва всички модули
 */

const App = {
    selectedHistoryItem: null,
    
    /**
     * Инициализация
     */
    async init() {
        await Auth.init();
        this.bindEvents();
        this.updateLabels();
    },
    
    /**
     * Свързване на събития
     */
    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Transform direction change
        document.getElementById('transform-direction')?.addEventListener('change', () => {
            this.updateLabels();
        });
        
        // Transform button
        document.getElementById('btn-transform')?.addEventListener('click', () => {
            this.transform();
        });
        
        // Swap button
        document.getElementById('btn-swap')?.addEventListener('click', () => {
            this.swap();
        });
        
        // Clear input
        document.getElementById('btn-clear-input')?.addEventListener('click', () => {
            document.getElementById('input-editor').value = '';
        });

        // Enable tabs in textareas
        document.getElementById('input-editor').addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            }
        });
        
        // Copy output
        document.getElementById('btn-copy-output')?.addEventListener('click', () => {
            this.copyOutput();
        });
        
        // Analyze button (statistics)
        document.getElementById('btn-analyze')?.addEventListener('click', () => {
            this.analyze();
        });
        
        // History
        document.getElementById('btn-restore-settings')?.addEventListener('click', () => {
            this.restoreFromHistory('settings');
        });
        
        document.getElementById('btn-restore-data')?.addEventListener('click', () => {
            this.restoreFromHistory('data');
        });
        
        document.getElementById('btn-restore-both')?.addEventListener('click', () => {
            this.restoreFromHistory('both');
        });
        
        document.getElementById('history-filter-type')?.addEventListener('change', () => {
            this.loadHistory();
        });
        
        // Rules
        document.getElementById('btn-save-rule')?.addEventListener('click', () => {
            this.saveRule();
        });
        
        document.getElementById('btn-apply-rules')?.addEventListener('click', () => {
            this.applyRules();
        });
        
        // Analysis
        document.getElementById('btn-parse-table')?.addEventListener('click', () => {
            this.parseTable();
        });
        
        document.getElementById('column-select')?.addEventListener('change', () => {
            this.showColumnData();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.transform();
            }
        });
    },
    
    /**
     * Превключване между табове
     */
    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tab}`);
        });
        
        // Load history when switching to history tab
        if (tab === 'history' && Auth.isLoggedIn()) {
            this.loadHistory();
        }
        
        // Load rules when switching to rules tab
        if (tab === 'rules' && Auth.isLoggedIn()) {
            this.loadRules();
        }
    },
    
    /**
     * Обновява labels според посоката
     */
    updateLabels() {
        const direction = document.getElementById('transform-direction').value;
        const inputLabel = document.getElementById('input-label');
        const outputLabel = document.getElementById('output-label');
        
        if (direction === 'emmet2xml') {
            inputLabel.textContent = 'Emmet Вход';
            outputLabel.textContent = 'XML Изход';
        } else {
            inputLabel.textContent = 'XML Вход';
            outputLabel.textContent = 'Emmet Изход';
        }
    },
    
    /**
     * Взема текущите настройки
     */
    getSettings() {
        return {
            indent: document.getElementById('setting-indent').value,
            showValues: document.getElementById('setting-values').checked,
            showAttributes: document.getElementById('setting-attributes').checked,
            showAttrValues: document.getElementById('setting-attr-values').checked,
            selfClosing: document.getElementById('setting-self-closing').checked
        };
    },
    
    /**
     * Задава настройки
     */
    setSettings(settings) {
        if (settings.indent) document.getElementById('setting-indent').value = settings.indent;
        if (typeof settings.showValues === 'boolean') {
            document.getElementById('setting-values').checked = settings.showValues;
        }
        if (typeof settings.showAttributes === 'boolean') {
            document.getElementById('setting-attributes').checked = settings.showAttributes;
        }
        if (typeof settings.showAttrValues === 'boolean') {
            document.getElementById('setting-attr-values').checked = settings.showAttrValues;
        }
        if (typeof settings.selfClosing === 'boolean') {
            document.getElementById('setting-self-closing').checked = settings.selfClosing;
        }
    },
    
    /**
     * Изпълнява трансформация
     */
    async transform() {
        const direction = document.getElementById('transform-direction').value;
        const input = document.getElementById('input-editor').value;
        const output = document.getElementById('output-editor');
        const settings = this.getSettings();
        
        if (!input.trim()) {
            output.value = '';
            return;
        }
        
        const result = Transformer.transform(input, direction, settings);
        
        if (result.success) {
            output.value = result.result;
            
            // Запазваме в историята ако е логнат
            if (Auth.isLoggedIn()) {
                const inputType = direction === 'emmet2xml' ? 'emmet' : 'xml';
                await Transformer.saveToHistory(inputType, input, result.result, settings);
            }
        } else {
            output.value = 'Грешка: ' + result.error;
        }
    },
    
    /**
     * Разменя вход и изход
     */
    swap() {
        const inputEditor = document.getElementById('input-editor');
        const outputEditor = document.getElementById('output-editor');
        const directionSelect = document.getElementById('transform-direction');
        
        // Swap values
        const temp = inputEditor.value;
        inputEditor.value = outputEditor.value;
        outputEditor.value = temp;
        
        // Swap direction
        directionSelect.value = directionSelect.value === 'emmet2xml' ? 'xml2emmet' : 'emmet2xml';
        
        this.updateLabels();
    },
    
    /**
     * Копира изхода
     */
    async copyOutput() {
        const output = document.getElementById('output-editor').value;
        
        try {
            await navigator.clipboard.writeText(output);
            // Visual feedback
            const btn = document.getElementById('btn-copy-output');
            const originalText = btn.textContent;
            btn.textContent = 'Копирано!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1500);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    },
    
    /**
     * Анализира документ (статистика)
     */
    analyze() {
        const input = document.getElementById('stats-input').value;
        const resultsEl = document.getElementById('stats-results');
        
        if (!input.trim()) {
            resultsEl.innerHTML = '<p class="empty-state">Въведи XML за анализ</p>';
            return;
        }
        
        const stats = Statistics.analyze(input);
        resultsEl.innerHTML = Statistics.render(stats);
    },
    
    /**
     * Зарежда история
     */
    async loadHistory() {
        if (!Auth.isLoggedIn()) {
            document.getElementById('history-list').innerHTML = 
                '<p class="empty-state">Влез в акаунта си за да видиш историята.</p>';
            return;
        }
        
        const type = document.getElementById('history-filter-type').value;
        
        try {
            const response = await fetch(`php/history.php?action=list&type=${type}`);
            const data = await response.json();
            
            if (data.success && data.items) {
                this.renderHistory(data.items);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    },
    
    /**
     * Рендира списък с история
     */
    renderHistory(items) {
        const list = document.getElementById('history-list');
        
        if (items.length === 0) {
            list.innerHTML = '<p class="empty-state">Няма записи в историята.</p>';
            return;
        }
        
        list.innerHTML = items.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-type">
                        ${item.input_type === 'emmet' ? 'Emmet → XML' : 'XML → Emmet'}
                    </span>
                    <span class="history-item-date">${this.formatDate(item.created_at)}</span>
                </div>
                <div class="history-item-preview">${this.escapeHtml(item.input_data.substring(0, 100))}</div>
            </div>
        `).join('');
        
        // Add click handlers
        list.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', () => {
                this.selectHistoryItem(el, items.find(i => i.id == el.dataset.id));
            });
        });
    },
    
    /**
     * Избира елемент от историята
     */
    selectHistoryItem(el, item) {
        // Deselect previous
        document.querySelectorAll('.history-item').forEach(i => i.classList.remove('selected'));
        
        // Select current
        el.classList.add('selected');
        this.selectedHistoryItem = item;
    },
    
    /**
     * Възстановява от историята
     */
    restoreFromHistory(type) {
        if (!this.selectedHistoryItem) {
            alert('Първо избери елемент от историята');
            return;
        }
        
        const item = this.selectedHistoryItem;
        
        if (type === 'settings' || type === 'both') {
            this.setSettings(item.settings || {});
        }
        
        if (type === 'data' || type === 'both') {
            document.getElementById('input-editor').value = item.input_data;
            document.getElementById('output-editor').value = item.output_data || '';
            
            // Set direction
            const direction = item.input_type === 'emmet' ? 'emmet2xml' : 'xml2emmet';
            document.getElementById('transform-direction').value = direction;
            this.updateLabels();
        }
        
        // Switch to transform tab
        this.switchTab('transform');
    },
    
    /**
     * Запазва правило
     */
    async saveRule() {
        if (!Auth.isLoggedIn()) {
            Auth.openModal();
            return;
        }
        
        const name = document.getElementById('rule-name').value.trim();
        const pattern = document.getElementById('rule-pattern').value.trim();
        const replacement = document.getElementById('rule-replacement').value.trim();
        
        if (!name || !pattern || !replacement) {
            alert('Попълни всички полета');
            return;
        }
        
        try {
            const response = await fetch('php/rules.php?action=save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, pattern, replacement })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear form
                document.getElementById('rule-name').value = '';
                document.getElementById('rule-pattern').value = '';
                document.getElementById('rule-replacement').value = '';
                
                this.loadRules();
            } else {
                alert(data.error || 'Грешка при запазване');
            }
        } catch (error) {
            console.error('Save rule error:', error);
        }
    },
    
    /**
     * Зарежда правила
     */
    async loadRules() {
        if (!Auth.isLoggedIn()) {
            document.getElementById('rules-list').innerHTML = 
                '<p class="empty-state">Влез за да видиш правилата.</p>';
            return;
        }
        
        try {
            const response = await fetch('php/rules.php?action=list');
            const data = await response.json();
            
            if (data.success && data.items) {
                this.renderRules(data.items);
            }
        } catch (error) {
            console.error('Load rules error:', error);
        }
    },
    
    /**
     * Рендира правила
     */
    renderRules(items) {
        const list = document.getElementById('rules-list');
        
        if (items.length === 0) {
            list.innerHTML = '<p class="empty-state">Няма запазени правила.</p>';
            return;
        }
        
        list.innerHTML = items.map(item => `
            <div class="rule-item" data-id="${item.id}">
                <div class="rule-item-info">
                    <div class="rule-item-name">${this.escapeHtml(item.name)}</div>
                    <div class="rule-item-pattern">${this.escapeHtml(item.pattern)} → ${this.escapeHtml(item.replacement)}</div>
                </div>
                <button class="btn-small btn-delete-rule" data-id="${item.id}">Изтрий</button>
            </div>
        `).join('');
        
        // Delete handlers
        list.querySelectorAll('.btn-delete-rule').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.deleteRule(btn.dataset.id);
            });
        });
    },
    
    /**
     * Изтрива правило
     */
    async deleteRule(id) {
        try {
            await fetch('php/rules.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            this.loadRules();
        } catch (error) {
            console.error('Delete rule error:', error);
        }
    },
    
    /**
     * Прилага правила
     */
    async applyRules() {
        const input = document.getElementById('rules-test-input').value;
        const output = document.getElementById('rules-test-output');
        
        if (!input.trim()) {
            output.value = '';
            return;
        }
        
        try {
            const response = await fetch('php/rules.php?action=list');
            const data = await response.json();
            
            if (data.success && data.items) {
                let result = input;
                
                for (const rule of data.items) {
                    const transformed = Transformer.applyRule(result, rule.pattern, rule.replacement);
                    if (transformed.success) {
                        result = transformed.result;
                    }
                }
                
                output.value = result;
            }
        } catch (error) {
            output.value = 'Грешка: ' + error.message;
        }
    },
    
    // Storage for parsed table data
    tableData: null,
    tableHeaders: [],
    
    /**
     * Парсва таблица от XML или Emmet
     */
    parseTable() {
        const format = document.getElementById('analysis-format').value;
        const input = document.getElementById('analysis-input').value;
        const controlsEl = document.getElementById('analysis-controls');
        const columnSelect = document.getElementById('column-select');
        const resultsContent = document.getElementById('analysis-results-content');
        
        if (!input.trim()) {
            resultsContent.innerHTML = '<p class="empty-state">Моля, въведи таблица.</p>';
            controlsEl.style.display = 'none';
            return;
        }
        
        let xml = input;
        
        // Convert Emmet to XML if needed
        if (format === 'emmet') {
            const result = Transformer.transform(input, 'emmet2xml', this.getSettings());
            if (!result.success) {
                resultsContent.innerHTML = `<p class="empty-state">Грешка при парсване на Emmet: ${this.escapeHtml(result.error)}</p>`;
                controlsEl.style.display = 'none';
                return;
            }
            xml = result.result;
        }
        
        // Parse table from XML
        const tableResult = this.extractTableData(xml);
        
        if (!tableResult.success) {
            resultsContent.innerHTML = `<p class="empty-state">${this.escapeHtml(tableResult.error)}</p>`;
            controlsEl.style.display = 'none';
            return;
        }
        
        this.tableData = tableResult.data;
        this.tableHeaders = tableResult.headers;
        
        // Populate column dropdown
        columnSelect.innerHTML = '<option value="">-- Избери колона --</option>';
        this.tableHeaders.forEach((header, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = header || `Колона ${index + 1}`;
            columnSelect.appendChild(option);
        });
        
        // Show controls
        controlsEl.style.display = 'block';
        document.getElementById('column-count').textContent = `Намерени ${this.tableHeaders.length} колони и ${this.tableData.length} реда с данни`;
        
        // Show preview
        this.showTablePreview();
    },
    
    /**
     * Извлича данни от XML таблица, списък или структурирани данни
     */
    extractTableData(xml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');
            
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                return { success: false, error: 'Невалиден XML формат.' };
            }
            
            const root = doc.documentElement;
            
            // 1. Try traditional table
            const tableResult = this.extractFromTable(root);
            if (tableResult.success) return tableResult;
            
            // 2. Try lists (ul, ol, li)
            const listResult = this.extractFromList(root);
            if (listResult.success) return listResult;
            
            // 3. Try structured data (list/item, items/item, etc.)
            const structuredResult = this.extractFromStructured(root);
            if (structuredResult.success) return structuredResult;
            
            return { success: false, error: 'Не е намерена таблица, списък или структурирани данни.\nПоддържани формати:\n- <table> с <tr>/<td>\n- <ul>/<ol> с <li>\n- Структурирани данни като <list>/<item> или <items>/<item>' };
            
        } catch (error) {
            return { success: false, error: 'Грешка при парсване: ' + error.message };
        }
    },
    
    /**
     * Извлича данни от традиционна HTML/XML таблица
     */
    extractFromTable(root) {
        let table = root.querySelector('table') || root;
        const rows = table.querySelectorAll('tr, row');
        
        if (rows.length === 0) {
            return { success: false };
        }
        
        let headers = [];
        const data = [];
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('th, td, cell');
            const rowData = [];
            
            cells.forEach((cell, cellIndex) => {
                const text = cell.textContent.trim();
                
                if (rowIndex === 0 && (cell.tagName.toLowerCase() === 'th' || headers.length === 0)) {
                    if (cell.tagName.toLowerCase() === 'th') {
                        headers.push(text);
                    } else if (rowIndex === 0) {
                        headers.push(text || `Колона ${cellIndex + 1}`);
                    }
                }
                rowData.push(text);
            });
            
            const firstRowCells = rows[0].querySelectorAll('th');
            if (firstRowCells.length > 0 && rowIndex === 0) {
                return;
            }
            
            if (rowData.length > 0) {
                data.push(rowData);
            }
        });
        
        if (headers.length === 0 && data.length > 0) {
            headers = data[0].map((_, i) => `Колона ${i + 1}`);
        }
        
        if (data.length === 0) {
            return { success: false };
        }
        
        return { success: true, headers, data };
    },
    
    /**
     * Извлича данни от списъци (ul, ol, li)
     */
    extractFromList(root) {
        // Find lists
        const lists = root.querySelectorAll('ul, ol');
        let listItems = [];
        
        if (lists.length > 0) {
            // Get li elements from found lists
            lists.forEach(list => {
                list.querySelectorAll(':scope > li').forEach(li => listItems.push(li));
            });
        } else {
            // Check for direct li elements under root or any parent
            listItems = Array.from(root.querySelectorAll('li'));
        }
        
        if (listItems.length === 0) {
            return { success: false };
        }
        
        // Check if li elements have children (structured) or just text
        const firstLi = listItems[0];
        const childElements = Array.from(firstLi.children).filter(el => el.nodeType === 1);
        
        if (childElements.length > 0) {
            // Structured list items - extract child elements as columns
            const headers = [];
            const headerSet = new Set();
            
            // Collect all unique child tag names as headers
            listItems.forEach(li => {
                Array.from(li.children).forEach(child => {
                    if (child.nodeType === 1 && !headerSet.has(child.tagName.toLowerCase())) {
                        headerSet.add(child.tagName.toLowerCase());
                        headers.push(child.tagName.toLowerCase());
                    }
                });
            });
            
            const data = listItems.map(li => {
                return headers.map(header => {
                    const el = li.querySelector(header);
                    return el ? el.textContent.trim() : '';
                });
            });
            
            // Capitalize headers
            const formattedHeaders = headers.map(h => h.charAt(0).toUpperCase() + h.slice(1));
            
            return { success: true, headers: formattedHeaders, data };
        } else {
            // Simple list - just text content
            const data = listItems.map(li => [li.textContent.trim()]);
            return { success: true, headers: ['Стойност'], data };
        }
    },
    
    /**
     * Извлича данни от структурирани XML елементи (list/item, items/item, etc.)
     */
    extractFromStructured(root) {
        // Common container patterns: list, items, data, records, entries
        const containerPatterns = ['list', 'items', 'data', 'records', 'entries', 'collection', 'rows'];
        // Common item patterns: item, record, entry, row, element
        const itemPatterns = ['item', 'record', 'entry', 'row', 'element', 'node'];
        
        let container = null;
        let items = [];
        
        // Try to find a container
        for (const pattern of containerPatterns) {
            container = root.querySelector(pattern) || (root.tagName.toLowerCase() === pattern ? root : null);
            if (container) break;
        }
        
        // If no known container, use root
        if (!container) {
            container = root;
        }
        
        // Find items within container
        for (const pattern of itemPatterns) {
            items = Array.from(container.querySelectorAll(`:scope > ${pattern}`));
            if (items.length > 0) break;
        }
        
        // If no items found with known patterns, get all direct children that repeat
        if (items.length === 0) {
            const children = Array.from(container.children);
            if (children.length > 1) {
                // Check if children have same tag name (repeated structure)
                const tagCounts = {};
                children.forEach(child => {
                    const tag = child.tagName.toLowerCase();
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
                
                // Find the most common repeated tag
                let maxTag = null;
                let maxCount = 0;
                for (const [tag, count] of Object.entries(tagCounts)) {
                    if (count > maxCount && count > 1) {
                        maxTag = tag;
                        maxCount = count;
                    }
                }
                
                if (maxTag) {
                    items = children.filter(c => c.tagName.toLowerCase() === maxTag);
                }
            }
        }
        
        if (items.length === 0) {
            return { success: false };
        }
        
        // Extract headers from first item's children
        const headers = [];
        const headerSet = new Set();
        
        items.forEach(item => {
            Array.from(item.children).forEach(child => {
                if (child.nodeType === 1) {
                    const tagName = child.tagName.toLowerCase();
                    if (!headerSet.has(tagName)) {
                        headerSet.add(tagName);
                        headers.push(tagName);
                    }
                }
            });
        });
        
        if (headers.length === 0) {
            // Items don't have children, treat as simple values
            const data = items.map(item => [item.textContent.trim()]);
            return { success: true, headers: ['Стойност'], data };
        }
        
        // Extract data
        const data = items.map(item => {
            return headers.map(header => {
                const el = item.querySelector(header);
                return el ? el.textContent.trim() : '';
            });
        });
        
        // Capitalize headers
        const formattedHeaders = headers.map(h => h.charAt(0).toUpperCase() + h.slice(1));
        
        return { success: true, headers: formattedHeaders, data };
    },
    
    /**
     * Показва преглед на цялата таблица
     */
    showTablePreview() {
        const resultsContent = document.getElementById('analysis-results-content');
        
        if (!this.tableData || this.tableData.length === 0) {
            resultsContent.innerHTML = '<p class="empty-state">Няма данни за показване.</p>';
            return;
        }
        
        let html = '<table class="results-table"><thead><tr>';
        html += '<th>#</th>';
        this.tableHeaders.forEach(h => {
            html += `<th>${this.escapeHtml(h)}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        this.tableData.forEach((row, idx) => {
            html += `<tr><td>${idx + 1}</td>`;
            row.forEach(cell => {
                html += `<td>${this.escapeHtml(cell)}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        resultsContent.innerHTML = html;
    },
    
    /**
     * Показва данни от избраната колона
     */
    showColumnData() {
        const columnSelect = document.getElementById('column-select');
        const resultsContent = document.getElementById('analysis-results-content');
        const columnIndex = columnSelect.value;
        
        if (columnIndex === '' || !this.tableData) {
            this.showTablePreview();
            return;
        }
        
        const colIdx = parseInt(columnIndex);
        const columnName = this.tableHeaders[colIdx] || `Колона ${colIdx + 1}`;
        const columnValues = this.tableData.map(row => row[colIdx] || '');
        
        // Calculate statistics
        const uniqueValues = [...new Set(columnValues)];
        const valueCounts = {};
        columnValues.forEach(v => {
            valueCounts[v] = (valueCounts[v] || 0) + 1;
        });
        
        // Check if numeric
        const numericValues = columnValues.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).map(parseFloat);
        const isNumeric = numericValues.length > columnValues.length / 2;
        
        let html = `<h4>Колона: ${this.escapeHtml(columnName)}</h4>`;
        html += '<table class="results-table"><thead><tr><th>#</th><th>Стойност</th></tr></thead><tbody>';
        
        columnValues.forEach((value, idx) => {
            html += `<tr><td>${idx + 1}</td><td>${this.escapeHtml(value)}</td></tr>`;
        });
        
        html += '</tbody></table>';
        
        // Summary section
        html += '<div class="analysis-summary"><h4>Статистика</h4>';
        html += `<div class="summary-item"><span>Общо записи:</span><span>${columnValues.length}</span></div>`;
        html += `<div class="summary-item"><span>Уникални стойности:</span><span>${uniqueValues.length}</span></div>`;
        
        const emptyCount = columnValues.filter(v => v === '').length;
        if (emptyCount > 0) {
            html += `<div class="summary-item"><span>Празни клетки:</span><span>${emptyCount}</span></div>`;
        }
        
        if (isNumeric && numericValues.length > 0) {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            const avg = sum / numericValues.length;
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            
            html += `<div class="summary-item"><span>Сума:</span><span>${sum.toFixed(2)}</span></div>`;
            html += `<div class="summary-item"><span>Средно:</span><span>${avg.toFixed(2)}</span></div>`;
            html += `<div class="summary-item"><span>Минимум:</span><span>${min}</span></div>`;
            html += `<div class="summary-item"><span>Максимум:</span><span>${max}</span></div>`;
        }
        
        html += '</div>';
        
        resultsContent.innerHTML = html;
    },
    
    /**
     * Форматира дата
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('bg-BG') + ' ' + date.toLocaleTimeString('bg-BG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },
    
    /**
     * Escape special chars
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Стартиране
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
