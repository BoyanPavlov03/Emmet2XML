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
            
            // Auto-indent on Enter for XML mode
            if (e.key === 'Enter') {
                const direction = document.getElementById('transform-direction').value;
                if (direction === 'xml2emmet') {
                    e.preventDefault();
                    this.handleXmlAutoIndent(e.target);
                }
            }
            
            // Format with Ctrl+Shift+F
            if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f' || e.code === 'KeyF')) {
                e.preventDefault();
                e.stopPropagation();
                this.formatInput();
            }
        });
        
        // Click to select block
        document.getElementById('input-editor').addEventListener('click', (e) => {
            const direction = document.getElementById('transform-direction').value;
            if (direction === 'xml2emmet') {
                this.handleXmlBlockSelect(e.target);
            } else {
                this.handleEmmetBlockSelect(e.target);
            }
        });
        
        // Format button
        document.getElementById('btn-format-xml')?.addEventListener('click', () => {
            this.formatInput();
        });
        
        // Apply all rules button
        document.getElementById('btn-apply-all-rules')?.addEventListener('click', () => {
            this.applyAllRulesToInput();
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
    
    /**
     * Обработва автоматична идентация при Enter в XML режим
     */
    handleXmlAutoIndent(textarea) {
        const value = textarea.value;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // Намираме текущия ред
        const beforeCursor = value.substring(0, start);
        const afterCursor = value.substring(end);
        
        // Вземаме текущия ред
        const lastNewline = beforeCursor.lastIndexOf('\n');
        const currentLine = beforeCursor.substring(lastNewline + 1);
        
        // Изчисляваме базовата идентация (whitespace в началото на текущия ред)
        const baseIndentMatch = currentLine.match(/^(\s*)/);
        const baseIndent = baseIndentMatch ? baseIndentMatch[1] : '';
        
        // Вземаме настройката за идентация
        const indentUnit = this.getSettings().indent;
        
        // Проверяваме дали курсорът е между отварящ и затварящ таг: <tag>|</tag>
        const beforeTag = beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>\s*$/);
        const afterTag = afterCursor.match(/^\s*<\/([a-zA-Z][a-zA-Z0-9-_]*)>/);
        
        let newText;
        let cursorPos;
        
        if (beforeTag && afterTag && beforeTag[1] === afterTag[1]) {
            // Курсорът е между отварящ и затварящ таг
            // Добавяме два нови реда - един с по-голяма идентация за съдържанието,
            // и един със същата идентация за затварящия таг
            const contentIndent = baseIndent + indentUnit;
            newText = '\n' + contentIndent + '\n' + baseIndent;
            cursorPos = start + 1 + contentIndent.length; // Поставяме курсора на средния ред
        } else if (beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>\s*$/)) {
            // След отварящ таг - добавяме по-голяма идентация
            const newIndent = baseIndent + indentUnit;
            newText = '\n' + newIndent;
            cursorPos = start + 1 + newIndent.length;
        } else if (beforeCursor.match(/<\/[a-zA-Z][a-zA-Z0-9-_]*>\s*$/)) {
            // След затварящ таг - запазваме текущата идентация
            newText = '\n' + baseIndent;
            cursorPos = start + 1 + baseIndent.length;
        } else {
            // Нормален случай - запазваме текущата идентация
            newText = '\n' + baseIndent;
            cursorPos = start + 1 + baseIndent.length;
        }
        
        // Вмъкваме новия текст
        textarea.value = beforeCursor + newText + afterCursor;
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
    },
    
    /**
     * Форматира входа според текущия режим
     */
    formatInput() {
        const direction = document.getElementById('transform-direction').value;
        if (direction === 'xml2emmet') {
            this.formatXml();
        } else {
            this.formatEmmet();
        }
    },
    
    /**
     * Форматира Emmet израз - разделя на редове за по-добра четимост
     */
    formatEmmet() {
        const textarea = document.getElementById('input-editor');
        const emmet = textarea.value.trim();
        
        if (!emmet) return;
        
        try {
            // Форматираме Emmet израз - слагаме нови редове след определени оператори
            let formatted = emmet;
            
            // Разделяме на главни секции (по + на top level)
            // Намираме + операторите, които не са в скоби или атрибути
            let result = '';
            let depth = 0; // За скоби ()
            let inBrackets = false; // За атрибути []
            let inBraces = false; // За текст {}
            
            for (let i = 0; i < formatted.length; i++) {
                const char = formatted[i];
                
                if (char === '(') depth++;
                if (char === ')') depth--;
                if (char === '[') inBrackets = true;
                if (char === ']') inBrackets = false;
                if (char === '{') inBraces = true;
                if (char === '}') inBraces = false;
                
                // Ако сме на top level и намерим +, слагаме нов ред
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
    
    /**
     * Форматира XML кода с правилна идентация
     */
    formatXml() {
        const textarea = document.getElementById('input-editor');
        const xml = textarea.value.trim();
        
        if (!xml) return;
        
        try {
            const indent = this.getSettings().indent;
            let formatted = '';
            let level = 0;
            
            // Премахваме празни редове и нормализираме
            const normalized = xml
                .replace(/>\s+</g, '><')  // Премахваме whitespace между тагове
                .replace(/\s+/g, ' ')      // Нормализираме whitespace
                .trim();
            
            // Разделяме на тагове и текст
            const tokens = normalized.match(/<[^>]+>|[^<]+/g) || [];
            
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i].trim();
                if (!token) continue;
                
                if (token.startsWith('</')) {
                    // Затварящ таг - намаляваме нивото преди
                    level--;
                    formatted += indent.repeat(Math.max(0, level)) + token + '\n';
                } else if (token.startsWith('<') && token.endsWith('/>')) {
                    // Self-closing таг
                    formatted += indent.repeat(level) + token + '\n';
                } else if (token.startsWith('<?') || token.startsWith('<!')) {
                    // XML declaration или коментар
                    formatted += token + '\n';
                } else if (token.startsWith('<')) {
                    // Отварящ таг
                    const tagName = token.match(/<([a-zA-Z][a-zA-Z0-9-_]*)/)?.[1];
                    formatted += indent.repeat(level) + token;
                    
                    // Проверяваме дали следващият токен е текст и след него има затварящ таг за същия елемент
                    const nextToken = tokens[i + 1]?.trim();
                    const afterNext = tokens[i + 2]?.trim();
                    
                    if (nextToken && !nextToken.startsWith('<') && 
                        afterNext && afterNext === `</${tagName}>`) {
                        // Inline елемент с текст: <tag>text</tag>
                        formatted += nextToken + afterNext + '\n';
                        i += 2; // Пропускаме текста и затварящия таг
                    } else {
                        formatted += '\n';
                        level++;
                    }
                } else {
                    // Текстов възел (самостоятелен)
                    formatted += indent.repeat(level) + token + '\n';
                }
            }
            
            textarea.value = formatted.trim();
        } catch (error) {
            console.error('Format error:', error);
            alert('Грешка при форматиране: ' + error.message);
        }
    },
    
    /**
     * Селектира XML блок при клик върху таг
     */
    handleXmlBlockSelect(textarea) {
        const value = textarea.value;
        const cursorPos = textarea.selectionStart;
        
        // Намираме таг около курсора
        // Първо търсим назад за начало на таг
        let tagStart = -1;
        let tagEnd = -1;
        
        // Търсим '<' преди курсора
        for (let i = cursorPos; i >= 0; i--) {
            if (value[i] === '<') {
                tagStart = i;
                break;
            }
            if (value[i] === '>') {
                // Курсорът не е върху таг
                break;
            }
        }
        
        if (tagStart === -1) return;
        
        // Търсим '>' след tagStart
        for (let i = tagStart; i < value.length; i++) {
            if (value[i] === '>') {
                tagEnd = i + 1;
                break;
            }
        }
        
        if (tagEnd === -1) return;
        
        const tagContent = value.substring(tagStart, tagEnd);
        
        // Проверяваме дали е затварящ таг
        if (tagContent.startsWith('</')) {
            // Намираме съответстващия отварящ таг
            const tagName = tagContent.match(/<\/([a-zA-Z][a-zA-Z0-9-_]*)/)?.[1];
            if (!tagName) return;
            
            const openingTagStart = this.findMatchingOpeningTag(value, tagStart, tagName);
            if (openingTagStart !== -1) {
                textarea.selectionStart = openingTagStart;
                textarea.selectionEnd = tagEnd;
            }
        } else if (tagContent.endsWith('/>')) {
            // Self-closing - селектираме само този таг
            textarea.selectionStart = tagStart;
            textarea.selectionEnd = tagEnd;
        } else {
            // Отварящ таг - намираме затварящия
            const tagName = tagContent.match(/<([a-zA-Z][a-zA-Z0-9-_]*)/)?.[1];
            if (!tagName) return;
            
            const closingTagEnd = this.findMatchingClosingTag(value, tagEnd, tagName);
            if (closingTagEnd !== -1) {
                textarea.selectionStart = tagStart;
                textarea.selectionEnd = closingTagEnd;
            }
        }
    },
    
    /**
     * Селектира Emmet блок при клик (групи в скоби или елемент)
     */
    handleEmmetBlockSelect(textarea) {
        const value = textarea.value;
        const cursorPos = textarea.selectionStart;
        
        // Намираме границите на текущия "блок" в Emmet
        // Блок може да е: група в скоби (), елемент с деца (до следващия + или ^), или целия израз
        
        let start = cursorPos;
        let end = cursorPos;
        
        // Проверяваме дали сме в скоби
        let parenDepth = 0;
        let parenStart = -1;
        
        // Търсим назад за начало на група или елемент
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
            
            // Ако намерим + или ^ на top level, това е началото на нашия блок
            if ((char === '+' || char === '^') && parenDepth === 0) {
                start = i + 1;
                break;
            }
            
            if (i === 0) start = 0;
        }
        
        // Ако сме намерили начало на скоби, търсим края на групата
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
                        // Проверяваме за multiplier след скобите (*N)
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
            // Търсим напред за край на елемента
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
                
                // Ако намерим + или ^ на top level, това е краят
                if ((char === '+' || char === '^') && parenDepth === 0 && !inBrackets && !inBraces) {
                    end = i;
                    break;
                }
                
                if (i === value.length - 1) end = value.length;
            }
        }
        
        // Премахваме whitespace от краищата
        while (start < value.length && /\s/.test(value[start])) start++;
        while (end > start && /\s/.test(value[end - 1])) end--;
        
        if (start < end) {
            textarea.selectionStart = start;
            textarea.selectionEnd = end;
        }
    },
    
    /**
     * Намира съответстващия отварящ таг
     */
    findMatchingOpeningTag(text, fromPos, tagName) {
        let depth = 1;
        const openPattern = new RegExp(`<${tagName}(?:\\s|>|/>)`, 'g');
        const closePattern = new RegExp(`</${tagName}>`, 'g');
        
        // Събираме всички отварящи и затварящи тагове преди fromPos
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
        
        // Сортираме по позиция в обратен ред
        tags.sort((a, b) => b.pos - a.pos);
        
        // Търсим съответстващия отварящ таг
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
    
    /**
     * Намира съответстващия затварящ таг
     */
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
    
    /**
     * Прилага всички запазени правила върху маркирания блок (XML или Emmet)
     */
    async applyAllRulesToInput() {
        const textarea = document.getElementById('input-editor');
        const fullText = textarea.value;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        const direction = document.getElementById('transform-direction').value;
        const isEmmetMode = direction === 'emmet2xml';
        
        // Проверяваме дали има селекция
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
            // Зареждаме правилата от сървъра
            const response = await fetch('php/rules.php?action=list');
            const data = await response.json();
            
            if (!data.success || !data.items || data.items.length === 0) {
                alert('Няма запазени правила за прилагане.');
                return;
            }
            
            let xmlToProcess = selectedText;
            const settings = this.getSettings();
            
            // Ако сме в Emmet режим, първо конвертираме към XML
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
            
            // Прилагаме всяко правило последователно
            for (const rule of data.items) {
                const transformed = Transformer.applyRule(result, rule.pattern, rule.replacement);
                if (transformed.success && transformed.result !== result) {
                    result = transformed.result;
                    appliedCount++;
                }
            }
            
            // Ако сме в Emmet режим, конвертираме обратно към Emmet
            if (isEmmetMode && appliedCount > 0) {
                const xmlResult = Transformer.transform(result, 'xml2emmet', settings);
                if (xmlResult.success) {
                    result = xmlResult.result;
                }
            }
            
            if (appliedCount > 0) {
                // Заменяме само селектираната част
                const beforeSelection = fullText.substring(0, selStart);
                const afterSelection = fullText.substring(selEnd);
                textarea.value = beforeSelection + result + afterSelection;
                
                // Възстановяваме селекцията върху трансформирания блок
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
