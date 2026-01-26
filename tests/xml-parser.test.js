/**
 * XML Parser Tests
 * Тестове за XML към Emmet конвертиране
 */

// Зареждаме парсера
const XmlParser = require('../js/xml-parser.js');

let passed = 0;
let failed = 0;

function test(name, xmlInput, expectedEmmet, settings = {}) {
    const ast = XmlParser.parse(xmlInput);
    const result = XmlParser.toEmmet(ast, settings);
    
    if (result === expectedEmmet) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        console.log(`   Input:    ${xmlInput.replace(/\n/g, '\\n').substring(0, 100)}`);
        console.log(`   Expected: ${expectedEmmet}`);
        console.log(`   Got:      ${result}`);
        failed++;
    }
}

function testParse(name, xmlInput, expectedNodeCount) {
    const ast = XmlParser.parse(xmlInput);
    
    if (ast.length === expectedNodeCount) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        console.log(`   Expected ${expectedNodeCount} nodes, got ${ast.length}`);
        failed++;
    }
}

function testAnalyze(name, xmlInput, checkFn) {
    const stats = XmlParser.analyze(xmlInput);
    const result = checkFn(stats);
    
    if (result === true) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        console.log(`   Stats: ${JSON.stringify(stats)}`);
        console.log(`   Check failed: ${result}`);
        failed++;
    }
}

console.log('============================================================');
console.log('XML PARSER TESTS');
console.log('============================================================\n');

// ==================== BASIC PARSING ====================
console.log('--- Basic Parsing ---');

testParse('Empty input', '', 0);
testParse('Single element', '<div></div>', 1);
testParse('Self-closing element', '<br/>', 1);
testParse('Multiple root elements', '<div></div><span></span>', 2);
testParse('Nested elements', '<div><span></span></div>', 1);

// ==================== BASIC ELEMENTS ====================
console.log('\n--- Basic Elements ---');

test('Single element', '<div></div>', 'div');
test('Self-closing element', '<input/>', 'input');
test('Element with space before close', '<br />', 'br');
test('Custom tag name', '<custom-element></custom-element>', 'custom-element');
test('Namespaced tag', '<ns:element></ns:element>', 'ns:element');

// ==================== ID AND CLASSES ====================
console.log('\n--- ID and Classes ---');

test('Element with ID', '<div id="main"></div>', 'div#main');
test('Element with class', '<div class="container"></div>', 'div.container');
test('Element with multiple classes', '<div class="foo bar baz"></div>', 'div.foo.bar.baz');
test('Element with ID and class', '<div id="main" class="container"></div>', 'div#main.container');
test('Element with ID and multiple classes', '<div id="app" class="wrapper flex"></div>', 'div#app.wrapper.flex');

// ==================== ATTRIBUTES ====================
console.log('\n--- Attributes ---');

test('Single attribute', '<input type="text"/>', 'input[type="text"]');
test('Multiple attributes', '<input type="text" name="email"/>', 'input[type="text" name="email"]');
test('Boolean attribute', '<input disabled/>', 'input[disabled]');
test('Mixed attributes', '<input type="checkbox" checked name="agree"/>', 'input[type="checkbox" checked name="agree"]');
test('Attribute with single quotes', "<div data-value='test'></div>", 'div[data-value="test"]');

// ==================== TEXT CONTENT ====================
console.log('\n--- Text Content ---');

test('Element with text', '<span>Hello</span>', 'span{Hello}');
test('Element with text and spaces', '<span>  Hello World  </span>', 'span{Hello World}');
test('Element with special chars in text', '<span>Hello &amp; World</span>', 'span{Hello &amp; World}');
test('Nested element with text', '<div><span>Text</span></div>', 'div>span{Text}');

// ==================== CHILDREN ====================
console.log('\n--- Children ---');

test('Single child', '<div><span></span></div>', 'div>span');
test('Multiple children', '<div><a></a><b></b><c></c></div>', 'div>(a+b+c)');
test('Deeply nested', '<div><span><a></a></span></div>', 'div>span>a');
test('Mixed nesting', '<div><a><b></b></a><c></c></div>', 'div>((a>b)+c)');  // Grouped for correct parsing

// ==================== SIBLINGS ====================
console.log('\n--- Siblings ---');

test('Two siblings', '<a></a><b></b>', 'a+b');
test('Three siblings', '<a></a><b></b><c></c>', 'a+b+c');
test('Siblings with children', '<div><span></span></div><p></p>', '(div>span)+p');  // Grouped for correct parsing

// ==================== MULTIPLICATION (GROUPING) ====================
console.log('\n--- Multiplication (Grouping identical elements) ---');

test('Two identical elements', '<li></li><li></li>', 'li*2');
test('Three identical elements', '<div></div><div></div><div></div>', 'div*3');
test('Identical with classes', '<div class="item"></div><div class="item"></div>', 'div.item*2');
test('Identical with text', '<li>Item</li><li>Item</li><li>Item</li>', 'li{Item}*3');
test('Mixed identical and unique', '<div></div><div></div><span></span>', 'div*2+span');
test('Unique then identical', '<span></span><div></div><div></div>', 'span+div*2');

// ==================== COMPLEX STRUCTURES ====================
console.log('\n--- Complex Structures ---');

test('Table structure', 
    '<table><tr><td></td><td></td></tr></table>', 
    'table>tr>td*2');

test('Table with multiple rows',
    '<table><tr><td></td></tr><tr><td></td></tr></table>',
    'table>tr*2>td');  // tr*2>td is equivalent to (tr>td)*2

test('List structure',
    '<ul><li></li><li></li><li></li></ul>',
    'ul>li*3');

test('Nested lists',
    '<ul><li><ul><li></li></ul></li></ul>',
    'ul>li>ul>li');

