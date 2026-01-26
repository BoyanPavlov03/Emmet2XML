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
