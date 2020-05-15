/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('native boolean functions', function() {

    it('true()', function() {
        var result = documentEvaluate("true()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('true() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("true(1)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('false()', function() {
        var result = documentEvaluate("false()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);
    });

    it('true() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("false('a')", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('boolean()', function() {
        var result;

        result = documentEvaluate("boolean('a')", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean('')", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);
    });

    it('boolean() conversion of booleans', function() {
        var result;

        result = documentEvaluate("boolean(true())", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean(false())", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);
    });

    it('boolean() conversion of numbers', function() {
        var result;

        result = documentEvaluate("boolean(1)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean(-1)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean(1 div 0)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean(0.1)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean('0.0001')", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean(0)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);

        result = documentEvaluate("boolean(0.0)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);

        result = documentEvaluate("boolean(number(''))", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);
    });

    it('boolean() conversion of nodeset', function() {
        var result;

        result = documentEvaluate("boolean(/xhtml:html)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean(/asdf)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);

        result = documentEvaluate("boolean(self::node())", doc.getElementById('FunctionBooleanEmptyNode'), helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("boolean(//xhtml:article)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);
    });

    it('boolean() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("boolean()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('boolean() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("boolean(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('not()', function() {
        var result;

        result = documentEvaluate("not(true())", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);

        result = documentEvaluate("not(false())", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);

        result = documentEvaluate("not(1)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(false);
    });

    it('not() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("not()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('not() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("not(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('lang()', function() {
        [
            ["lang('en')", doc.documentElement, true],
            ["lang('EN')", doc.documentElement, true],
            ["lang('EN-us')", doc.documentElement, true],
            ["lang('EN-us-boont')", doc.documentElement, false], //
            // hierarchy check
            ["lang('EN')", doc.querySelector('body'), true],
            ["lang('sr')", doc.getElementById('testLang2'), true],
            ["lang('sr-Cyrl-bg')", doc.getElementById('testLang2'), true],
            ["lang('fr')", doc.getElementById('testLang2'), false], //
            // node check
            ["lang('sl')", doc.getElementById('testLang3'), true], //
            // attribute node check
            ["lang('sr-Cyrl-bg')", filterAttributes(doc.getElementById('testLang4').attributes)[0], true]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[1], helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[2]);
        });
    });

    it('lang() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("lang()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('lang() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("lang(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });
});
