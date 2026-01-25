/**
 * Emmet Parser - Парсер за Emmet синтаксис
 * Конвертира Emmet изрази в AST (Abstract Syntax Tree)
 */

const EmmetParser = {
    // Текуща позиция в израза
    pos: 0,
    input: '',
    maxIterations: 10000, // Защита от безкрайни цикли
    iterations: 0,
    
    /**
     * Парсва Emmet израз и връща AST
     */
    parse(input) {
        this.pos = 0;
        this.input = input.trim();
        this.iterations = 0;
        
        if (!this.input) {
            return [];
        }
        
        // Проверка дали входът изглежда като XML вместо Emmet
        if (this.input.startsWith('<') && this.input.includes('</')) {
            console.warn('EmmetParser: Input looks like XML, not Emmet');
            return [];
        }
        
        return this.parseGroup();
    },
    
    /**
     * Парсва група от елементи (най-високо ниво)
     */
    parseGroup() {
        const nodes = [];
        let currentNodes = []; // Следим всички текущи nodes (за множествени елементи)
        
        while (this.pos < this.input.length) {
            // Защита от безкрайни цикли
            if (++this.iterations > this.maxIterations) {
                console.error('EmmetParser: Max iterations reached, aborting');
                break;
            }
            
            const char = this.input[this.pos];
            
            if (char === '(') {
                // Група в скоби
                this.pos++; // skip '('
                const groupNodes = this.parseGroup();
                
                // Проверка за multiplication след групата
                const multiplier = this.parseMultiplier();
                
                if (multiplier > 1) {
                    for (let i = 0; i < multiplier; i++) {
                        const cloned = this.cloneNodes(groupNodes, i + 1);
                        if (currentNodes.length > 0) {
                            for (const cn of currentNodes) {
                                cn.children.push(...this.deepCloneNodes(cloned));
                            }
                        } else {
                            nodes.push(...cloned);
                        }
                    }
                } else {
                    if (currentNodes.length > 0) {
                        for (const cn of currentNodes) {
                            cn.children.push(...this.deepCloneNodes(groupNodes));
                        }
                    } else {
                        nodes.push(...groupNodes);
                    }
                }
            } else if (char === ')') {
                this.pos++; // skip ')'
                break; // Край на групата
            } else if (char === '>') {
                // Child - добавяме към ВСИЧКИ текущи nodes
                this.pos++;
                const child = this.parseElement();
                if (child && currentNodes.length > 0) {
                    // Добавяме деца към всички текущи nodes
                    for (const cn of currentNodes) {
                        const childCopy = this.deepCloneNode(child);
                        cn.children.push(childCopy);
                    }
                    // Текущите nodes стават най-дълбоките деца
                    currentNodes = this.getAllDeepestChildren(currentNodes);
                }
            } else if (char === '+') {
                // Sibling
                this.pos++;
                const sibling = this.parseElement();
                if (sibling) {
                    nodes.push(sibling);
                    currentNodes = sibling._multiple ? [...sibling._multiple] : [sibling];
                }
            } else if (char === '^') {
                // Climb up
                this.pos++;
                const sibling = this.parseElement();
                if (sibling) {
                    nodes.push(sibling);
                    currentNodes = sibling._multiple ? [...sibling._multiple] : [sibling];
                }
            } else if (char === ' ' || char === '\n' || char === '\t') {
                this.pos++; // skip whitespace
            } else {
                // Елемент
                const element = this.parseElement();
                if (element) {
                    nodes.push(element);
                    // Ако елементът е множествен, следим всички копия
                    currentNodes = element._multiple ? [...element._multiple] : [element];
                }
            }
        }
        
        return nodes;
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
                nodes.push(this.cloneNode(node, i + 1));
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
        // $$$ -> 001, $$ -> 01, $ -> 1
        return str.replace(/\$+/g, (match) => {
            return String(index).padStart(match.length, '0');
        });
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
