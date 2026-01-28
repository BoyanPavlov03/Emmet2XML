const XmlParser = {
    pos: 0,
    input: '',
    maxIterations: 10000,

    parse(input) {
        this.pos = 0;
        this.input = input.trim();

        if (!this.input) {
            return [];
        }

        if (!this.input.includes('<')) {

            return [];
        }

        const nodes = [];
        let iterations = 0;

        while (this.pos < this.input.length) {
            if (++iterations > this.maxIterations) {
                console.error('XmlParser: Max iterations reached, aborting');
                break;
            }

            this.skipWhitespace();

            if (this.pos >= this.input.length) break;

            if (this.input[this.pos] === '<') {
                const prevPos = this.pos;
                const node = this.parseElement();
                if (node) {
                    nodes.push(node);
                }

                if (this.pos === prevPos) {
                    this.pos++;
                }
            } else {

                this.skipToNextTag();
            }
        }

        return nodes;
    },

    parseElement() {
        if (this.input[this.pos] !== '<') return null;
        this.pos++;

        if (this.input[this.pos] === '/') {

            this.skipToChar('>');
            this.pos++;
            return null;
        }

        if (this.input[this.pos] === '!') {

            this.skipComment();
            return null;
        }

        if (this.input[this.pos] === '?') {

            this.skipToString('?>');
            this.pos += 2;
            return null;
        }

        const node = {
            tag: '',
            id: null,
            classes: [],
            attributes: {},
            text: null,
            children: []
        };

        node.tag = this.parseTagName();
        if (!node.tag) return null;

        this.skipWhitespace();
        let attrIterations = 0;
        while (this.pos < this.input.length &&
               this.input[this.pos] !== '>' &&
               this.input[this.pos] !== '/') {

            if (++attrIterations > 1000) break;

            const prevPos = this.pos;
            const attr = this.parseAttribute();
            if (attr) {
                if (attr.name === 'id') {
                    node.id = attr.value;
                } else if (attr.name === 'class') {
                    node.classes = attr.value.split(/\s+/).filter(c => c);
                } else {
                    node.attributes[attr.name] = attr.value;
                }
            }

            if (this.pos === prevPos) {
                this.pos++;
            }
            this.skipWhitespace();
        }

        if (this.input[this.pos] === '/') {
            this.pos++;
            if (this.input[this.pos] === '>') {
                this.pos++;
            }
            return node;
        }

        if (this.input[this.pos] === '>') {
            this.pos++;
        }

        const voidElements = new Set([
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'
        ]);

        if (voidElements.has(node.tag.toLowerCase())) {
            return node;
        }

        let textContent = '';

        while (this.pos < this.input.length) {
            const beforePos = this.pos;
            this.skipWhitespace();

            if (this.pos >= this.input.length) break;

            if (this.input[this.pos] === '<') {
                if (this.input[this.pos + 1] === '/') {

                    this.pos += 2;
                    const closingTag = this.parseTagName();
                    this.skipToChar('>');
                    this.pos++;
                    break;
                } else if (this.input[this.pos + 1] === '!') {

                    this.skipComment();
                } else {

                    const child = this.parseElement();
                    if (child) {
                        node.children.push(child);
                    }
                }
            } else {

                textContent += this.parseTextContent();
            }
        }

        textContent = textContent.trim();
        if (textContent) {
            node.text = textContent;
        }

        return node;
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
        return name;
    },

    parseAttribute() {
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

        if (!name) return null;

        this.skipWhitespace();

        if (this.input[this.pos] !== '=') {
            return { name, value: true };
        }

        this.pos++;
        this.skipWhitespace();

        let value = '';
        const quote = this.input[this.pos];

        if (quote === '"' || quote === "'") {
            this.pos++;
            while (this.pos < this.input.length && this.input[this.pos] !== quote) {
                value += this.input[this.pos];
                this.pos++;
            }
            this.pos++;
        } else {

            while (this.pos < this.input.length && !/[\s>\/]/.test(this.input[this.pos])) {
                value += this.input[this.pos];
                this.pos++;
            }
        }

        return { name, value };
    },

    parseTextContent() {
        let text = '';
        while (this.pos < this.input.length && this.input[this.pos] !== '<') {
            text += this.input[this.pos];
            this.pos++;
        }
        return text;
    },

    skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
            this.pos++;
        }
    },

    skipToChar(char) {
        while (this.pos < this.input.length && this.input[this.pos] !== char) {
            this.pos++;
        }
    },

    skipToString(str) {
        while (this.pos < this.input.length) {
            if (this.input.substring(this.pos, this.pos + str.length) === str) {
                return;
            }
            this.pos++;
        }
    },

    skipToNextTag() {
        this.skipToChar('<');
    },

    skipComment() {
        if (this.input.substring(this.pos, this.pos + 4) === '<!--') {
            this.skipToString('-->');
            this.pos += 3;
        } else {

            this.skipToChar('>');
            this.pos++;
        }
    },

    toEmmet(nodes, settings = {}) {
        const showValues = settings.showValues !== false;
        const showAttributes = settings.showAttributes !== false;
        const showAttrValues = settings.showAttrValues !== false;

        const nodeToEmmet = (node, ignoreText = false) => {
            let result = node.tag;

            if (showAttributes && node.id) {
                result += '#' + (showAttrValues ? node.id : '');
            }

            if (showAttributes && node.classes.length > 0) {
                if (showAttrValues) {
                    result += '.' + node.classes.join('.');
                } else {
                    result += '.';
                }
            }

            if (showAttributes && Object.keys(node.attributes).length > 0) {
                const attrs = [];
                for (const [key, value] of Object.entries(node.attributes)) {
                    if (value === true) {
                        attrs.push(key);
                    } else if (showAttrValues) {
                        attrs.push(`${key}="${value}"`);
                    } else {
                        attrs.push(key);
                    }
                }
                result += '[' + attrs.join(' ') + ']';
            }

            if (showValues && node.text && !ignoreText) {
                result += '{' + node.text + '}';
            }

            return result;
        };

        const nodesEqual = (a, b) => {
            if (a.tag !== b.tag) return false;
            if (a.id !== b.id) return false;
            if (a.classes.join('.') !== b.classes.join('.')) return false;
            if (JSON.stringify(a.attributes) !== JSON.stringify(b.attributes)) return false;
            if (a.text !== b.text) return false;
            if (a.children.length !== b.children.length) return false;

            for (let i = 0; i < a.children.length; i++) {
                if (!nodesEqual(a.children[i], b.children[i])) return false;
            }

            return true;
        };

        const groupNodes = (nodes) => {
            const groups = [];
            let i = 0;

            while (i < nodes.length) {
                const current = nodes[i];
                let count = 1;

                while (i + count < nodes.length && nodesEqual(current, nodes[i + count])) {
                    count++;
                }

                groups.push({ node: current, count });
                i += count;
            }

            return groups;
        };

        const processNodes = (nodes, level = 0) => {
            if (nodes.length === 0) return '';

            const groups = groupNodes(nodes);
            const results = [];

            for (const group of groups) {
                const node = group.node;
                const count = group.count;

                let emmet = nodeToEmmet(node);

                if (count > 1) {
                    emmet += '*' + count;
                }

                if (node.children && node.children.length > 0) {
                    const childGroups = groupNodes(node.children);
                    const childrenEmmet = processNodes(node.children, level + 1);

                    if (childGroups.length > 1) {
                        emmet += '>(' + childrenEmmet + ')';
                    } else {
                        emmet += '>' + childrenEmmet;
                    }
                }

                results.push(emmet);
            }

            if (results.length > 1) {

                const needsGrouping = results.some(r => r.includes('>'));
                if (needsGrouping) {
                    return results.map(r => r.includes('>') ? '(' + r + ')' : r).join('+');
                }
            }

            return results.join('+');
        };

        return processNodes(nodes);
    },

    analyze(input) {
        const nodes = this.parse(input);

        const stats = {
            totalElements: 0,
            elements: {},
            classes: {},
            attributes: {},
            maxDepth: 0,
            textNodes: 0
        };

        const analyzeNode = (node, depth = 1) => {
            stats.totalElements++;
            stats.maxDepth = Math.max(stats.maxDepth, depth);

            stats.elements[node.tag] = (stats.elements[node.tag] || 0) + 1;

            for (const cls of node.classes) {
                stats.classes[cls] = (stats.classes[cls] || 0) + 1;
            }

            for (const attr of Object.keys(node.attributes)) {
                stats.attributes[attr] = (stats.attributes[attr] || 0) + 1;
            }
            if (node.id) {
                stats.attributes['id'] = (stats.attributes['id'] || 0) + 1;
            }
            if (node.classes.length > 0) {
                stats.attributes['class'] = (stats.attributes['class'] || 0) + 1;
            }

            if (node.text) {
                stats.textNodes++;
            }

            for (const child of node.children) {
                analyzeNode(child, depth + 1);
            }
        };

        for (const node of nodes) {
            analyzeNode(node);
        }

        return stats;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = XmlParser;
}
