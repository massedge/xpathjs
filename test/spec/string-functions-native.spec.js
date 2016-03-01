/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('native string functions', function() {

    describe('string() conversion of strings, numbers, booleans', function() {
        var test = function(t) {
            it('works for ' + t[0], function() {
                var result = documentEvaluate(t[0], doc, null, win.XPathResult.STRING_TYPE, null);
                expect(result.stringValue).to.equal(t[1]);
            });
        };

        // of strings
        [
            ["string('-1.0')", "-1.0"],
            ["string('1')", "1"],
            ["string('  \nhello \n\r')", "  \nhello \n\r"],
            ["string('')", ""],
            ["string('As Df')", "As Df"]
        ].forEach(test);

        // of numbers
        [
            ["string(number('-1.0a'))", "NaN"],
            ["string(0)", "0"],
            ["string(-0)", "0"],
            ["string(1 div 0)", "Infinity"],
            ["string(-1 div 0)", "-Infinity"],
            ["string(-123)", "-123"],
            ["string(123)", "123"],
            ["string(123.)", "123"],
            ["string(123.0)", "123"],
            ["string(.123)", "0.123"],
            ["string(-0.1000)", "-0.1"],
            ["string(1.1)", "1.1"],
            ["string(-1.1)", "-1.1"]
        ].forEach(test);

        // of booleans
        [
            ["string(true())", "true"],
            ["string(false())", "false"]
        ].forEach(test);
    });


    it('string() conversion of nodesets', function() {
        var result, input, i, node,
            nodeWithAttributes = doc.getElementById('FunctionStringCaseStringNodesetAttribute');

        input = [
            ["string(/htmlnot)", doc, ""], // empty
            ["string(self::node())", doc.getElementById('FunctionStringCaseStringNodesetElement'), "aaa"], // element
            ["string()", doc.getElementById('FunctionStringCaseStringNodesetElement'), "aaa"], // element
            ["string(node())", doc.getElementById('FunctionStringCaseStringNodesetElementNested'), "bbb"], // element nested
            ["string(self::node())", doc.getElementById('FunctionStringCaseStringNodesetElementNested'), "bbbssscccddd"], // element nested
            ["string()", doc.getElementById('FunctionStringCaseStringNodesetElementNested'), "bbbssscccddd"], // element nested
            ["string()", doc.getElementById('FunctionStringCaseStringNodesetComment').firstChild, " hello world "], // comment
            ["string()", doc.getElementById('FunctionStringCaseStringNodesetText').firstChild, "here is some text"], // text
            ["string(attribute::node()[1])", nodeWithAttributes, filterAttributes(nodeWithAttributes.attributes)[0].nodeValue], // attribute
            ["string(attribute::node()[3])", nodeWithAttributes, filterAttributes(nodeWithAttributes.attributes)[2].nodeValue] // attribute
        ];

        // Processing Instruction
        node = doc.getElementById('FunctionStringCaseStringNodesetProcessingInstruction').firstChild;
        if (node && node.nodeType == 7) {
            input.push(["string()", node, 'type="text/xml" href="test.xsl"']);
        }
        // CDATASection
        node = doc.getElementById('FunctionStringCaseStringNodesetCData').firstChild;
        if (node && node.nodeType == 4) {
            input.push(["string()", node, 'some cdata']);
        }

        for (i = 0; i < input.length; i++) {
            result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(input[i][2]);
        }
    });

    it('string conversion of nodeset with namepace', function() {
        var result = documentEvaluate("string(namespace::node())", doc.getElementById('FunctionStringCaseStringNodesetNamespace'), null, win.XPathResult.STRING_TYPE, null);
        expect(result.stringValue).to.equal("http://www.w3.org/1999/xhtml");
    });

    it('string conversion fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("string(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('concat()', function() {
        [
            ["concat(0, 0)", "00"],
            ["concat('', '', 'b')", "b"],
            ["concat('a', '', 'c')", "ac"],
            ["concat('a', 'b', 'c', 'd', 'e')", "abcde"]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(t[1]);
        });
    });

    //in javarosa this needs to return ''
    xit('concat() fails when not enough arguments provided', function() {
        var test = function() {
            documentEvaluate("concat()", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);

        test = function() {
            documentEvaluate("concat(1)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('starts-with', function() {
        [
            ["starts-with('', '')", true],
            ["starts-with('a', '')", true],
            ["starts-with('a', 'a')", true],
            ["starts-with('a', 'b')", false],
            ["starts-with('ba', 'b')", true],
            ["starts-with('', 'b')", false]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[1]);
        });
    });

    it('starts-with() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("starts-with(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('start-with() fails when not enough arguments are provided', function() {
        var test = function() {
            documentEvaluate("starts-with()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);

        test = function() {
            documentEvaluate("starts-with(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('contains()', function() {
        [
            ["contains('', '')", true],
            ["contains('', 'a')", false],
            ["contains('a', 'a')", true],
            ["contains('a', '')", true],
            ["contains('asdf', 'sd')", true],
            ["contains('asdf', 'af')", false]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[1]);
        });
    });

    it('contains() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("contains(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('contains() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("contains()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);

        test = function() {
            documentEvaluate("contains(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('substring-before()', function() {
        [
            ["substring-before('', '')", ''],
            ["substring-before('', 'a')", ''],
            ["substring-before('a', '')", ''],
            ["substring-before('a', 'a')", ''],
            ["substring-before('ab', 'a')", ''],
            ["substring-before('ab', 'b')", 'a'],
            ["substring-before('abb', 'b')", 'a'],
            ["substring-before('ab', 'c')", '']
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(t[1]);
        });
    });

    it('substring-before() fails with too many arguments', function() {
        var test = function() {
            documentEvaluate("substring-before(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('substring-before() with too few arguments', function() {
        var test = function() {
            documentEvaluate("substring-before()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
        test = function() {
            documentEvaluate("substring-before(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('substring-after()', function() {
        [
            ["substring-after('', '')", ''],
            ["substring-after('', 'a')", ''],
            ["substring-after('a', '')", 'a'],
            ["substring-after('a', 'a')", ''],
            ["substring-after('ab', 'a')", 'b'],
            ["substring-after('aab', 'a')", 'ab'],
            ["substring-after('ab', 'b')", ''],
            ["substring-after('ab', 'c')", '']
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(t[1]);
        });
    });

    it('substring-after() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("substring-after(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('substring-after() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("substring-after()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);

        test = function() {
            documentEvaluate("substring-after(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('substring()', function() {
        [
            ["substring('12345', 2, 3)", '234'],
            ["substring('12345', 2)", '2345'],
            ["substring('12345', -1)", '12345'],
            ["substring('12345', 1 div 0)", ''],
            ["substring('12345', 0 div 0)", ''],
            ["substring('12345', -1 div 0)", '12345'],
            ["substring('12345', 1.5, 2.6)", '234'],
            ["substring('12345', 1.3, 2.3)", '12'],
            ["substring('12345', 0, 3)", '12'],
            ["substring('12345', 0, -1 div 0)", ''],
            ["substring('12345', 0 div 0, 3)", ''],
            ["substring('12345', 1, 0 div 0)", ''],
            ["substring('12345', -42, 1 div 0)", '12345'],
            ["substring('12345', -1 div 0, 1 div 0)", '']
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(t[1]);
        });
    });

    it('substring() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("substring(1, 2, 3, 4)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('substring() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("substring()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);

        test = function() {
            documentEvaluate("substring(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('string-length()', function() {
        [
            ["string-length('')", 0, doc],
            ["string-length(' ')", 1, doc],
            ["string-length('\r\n')", 2, doc],
            ["string-length('a')", 1, doc],
            ["string-length()", 0, doc.getElementById('FunctionStringCaseStringLength1')],
            ["string-length()", 4, doc.getElementById('FunctionStringCaseStringLength2')]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[2], null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });
    });

    it('string-length() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("string-length(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('normalize-space', function() {
        [
            ["normalize-space('')", '', doc],
            ["normalize-space('    ')", '', doc],
            ["normalize-space('  a')", 'a', doc],
            ["normalize-space('  a  ')", 'a', doc],
            ["normalize-space('  a b  ')", 'a b', doc],
            ["normalize-space('  a  b  ')", 'a b', doc],
            ["normalize-space(' \r\n\t')", '', doc],
            ["normalize-space(' \f\v ')", '\f\v', doc],
            ["normalize-space('\na  \f \r\v  b\r\n  ')", 'a \f \v b', doc],
            ["normalize-space()", '', doc.getElementById('FunctionStringCaseStringNormalizeSpace1')],
            ["normalize-space()", '', doc.getElementById('FunctionStringCaseStringNormalizeSpace2')],
            ["normalize-space()", 'a b', doc.getElementById('FunctionStringCaseStringNormalizeSpace3')],
            ["normalize-space()", 'a bc c', doc.getElementById('FunctionStringCaseStringNormalizeSpace4')]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[2], null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(t[1]);
        });
    });

    it('normalize-space() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("normalize-space(1,2)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('translate()', function() {
        [
            ["translate('', '', '')", ''],
            ["translate('a', '', '')", 'a'],
            ["translate('a', 'a', '')", ''],
            ["translate('a', 'b', '')", 'a'],
            ["translate('ab', 'a', 'A')", 'Ab'],
            ["translate('ab', 'a', 'AB')", 'Ab'],
            ["translate('aabb', 'ab', 'ba')", 'bbaa'],
            ["translate('aa', 'aa', 'bc')", 'bb']
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(t[1]);
        });
    });

    it('translate() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("translate(1, 2, 3, 4)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('translate() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("translate()", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);

        test = function() {
            documentEvaluate("translate(1)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);

        test = function() {
            documentEvaluate("translate(1,2)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });
});
