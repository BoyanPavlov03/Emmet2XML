/**
 * Emmet Parser - Парсер за Emmet синтаксис
 * Конвертира Emmet изрази в AST (Abstract Syntax Tree)
 */

const EmmetParser = {
    pos: 0,
    input: '',
    
    /**
     * Парсва Emmet израз и връща AST
     */
    parse(input) {
        this.pos = 0;
        this.input = input.trim();
        
        if (!this.input) {
            return [];
        }
        
        if (this.input.startsWith('<') && this.input.includes('</')) {
            console.warn('EmmetParser: Input looks like XML, not Emmet');
            return [];
        }
        
        // Stack-based parsing
        // stack[i] = { parent: nodeArray, siblings: nodeArray, _isRoot: bool }
        // parent = масив към който добавяме
        // siblings = последните добавени елементи (за > оператор)
        // _isRoot = дали parent е root масив или масив от parent nodes
        const rootNodes = [];
        let context = {
            parent: rootNodes,
            siblings: [],
            _isRoot: true
        };
        let stack = [context];
        
        while (this.pos < this.input.length) {
            this.skipWhitespace();
            if (this.pos >= this.input.length) break;
            
            const char = this.input[this.pos];
            
            if (char === '>') {
                // Child operator: следващите елементи са деца на siblings
                this.pos++;
                this.skipWhitespace();
                
                if (context.siblings.length > 0) {
                    // Създаваме нов контекст - siblings стават parent nodes
                    const newContext = {
                        parent: context.siblings,
                        siblings: [],
                        _isRoot: false  // parent са nodes, не root масив
                    };
                    stack.push(newContext);
                    context = newContext;
                }
                
                // Специален случай: >{text} добавя текст към текущите siblings
                if (this.input[this.pos] === '{') {
                    this.pos++; // skip '{'
                    const text = this.parseText();
                    
                    // Търсим siblings от текущия или предишния контекст
                    let targetSiblings = context.siblings;
                    if (targetSiblings.length === 0 && stack.length > 1) {
                        // Проверяваме предишните контексти
                        for (let i = stack.length - 2; i >= 0; i--) {
                            if (stack[i].siblings && stack[i].siblings.length > 0) {
                                targetSiblings = stack[i].siblings;
                                break;
                            }
                        }
                    }
                    
                    // Добавяме текст към всички siblings
                    for (const s of targetSiblings) {
                        s.text = s._index ? this.replaceIndex(text, s._index) : text;
                    }
                    
                    // Не сменяме контекста
                    continue;
                }
                
                // Ако следва група, не парсваме atom тук - групата ще се обработи на следващата итерация
                if (this.input[this.pos] === '(') {
                    continue;
                }
                
                const nodes = this.parseAtom();
                if (nodes.length > 0) {
                    // Събираме ВСИЧКИ добавени елементи
                    const allAdded = [];
                    
                    // Добавяме към всички родители
                    for (const p of context.parent) {
                        for (const n of nodes) {
                            // Клонираме node-а
                            let clone = this.deepCloneNode(n);
                            
                            // Ако parent има _index, заместваме $ в текста/атрибутите
                            if (p._index) {
                                clone = this.cloneNodeWithIndex(clone, p._index);
                            }
                            
                            // Запазваме оригиналния _index на node-а (за вложени multipliers)
                            if (n._index !== undefined) {
                                clone._index = n._index;
                            }
                            
                            p.children.push(clone);
                            allAdded.push(clone);
                        }
                    }
                    // siblings са ВСИЧКИ добавени елементи
                    context.siblings = allAdded;
                }
                
            } else if (char === '+') {
                // Sibling operator: добавяме на същото ниво като последните siblings
                this.pos++;
                this.skipWhitespace();
                
                // Ако следва група '(', просто продължаваме - групата ще се добави от основния loop
                if (this.input[this.pos] === '(') {
                    continue;
                }
                
                const nodes = this.parseAtom();
                if (nodes.length > 0) {
                    // Ако сме на root level или в група - добавяме директно към parent array
                    if (context._isRoot || context._isGroup) {
                        for (const n of nodes) {
                            context.parent.push(n);
                        }
                        context.siblings = nodes;
                    } else {
                        // Сме вътре в > context - context.parent са node-ове
                        // Добавяме новите елементи като деца на тези node-ове (siblings на предишните)
                        const addedNodes = [];
                        for (const p of context.parent) {
                            for (const n of nodes) {
                                const clone = this.deepCloneNode(n);
                                // Прилагаме parent index ако има
                                if (p._index) {
                                    clone = this.cloneNodeWithIndex(clone, p._index);
                                }
                                p.children.push(clone);
                                addedNodes.push(clone);
                            }
                        }
                        context.siblings = addedNodes;
                    }
                }
                
            } else if (char === '^') {
                // Climb up - качваме се едно ниво в DOM дървото
                // Това означава следващият елемент ще е sibling на текущия parent,
                // т.е. дете на grandparent
                this.pos++;
                if (stack.length > 1) {
                    stack.pop();
                    context = stack[stack.length - 1];
                }
                // Продължаваме с парсване
                
            } else if (char === '(') {
                // Group start
                this.pos++;
                const groupContent = [];
                const groupContext = {
                    parent: groupContent,
                    siblings: [],
                    _isGroup: true,
                    _isRoot: true, // groupContent е празен масив, работи като root
                    _outerContext: context // Запомняме външния контекст
                };
                stack.push(groupContext);
                context = groupContext;
                
            } else if (char === ')') {
                // Group end
                this.pos++;
                
                // Намираме груповия контекст
                let groupContent = [];
                let outerContext = null;
                while (stack.length > 1) {
                    const ctx = stack.pop();
                    if (ctx._isGroup) {
                        groupContent = ctx.parent;
                        outerContext = ctx._outerContext;
                        break;
                    }
                }
                context = stack[stack.length - 1];
                
                // Multiplier след група
                const multiplier = this.parseMultiplier();
                
                // Добавяме групата към правилното място
                // Ако външният контекст НЕ е root (т.е. сме вътре в > context), добавяме като деца
                if (outerContext && !outerContext._isRoot && outerContext.parent && outerContext.parent.length > 0) {
                    // Групата е дете - добавяме към children на parent nodes
                    for (const p of outerContext.parent) {
                        if (multiplier > 1) {
                            for (let i = 0; i < multiplier; i++) {
                                for (const node of groupContent) {
                                    let clone = this.cloneNodeWithIndex(this.deepCloneNode(node), i + 1);
                                    // Ако parent има _index, заместваме и неговия $
                                    if (p._index) {
                                        clone = this.cloneNodeWithIndex(clone, p._index);
                                    }
                                    p.children.push(clone);
                                }
                            }
                        } else {
                            for (const node of groupContent) {
                                let clone = this.deepCloneNode(node);
                                // Ако parent има _index, заместваме $ с неговия индекс
                                if (p._index) {
                                    clone = this.cloneNodeWithIndex(clone, p._index);
                                }
                                p.children.push(clone);
                            }
                        }
                    }
                    // siblings стават последните добавени
                    if (outerContext.parent[0].children.length > 0) {
                        context.siblings = outerContext.parent[0].children.slice(-groupContent.length * (multiplier > 1 ? multiplier : 1));
                    }
                } else if (Array.isArray(context.parent)) {
                    // Групата е на root level или outerContext е root
                    if (multiplier > 1) {
                        for (let i = 0; i < multiplier; i++) {
                            for (const node of groupContent) {
                                context.parent.push(this.cloneNodeWithIndex(node, i + 1));
                            }
                        }
                    } else {
                        for (const node of groupContent) {
                            context.parent.push(node);
                        }
                    }
                    context.siblings = groupContent;
                }
                
            } else {
                // Елемент на текущото ниво
                const nodes = this.parseAtom();
                if (nodes.length > 0) {
                    if (context._isRoot) {
                        // Root level - добавяме директно към масива
                        for (const n of nodes) {
                            context.parent.push(n);
                        }
                        context.siblings = nodes;
                    } else {
                        // Parent са nodes - добавяме към техните children
                        const allAdded = [];
                        for (const p of context.parent) {
                            for (const n of nodes) {
                                const clone = this.deepCloneNode(n);
                                p.children.push(clone);
                                allAdded.push(clone);
                            }
                        }
                        context.siblings = allAdded;
                    }
                } else {
                    break;
                }
            }
        }
        
        return rootNodes;
    },
    
    /**
     * Парсва един атом (елемент)
     */
    parseAtom() {
        this.skipWhitespace();
        if (this.pos >= this.input.length) return [];
        
        const char = this.input[this.pos];
        if (char === '(' || char === ')' || char === '>' || char === '+' || char === '^') {
            return [];
        }
        
        const element = this.parseElement();
        if (!element) return [];
        
        if (element._multiple) {
            return element._multiple;
        }
        
        return [element];
    },
    
    /**
     * Clone node with $ replaced by index
     */
    cloneNodeWithIndex(node, index) {
        const clone = {
            tag: node.tag,
            id: node.id ? this.replaceIndex(node.id, index) : null,
            classes: node.classes.map(c => this.replaceIndex(c, index)),
            attributes: {},
            text: node.text ? this.replaceIndex(node.text, index) : null,
            children: node.children.map(c => this.cloneNodeWithIndex(c, index)),
            multiplier: 1
        };
        
        for (const [key, value] of Object.entries(node.attributes)) {
            clone.attributes[key] = typeof value === 'string' 
                ? this.replaceIndex(value, index) 
                : value;
        }
        
        return clone;
    },
    
    /**
     * Пропуска whitespace
     */
    skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
            this.pos++;
        }
    },
    
    /**
     * Парсва единичен елемент с атрибути, класове, id и т.н.
     */
    parseElement() {
        const node = {
            tag: 'div', // default
            id: null,
            classes: [],
            attributes: {},
            text: null,
            children: [],
            multiplier: 1
        };
        
        // Парсване на tag name
        const tagName = this.parseTagName();
        if (tagName) {
            node.tag = tagName;
        }
        
        // Парсване на модификатори (#id, .class, [attr], {text})
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            
            if (char === '#') {
                this.pos++;
                node.id = this.parseIdentifier();
            } else if (char === '.') {
                this.pos++;
                const className = this.parseIdentifier();
                if (className) {
                    node.classes.push(className);
                }
            } else if (char === '[') {
                this.pos++;
                const attrs = this.parseAttributes();
                Object.assign(node.attributes, attrs);
            } else if (char === '{') {
                this.pos++;
                node.text = this.parseText();
            } else if (char === '*') {
                this.pos++;
                node.multiplier = this.parseNumber() || 1;
            } else {
                break; // Край на елемента
            }
        }
        
        // Ако няма tag и има само id или class, използваме div
        if (!tagName && (node.id || node.classes.length > 0)) {
            node.tag = 'div';
        }
        
        // Разширяване при multiplier > 1
        if (node.multiplier > 1) {
            const nodes = [];
            for (let i = 0; i < node.multiplier; i++) {
                const clone = this.cloneNode(node, i + 1);
                clone._index = i + 1; // Запазваме индекса за деца
                nodes.push(clone);
            }
            return { _multiple: nodes };
        }
        
        return node.tag ? node : null;
    },
    
    /**
     * Парсва име на таг
     */
    parseTagName() {
        let name = '';
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            if (/[a-zA-Z0-9\-_:]/.test(char)) {
                name += char;
                this.pos++;
            } else {
                break;
            }
        }
        return name || null;
    },
    
    /**
     * Парсва идентификатор (за id, class)
     */
    parseIdentifier() {
        let id = '';
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            if (/[a-zA-Z0-9\-_$]/.test(char)) {
                id += char;
                this.pos++;
            } else {
                break;
            }
        }
        return id || null;
    },
    
    /**
     * Парсва атрибути [attr=value attr2="value2"]
     */
    parseAttributes() {
        const attrs = {};
        
        while (this.pos < this.input.length && this.input[this.pos] !== ']') {
            // Skip whitespace
            while (this.input[this.pos] === ' ') this.pos++;
            
            // Парсване на име на атрибут
            let attrName = '';
            while (this.pos < this.input.length) {
                const char = this.input[this.pos];
                if (/[a-zA-Z0-9\-_:]/.test(char)) {
                    attrName += char;
                    this.pos++;
                } else {
                    break;
                }
            }
            
            if (!attrName) break;
            
            // Проверка за стойност
            if (this.input[this.pos] === '=') {
                this.pos++; // skip '='
                let attrValue = '';
                const quote = this.input[this.pos];
                
                if (quote === '"' || quote === "'") {
                    this.pos++; // skip opening quote
                    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
                        attrValue += this.input[this.pos];
                        this.pos++;
                    }
                    this.pos++; // skip closing quote
                } else {
                    // Без кавички
                    while (this.pos < this.input.length && !/[\s\]]/.test(this.input[this.pos])) {
                        attrValue += this.input[this.pos];
                        this.pos++;
                    }
                }
                attrs[attrName] = attrValue;
            } else {
                // Boolean атрибут
                attrs[attrName] = true;
            }
            
            // Skip whitespace
            while (this.input[this.pos] === ' ') this.pos++;
        }
        
        if (this.input[this.pos] === ']') {
            this.pos++; // skip ']'
        }
        
        return attrs;
    },
    
    /**
     * Парсва текст {text content}
     */
    parseText() {
        let text = '';
        let depth = 1;
        
        while (this.pos < this.input.length && depth > 0) {
            const char = this.input[this.pos];
            if (char === '{') {
                depth++;
                text += char;
            } else if (char === '}') {
                depth--;
                if (depth > 0) text += char;
            } else {
                text += char;
            }
            this.pos++;
        }
        
        return text;
    },
    
    /**
     * Парсва число
     */
    parseNumber() {
        let num = '';
        while (this.pos < this.input.length && /\d/.test(this.input[this.pos])) {
            num += this.input[this.pos];
            this.pos++;
        }
        return num ? parseInt(num, 10) : null;
    },
    
    /**
     * Парсва multiplier *N
     */
    parseMultiplier() {
        if (this.input[this.pos] === '*') {
            this.pos++;
            return this.parseNumber() || 1;
        }
        return 1;
    },
    
    /**
     * Клонира node и заменя $ с номер
     */
    cloneNode(node, index) {
        const clone = {
            tag: node.tag,
            id: node.id ? this.replaceIndex(node.id, index) : null,
            classes: node.classes.map(c => this.replaceIndex(c, index)),
            attributes: {},
            text: node.text ? this.replaceIndex(node.text, index) : null,
            children: [],
            multiplier: 1
        };
        
        for (const [key, value] of Object.entries(node.attributes)) {
            clone.attributes[key] = typeof value === 'string' 
                ? this.replaceIndex(value, index) 
                : value;
        }
        
        return clone;
    },
    
    /**
     * Клонира масив от nodes
     */
    cloneNodes(nodes, index) {
        return nodes.map(node => {
            if (node._multiple) {
                return node;
            }
            const clone = this.cloneNode(node, index);
            clone.children = this.cloneNodes(node.children, index);
            return clone;
        });
    },
    
    /**
     * Заменя $ с индекс
     */
    replaceIndex(str, index) {
        // Първо премахваме escape-натите \$ -> временен placeholder
        let result = str.replace(/\\\$/g, '\x00ESCAPED_DOLLAR\x00');
        
        // Заместваме $$$ -> 001, $$ -> 01, $ -> 1
        result = result.replace(/\$+/g, (match) => {
            return String(index).padStart(match.length, '0');
        });
        
        // Връщаме escaped dollars обратно като обикновени $
        result = result.replace(/\x00ESCAPED_DOLLAR\x00/g, '$');
        
        return result;
    },
    
    /**
     * Намира най-дълбокото дете
     */
    getDeepestChild(node) {
        if (node._multiple) {
            const last = node._multiple[node._multiple.length - 1];
            return this.getDeepestChild(last);
        }
        if (node.children && node.children.length > 0) {
            return this.getDeepestChild(node.children[node.children.length - 1]);
        }
        return node;
    },
    
    /**
     * Връща всички най-дълбоки деца от масив от nodes
     */
    getAllDeepestChildren(nodes) {
        const result = [];
        for (const node of nodes) {
            if (node._multiple) {
                result.push(...this.getAllDeepestChildren(node._multiple));
            } else if (node.children && node.children.length > 0) {
                result.push(...this.getAllDeepestChildren(node.children));
            } else {
                result.push(node);
            }
        }
        return result;
    },
    
    /**
     * Дълбоко копиране на node
     */
    deepCloneNode(node) {
        if (node._multiple) {
            return { _multiple: node._multiple.map(n => this.deepCloneNode(n)) };
        }
        
        const clone = {
            tag: node.tag,
            id: node.id,
            classes: [...node.classes],
            attributes: { ...node.attributes },
            text: node.text,
            children: node.children.map(c => this.deepCloneNode(c)),
            multiplier: 1
        };
        
        // Копираме _index ако има
        if (node._index !== undefined) {
            clone._index = node._index;
        }
        
        return clone;
    },
    
    /**
     * Дълбоко копиране на масив от nodes
     */
    deepCloneNodes(nodes) {
        return nodes.map(n => this.deepCloneNode(n));
    },
    
    /**
     * Генерира XML от AST
     */
    generate(nodes, settings = {}) {
        const indent = settings.indent || '  ';
        const selfClosing = settings.selfClosing !== false;
        const showValues = settings.showValues !== false;
        const showAttributes = settings.showAttributes !== false;
        const showAttrValues = settings.showAttrValues !== false;
        
        const generateNode = (node, level = 0) => {
            if (node._multiple) {
                return node._multiple.map(n => generateNode(n, level)).join('\n');
            }
            
            const pad = indent.repeat(level);
            let result = pad + '<' + node.tag;
            
            // ID
            if (showAttributes && node.id) {
                result += ` id="${showAttrValues ? node.id : ''}"`;
            }
            
            // Classes
            if (showAttributes && node.classes.length > 0) {
                result += ` class="${showAttrValues ? node.classes.join(' ') : ''}"`;
            }
            
            // Other attributes
            if (showAttributes) {
                for (const [key, value] of Object.entries(node.attributes)) {
                    if (value === true) {
                        result += ` ${key}`;
                    } else {
                        result += ` ${key}="${showAttrValues ? value : ''}"`;
                    }
                }
            }
            
            // Self-closing check
            const hasContent = (showValues && node.text) || node.children.length > 0;
            
            if (!hasContent && selfClosing) {
                result += ' />';
                return result;
            }
            
            result += '>';
            
            // Text content
            if (showValues && node.text) {
                if (node.children.length === 0) {
                    result += node.text + '</' + node.tag + '>';
                    return result;
                }
                result += '\n' + pad + indent + node.text;
            }
            
            // Children
            if (node.children.length > 0) {
                result += '\n';
                for (const child of node.children) {
                    result += generateNode(child, level + 1) + '\n';
                }
                result += pad + '</' + node.tag + '>';
            } else if (showValues && node.text) {
                result += '\n' + pad + '</' + node.tag + '>';
            } else {
                result += '</' + node.tag + '>';
            }
            
            return result;
        };
        
        // Flatten multiple nodes
        const flattenNodes = (nodes) => {
            const result = [];
            for (const node of nodes) {
                if (node._multiple) {
                    result.push(...node._multiple);
                } else {
                    result.push(node);
                }
            }
            return result;
        };
        
        const flatNodes = flattenNodes(nodes);
        return flatNodes.map(n => generateNode(n, 0)).join('\n');
    }
};

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmmetParser;
}
