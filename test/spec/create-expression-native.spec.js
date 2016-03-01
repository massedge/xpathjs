/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, DOMException, XPathException, documentEvaluate, documentCreateExpression, documentCreateNSResolver, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('creating expressions', function() {

    it('parses', function() {
        var resolver = documentCreateNSResolver(doc.documentElement);
        var expression = documentCreateExpression('1', resolver);

        expect(expression).to.be.an.instanceOf(win.XPathExpression);
    });

    it('throws invalid expression exceptions', function() {
        var resolver = documentCreateNSResolver(doc.documentElement);
        var test = function() {
            documentCreateExpression('aa&&aa', resolver);
        };

        expect(test).to.throw(win.XPathException.INVALID_EXPRESSION_ERR); //,/DOM XPath Exception 51/);
    });

    it('throws exception when parsing without a resolver', function() {
        var test = function() {
            documentCreateExpression('xml:node');
        };

        expect(test).to.throw(win.XPathException.NAMESPACE_ERR);
    });

    it('parses with a namespace', function() {
        var test = function() {
            var resolver = documentCreateNSResolver(doc.documentElement);
            var expression = documentCreateExpression('node1 | xml:node2 | ev:node2', resolver);
        };

        expect(test).not.to.throw();
    });

    it('throws an exception if namespace is incorrect', function() {
        var resolver = documentCreateNSResolver(doc.documentElement);
        var test = function() {
            documentCreateExpression('as:node1 | ev:node2', resolver);
        };

        expect(test).to.throw(win.DOMException.NAMESPACE_ERR); //,/DOM Exception 14/);
    });
});
