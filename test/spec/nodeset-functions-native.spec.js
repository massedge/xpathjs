/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('native nodeset functions', function() {

    it('last()', function() {
        [
            ["last()", 1],
            ["xhtml:p[last()]", 4],
            ["xhtml:p[last()-last()+1]", 1]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });
    });

    it('last() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("last(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('position()', function() {
        [
            ["position()", 1],
            ["*[position()=last()]", 4],
            ["*[position()=2]", 2],
            ["xhtml:p[position()=2]", 2]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);

        });

        [
            ["*[position()=-1]", ""]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(t[1]);
        });
    });

    it('position() fails when too many args are provided', function() {
        var test = function() {
            documentEvaluate("position(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('count()', function() {
        [
            ["count(xhtml:p)", 4],
            ["count(p)", 0]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });

        /*
        [
            ["count(.)", doc.getElementsByName('##########'),1]
        ].forEach(function(t){
            var result = documentEvaluate(t[0], t[1], helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[2]);
        });
        */
    });

    it('count() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("count(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('count() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("count()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('count() fails when incorrect argument type is provided', function() {
        var test = function() {
            documentEvaluate("count(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('local-name()', function() {
        var result, input, i, node,
            nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute'),
            nodeAttributes = filterAttributes(nodeWithAttributes.attributes),
            nodeAttributesIndex;

        for (i = 0; i < nodeAttributes.length; i++) {
            if (nodeAttributes[i].nodeName == 'ev:class') {
                nodeAttributesIndex = i;
                break;
            }
        }

        input = [
            ["local-name(/htmlnot)", doc, ""], // empty
            ["local-name()", doc, ""], // document
            ["local-name()", doc.documentElement, "html"], // element
            ["local-name(self::node())", doc.getElementById('testFunctionNodesetElement'), "div"], // element
            ["local-name()", doc.getElementById('testFunctionNodesetElement'), "div"], // element
            ["local-name()", doc.getElementById('testFunctionNodesetElementPrefix').firstChild, "div2"], // element
            ["local-name(node())", doc.getElementById('testFunctionNodesetElementNested'), "span"], // element nested
            ["local-name(self::node())", doc.getElementById('testFunctionNodesetElementNested'), "div"], // element nested
            ["local-name()", doc.getElementById('testFunctionNodesetComment').firstChild, ""], // comment
            ["local-name()", doc.getElementById('testFunctionNodesetText').firstChild, ""], // text
            ["local-name(attribute::node())", nodeWithAttributes, nodeAttributes[0].nodeName], // attribute
            ["local-name(attribute::node()[" + (nodeAttributesIndex + 1) + "])", nodeWithAttributes, 'class'] // attribute
        ];

        // Processing Instruction
        node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
        if (node && node.nodeType == 7) {
            input.push(["local-name()", node, 'xml-stylesheet']);
        }

        // CDATASection
        node = doc.getElementById('testFunctionNodesetCData').firstChild;
        if (node && node.nodeType == 4) {
            input.push(["local-name()", node, '']);
        }

        for (i = 0; i < input.length; i++) {
            result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue.toLowerCase()).to.equal(input[i][2]);
        }
    });

    it('local-name() with namespace', function() {
        var nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute');

        [
            ["local-name(namespace::node())", doc.getElementById('testFunctionNodesetNamespace'), ""],
            ["local-name(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace'), "asdf"]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[1], null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue.toLowerCase()).to.equal(t[2]);
        });
    });

    it('local-name() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("local-name(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('local-name() fails when the wrong type argument is provided', function() {
        var test = function() {
            documentEvaluate("local-name(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('namespace-uri()', function() {
        var result, input, i, node,
            nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute'),
            nodeAttributes = filterAttributes(nodeWithAttributes.attributes),
            nodeAttributesIndex;

        for (i = 0; i < nodeAttributes.length; i++) {
            if (nodeAttributes[i].nodeName == 'ev:class') {
                nodeAttributesIndex = i;
                break;
            }
        }

        input = [
            ["namespace-uri(/htmlnot)", doc, ""], // empty
            ["namespace-uri()", doc, ""], // document
            ["namespace-uri()", doc.documentElement, "http://www.w3.org/1999/xhtml"], // element
            ["namespace-uri(self::node())", doc.getElementById('testFunctionNodesetElement'), "http://www.w3.org/1999/xhtml"], // element
            ["namespace-uri()", doc.getElementById('testFunctionNodesetElement'), "http://www.w3.org/1999/xhtml"], // element
            ["namespace-uri(node())", doc.getElementById('testFunctionNodesetElementNested'), "http://www.w3.org/1999/xhtml"], // element nested
            ["namespace-uri(self::node())", doc.getElementById('testFunctionNodesetElementNested'), "http://www.w3.org/1999/xhtml"], // element nested
            ["namespace-uri()", doc.getElementById('testFunctionNodesetElementPrefix').firstChild, "http://some-namespace.com/nss"], // element
            ["namespace-uri()", doc.getElementById('testFunctionNodesetComment').firstChild, ""], // comment
            ["namespace-uri()", doc.getElementById('testFunctionNodesetText').firstChild, ""], // text
            ["namespace-uri(attribute::node())", nodeWithAttributes, ''], // attribute
            ["namespace-uri(attribute::node()[" + (nodeAttributesIndex + 1) + "])", nodeWithAttributes, 'http://some-namespace.com/nss'], // attribute
            ["namespace-uri(namespace::node())", doc.getElementById('testFunctionNodesetNamespace'), ""], // namespace
            ["namespace-uri(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace'), ""] // namespace
        ];

        // Processing Instruction
        node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
        if (node && node.nodeType == 7) {
            input.push(["namespace-uri()", node, '']);
        }

        // CDATASection
        node = doc.getElementById('testFunctionNodesetCData').firstChild;
        if (node && node.nodeType == 4) {
            input.push(["namespace-uri()", node, '']);
        }

        for (i = 0; i < input.length; i++) {
            result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(input[i][2]);
        }
    });

    it('namespace-uri() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("namespace-uri(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('namespace-uri() fails when wrong type of argument is provided', function() {
        var test = function() {
            documentEvaluate("namespace-uri(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('name()', function() {
        var result, input, i, node,
            nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute'),
            nodeAttributes = filterAttributes(nodeWithAttributes.attributes),
            nodeAttributesIndex;

        for (i = 0; i < nodeAttributes.length; i++) {
            if (nodeAttributes[i].nodeName == 'ev:class') {
                nodeAttributesIndex = i;
                break;
            }
        }

        input = [
            ["name(/htmlnot)", doc, ""], // empty
            ["name()", doc, ""], // document
            ["name()", doc.documentElement, "html"], // element
            ["name(self::node())", doc.getElementById('testFunctionNodesetElement'), "div"], // element
            ["name()", doc.getElementById('testFunctionNodesetElement'), "div"], // element
            ["name(node())", doc.getElementById('testFunctionNodesetElementNested'), "span"], // element nested
            ["name(self::node())", doc.getElementById('testFunctionNodesetElementNested'), "div"], // element nested
            ["name()", doc.getElementById('testFunctionNodesetElementPrefix').firstChild, "ev:div2"], // element
            ["name()", doc.getElementById('testFunctionNodesetComment').firstChild, ""], // comment
            ["name()", doc.getElementById('testFunctionNodesetText').firstChild, ""], // text
            ["name(attribute::node())", nodeWithAttributes, nodeAttributes[0].nodeName], // attribute
            ["name(attribute::node()[" + (nodeAttributesIndex + 1) + "])", nodeWithAttributes, 'ev:class'], // attribute
            ["name(namespace::node())", doc.getElementById('testFunctionNodesetNamespace'), ""], // namespace
            ["name(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace'), "asdf"] // namespace
        ];

        // Processing Instruction
        node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
        if (node && node.nodeType == 7) {
            input.push(["name()", node, 'xml-stylesheet']);
        }

        // CDATASection
        node = doc.getElementById('testFunctionNodesetCData').firstChild;
        if (node && node.nodeType == 4) {
            input.push(["name()", node, '']);
        }

        for (i = 0; i < input.length; i++) {
            result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
            expect(result.stringValue).to.equal(input[i][2]);
        }
    });

    it('name() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("name(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('name() fails when the wrong argument type is provided', function() {
        var test = function() {
            documentEvaluate("name(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });
});
