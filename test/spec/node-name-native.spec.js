/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, DOMException, XPathException, documentEvaluate, documentCreateExpression, documentCreateNSResolver, checkNodeResult, checkNodeResultNamespace, parseNamespacesFromAttributes, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('node name for', function() {
    var h;

    before(function() {

        h = {
            filterElementNodes: function(nodes) {
                var elementNodes = [],
                    i;

                for (i = 0; i < nodes.length; i++) {
                    if (nodes[i].nodeType == 1) {
                        elementNodes.push(nodes[i]);
                    }
                }

                return elementNodes;
            }
        };
    });

    it('any attribute', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestAttribute');
        checkNodeResult("attribute::*", node, filterAttributes(node.attributes));
    });

    it('any namespace', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestNamespace'),
            namespaces = [];

        namespaces.push(['', 'http://www.w3.org/1999/xhtml']);
        parseNamespacesFromAttributes(node.attributes, namespaces);
        namespaces.push(['ev', 'http://some-namespace.com/nss']);
        namespaces.push(['xml', 'http://www.w3.org/XML/1998/namespace']);

        checkNodeResultNamespace("namespace::*", node, namespaces);
    });

    it('any child', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestChild');
        checkNodeResult("child::*", node, h.filterElementNodes(node.childNodes));
    });

    it('any ancestor-or-self', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
            attributes = filterAttributes(node.attributes);

        checkNodeResult("ancestor-or-self::*", attributes[0], [
            doc.documentElement,
            doc.querySelector('body'),
            doc.getElementById('StepNodeTestCaseNameTest'),
            doc.getElementById('StepNodeTestCaseNameTestAttribute')
        ]);
    });

    it('any attribute with specific namespace', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
            attributes = filterAttributes(node.attributes),
            i,
            name;

        for (i = attributes.length - 1; i >= 0; i--) {
            name = attributes[i].nodeName.split(':');

            if (name[0] != 'ev') {
                attributes.splice(i, 1);
            }
        }

        expect(attributes).to.have.length(2);

        checkNodeResult("attribute::ev:*", node, attributes, helpers.xhtmlResolver);
    });

    it('any namespace with a specific namespace (?)', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestNamespace');
        checkNodeResultNamespace("namespace::ns2:*", node, [], helpers.xhtmlResolver);
    });

    it('any child with specific namespace', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestChild'),
            nodesFinal = [];

        nodesFinal = [
            node.childNodes[0],
            node.childNodes[1],
            node.childNodes[2]
        ];

        checkNodeResult("child::ns2:*", node, nodesFinal, helpers.xhtmlResolver);
    });

    it('attribute with a specific name and namespace', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
            attributes = filterAttributes(node.attributes),
            i,
            name;

        for (i = attributes.length - 1; i >= 0; i--) {
            name = attributes[i].nodeName.split(':');
            if (name[0] != 'ev' || name[1] != 'attrib2') {
                attributes.splice(i, 1);
            }
        }

        expect(attributes).to.have.length(1);

        checkNodeResult("attribute::ev:attrib2", node, attributes, helpers.xhtmlResolver);
    });

    it('specific namespace with a specific namespace', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestNamespace');
        checkNodeResultNamespace("namespace::ns2:ns2", node, [], helpers.xhtmlResolver);
    });

    it('specific child name with a specific namespace', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestChild'),
            nodesFinal = [];

        nodesFinal = [
            node.childNodes[0],
            node.childNodes[1]
        ];

        checkNodeResult("child::ns2:div", node, nodesFinal, helpers.xhtmlResolver);
    });

    it('attribute with a specific name', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
            attributes = filterAttributes(node.attributes),
            i,
            name;

        for (i = attributes.length - 1; i >= 0; i--) {
            name = attributes[i].nodeName.split(':');

            if (name[0] != 'attrib3') {
                attributes.splice(i, 1);
            }
        }

        expect(attributes).to.have.length(1);

        checkNodeResult("attribute::attrib3", node, attributes, helpers.xhtmlResolver);
    });

    it('namespace with specific name', function() {
        var node = doc.getElementById('StepNodeTestCaseNameTestNamespace');

        checkNodeResultNamespace("namespace::ns2", node, [
            [
                'ns2',
                'http://asdf/'
            ]
        ], helpers.xhtmlResolver);
    });

    it('child with specific (namespaced) name', function() {
        checkNodeResult("child::html", doc, [], helpers.xhtmlResolver);
        checkNodeResult("child::xhtml:html", doc, [doc.documentElement], helpers.xhtmlResolver);
    });

    it('ancestor with specific name and namespace', function() {
        checkNodeResult("ancestor::xhtml:div", doc.getElementById('StepNodeTestCaseNameTest3'), [
            doc.getElementById('StepNodeTestCaseNameTest'),
            doc.getElementById('StepNodeTestCaseNameTest1'),
            doc.getElementById('StepNodeTestCaseNameTest2')
        ], helpers.xhtmlResolver);
    });

    it('ancestor with specific name without a default namespace', function() {
        checkNodeResult("ancestor::div", doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild.firstChild.firstChild, [
            doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild,
            doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild.firstChild
        ], helpers.xhtmlResolver);
    });

});
