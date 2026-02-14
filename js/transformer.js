const Transformer = {
    defaultSettings: {
        indent: '  ',
        showValues: true,
        showAttributes: true,
        showAttrValues: true,
        selfClosing: true
    },

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

    transform(input, direction, settings = {}) {
        if (direction === 'emmet2xml') {
            return this.emmetToXml(input, settings);
        } else {
            return this.xmlToEmmet(input, settings);
        }
    },

applyRule(xml, pattern, replacement) {
        try {

            const ast = XmlParser.parse(xml);

            const searchPattern = this.parseSearchPattern(pattern);
            const replacementStructure = this.parseReplacementString(replacement);

            if (!searchPattern.length || !replacementStructure.length) {
                return { success: false, error: 'Невалиден pattern или replacement' };
            }

            const resultAst = this.applyPatternToAst(ast, searchPattern, replacementStructure);

            const outputEmmet = EmmetParser.generate(resultAst, this.defaultSettings);

            return { success: true, result: outputEmmet };
        } catch (error) {
            console.error(error);
            return { success: false, error: error.message };
        }
    },

    parseSearchPattern(pattern) {
        if (!pattern) return [];
        return pattern.split('+').map(p => {
            const trimmed = p.trim();
            // Разрешаваме множество двоеточия за пълната комбинация ns:Var:constraint
            const match = trimmed.match(/^([a-zA-Z0-9-_:]+)((?:\.[a-zA-Z0-9-_]+)*)$/);

            if (!match) return { type: 'literal', tag: trimmed };

            const mainPart = match[1];
            const classString = match[2];
            const classes = classString ? classString.split('.').filter(c => c) : [];

            const parts = mainPart.split(':');
            let ns = undefined, key = undefined, constraint = undefined;

            if (parts.length === 1) {
                key = parts[0];
            } else if (parts.length === 2) {
                if (/^[A-Z]/.test(parts[0]) && !/^[A-Z]/.test(parts[1])) {
                    // Пример: A:div (Променлива A, ограничение div)
                    key = parts[0];
                    constraint = parts[1];
                } else if (/^[A-Z]/.test(parts[1])) {
                    // Пример: foo:A (Namespace foo, Променлива A)
                    ns = parts[0];
                    key = parts[1];
                } else {
                    // Пример: foo:div (Namespace foo, литерал div)
                    ns = parts[0];
                    key = parts[1];
                }
            } else if (parts.length >= 3) {
                // Пример: foo:A:div (Namespace foo, Променлива A, ограничение div)
                ns = parts[0];
                key = parts[1];
                constraint = parts[2];
            }

            const isVar = /^[A-Z]/.test(key);

            if (isVar) {
                return {
                    type: 'variable',
                    key: key,
                    explicitNs: ns, // Пазим информация дали изрично е търсен namespace
                    constraint: constraint,
                    mustHaveClasses: classes
                };
            } else {
                return {
                    type: 'literal',
                    tag: ns ? `${ns}:${key}` : key,
                    mustHaveClasses: classes
                };
            }
        });
    },

    parseReplacementString(str) {
        if (!str) return [];

        const parts = str.split('+').map(s => s.trim());

        return parts.map(part => {

            const hierarchy = part.split('>').map(s => s.trim());
            let currentNode = this.parseToken(hierarchy[hierarchy.length - 1]);

            for (let i = hierarchy.length - 2; i >= 0; i--) {
                const parentNode = this.parseToken(hierarchy[i]);
                parentNode.children = [currentNode];
                currentNode = parentNode;
            }
            return currentNode;
        });
    },

    parseToken(token) {
        const regex = /^([a-zA-Z0-9-_:]+)(?:#([a-zA-Z0-9-_]+))?((?:\.[a-zA-Z0-9-_]+)*)$/;
        const match = token.match(regex);

        if (!match) return { type: 'literal', tag: token, children: [] };

        const mainPart = match[1];
        const id = match[2] || null;
        const classString = match[3];
        const classes = classString ? classString.split('.').filter(c => c) : [];

        const parts = mainPart.split(':');
        let ns = undefined, key = undefined, newTag = undefined;

        if (parts.length === 1) {
            key = parts[0];
        } else if (parts.length === 2) {
            if (/^[A-Z]/.test(parts[0]) && !/^[A-Z]/.test(parts[1])) {
                // Пример: A:span (Променлива A, нов таг span)
                key = parts[0];
                newTag = parts[1];
            } else if (/^[A-Z]/.test(parts[1])) {
                // Пример: foo:A (Namespace foo, Променлива A)
                ns = parts[0];
                key = parts[1];
            } else {
                // Пример: foo:span (Namespace foo, литерал span)
                ns = parts[0];
                key = parts[1];
            }
        } else if (parts.length >= 3) {
            // Пример: foo:A:span (Namespace foo, Променлива A, нов таг span)
            ns = parts[0];
            key = parts[1];
            newTag = parts[2];
        }

        const isVar = /^[A-Z]/.test(key);

        return {
            type: isVar ? 'variable' : 'literal',
            key: isVar ? key : null,
            tag: isVar ? null : (ns ? `${ns}:${key}` : key),
            ns: ns,           // Изричен namespace за прилагане
            newTag: newTag,   // Изричен нов локален таг
            addId: id,
            addClasses: classes,
            children: []
        };
    },

    applyPatternToAst(nodes, searchPattern, replacementStructure) {
        const result = [];
        let i = 0;

        while (i < nodes.length) {
            if (i + searchPattern.length <= nodes.length) {
                const matches = {};
                let matched = true;

                for (let j = 0; j < searchPattern.length; j++) {
                    const pNode = searchPattern[j];
                    const astNode = nodes[i + j];

                    if (pNode.type === 'variable') {
                        const tParts = astNode.tag.split(':');
                        const tNs = tParts.length > 1 ? tParts[0] : undefined;
                        const tLocal = tParts.length > 1 ? tParts[1] : tParts[0];

                        // Проверка за namespace
                        if (pNode.explicitNs !== undefined && pNode.explicitNs !== tNs) {
                            matched = false; break;
                        }

                        // Проверка за ограничение на тага
                        if (pNode.constraint && tLocal !== pNode.constraint) {
                            matched = false; break;
                        }
                    } else {
                        if (astNode.tag !== pNode.tag) {
                            matched = false; break;
                        }
                    }

                    if (pNode.mustHaveClasses && pNode.mustHaveClasses.length > 0) {
                        const nodeClasses = astNode.classes || [];
                        const hasAll = pNode.mustHaveClasses.every(cls => nodeClasses.includes(cls));
                        if (!hasAll) { matched = false; break; }
                    }

                    if (pNode.type === 'variable') {
                        matches[pNode.key] = {
                            node: astNode,
                            removedClasses: pNode.mustHaveClasses || [],
                            matchedNs: pNode.explicitNs // Записваме дали е търсен конкретен namespace
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

            const tParts = outputNode.tag.split(':');
            const origNs = tParts.length > 1 ? tParts[0] : undefined;
            const origLocal = tParts.length > 1 ? tParts[1] : tParts[0];

            let finalLocal = def.newTag || origLocal;
            let finalNs = origNs; 

            if (def.ns !== undefined) {
                // 1. Изрично добавяне/промяна на namespace в правилото (напр. foo:A)
                finalNs = def.ns;
            } else if (matchData.matchedNs !== undefined) {
                // 2. Премахване на namespace (Търсен е foo:A, но е заменен само с A)
                finalNs = undefined;
            }
            // 3. Ако нито едно от горните не е вярно (A -> A), пазим оригиналния namespace

            if (finalNs) {
                outputNode.tag = `${finalNs}:${finalLocal}`;
            } else {
                outputNode.tag = finalLocal;
            }

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

        if (def.children && def.children.length > 0) {
            outputNode.children = def.children.map(childDef => this.buildNode(childDef, matches));
        }

        return outputNode;
    },

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

        if (result.headers.length === 0 && result.rows.length > 0) {
            result.headers = result.rows.shift();
        }

        return result;
    },

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