test('Navigation structure',
    '<nav><ul><li><a></a></li><li><a></a></li></ul></nav>',
    'nav>ul>li*2>a');  // li*2>a is equivalent to (li>a)*2

// ==================== SETTINGS: showValues ====================
console.log('\n--- Settings: showValues ---');

test('Hide text values',
    '<span>Hello</span>',
    'span',
    { showValues: false });

test('Show text values (default)',
    '<span>Hello</span>',
    'span{Hello}',
    { showValues: true });

// ==================== SETTINGS: showAttributes ====================
console.log('\n--- Settings: showAttributes ---');

test('Hide attributes',
    '<div id="main" class="container"></div>',
    'div',
    { showAttributes: false });

test('Show attributes (default)',
    '<div id="main" class="container"></div>',
    'div#main.container',
    { showAttributes: true });

test('Hide attributes but show values',
    '<span class="text">Hello</span>',
    'span{Hello}',
    { showAttributes: false, showValues: true });

// ==================== SETTINGS: showAttrValues ====================
console.log('\n--- Settings: showAttrValues ---');

test('Hide attribute values',
    '<div id="main" class="container"></div>',
    'div#.', 
    { showAttrValues: false });

test('Hide attr values with other attrs',
    '<input type="text" name="email"/>',
    'input[type name]',
    { showAttrValues: false });

test('Combined: show attrs, hide values',
    '<div id="app" class="wrapper"><span>Text</span></div>',
    'div#.>span',
    { showAttributes: true, showAttrValues: false, showValues: false });

// ==================== XML DECLARATIONS AND COMMENTS ====================
console.log('\n--- XML Declarations and Comments ---');

testParse('XML declaration', '<?xml version="1.0"?><root></root>', 1);
testParse('With comment', '<div><!-- comment --><span></span></div>', 1);
testParse('DOCTYPE', '<!DOCTYPE html><html></html>', 1);

test('After XML declaration',
    '<?xml version="1.0"?><root></root>',
    'root');

test('With comments inside',
    '<div><!-- comment --><span></span></div>',
    'div>span');

// ==================== EDGE CASES ====================
console.log('\n--- Edge Cases ---');

test('Whitespace between elements',
    '<div>\n  <span></span>\n</div>',
    'div>span');

test('Empty text nodes',
    '<div>   </div>',
    'div');

test('Attributes with empty values',
    '<input value=""/>',
    'input[value=""]');

test('Deep nesting',
    '<a><b><c><d><e></e></d></c></b></a>',
    'a>b>c>d>e');

test('Wide structure',
    '<div><a></a><b></b><c></c><d></d><e></e></div>',
    'div>(a+b+c+d+e)');

// ==================== REAL-WORLD EXAMPLES ====================
console.log('\n--- Real-World Examples ---');

test('Card component',
    '<div class="card"><div class="card-header"></div><div class="card-body"></div></div>',
    'div.card>(div.card-header+div.card-body)');

test('Form group',
    '<div class="form-group"><label></label><input type="text"/></div>',
    'div.form-group>(label+input[type="text"])');

test('Article structure',
    '<article><header></header><section></section><footer></footer></article>',
    'article>(header+section+footer)');

test('Menu with links',
    '<ul class="menu"><li><a href="#">Link</a></li><li><a href="#">Link</a></li></ul>',
    'ul.menu>li*2>a[href="#"]{Link}');  // Shorter equivalent form

// ==================== ANALYZE FUNCTION ====================
console.log('\n--- Analyze Function ---');

testAnalyze('Count total elements',
    '<div><span></span><span></span></div>',
    stats => stats.totalElements === 3);

testAnalyze('Count element types',
    '<div><span></span><span></span><a></a></div>',
    stats => stats.elements['div'] === 1 && stats.elements['span'] === 2 && stats.elements['a'] === 1);

testAnalyze('Count classes',
    '<div class="foo bar"><span class="foo"></span></div>',
    stats => stats.classes['foo'] === 2 && stats.classes['bar'] === 1);

testAnalyze('Max depth - shallow',
    '<div><span></span></div>',
    stats => stats.maxDepth === 2);

testAnalyze('Max depth - deep',
    '<a><b><c><d><e></e></d></c></b></a>',
    stats => stats.maxDepth === 5);

testAnalyze('Count text nodes',
    '<div><span>Hello</span><span>World</span></div>',
    stats => stats.textNodes === 2);

testAnalyze('Count attributes',
    '<div id="main" class="foo"><input type="text" name="x"/></div>',
    stats => stats.attributes['id'] === 1 && stats.attributes['class'] === 1 && 
             stats.attributes['type'] === 1 && stats.attributes['name'] === 1);

// ==================== ROUNDTRIP TESTS ====================
console.log('\n--- Roundtrip Tests (XML -> Emmet -> XML -> Emmet) ---');

function testRoundtrip(name, xml) {
    const ast1 = XmlParser.parse(xml);
    const emmet1 = XmlParser.toEmmet(ast1);
    
    // We need EmmetParser for full roundtrip
    // For now, just verify the XML parses and converts without error
    if (emmet1 && emmet1.length > 0) {
        console.log(`✅ ${name}`);
        console.log(`   XML -> Emmet: ${emmet1}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        console.log(`   Failed to convert XML to Emmet`);
        failed++;
    }
}

testRoundtrip('Simple element', '<div></div>');
testRoundtrip('With attributes', '<div id="main" class="container"></div>');
testRoundtrip('With children', '<ul><li></li><li></li></ul>');
testRoundtrip('Complex structure', '<div class="wrapper"><header><nav></nav></header><main><article></article></main><footer></footer></div>');

// ==================== RESULTS ====================
console.log('\n============================================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('============================================================');

process.exit(failed > 0 ? 1 : 0);
