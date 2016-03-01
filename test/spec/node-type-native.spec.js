/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, DOMException, XPathException, documentEvaluate, documentCreateExpression, documentCreateNSResolver, checkNodeResult, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('node-type', function() {

    it('"node" is supported', function() {
        var node = doc.getElementById('StepNodeTestNodeTypeCase');
        checkNodeResult("child::node()", node, node.childNodes);
    });

    it('"text" is supported', function() {
        var node = doc.getElementById('StepNodeTestNodeTypeCase'),
            nodes = [],
            i;

        for (i = 0; i < node.childNodes.length; i++) {
            switch (node.childNodes[i].nodeType) {
                case 3: // text
                case 4: // cdata
                    nodes.push(node.childNodes[i]);
                    break;
            }
        }

        checkNodeResult("child::text()", node, nodes);
    });

    it('"comment" is supported', function() {
        var node = doc.getElementById('StepNodeTestNodeTypeCase'),
            nodes = [],
            i;

        for (i = 0; i < node.childNodes.length; i++) {
            switch (node.childNodes[i].nodeType) {
                case 8: // comment
                    nodes.push(node.childNodes[i]);
                    break;
            }
        }

        checkNodeResult("child::comment()", node, nodes);
    });

    it('"processing-instruction any" is supported', function() {
        var node = doc.getElementById('StepNodeTestNodeTypeCase'),
            nodes = [],
            i;

        for (i = 0; i < node.childNodes.length; i++) {
            switch (node.childNodes[i].nodeType) {
                case 7: // processing instruction
                    nodes.push(node.childNodes[i]);
                    break;
            }
        }

        checkNodeResult("child::processing-instruction()", node, nodes);
    });

    it('"processing-instruction specific" is supported', function() {
        var node = doc.getElementById('StepNodeTestNodeTypeCase'),
            nodes = [],
            i;

        for (i = 0; i < node.childNodes.length; i++) {
            switch (node.childNodes[i].nodeType) {
                case 7: // processing instruction
                    if (node.childNodes[i].nodeName == 'custom-process-instruct') {
                        nodes.push(node.childNodes[i]);
                    }
                    break;
            }
        }

        checkNodeResult("child::processing-instruction('custom-process-instruct')", node, nodes);
    });

});
