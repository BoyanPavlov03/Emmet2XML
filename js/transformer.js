/**
 * Transformer - Модул за трансформации
 * Управлява трансформации между Emmet и XML
 */

const Transformer = {
    /**
     * Настройки по подразбиране
     */
    defaultSettings: {
        indent: '  ',
        showValues: true,
        showAttributes: true,
        showAttrValues: true,
        selfClosing: true
    },
    
    /**
     * Трансформира Emmet към XML
     */
    emmetToXml(emmet, settings = {}) {
        const opts = { ...this.defaultSettings, ...settings };
        
        try {
            const ast = EmmetParser.parse(emmet);
            const xml = EmmetParser.generate(ast, opts);
            return { success: true, result: xml, ast };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Трансформира XML към Emmet
     */
    xmlToEmmet(xml, settings = {}) {
        const opts = { ...this.defaultSettings, ...settings };
        
        try {
            const ast = XmlParser.parse(xml);
            const emmet = XmlParser.toEmmet(ast, opts);
            return { success: true, result: emmet, ast };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Двупосочна трансформация
     */
    transform(input, direction, settings = {}) {
        if (direction === 'emmet2xml') {
            return this.emmetToXml(input, settings);
        } else {
            return this.xmlToEmmet(input, settings);
        }
    },
    
    /**
     * Прилага правило за преструктуриране
     * Pattern: E1+E2 -> E2+E1
     */
    applyRule(xml, pattern, replacement) {
        try {
            // Парсваме входния XML
            const ast = XmlParser.parse(xml);
            
            // Парсваме pattern-а (E1+E2 формат)
            const patternParts = this.parsePattern(pattern);
            const replacementParts = this.parsePattern(replacement);
            
            if (!patternParts || !replacementParts) {
                return { success: false, error: 'Невалиден pattern или replacement' };
            }
            
            // Прилагаме правилото
            const result = this.applyPatternToAst(ast, patternParts, replacementParts);
            
            // Генерираме XML от модифицирания AST
            const outputXml = EmmetParser.generate(result, this.defaultSettings);
            
            return { success: true, result: outputXml };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Парсва pattern (E1+E2 формат)
     */
    parsePattern(pattern) {
        const parts = pattern.split('+').map(p => p.trim());
        if (parts.length === 0) return null;
        
        return parts.map(p => {
            const match = p.match(/^([A-Z])(\d+)$/);
            if (match) {
                return { type: 'variable', name: match[1], index: parseInt(match[2]) };
            }
            return { type: 'literal', value: p };
        });
    },
    
    /**
     * Прилага pattern към AST
     */
    applyPatternToAst(nodes, patternParts, replacementParts) {
        const result = [];
        let i = 0;
        
        while (i < nodes.length) {
            // Опитваме да намерим съвпадение
            if (i + patternParts.length <= nodes.length) {
                const matches = {};
                let matched = true;
                
                for (let j = 0; j < patternParts.length; j++) {
                    const part = patternParts[j];
                    const node = nodes[i + j];
                    
                    if (part.type === 'variable') {
                        // Запазваме съвпадението
                        const key = part.name + part.index;
                        matches[key] = node;
                    } else {
                        // Literal - проверяваме за точно съвпадение на тага
                        if (node.tag !== part.value) {
                            matched = false;
                            break;
                        }
                    }
                }
                
                if (matched) {
                    // Прилагаме replacement
                    for (const rPart of replacementParts) {
                        if (rPart.type === 'variable') {
                            const key = rPart.name + rPart.index;
                            if (matches[key]) {
                                result.push(matches[key]);
                            }
                        } else {
                            result.push({ tag: rPart.value, children: [], classes: [], attributes: {} });
                        }
                    }
                    i += patternParts.length;
                    continue;
                }
            }
            
            // Не е намерено съвпадение - копираме node-а
            const node = nodes[i];
            if (node.children && node.children.length > 0) {
                node.children = this.applyPatternToAst(node.children, patternParts, replacementParts);
            }
            result.push(node);
            i++;
        }
        
        return result;
    },
    
    /**
     * Извлича данни от таблица
     */
    extractTableData(xml) {
        const ast = XmlParser.parse(xml);
        const tables = [];
        
        const findTables = (nodes) => {
            for (const node of nodes) {
                if (node.tag.toLowerCase() === 'table') {
                    tables.push(this.parseTable(node));
                }
                if (node.children) {
                    findTables(node.children);
                }
            }
        };
        
        findTables(ast);
        return tables;
    },
    
    /**
     * Парсва таблица
     */
    parseTable(tableNode) {
        const result = {
            headers: [],
            rows: []
        };
        
        const findRows = (nodes, isHeader = false) => {
            for (const node of nodes) {
                const tag = node.tag.toLowerCase();
                
                if (tag === 'thead') {
                    findRows(node.children, true);
                } else if (tag === 'tbody' || tag === 'tfoot') {
                    findRows(node.children, false);
                } else if (tag === 'tr') {
                    const row = [];
                    for (const cell of node.children) {
                        const cellTag = cell.tag.toLowerCase();
                        if (cellTag === 'th' || cellTag === 'td') {
                            row.push(cell.text || '');
                        }
                    }
                    
                    if (isHeader || node.children.some(c => c.tag.toLowerCase() === 'th')) {
                        result.headers = row;
                    } else {
                        result.rows.push(row);
                    }
                }
            }
        };
        
        findRows(tableNode.children);
        
        // Ако няма headers, използваме първия ред
        if (result.headers.length === 0 && result.rows.length > 0) {
            result.headers = result.rows.shift();
        }
        
        return result;
    },
    
    /**
     * Извлича данни от списъци
     */
    extractListData(xml) {
        const ast = XmlParser.parse(xml);
        const lists = [];
        
        const findLists = (nodes) => {
            for (const node of nodes) {
                const tag = node.tag.toLowerCase();
                
                if (tag === 'ul' || tag === 'ol') {
                    const items = [];
                    for (const child of node.children) {
                        if (child.tag.toLowerCase() === 'li') {
                            items.push({
                                text: child.text || '',
                                nested: findLists(child.children)
                            });
                        }
                    }
                    lists.push({
                        type: tag,
                        items
                    });
                }
                
                if (node.children) {
                    const nested = findLists(node.children);
                    lists.push(...nested);
                }
            }
            
            return lists;
        };
        
        return findLists(ast);
    },
    
    /**
     * Запазва трансформация в историята (изпраща към сървъра)
     */
    async saveToHistory(inputType, inputData, outputData, settings) {
        if (!Auth.isLoggedIn()) {
            return { success: false, error: 'Not logged in' };
        }
        
        try {
            const response = await fetch('php/history.php?action=save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input_type: inputType,
                    input_data: inputData,
                    output_data: outputData,
                    settings: settings
                })
            });
            
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
