/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, documentCreateNSResolver, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('and/or operators', function() {

    /**
     * These absent-spacing tests seem weird to me. Am surprised that this works and that this is required to work.
     */
    it('and works without spacing', function() {
        var result = documentEvaluate("1and1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('and works without spacing AFTER and', function() {
        var result = documentEvaluate("1 and1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('and works with linebreak/tab spacing', function() {
        var result = documentEvaluate("1 and\r\n\t1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('and works without spacing BEFORE and', function() {
        var result = documentEvaluate("1and 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('and works with numbers-as-string', function() {
        var result = documentEvaluate("'1'and'1'", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('And (capitalized) fails miserably', function() {
        var test = function() {
            documentEvaluate("1 And 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        };
        // does not throw instance of Error
        expect(test).to.throw();
    });

    it('and without potential spacing issues works', function() {
        [
            ["true() and true()", true],
            ["false() and true()", false],
            ["true() and false()", false],
            ["false() and false()", false],
            ["1 and 1", true],
            ["0 and 1", false],
            ["-1 and 0", false],
            ["0 and 0", false],
            ["1 and -1", true],
            ["1 and (1 div 0)", true],
            ["(-1 div 0) and 1", true],
            ["number('') and 1", false],
            ["number('') and 0", false],
            ["1 and 1 and 0", false],
            ["1 and 1 and true()", true],
            ["false() and 1 and true()", false]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[1]);
        });
    });

    it('and laziness', function() {
        [
            ["false() and $some-made-up-var", false],
            ["false() and $some-made-up-var and true()", false],
            ["true() and false() and $some-made-up-var", false]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[1]);
        });
    });

    it('or works without spacing', function() {
        var result = documentEvaluate("1or1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('or works without spacing AFTER or', function() {
        var result = documentEvaluate("1 or1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('or works with newline/tab spacing', function() {
        var result = documentEvaluate("1 or\r\n\t1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('or works without spacing BEFORE or', function() {
        var result = documentEvaluate("1or 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('or works with numbers-as-string', function() {
        var result = documentEvaluate("'1'or'1'", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        expect(result.booleanValue).to.equal(true);
    });

    it('And (capitalized) fails miserably', function() {
        var test = function() {
            documentEvaluate("1 OR 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
        };
        // does not throw instance of Error
        expect(test).to.throw();
    });

    it('or without potential spacing issues works', function() {
        [
            ["true() or true()", true],
            ["false() or true()", true],
            ["true() or false()", true],
            ["false() or false()", false],
            ["1 or 1", true],
            ["0 or 1", true],
            ["0 or -1", true],
            ["0 or 0", false],
            ["1 or -1", true],
            ["1 or (1 div 0)", true],
            ["(-1 div 0) or 1", true],
            ["number('') or 1", true],
            ["number('') or 0", false],
            ["1 or 1 or 0", true],
            ["1 or 1 or true()", true],
            ["false() or 0 or 0", false]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[1]);
        });
    });

    it('or laziness', function() {
        [
            ["true() or $some-made-up-var", true],
            ["true() or $some-made-up-var and true()", true],
            ["false() or true() or $some-made-up-var", true]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[1]);
        });
    });

    it('or/and precendence rules are applied correctly', function() {
        [
            ["true() or true() and false()", true],
            ["true() and false() or true()", true],
            ["false() and false() or false()", false],
            ["0 or 1 and 0", false],
            ["0 or 1 and 0+1", true]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
            expect(result.booleanValue).to.equal(t[1]);
        });
    });
});
