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
     * Прилага правило (Pattern -> Replacement)
     */
    applyRule(xml, pattern, replacement) {
        try {
            // 1. Парсваме входа
            const ast = XmlParser.parse(xml);
            
            // 2. Парсваме шаблоните
            const searchPattern = this.parseSearchPattern(pattern);
            const replacementStructure = this.parseReplacementString(replacement);

            if (!searchPattern.length || !replacementStructure.length) {
                return { success: false, error: 'Невалиден pattern или replacement' };
            }

            // 3. Прилагаме правилото
            const resultAst = this.applyPatternToAst(ast, searchPattern, replacementStructure);
            
            // 4. Генерираме изхода
            const outputEmmet = EmmetParser.generate(resultAst, this.defaultSettings);
            
            return { success: true, result: outputEmmet };
        } catch (error) {
            console.error(error);
            return { success: false, error: error.message };
        }
    },

    // --- PARSERS ---

    parseSearchPattern(pattern) {
        if (!pattern) return [];
        return pattern.split('+').map(p => {
            const trimmed = p.trim();
            // Regex: TagOrVar (:Constraint)? (.class)*
            // Starts with Uppercase (E, Item) -> Variable
            // Starts with Lowercase (div, span) -> Literal
            const match = trimmed.match(/^([a-zA-Z0-9-_]+)(?::([a-z0-9-]+))?((?:\.[a-zA-Z0-9-_]+)*)$/);
            
            if (!match) return { type: 'literal', tag: trimmed };

            const key = match[1];
            const constraint = match[2]; // e.g. E:div
            const classString = match[3];
            const classes = classString ? classString.split('.').filter(c => c) : [];

            const isVar = /^[A-Z]/.test(key); // Convention: Uppercase = Variable

            if (isVar) {
                return { 
                    type: 'variable', 
                    key: key, 
                    constraint: constraint,
                    mustHaveClasses: classes 
                };
            } else {
                return { 
                    type: 'literal', 
                    tag: key,
                    mustHaveClasses: classes
                };
            }
        });
    },

    parseReplacementString(str) {
        if (!str) return [];
        // Support sibling replacement (div+span)
        const parts = str.split('+').map(s => s.trim());
        
        return parts.map(part => {
            // Support hierarchy (div>span)
            const hierarchy = part.split('>').map(s => s.trim());
            let currentNode = this.parseToken(hierarchy[hierarchy.length - 1]);
            
            // Build tree bottom-up
            for (let i = hierarchy.length - 2; i >= 0; i--) {
                const parentNode = this.parseToken(hierarchy[i]);
                parentNode.children = [currentNode];
                currentNode = parentNode;
            }
            return currentNode;
        });
    },

    parseToken(token) {
        const regex = /^([a-zA-Z][a-zA-Z0-9-_]*)(?::([a-z0-9-]+))?(?:#([a-zA-Z0-9-_]+))?((?:\.[a-zA-Z0-9-_]+)*)$/;
        const match = token.match(regex);
        
        if (!match) return { type: 'literal', tag: token, children: [] };

        const mainPart = match[1];
        const newTag = match[2];
        const id = match[3] || null;
        const classString = match[4];
        const classes = classString ? classString.split('.').filter(c => c) : [];
        const isVar = /^[A-Z]/.test(mainPart);

        return {
            type: isVar ? 'variable' : 'literal',
            key: isVar ? mainPart : null,
            tag: isVar ? null : mainPart,
            newTag: newTag || null,
            addId: id,
            addClasses: classes,
            children: []
        };
    },

    // --- CORE LOGIC ---

    applyPatternToAst(nodes, searchPattern, replacementStructure) {
        const result = [];
        let i = 0;

        while (i < nodes.length) {
            // MATCHING LOGIC
            if (i + searchPattern.length <= nodes.length) {
                const matches = {};
                let matched = true;

                for (let j = 0; j < searchPattern.length; j++) {
                    const pNode = searchPattern[j];
                    const astNode = nodes[i + j];

                    // 1. Tag / Variable Check
                    if (pNode.type === 'variable') {
                        if (pNode.constraint && astNode.tag !== pNode.constraint) {
                            matched = false; break;
                        }
                    } else {
                        if (astNode.tag !== pNode.tag) {
                            matched = false; break;
                        }
                    }

                    // 2. Class Check
                    if (pNode.mustHaveClasses && pNode.mustHaveClasses.length > 0) {
                        const nodeClasses = astNode.classes || [];
                        const hasAll = pNode.mustHaveClasses.every(cls => nodeClasses.includes(cls));
                        if (!hasAll) { matched = false; break; }
                    }

                    // Store match info
                    if (pNode.type === 'variable') {
                        matches[pNode.key] = {
                            node: astNode,
                            // Store classes that caused the match, so we can remove them later (Smart Diffing)
                            removedClasses: pNode.mustHaveClasses || []
                        };
                    }
                }

                if (matched) {
                    replacementStructure.forEach(repNode => {
                        const built = this.buildNode(repNode, matches);
                        if (built) result.push(built);
                    });
                    i += searchPattern.length;
                    continue;
                }
            }

            // RECURSION (No match found)
            const node = nodes[i];
            const newNode = this.deepClone(node);
            
            if (node.children && node.children.length > 0) {
                newNode.children = this.applyPatternToAst(node.children, searchPattern, replacementStructure);
            }
            
            result.push(newNode);
            i++;
        }
        return result;
    },

    // --- NODE BUILDER ---

    buildNode(def, matches) {
        let outputNode = null;

        if (def.type === 'variable') {
            const matchData = matches[def.key];
            if (!matchData) return null;

            const original = matchData.node;
            const classesToRemove = matchData.removedClasses;

            outputNode = this.deepClone(original);

            if (classesToRemove && classesToRemove.length > 0) {
                outputNode.classes = outputNode.classes.filter(c => !classesToRemove.includes(c));
            }

            if (def.newTag) outputNode.tag = def.newTag;

            if (def.addId) {
                outputNode.id = def.addId;
            }

            if (def.addClasses) {
                this.addClassesToNode(outputNode, def.addClasses);
            }

        } else {
            outputNode = {
                tag: def.tag,
                children: [],
                classes: [],
                attributes: {},
                text: null
            };
            if (def.addId) {
                outputNode.id = def.addId;
            }
            if (def.addClasses) {
                this.addClassesToNode(outputNode, def.addClasses);
            }
        }

        // 4. Handle Nesting / Wrapping
        if (def.children && def.children.length > 0) {
            outputNode.children = def.children.map(childDef => this.buildNode(childDef, matches));
        }

        return outputNode;
    },

    // --- HELPERS ---

    addClassesToNode(node, classesToAdd) {
        if (!classesToAdd || classesToAdd.length === 0) return;

        classesToAdd.forEach(cls => {
            if (!node.classes.includes(cls)) {
                node.classes.push(cls);
            }
        });
    },

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
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
