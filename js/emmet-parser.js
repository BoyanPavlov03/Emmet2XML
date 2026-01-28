const EmmetParser = {
    pos: 0,
    input: '',

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

                this.pos++;
                this.skipWhitespace();

                if (context.siblings.length > 0) {

                    const newContext = {
                        parent: context.siblings,
                        siblings: [],
                        _isRoot: false
                    };
                    stack.push(newContext);
                    context = newContext;
                }

                if (this.input[this.pos] === '{') {
                    this.pos++;
                    const text = this.parseText();

                    let targetSiblings = context.siblings;
                    if (targetSiblings.length === 0 && stack.length > 1) {

                        for (let i = stack.length - 2; i >= 0; i--) {
                            if (stack[i].siblings && stack[i].siblings.length > 0) {
                                targetSiblings = stack[i].siblings;
                                break;
                            }
                        }
                    }

                    for (const s of targetSiblings) {
                        s.text = s._index ? this.replaceIndex(text, s._index) : text;
                    }

                    continue;
                }

                if (this.input[this.pos] === '(') {
                    continue;
                }

                const nodes = this.parseAtom();
                if (nodes.length > 0) {

                    const allAdded = [];

                    for (const p of context.parent) {
                        for (const n of nodes) {

                            let clone = this.deepCloneNode(n);

                            if (p._index) {
                                clone = this.cloneNodeWithIndex(clone, p._index);
                            }

                            if (n._index !== undefined) {
                                clone._index = n._index;
                            }

                            p.children.push(clone);
                            allAdded.push(clone);
                        }
                    }

                    context.siblings = allAdded;
                }

            } else if (char === '+') {

                this.pos++;
                this.skipWhitespace();

                if (this.input[this.pos] === '(') {
                    continue;
                }

                const nodes = this.parseAtom();
                if (nodes.length > 0) {

                    if (context._isRoot || context._isGroup) {
                        for (const n of nodes) {
                            context.parent.push(n);
                        }
                        context.siblings = nodes;
                    } else {

                        const addedNodes = [];
                        for (const p of context.parent) {
                            for (const n of nodes) {
                                let clone = this.deepCloneNode(n);

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

                this.pos++;
                if (stack.length > 1) {
                    stack.pop();
                    context = stack[stack.length - 1];
                }

            } else if (char === '(') {

                this.pos++;
                const groupContent = [];
                const groupContext = {
                    parent: groupContent,
                    siblings: [],
                    _isGroup: true,
                    _isRoot: true,
                    _outerContext: context
                };
                stack.push(groupContext);
                context = groupContext;

            } else if (char === ')') {

                this.pos++;

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

                const multiplier = this.parseMultiplier();

                if (outerContext && outerContext._isGroup) {

                    if (multiplier > 1) {
                        for (let i = 0; i < multiplier; i++) {
                            for (const node of groupContent) {
                                outerContext.parent.push(this.cloneNodeWithIndex(this.deepCloneNode(node), i + 1));
                            }
                        }
                    } else {
                        for (const node of groupContent) {
                            outerContext.parent.push(this.deepCloneNode(node));
                        }
                    }
                    context.siblings = groupContent;
                } else if (outerContext && !outerContext._isRoot && outerContext.parent && outerContext.parent.length > 0) {

                    for (const p of outerContext.parent) {
                        if (multiplier > 1) {
                            for (let i = 0; i < multiplier; i++) {
                                for (const node of groupContent) {
                                    let clone = this.cloneNodeWithIndex(this.deepCloneNode(node), i + 1);

                                    if (p._index) {
                                        clone = this.cloneNodeWithIndex(clone, p._index);
                                    }
                                    p.children.push(clone);
                                }
                            }
                        } else {
                            for (const node of groupContent) {
                                let clone = this.deepCloneNode(node);

                                if (p._index) {
                                    clone = this.cloneNodeWithIndex(clone, p._index);
                                }
                                p.children.push(clone);
                            }
                        }
                    }

                    if (outerContext.parent[0].children.length > 0) {
                        context.siblings = outerContext.parent[0].children.slice(-groupContent.length * (multiplier > 1 ? multiplier : 1));
                    }
                } else if (Array.isArray(context.parent)) {

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

                const nodes = this.parseAtom();
                if (nodes.length > 0) {
                    if (context._isRoot) {

                        for (const n of nodes) {
                            context.parent.push(n);
                        }
                        context.siblings = nodes;
                    } else {

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

    skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
            this.pos++;
        }
    },

    parseElement() {
        const node = {
            tag: 'div',
            id: null,
            classes: [],
            attributes: {},
            text: null,
            children: [],
            multiplier: 1
        };

        const tagName = this.parseTagName();
        if (tagName) {
            node.tag = tagName;
        }

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
                break;
            }
        }

        if (!tagName && (node.id || node.classes.length > 0)) {
            node.tag = 'div';
        }

        if (node.multiplier > 1) {
            const nodes = [];
            for (let i = 0; i < node.multiplier; i++) {
                const clone = this.cloneNode(node, i + 1);
                clone._index = i + 1;
                nodes.push(clone);
            }
            return { _multiple: nodes };
        }

        return node.tag ? node : null;
    },

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

    parseAttributes() {
        const attrs = {};

        while (this.pos < this.input.length && this.input[this.pos] !== ']') {

            while (this.input[this.pos] === ' ') this.pos++;

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

            if (this.input[this.pos] === '=') {
                this.pos++;
                let attrValue = '';
                const quote = this.input[this.pos];

                if (quote === '"' || quote === "'") {
                    this.pos++;
                    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
                        attrValue += this.input[this.pos];
                        this.pos++;
                    }
                    this.pos++;
                } else {

                    while (this.pos < this.input.length && !/[\s\]]/.test(this.input[this.pos])) {
                        attrValue += this.input[this.pos];
                        this.pos++;
                    }
                }
                attrs[attrName] = attrValue;
            } else {

                attrs[attrName] = true;
            }

            while (this.input[this.pos] === ' ') this.pos++;
        }

        if (this.input[this.pos] === ']') {
            this.pos++;
        }

        return attrs;
    },

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

    parseNumber() {
        let num = '';
        while (this.pos < this.input.length && /\d/.test(this.input[this.pos])) {
            num += this.input[this.pos];
            this.pos++;
        }
        return num ? parseInt(num, 10) : null;
    },

    parseMultiplier() {
        if (this.input[this.pos] === '*') {
            this.pos++;
            return this.parseNumber() || 1;
        }
        return 1;
    },

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

    replaceIndex(str, index) {

        let result = str.replace(/\\\$/g, '\x00ESCAPED_DOLLAR\x00');

        result = result.replace(/\$+/g, (match) => {
            return String(index).padStart(match.length, '0');
        });

        result = result.replace(/\x00ESCAPED_DOLLAR\x00/g, '$');

        return result;
    },

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

        if (node._index !== undefined) {
            clone._index = node._index;
        }

        return clone;
    },

    deepCloneNodes(nodes) {
        return nodes.map(n => this.deepCloneNode(n));
    },

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

            if (showAttributes && node.id) {
                result += ` id="${showAttrValues ? node.id : ''}"`;
            }

            if (showAttributes && node.classes.length > 0) {
                result += ` class="${showAttrValues ? node.classes.join(' ') : ''}"`;
            }

            if (showAttributes) {
                for (const [key, value] of Object.entries(node.attributes)) {
                    if (value === true) {
                        result += ` ${key}`;
                    } else {
                        result += ` ${key}="${showAttrValues ? value : ''}"`;
                    }
                }
            }

            const hasContent = (showValues && node.text) || node.children.length > 0;

            if (!hasContent && selfClosing) {
                result += ' />';
                return result;
            }

            result += '>';

            if (showValues && node.text) {
                if (node.children.length === 0) {
                    result += node.text + '</' + node.tag + '>';
                    return result;
                }
                result += '\n' + pad + indent + node.text;
            }

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmmetParser;
}
