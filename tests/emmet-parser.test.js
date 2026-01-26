/**
 * Unit Tests за Emmet Parser
 * Изпълни с: node tests/emmet-parser.test.js
 */

const path = require('path');

// Зареждаме парсера директно (файлът вече има module.exports)
const EmmetParser = require(path.join(__dirname, '../js/emmet-parser.js'));

// Помощни функции
let passed = 0;
let failed = 0;

function normalize(str) {
    return str.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
}

function test(name, emmet, expected) {
    try {
        const ast = EmmetParser.parse(emmet);
        const result = EmmetParser.generate(ast, { indent: '  ', selfClosing: true });
        const normalizedResult = normalize(result);
        const normalizedExpected = normalize(expected);
        
        if (normalizedResult === normalizedExpected) {
            console.log(`✅ ${name}`);
            passed++;
        } else {
            console.log(`❌ ${name}`);
            console.log(`   Input:    ${emmet}`);
            console.log(`   Expected: ${normalizedExpected}`);
            console.log(`   Got:      ${normalizedResult}`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ ${name} - ERROR: ${error.message}`);
        failed++;
    }
}

console.log('='.repeat(60));
console.log('EMMET PARSER UNIT TESTS');
console.log('='.repeat(60));
console.log('');

// ============================================
// BASIC ELEMENTS
// ============================================
console.log('--- Basic Elements ---');

test('Single element',
    'div',
    '<div />'
);

test('Element with text',
    'p{Hello}',
    '<p>Hello</p>'
);

test('Element with id',
    'div#main',
    '<div id="main" />'
);

test('Element with class',
    'div.container',
    '<div class="container" />'
);

test('Element with multiple classes',
    'div.one.two.three',
    '<div class="one two three" />'
);

test('Element with id and class',
    'div#main.container',
    '<div id="main" class="container" />'
);

test('Element with attribute',
    'a[href=#]',
    '<a href="#" />'
);

test('Element with multiple attributes',
    'input[type=text placeholder="Enter name"]',
    '<input type="text" placeholder="Enter name" />'
);

test('Implicit div with id',
    '#main',
    '<div id="main" />'
);

test('Implicit div with class',
    '.container',
    '<div class="container" />'
);

// ============================================
// CHILD OPERATOR (>)
// ============================================
console.log('');
console.log('--- Child Operator (>) ---');

test('Simple child',
    'div>p',
    '<div><p /></div>'
);

test('Multiple levels',
    'div>ul>li',
    '<div><ul><li /></ul></div>'
);

test('Child with text',
    'div>p{Hello}',
    '<div><p>Hello</p></div>'
);

test('Deep nesting',
    'div>div>div>div>span',
    '<div><div><div><div><span /></div></div></div></div>'
);

// ============================================
// SIBLING OPERATOR (+)
// ============================================
console.log('');
console.log('--- Sibling Operator (+) ---');

test('Simple sibling',
    'div+p',
    '<div /><p />'
);

test('Multiple siblings',
    'div+p+span',
    '<div /><p /><span />'
);

test('Siblings with text',
    'h1{Title}+p{Content}',
    '<h1>Title</h1><p>Content</p>'
);

// ============================================
// MULTIPLICATION (*)
// ============================================
console.log('');
console.log('--- Multiplication (*) ---');

test('Simple multiplication',
    'li*3',
    '<li /><li /><li />'
);

test('Multiplication with text',
    'li{Item}*3',
    '<li>Item</li><li>Item</li><li>Item</li>'
);

test('Multiplication with numbering',
    'li{Item $}*3',
    '<li>Item 1</li><li>Item 2</li><li>Item 3</li>'
);

test('Multiplication with padded numbering',
    'li{Item $$}*3',
    '<li>Item 01</li><li>Item 02</li><li>Item 03</li>'
);

test('Multiplication with class numbering',
    'li.item$*3',
    '<li class="item1" /><li class="item2" /><li class="item3" />'
);

// ============================================
// GROUPING ()
// ============================================
console.log('');
console.log('--- Grouping () ---');

test('Simple group',
    '(div)',
    '<div />'
);

test('Group with siblings',
    '(div+p)',
    '<div /><p />'
);

test('Group as child',
    'div>(header+footer)',
    '<div><header /><footer /></div>'
);

test('Group with child operator - IMPORTANT',
    'div>(header>nav)+footer',
    '<div><header><nav /></header><footer /></div>'
);

test('Nested groups',
    'div>(header>(nav>a))+footer',
    '<div><header><nav><a /></nav></header><footer /></div>'
);

test('Group multiplication',
    '(div+p)*2',
    '<div /><p /><div /><p />'
);

test('Complex group',
    'div>(header>h1{Title})+main+footer',
    '<div><header><h1>Title</h1></header><main /><footer /></div>'
);

// ============================================
// COMBINED OPERATORS
// ============================================
console.log('');
console.log('--- Combined Operators ---');

test('Table structure',
    'table>tr*3>td*4{Cell}',
    '<table><tr><td>Cell</td><td>Cell</td><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td><td>Cell</td><td>Cell</td></tr></table>'
);

test('Navigation',
    'nav>ul>li*3>a[href=#]{Link $}',
    '<nav><ul><li><a href="#">Link 1</a></li><li><a href="#">Link 2</a></li><li><a href="#">Link 3</a></li></ul></nav>'
);

test('Form structure',
    'form>input[type=text]+input[type=email]+button{Submit}',
    '<form><input type="text" /><input type="email" /><button>Submit</button></form>'
);

test('Article structure',
    'article>h2{Title}+p{Content}+footer>a[href=#]{Read more}',
    '<article><h2>Title</h2><p>Content</p><footer><a href="#">Read more</a></footer></article>'
);

test('Page layout',
    'div#page>(header>h1{Site})+(main>article*2>h2{Post $})+footer',
    '<div id="page"><header><h1>Site</h1></header><main><article><h2>Post 1</h2></article><article><h2>Post 2</h2></article></main><footer /></div>'
);

// ============================================
// EDGE CASES
// ============================================
console.log('');
console.log('--- Edge Cases ---');

test('Empty input',
    '',
    ''
);

test('Whitespace handling',
    'div > p',
    '<div><p /></div>'
);

test('Complex attributes',
    'a[href="https://example.com" target="_blank" rel="noopener"]',
    '<a href="https://example.com" target="_blank" rel="noopener" />'
);

test('Boolean attribute',
    'input[disabled]',
    '<input disabled />'
);

test('Special characters in text',
    'p{Hello & welcome <friend>}',
    '<p>Hello & welcome <friend></p>'
);

// ============================================
// TEXT WITH CHILD OPERATOR (>{text})
// ============================================
console.log('');
console.log('--- Text with Child Operator ---');

test('Simple text child',
    'td>{Content}',
    '<td>Content</td>'
);

test('Multiple elements with text child',
    'td*3>{Item $}',
    '<td>Item 1</td><td>Item 2</td><td>Item 3</td>'
);

test('Nested multiplication with text',
    'tr*2>td*3>{Cell}',
    '<tr><td>Cell</td><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr>'
);

test('Table with class and text numbering',
    'table>tr*2>td.col$*3>{Item $}',
    '<table><tr><td class="col1">Item 1</td><td class="col2">Item 2</td><td class="col3">Item 3</td></tr><tr><td class="col1">Item 1</td><td class="col2">Item 2</td><td class="col3">Item 3</td></tr></table>'
);

// ============================================
// CLIMB-UP OPERATOR (^)
// ============================================
console.log('');
console.log('--- Climb-up Operator (^) ---');

test('Simple climb-up',
    'div>p^span',
    '<div><p /></div><span />'
);

test('Multiple climb-ups',
    'div>ul>li^^p',
    '<div><ul><li /></ul></div><p />'
);

test('Climb-up with siblings',
    'div>header>nav^main',
    '<div><header><nav /></header><main /></div>'
);

// ============================================
// COMPLEX REAL-WORLD EXAMPLES
// ============================================
console.log('');
console.log('--- Real-world Examples ---');

test('Card component',
    'div.card>(div.card-header>h3{Title})+(div.card-body>p{Content})+(div.card-footer>button{Action})',
    '<div class="card"><div class="card-header"><h3>Title</h3></div><div class="card-body"><p>Content</p></div><div class="card-footer"><button>Action</button></div></div>'
);

test('Navigation menu',
    'nav.navbar>ul.nav>li.nav-item*4>a.nav-link[href=#]{Menu $}',
    '<nav class="navbar"><ul class="nav"><li class="nav-item"><a class="nav-link" href="#">Menu 1</a></li><li class="nav-item"><a class="nav-link" href="#">Menu 2</a></li><li class="nav-item"><a class="nav-link" href="#">Menu 3</a></li><li class="nav-item"><a class="nav-link" href="#">Menu 4</a></li></ul></nav>'
);

test('Form with labels',
    'form>(div.form-group>label{Name}+input[type=text name=name])+(div.form-group>label{Email}+input[type=email name=email])+button[type=submit]{Send}',
    '<form><div class="form-group"><label>Name</label><input type="text" name="name" /></div><div class="form-group"><label>Email</label><input type="email" name="email" /></div><button type="submit">Send</button></form>'
);

test('Definition list',
    'dl>(dt{Term $}+dd{Definition $})*3',
    '<dl><dt>Term 1</dt><dd>Definition 1</dd><dt>Term 2</dt><dd>Definition 2</dd><dt>Term 3</dt><dd>Definition 3</dd></dl>'
);

test('Nested structure with groups',
    'ul>li*2>(a{Link}+span{Info})',
    '<ul><li><a>Link</a><span>Info</span></li><li><a>Link</a><span>Info</span></li></ul>'
);

test('Grid layout',
    'div.container>div.row*2>div.col*3>{Column $}',
    '<div class="container"><div class="row"><div class="col">Column 1</div><div class="col">Column 2</div><div class="col">Column 3</div></div><div class="row"><div class="col">Column 1</div><div class="col">Column 2</div><div class="col">Column 3</div></div></div>'
);

// ============================================
// ADVANCED NUMBERING
// ============================================
console.log('');
console.log('--- Advanced Numbering ---');

test('Triple digit padding',
    'li{Item $$$}*3',
    '<li>Item 001</li><li>Item 002</li><li>Item 003</li>'
);

test('Numbering in id',
    'div#item$*3',
    '<div id="item1" /><div id="item2" /><div id="item3" />'
);

test('Numbering in multiple places',
    'li#item$.class${Text $}*3',
    '<li id="item1" class="class1">Text 1</li><li id="item2" class="class2">Text 2</li><li id="item3" class="class3">Text 3</li>'
);

test('Numbering in attributes',
    'a[href=page$.html]{Link $}*3',
    '<a href="page1.html">Link 1</a><a href="page2.html">Link 2</a><a href="page3.html">Link 3</a>'
);

// ============================================
// SPECIAL TAGS
// ============================================
console.log('');
console.log('--- Special Tags ---');

test('Custom XML tags',
    'book>title{My Book}+author{John Doe}+year{2024}',
    '<book><title>My Book</title><author>John Doe</author><year>2024</year></book>'
);

test('Namespaced tags',
    'svg:rect[width=100 height=50]',
    '<svg:rect width="100" height="50" />'
);

test('Data attributes',
    'div[data-id=123 data-name="test"]',
    '<div data-id="123" data-name="test" />'
);

// ============================================
// STRESS TESTS
// ============================================
console.log('');
console.log('--- Stress Tests ---');

test('Deep nesting (10 levels)',
    'a>b>c>d>e>f>g>h>i>j',
    '<a><b><c><d><e><f><g><h><i><j /></i></h></g></f></e></d></c></b></a>'
);

test('Many siblings',
    'a+b+c+d+e+f+g+h+i+j',
    '<a /><b /><c /><d /><e /><f /><g /><h /><i /><j />'
);

test('Large multiplication',
    'li*10',
    '<li /><li /><li /><li /><li /><li /><li /><li /><li /><li />'
);

test('Complex nested multiplication',
    'table>tbody>tr*3>td*5{R$C}',
    '<table><tbody><tr><td>R1C</td><td>R2C</td><td>R3C</td><td>R4C</td><td>R5C</td></tr><tr><td>R1C</td><td>R2C</td><td>R3C</td><td>R4C</td><td>R5C</td></tr><tr><td>R1C</td><td>R2C</td><td>R3C</td><td>R4C</td><td>R5C</td></tr></tbody></table>'
);

test('Complex structure with all features',
    'root>header#mainHeader>(title{Emmet Demo}+meta[charset=utf-8])+body>(section.content*2>(article.post[data-id=$]>(h2{Post $}+p{Lorem ipsum $}))+footer>nav>ul>li.item$*3>a[href=/link$]{Link $})',
    '<root><header id="mainHeader"><title>Emmet Demo</title><meta charset="utf-8" /><body><section class="content"><article class="post" data-id="1"><h2>Post 1</h2><p>Lorem ipsum 1</p></article><footer><nav><ul><li class="item1"><a href="/link1">Link 1</a></li><li class="item2"><a href="/link2">Link 2</a></li><li class="item3"><a href="/link3">Link 3</a></li></ul></nav></footer></section><section class="content"><article class="post" data-id="2"><h2>Post 2</h2><p>Lorem ipsum 2</p></article><footer><nav><ul><li class="item1"><a href="/link1">Link 1</a></li><li class="item2"><a href="/link2">Link 2</a></li><li class="item3"><a href="/link3">Link 3</a></li></ul></nav></footer></section></body></header></root>'
)

// ============================================
// RESULTS
// ============================================
console.log('');
console.log('='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
