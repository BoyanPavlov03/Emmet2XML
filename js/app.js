const App = {
    selectedHistoryItem: null,

    async init() {
        await Auth.init();
        this.bindEvents();
        this.updateLabels();
    },

    bindEvents() {

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        document.getElementById('transform-direction')?.addEventListener('change', () => {
            this.updateLabels();
        });

        document.getElementById('btn-transform')?.addEventListener('click', () => {
            this.transform();
        });

        document.getElementById('btn-swap')?.addEventListener('click', () => {
            this.swap();
        });

        document.getElementById('btn-clear-input')?.addEventListener('click', () => {
            document.getElementById('input-editor').value = '';
        });

        document.getElementById('input-editor').addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            }

            if (e.key === 'Enter') {
                const direction = document.getElementById('transform-direction').value;
                if (direction === 'xml2emmet') {
                    e.preventDefault();
                    this.handleXmlAutoIndent(e.target);
                }
            }

            if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f' || e.code === 'KeyF')) {
                e.preventDefault();
                e.stopPropagation();
                this.formatInput();
            }
        });

        document.getElementById('input-editor').addEventListener('click', (e) => {
            const direction = document.getElementById('transform-direction').value;
            if (direction === 'xml2emmet') {
                this.handleXmlBlockSelect(e.target);
            } else {
                this.handleEmmetBlockSelect(e.target);
            }
        });

        document.getElementById('btn-format-xml')?.addEventListener('click', () => {
            this.formatInput();
        });

        document.getElementById('btn-apply-all-rules')?.addEventListener('click', () => {
            this.applyAllRulesToInput();
        });

        document.getElementById('btn-copy-output')?.addEventListener('click', () => {
            this.copyOutput();
        });

        document.getElementById('btn-analyze')?.addEventListener('click', () => {
            this.analyze();
        });

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

        document.getElementById('btn-save-rule')?.addEventListener('click', () => {
            this.saveRule();
        });

        document.getElementById('btn-apply-rules')?.addEventListener('click', () => {
            this.applyRules();
        });

        document.getElementById('btn-parse-table')?.addEventListener('click', () => {
            this.parseTable();
        });

        document.getElementById('column-select')?.addEventListener('change', () => {
            this.showColumnData();
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.transform();
            }
        });
    },

    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tab}`);
        });

        if (tab === 'history' && Auth.isLoggedIn()) {
            this.loadHistory();
        }

        if (tab === 'rules' && Auth.isLoggedIn()) {
            this.loadRules();
        }
    },

    updateLabels() {
        const direction = document.getElementById('transform-direction').value;
        const inputLabel = document.getElementById('input-label');
        const outputLabel = document.getElementById('output-label');
        const formatBtn = document.getElementById('btn-format-xml');
        const applyRulesBtn = document.getElementById('btn-apply-all-rules');

        if (direction === 'emmet2xml') {
            inputLabel.textContent = 'Emmet Вход';
            outputLabel.textContent = 'XML Изход';
            if (formatBtn) {
                formatBtn.style.display = 'inline-block';
                formatBtn.textContent = '⚙ Форматирай';
                formatBtn.title = 'Форматирай Emmet (Ctrl+Shift+F)';
            }
            if (applyRulesBtn) applyRulesBtn.style.display = 'inline-block';
        } else {
            inputLabel.textContent = 'XML Вход';
            outputLabel.textContent = 'Emmet Изход';
            if (formatBtn) {
                formatBtn.style.display = 'inline-block';
                formatBtn.textContent = '⚙ Форматирай';
                formatBtn.title = 'Форматирай XML (Ctrl+Shift+F)';
            }
            if (applyRulesBtn) applyRulesBtn.style.display = 'inline-block';
        }
    },

    handleXmlAutoIndent(textarea) {
        const value = textarea.value;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const beforeCursor = value.substring(0, start);
        const afterCursor = value.substring(end);

        const lastNewline = beforeCursor.lastIndexOf('\n');
        const currentLine = beforeCursor.substring(lastNewline + 1);

        const baseIndentMatch = currentLine.match(/^(\s*)/);
        const baseIndent = baseIndentMatch ? baseIndentMatch[1] : '';

        const indentUnit = this.getSettings().indent;

        const beforeTag = beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>\s*$/);
        const afterTag = afterCursor.match(/^\s*<\/([a-zA-Z][a-zA-Z0-9-_]*)>/);

        let newText;
        let cursorPos;

        if (beforeTag && afterTag && beforeTag[1] === afterTag[1]) {

            const contentIndent = baseIndent + indentUnit;
            newText = '\n' + contentIndent + '\n' + baseIndent;
            cursorPos = start + 1 + contentIndent.length;
        } else if (beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>\s*$/)) {

            const newIndent = baseIndent + indentUnit;
            newText = '\n' + newIndent;
            cursorPos = start + 1 + newIndent.length;
        } else if (beforeCursor.match(/<\/[a-zA-Z][a-zA-Z0-9-_]*>\s*$/)) {

            newText = '\n' + baseIndent;
            cursorPos = start + 1 + baseIndent.length;
        } else {

            newText = '\n' + baseIndent;
            cursorPos = start + 1 + baseIndent.length;
        }

        textarea.value = beforeCursor + newText + afterCursor;
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
    },

    formatInput() {
        const direction = document.getElementById('transform-direction').value;
        if (direction === 'xml2emmet') {
            this.formatXml();
        } else {
            this.formatEmmet();
        }
    },

    formatEmmet() {
        const textarea = document.getElementById('input-editor');
        const emmet = textarea.value.trim();

        if (!emmet) return;

        try {

            let formatted = emmet;

            let result = '';
            let depth = 0;
            let inBrackets = false;
            let inBraces = false;

            for (let i = 0; i < formatted.length; i++) {
                const char = formatted[i];

                if (char === '(') depth++;
                if (char === ')') depth--;
                if (char === '[') inBrackets = true;
                if (char === ']') inBrackets = false;
                if (char === '{') inBraces = true;
                if (char === '}') inBraces = false;

                if (char === '+' && depth === 0 && !inBrackets && !inBraces) {
                    result += '\n+ ';
                } else if (char === '>' && depth === 0 && !inBrackets && !inBraces) {
                    result += '\n  > ';
                } else if (char === '^' && depth === 0 && !inBrackets && !inBraces) {
                    result += '\n^ ';
                } else {
                    result += char;
                }
            }

            textarea.value = result.trim();
        } catch (error) {
            console.error('Format Emmet error:', error);
            alert('Грешка при форматиране: ' + error.message);
        }
    },

    formatXml() {
        const textarea = document.getElementById('input-editor');
        const xml = textarea.value.trim();

        if (!xml) return;

        try {
            const indent = this.getSettings().indent;
            let formatted = '';
            let level = 0;

            const normalized = xml
                .replace(/>\s+</g, '><')
                .replace(/\s+/g, ' ')
                .trim();

            const tokens = normalized.match(/<[^>]+>|[^<]+/g) || [];

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i].trim();
                if (!token) continue;

                if (token.startsWith('</')) {

                    level--;
                    formatted += indent.repeat(Math.max(0, level)) + token + '\n';
                } else if (token.startsWith('<') && token.endsWith('/>')) {

                    formatted += indent.repeat(level) + token + '\n';
                } else if (token.startsWith('<?') || token.startsWith('<!')) {

                    formatted += token + '\n';
                } else if (token.startsWith('<')) {

                    const tagName = token.match(/<([a-zA-Z][a-zA-Z0-9-_]*)/)?.[1];
                    formatted += indent.repeat(level) + token;

                    const nextToken = tokens[i + 1]?.trim();
                    const afterNext = tokens[i + 2]?.trim();

                    if (nextToken && !nextToken.startsWith('<') &&
                        afterNext && afterNext === `</${tagName}>`) {

                        formatted += nextToken + afterNext + '\n';
                        i += 2;
                    } else {
                        formatted += '\n';
                        level++;
                    }
                } else {

                    formatted += indent.repeat(level) + token + '\n';
                }
            }

            textarea.value = formatted.trim();
        } catch (error) {
            console.error('Format error:', error);
            alert('Грешка при форматиране: ' + error.message);
        }
    },

    handleXmlBlockSelect(textarea) {
        const value = textarea.value;
        const cursorPos = textarea.selectionStart;

        let tagStart = -1;
        let tagEnd = -1;

        for (let i = cursorPos; i >= 0; i--) {
            if (value[i] === '<') {
                tagStart = i;
                break;
            }
            if (value[i] === '>') {

                break;
            }
        }

        if (tagStart === -1) return;

        for (let i = tagStart; i < value.length; i++) {
            if (value[i] === '>') {
                tagEnd = i + 1;
                break;
            }
        }

        if (tagEnd === -1) return;

        const tagContent = value.substring(tagStart, tagEnd);

        if (tagContent.startsWith('</')) {

            const tagName = tagContent.match(/<\/([a-zA-Z][a-zA-Z0-9-_]*)/)?.[1];
            if (!tagName) return;

            const openingTagStart = this.findMatchingOpeningTag(value, tagStart, tagName);
            if (openingTagStart !== -1) {
                textarea.selectionStart = openingTagStart;
                textarea.selectionEnd = tagEnd;
            }
        } else if (tagContent.endsWith('/>')) {

            textarea.selectionStart = tagStart;
            textarea.selectionEnd = tagEnd;
        } else {

            const tagName = tagContent.match(/<([a-zA-Z][a-zA-Z0-9-_]*)/)?.[1];
            if (!tagName) return;

            const closingTagEnd = this.findMatchingClosingTag(value, tagEnd, tagName);
            if (closingTagEnd !== -1) {
                textarea.selectionStart = tagStart;
                textarea.selectionEnd = closingTagEnd;
            }
        }
    },

    handleEmmetBlockSelect(textarea) {
        const value = textarea.value;
        const cursorPos = textarea.selectionStart;

        let start = cursorPos;
        let end = cursorPos;

        let parenDepth = 0;
        let parenStart = -1;

        for (let i = cursorPos; i >= 0; i--) {
            const char = value[i];

            if (char === ')') parenDepth++;
            if (char === '(') {
                if (parenDepth > 0) {
                    parenDepth--;
                } else {
                    parenStart = i;
                    break;
                }
            }

            if ((char === '+' || char === '^') && parenDepth === 0) {
                start = i + 1;
                break;
            }

            if (i === 0) start = 0;
        }

        if (parenStart !== -1) {
            start = parenStart;
            parenDepth = 1;

            for (let i = parenStart + 1; i < value.length; i++) {
                const char = value[i];
                if (char === '(') parenDepth++;
                if (char === ')') {
                    parenDepth--;
                    if (parenDepth === 0) {
                        end = i + 1;

                        if (value[i + 1] === '*') {
                            let j = i + 2;
                            while (j < value.length && /\d/.test(value[j])) j++;
                            end = j;
                        }
                        break;
                    }
                }
            }
        } else {

            parenDepth = 0;
            let inBrackets = false;
            let inBraces = false;

            for (let i = cursorPos; i < value.length; i++) {
                const char = value[i];

                if (char === '(') parenDepth++;
                if (char === ')') parenDepth--;
                if (char === '[') inBrackets = true;
                if (char === ']') inBrackets = false;
                if (char === '{') inBraces = true;
                if (char === '}') inBraces = false;

                if ((char === '+' || char === '^') && parenDepth === 0 && !inBrackets && !inBraces) {
                    end = i;
                    break;
                }

                if (i === value.length - 1) end = value.length;
            }
        }

        while (start < value.length && /\s/.test(value[start])) start++;
        while (end > start && /\s/.test(value[end - 1])) end--;

        if (start < end) {
            textarea.selectionStart = start;
            textarea.selectionEnd = end;
        }
    },

    findMatchingOpeningTag(text, fromPos, tagName) {
        let depth = 1;
        const openPattern = new RegExp(`<${tagName}(?:\\s|>|/>)`, 'g');
        const closePattern = new RegExp(`</${tagName}>`, 'g');

        const beforeText = text.substring(0, fromPos);
        const tags = [];

        let match;
        openPattern.lastIndex = 0;
        while ((match = openPattern.exec(beforeText)) !== null) {
            const isSelfClosing = text.substring(match.index, text.indexOf('>', match.index) + 1).endsWith('/>');
            if (!isSelfClosing) {
                tags.push({ pos: match.index, type: 'open' });
            }
        }

        closePattern.lastIndex = 0;
        while ((match = closePattern.exec(beforeText)) !== null) {
            tags.push({ pos: match.index, type: 'close' });
        }

        tags.sort((a, b) => b.pos - a.pos);

        let closeCount = 0;
        for (const tag of tags) {
            if (tag.type === 'close') {
                closeCount++;
            } else {
                if (closeCount === 0) {
                    return tag.pos;
                }
                closeCount--;
            }
        }

        return -1;
    },

    findMatchingClosingTag(text, fromPos, tagName) {
        let depth = 1;
        const afterText = text.substring(fromPos);

        const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?(?:>|/>)|</${tagName}>`, 'g');

        let match;
        while ((match = regex.exec(afterText)) !== null) {
            const fullMatch = match[0];

            if (fullMatch.startsWith(`</${tagName}`)) {
                depth--;
                if (depth === 0) {
                    return fromPos + match.index + fullMatch.length;
                }
            } else if (!fullMatch.endsWith('/>')) {
                depth++;
            }
        }

        return -1;
    },

    async applyAllRulesToInput() {
        const textarea = document.getElementById('input-editor');
        const fullText = textarea.value;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        const direction = document.getElementById('transform-direction').value;
        const isEmmetMode = direction === 'emmet2xml';

        if (selStart === selEnd) {
            const hint = isEmmetMode
                ? 'Съвет: Кликни върху елемент или група за да селектираш блок.'
                : 'Съвет: Кликни върху таг за да селектираш целия блок.';
            alert(`Моля, маркирай блок върху който да се приложат правилата.\n\n${hint}`);
            return;
        }

        let selectedText = fullText.substring(selStart, selEnd).trim();

        if (!selectedText) {
            alert('Моля, маркирай блок.');
            return;
        }

        try {

            const response = await fetch('php/rules.php?action=list');
            const data = await response.json();

            if (!data.success || !data.items || data.items.length === 0) {
                alert('Няма запазени правила за прилагане.');
                return;
            }

            let xmlToProcess = selectedText;
            const settings = this.getSettings();

            if (isEmmetMode) {
                const emmetResult = Transformer.transform(selectedText, 'emmet2xml', settings);
                if (!emmetResult.success) {
                    alert('Грешка при парсване на Emmet: ' + emmetResult.error);
                    return;
                }
                xmlToProcess = emmetResult.result;
            }

            let result = xmlToProcess;
            let appliedCount = 0;

            for (const rule of data.items) {
                if (!rule.enabled) continue;
                const transformed = Transformer.applyRule(result, rule.pattern, rule.replacement);
                if (transformed.success && transformed.result !== result) {
                    result = transformed.result;
                    appliedCount++;
                }
            }

            if (isEmmetMode && appliedCount > 0) {
                const xmlResult = Transformer.transform(result, 'xml2emmet', settings);
                if (xmlResult.success) {
                    result = xmlResult.result;
                }
            }

            if (appliedCount > 0) {

                const beforeSelection = fullText.substring(0, selStart);
                const afterSelection = fullText.substring(selEnd);
                textarea.value = beforeSelection + result + afterSelection;

                textarea.selectionStart = selStart;
                textarea.selectionEnd = selStart + result.length;
                textarea.focus();

                alert(`Успешно приложени ${appliedCount} правила върху маркирания блок.`);
            } else {
                alert('Няма съвпадения с правилата в маркирания блок.');
            }

        } catch (error) {
            console.error('Apply rules error:', error);
            alert('Грешка при прилагане на правила: ' + error.message);
        }
    },

    getSettings() {
        return {
            indent: document.getElementById('setting-indent').value,
            showValues: document.getElementById('setting-values').checked,
            showAttributes: document.getElementById('setting-attributes').checked,
            showAttrValues: document.getElementById('setting-attr-values').checked,
            selfClosing: document.getElementById('setting-self-closing').checked
        };
    },

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

            if (Auth.isLoggedIn()) {
                const inputType = direction === 'emmet2xml' ? 'emmet' : 'xml';
                await Transformer.saveToHistory(inputType, input, result.result, settings);
            }
        } else {
            output.value = 'Грешка: ' + result.error;
        }
    },

    swap() {
        const inputEditor = document.getElementById('input-editor');
        const outputEditor = document.getElementById('output-editor');
        const directionSelect = document.getElementById('transform-direction');

        const temp = inputEditor.value;
        inputEditor.value = outputEditor.value;
        outputEditor.value = temp;

        directionSelect.value = directionSelect.value === 'emmet2xml' ? 'xml2emmet' : 'emmet2xml';

        this.updateLabels();
    },

    async copyOutput() {
        const output = document.getElementById('output-editor').value;

        try {
            await navigator.clipboard.writeText(output);

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

        list.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', () => {
                this.selectHistoryItem(el, items.find(i => i.id == el.dataset.id));
            });
        });
    },

    selectHistoryItem(el, item) {

        document.querySelectorAll('.history-item').forEach(i => i.classList.remove('selected'));

        el.classList.add('selected');
        this.selectedHistoryItem = item;
    },

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

            const direction = item.input_type === 'emmet' ? 'emmet2xml' : 'xml2emmet';
            document.getElementById('transform-direction').value = direction;
            this.updateLabels();
        }

        this.switchTab('transform');
    },

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

    renderRules(items) {
        const list = document.getElementById('rules-list');

        if (items.length === 0) {
            list.innerHTML = '<p class="empty-state">Няма запазени правила.</p>';
            return;
        }

        list.innerHTML = items.map(item => `
            <div class="rule-item ${item.enabled ? '' : 'rule-disabled'}" data-id="${item.id}">
                <div class="rule-item-toggle">
                    <input type="checkbox" class="rule-toggle" data-id="${item.id}" ${item.enabled ? 'checked' : ''}>
                </div>
                <div class="rule-item-info">
                    <div class="rule-item-name">${this.escapeHtml(item.name)}</div>
                    <div class="rule-item-pattern">${this.escapeHtml(item.pattern)} → ${this.escapeHtml(item.replacement)}</div>
                </div>
                <button class="btn-small btn-delete-rule" data-id="${item.id}">Изтрий</button>
            </div>
        `).join('');

        list.querySelectorAll('.btn-delete-rule').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.deleteRule(btn.dataset.id);
            });
        });

        list.querySelectorAll('.rule-toggle').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                await this.toggleRule(checkbox.dataset.id, checkbox.checked);
            });
        });
    },

    async toggleRule(id, enabled) {
        try {
            await fetch('php/rules.php?action=toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, enabled })
            });
            const item = document.querySelector(`.rule-item[data-id="${id}"]`);
            if (item) {
                item.classList.toggle('rule-disabled', !enabled);
            }
        } catch (error) {
            console.error('Toggle rule error:', error);
        }
    },

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
                    if (!rule.enabled) continue;
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

    tableData: null,
    tableHeaders: [],

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

        if (format === 'emmet') {
            const result = Transformer.transform(input, 'emmet2xml', this.getSettings());
            if (!result.success) {
                resultsContent.innerHTML = `<p class="empty-state">Грешка при парсване на Emmet: ${this.escapeHtml(result.error)}</p>`;
                controlsEl.style.display = 'none';
                return;
            }
            xml = result.result;
        }

        const tableResult = this.extractTableData(xml);

        if (!tableResult.success) {
            resultsContent.innerHTML = `<p class="empty-state">${this.escapeHtml(tableResult.error)}</p>`;
            controlsEl.style.display = 'none';
            return;
        }

        this.tableData = tableResult.data;
        this.tableHeaders = tableResult.headers;

        columnSelect.innerHTML = '<option value="">-- Избери колона --</option>';
        this.tableHeaders.forEach((header, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = header || `Колона ${index + 1}`;
            columnSelect.appendChild(option);
        });

        controlsEl.style.display = 'block';
        document.getElementById('column-count').textContent = `Намерени ${this.tableHeaders.length} колони и ${this.tableData.length} реда с данни`;

        this.showTablePreview();
    },

    extractTableData(xml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');

            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                return { success: false, error: 'Невалиден XML формат.' };
            }

            const root = doc.documentElement;

            const schemaResult = this.extractFromSchemaTable(root);
            if (schemaResult.success) return schemaResult;

            const tableResult = this.extractFromTable(root);
            if (tableResult.success) return tableResult;

            const listResult = this.extractFromList(root);
            if (listResult.success) return listResult;

            const structuredResult = this.extractFromStructured(root);
            if (structuredResult.success) return structuredResult;

            return { success: false, error: 'Не е намерена таблица, списък или структурирани данни.\nПоддържани формати:\n- <table> със schema (<columns>/<rows>/<cell>)\n- <table> с <tr>/<td>\n- <ul>/<ol> с <li>\n- Структурирани данни като <list>/<item> или <items>/<item>' };

        } catch (error) {
            return { success: false, error: 'Грешка при парсване: ' + error.message };
        }
    },

    extractFromSchemaTable(root) {

        const table = root.tagName.toLowerCase() === 'table' ? root : root.querySelector('table');
        if (!table) return { success: false };

        const columnsEl = table.querySelector('columns');
        const rowsEl = table.querySelector('rows');

        if (!columnsEl && !rowsEl) return { success: false };

        let headers = [];
        let columnMap = {};

        if (columnsEl) {
            const columnEls = columnsEl.querySelectorAll('column');
            columnEls.forEach((col, idx) => {
                const colId = col.getAttribute('id') || col.getAttribute('name') || col.textContent.trim();
                const colName = col.getAttribute('name') || col.getAttribute('id') || col.textContent.trim() || `Колона ${idx + 1}`;
                headers.push(colName.charAt(0).toUpperCase() + colName.slice(1));
                columnMap[colId] = idx;
            });
        }

        const data = [];
        const rowEls = rowsEl ? rowsEl.querySelectorAll('row') : table.querySelectorAll('row');

        if (rowEls.length === 0) return { success: false };

        if (headers.length === 0) {
            const firstRowCells = rowEls[0].querySelectorAll('cell');
            firstRowCells.forEach((cell, idx) => {
                const colAttr = cell.getAttribute('column') || cell.getAttribute('col') || cell.getAttribute('id');
                if (colAttr && !columnMap[colAttr]) {
                    headers.push(colAttr.charAt(0).toUpperCase() + colAttr.slice(1));
                    columnMap[colAttr] = idx;
                }
            });

            if (headers.length === 0) {
                const numCells = firstRowCells.length;
                for (let i = 0; i < numCells; i++) {
                    headers.push(`Колона ${i + 1}`);
                }
            }
        }

        rowEls.forEach(rowEl => {
            const cells = rowEl.querySelectorAll('cell');
            const rowData = new Array(headers.length).fill('');

            cells.forEach(cell => {
                const colAttr = cell.getAttribute('column') || cell.getAttribute('col') || cell.getAttribute('id');
                const value = cell.textContent.trim();

                if (colAttr && columnMap.hasOwnProperty(colAttr)) {
                    rowData[columnMap[colAttr]] = value;
                } else {

                    const cellIndex = Array.from(cells).indexOf(cell);
                    if (cellIndex < rowData.length) {
                        rowData[cellIndex] = value;
                    }
                }
            });

            data.push(rowData);
        });

        if (headers.length === 0 || data.length === 0) {
            return { success: false };
        }

        return { success: true, headers, data };
    },

    extractFromTable(root) {

        const table = root.querySelector('table') || root;
        const rows = Array.from(table.querySelectorAll('tr, row'));

        if (rows.length === 0) return { success: false };

        const firstRowCells = Array.from(rows[0].querySelectorAll('th, td, cell'));

        if (firstRowCells.length === 0) return { success: false };

        const headers = firstRowCells.map((cell, i) => {
            const text = cell.textContent.trim();

            return text || `Колона ${i + 1}`;
        });

        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('th, td, cell'));
            const rowData = cells.map(cell => cell.textContent.trim());

            if (rowData.length > 0) {
                data.push(rowData);
            }
        }

        if (data.length === 0) {
            return { success: true, headers, data: [] };
        }

        return { success: true, headers, data };
    },
    extractFromList(root) {

        const lists = root.querySelectorAll('ul, ol');
        let listItems = [];

        if (lists.length > 0) {

            lists.forEach(list => {
                list.querySelectorAll(':scope > li').forEach(li => listItems.push(li));
            });
        } else {

            listItems = Array.from(root.querySelectorAll('li'));
        }

        if (listItems.length === 0) {
            return { success: false };
        }

        const firstLi = listItems[0];
        const childElements = Array.from(firstLi.children).filter(el => el.nodeType === 1);

        if (childElements.length > 0) {

            const headers = [];
            const headerSet = new Set();

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

            const formattedHeaders = headers.map(h => h.charAt(0).toUpperCase() + h.slice(1));

            return { success: true, headers: formattedHeaders, data };
        } else {

            const data = listItems.map(li => [li.textContent.trim()]);
            return { success: true, headers: ['Стойност'], data };
        }
    },

    extractFromStructured(root) {

        const containerPatterns = ['list', 'items', 'data', 'records', 'entries', 'collection', 'rows'];

        const itemPatterns = ['item', 'record', 'entry', 'row', 'element', 'node'];

        let container = null;
        let items = [];

        for (const pattern of containerPatterns) {
            container = root.querySelector(pattern) || (root.tagName.toLowerCase() === pattern ? root : null);
            if (container) break;
        }

        if (!container) {
            container = root;
        }

        for (const pattern of itemPatterns) {
            items = Array.from(container.querySelectorAll(`:scope > ${pattern}`));
            if (items.length > 0) break;
        }

        if (items.length === 0) {
            const children = Array.from(container.children);
            if (children.length > 1) {

                const tagCounts = {};
                children.forEach(child => {
                    const tag = child.tagName.toLowerCase();
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });

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

            const data = items.map(item => [item.textContent.trim()]);
            return { success: true, headers: ['Стойност'], data };
        }

        const data = items.map(item => {
            return headers.map(header => {
                const el = item.querySelector(header);
                return el ? el.textContent.trim() : '';
            });
        });

        const formattedHeaders = headers.map(h => h.charAt(0).toUpperCase() + h.slice(1));

        return { success: true, headers: formattedHeaders, data };
    },

    showTablePreview() {
        const resultsContent = document.getElementById('analysis-results-content');

        if (!this.tableData || this.tableData.length === 0) {
            resultsContent.innerHTML = '<p class="empty-state">Няма данни за показване.</p>';
            return;
        }

        let html = '<div class="editable-table-container">';
        html += '<div class="table-controls">';
        html += '<button class="btn-small btn-add" id="btn-add-column" title="Добави колона">➕ Колона</button>';
        html += '<button class="btn-small btn-add" id="btn-add-row" title="Добави ред">➕ Ред</button>';
        html += '<span class="control-separator"></span>';
        html += '<button class="btn-small btn-export" id="btn-export-xml" title="Експортирай в стандартен XML (table/tr/td)">📄 XML</button>';
        html += '<button class="btn-small btn-export" id="btn-export-schema-xml" title="Експортирай в schema XML (columns/rows/cell)">📋 Schema XML</button>';
        html += '<button class="btn-small btn-export" id="btn-export-emmet" title="Експортирай в Emmet">⚡ Emmet</button>';
        html += '</div>';

        html += '<table class="editable-table" id="analysis-editable-table"><thead><tr>';
        html += '<th class="row-number-header">#</th>';
        this.tableHeaders.forEach((h, colIdx) => {
            html += `<th class="editable-header" data-col="${colIdx}">
                    <div class="header-cell-container">
                        <input type="text" value="${this.escapeHtml(h)}" class="header-input" data-col="${colIdx}">
                        <button class="btn-delete-col" data-col="${colIdx}" title="Изтрий колона">✕</button>
                    </div>
                </th>`;
        });
        html += '</tr></thead><tbody>';

        this.tableData.forEach((row, rowIdx) => {
            html += `<tr data-row="${rowIdx}">`;
            html += `<td class="row-number"><span>${rowIdx + 1}</span><button class="btn-delete-row" data-row="${rowIdx}" title="Изтрий ред">✕</button></td>`;
            row.forEach((cell, colIdx) => {
                html += `<td class="editable-cell" data-row="${rowIdx}" data-col="${colIdx}">
                            <input type="text" value="${this.escapeHtml(cell)}" class="cell-input" data-row="${rowIdx}" data-col="${colIdx}">
                        </td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        html += '</div>';

        resultsContent.innerHTML = html;

        this.bindEditableTableEvents();
    },

    bindEditableTableEvents() {
        const container = document.querySelector('.editable-table-container');
        if (!container) return;

        container.querySelectorAll('.header-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const colIdx = parseInt(e.target.dataset.col);
                this.tableHeaders[colIdx] = e.target.value;
            });
        });

        container.querySelectorAll('.cell-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const rowIdx = parseInt(e.target.dataset.row);
                const colIdx = parseInt(e.target.dataset.col);
                if (this.tableData[rowIdx]) {
                    this.tableData[rowIdx][colIdx] = e.target.value;
                }
            });
        });

        document.getElementById('btn-add-column')?.addEventListener('click', () => {
            this.addColumn();
        });

        document.getElementById('btn-add-row')?.addEventListener('click', () => {
            this.addRow();
        });

        container.querySelectorAll('.btn-delete-col').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const colIdx = parseInt(btn.dataset.col);
                this.deleteColumn(colIdx);
            });
        });

        container.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rowIdx = parseInt(btn.dataset.row);
                this.deleteRow(rowIdx);
            });
        });

        document.getElementById('btn-export-xml')?.addEventListener('click', () => {
            this.exportTableToXML();
        });

        document.getElementById('btn-export-schema-xml')?.addEventListener('click', () => {
            this.exportTableToSchemaXML();
        });

        document.getElementById('btn-export-emmet')?.addEventListener('click', () => {
            this.exportTableToEmmet();
        });
    },

    addColumn() {
        const newHeaderName = `Колона ${this.tableHeaders.length + 1}`;
        this.tableHeaders.push(newHeaderName);

        this.tableData.forEach(row => {
            row.push('');
        });

        this.showTablePreview();
    },

    addRow() {
        const newRow = new Array(this.tableHeaders.length).fill('');
        this.tableData.push(newRow);
        this.showTablePreview();
    },

    deleteColumn(colIdx) {
        if (this.tableHeaders.length <= 1) {
            alert('Не можеш да изтриеш последната колона!');
            return;
        }

        if (confirm(`Сигурен ли си че искаш да изтриеш колоната "${this.escapeHtml(this.tableHeaders[colIdx])}"?`)) {
            this.tableHeaders.splice(colIdx, 1);
            this.tableData.forEach(row => {
                row.splice(colIdx, 1);
            });
            this.showTablePreview();
        }
    },

    deleteRow(rowIdx) {
        if (confirm(`Сигурен ли си че искаш да изтриеш ред ${rowIdx + 1}?`)) {
            this.tableData.splice(rowIdx, 1);
            this.showTablePreview();
        }
    },

    exportTableToXML() {
        let xml = '<table>\n  <tr>\n';

        this.tableHeaders.forEach(header => {
            xml += `    <th>${this.escapeXmlSpecialChars(header)}</th>\n`;
        });
        xml += '  </tr>\n';

        this.tableData.forEach(row => {
            xml += '  <tr>\n';
            row.forEach(cell => {
                xml += `    <td>${this.escapeXmlSpecialChars(cell)}</td>\n`;
            });
            xml += '  </tr>\n';
        });

        xml += '</table>';

        const analysisInput = document.getElementById('analysis-input');
        const outputEditor = document.getElementById('output-editor');
        if (analysisInput) {
            analysisInput.value = xml;
        }
        if (outputEditor) {
            outputEditor.value = xml;

            this.switchTab('transform');
            outputEditor.scrollIntoView({ behavior: 'smooth' });
        }
    },

    exportTableToSchemaXML() {
        const tableName = 'data';
        let xml = `<table name="${tableName}">\n`;

        xml += '  <columns>\n';
        this.tableHeaders.forEach(header => {
            const colId = header.toLowerCase().replace(/\s+/g, '_');
            xml += `    <column id="${this.escapeXmlSpecialChars(colId)}" type="string"/>\n`;
        });
        xml += '  </columns>\n\n';

        xml += '  <rows>\n';
        this.tableData.forEach(row => {
            xml += '    <row>\n';
            row.forEach((cell, idx) => {
                const colId = this.tableHeaders[idx].toLowerCase().replace(/\s+/g, '_');
                xml += `      <cell column="${this.escapeXmlSpecialChars(colId)}">${this.escapeXmlSpecialChars(cell)}</cell>\n`;
            });
            xml += '    </row>\n';
        });
        xml += '  </rows>\n';
        xml += '</table>';

        const analysisInput = document.getElementById('analysis-input');
        const outputEditor = document.getElementById('output-editor');
        if (analysisInput) {
            analysisInput.value = xml;
        }
        if (outputEditor) {
            outputEditor.value = xml;

            this.switchTab('transform');
            outputEditor.scrollIntoView({ behavior: 'smooth' });
        }
    },

    exportTableToEmmet() {
        let emmet = 'table>tr>';

        const headerParts = this.tableHeaders.map(h => `th{${this.escapeEmmetSpecialChars(h)}}`).join('+');
        emmet += headerParts;

        this.tableData.forEach(row => {
            emmet += '^tr>';
            const cellParts = row.map(cell => `td{${this.escapeEmmetSpecialChars(cell)}}`).join('+');
            emmet += cellParts;
        });

        const analysisInput = document.getElementById('analysis-input');
        const inputEditor = document.getElementById('input-editor');
        if (analysisInput) {

            document.getElementById('analysis-format').value = 'emmet';
            analysisInput.value = emmet;
        }
        if (inputEditor) {
            inputEditor.value = emmet;

            this.switchTab('transform');
            inputEditor.scrollIntoView({ behavior: 'smooth' });
        }
    },

    escapeXmlSpecialChars(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },

    escapeEmmetSpecialChars(str) {
        if (!str) return '';
        return str
            .replace(/[{}]/g, '')
            .replace(/[+>^]/g, ' ')
            .trim();
    },

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

        const uniqueValues = [...new Set(columnValues)];
        const valueCounts = {};
        columnValues.forEach(v => {
            valueCounts[v] = (valueCounts[v] || 0) + 1;
        });

        const numericValues = columnValues.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).map(parseFloat);
        const isNumeric = numericValues.length > columnValues.length / 2;

        let html = '<div class="filtered-column-view">';
        html += `<h4>Колона: ${this.escapeHtml(columnName)}</h4>`;
        html += '<div class="column-view-content">';
        html += '<table class="results-table filtered-table"><thead><tr><th>#</th><th>Стойност</th><th>Действие</th></tr></thead><tbody>';

        columnValues.forEach((value, idx) => {
            html += `<tr data-col="${colIdx}" data-row="${idx}">
                        <td>${idx + 1}</td>
                        <td><input type="text" value="${this.escapeHtml(value)}" class="filtered-cell-input" data-row="${idx}" data-col="${colIdx}" style="width:100%;"></td>
                        <td><button class="btn-delete-filtered-row" data-row="${idx}" data-col="${colIdx}" title="Изтрий">✕</button></td>
                    </tr>`;
        });

        html += '</tbody></table>';
        html += '</div>';

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
        html += '<button class="btn-primary" id="btn-back-to-full-table" style="margin-top: 10px;">← Назад към цялата таблица</button>';
        html += '</div>';

        resultsContent.innerHTML = html;

        const container = resultsContent.querySelector('.filtered-column-view');

        container.querySelectorAll('.filtered-cell-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const rowIdx = parseInt(e.target.dataset.row);
                const colIdx = parseInt(e.target.dataset.col);
                if (this.tableData[rowIdx]) {
                    this.tableData[rowIdx][colIdx] = e.target.value;
                }
            });
        });

        container.querySelectorAll('.btn-delete-filtered-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rowIdx = parseInt(btn.dataset.row);
                this.deleteRow(rowIdx);
            });
        });

        document.getElementById('btn-back-to-full-table')?.addEventListener('click', () => {
            columnSelect.value = '';
            this.showTablePreview();
        });
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('bg-BG') + ' ' + date.toLocaleTimeString('bg-BG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
