/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('native number functions', function() {


    describe('number() conversion of convertible numbers, strings, booleans', function() {
        var test = function(t) {
            it('works for ' + t[0], function() {
                var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
                expect(result.numberValue).to.equal(t[1]);
            });
        };

        // of numbers
        [
            ['number(-1.0)', -1],
            ['number(1)', 1],
            ['number(0.199999)', 0.199999],
            ['number(-0.199999)', -0.199999],
            ['number(- 0.199999)', -0.199999],
            ['number(0.0)', 0],
            ['number(.0)', 0],
            ['number(0.)', 0]
        ].forEach(test);

        // of booleans
        [
            ['number(true())', 1],
            ['number(false())', 0]
        ].forEach(test);

        // of strings
        [
            ["number('-1.0')", -1],
            ["number('1')", 1],
            ["number('0.199999')", 0.199999],
            ["number('-0.9991')", -0.9991],
            ["number('0.0')", 0],
            ["number('.0')", 0],
            ["number('.112')", 0.112],
            ["number('0.')", 0],
            ["number('  1.1')", 1.1],
            ["number('1.1   ')", 1.1],
            ["number('1.1   \n ')", 1.1],
            ["number('  1.1 \n\r\n  ')", 1.1]
        ].forEach(test);
    });

    it('number() conversions returns NaN if not convertible', function() {
        [
            ["number('asdf')", NaN],
            ["number('1asdf')", NaN],
            ["number('1.1sd')", NaN],
            ["number('.1sd')", NaN],
            ["number(' . ')", NaN]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('number() conversion of nodesets', function() {
        [
            ["number(self::node())", doc.getElementById('FunctionNumberCaseNumber'), 123],
            ["number(*)", doc.getElementById('FunctionNumberCaseNumberMultiple'), -10],
            ["number()", doc.getElementById('FunctionNumberCaseNumber'), 123]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[1], null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[2]);
        });

        [
            ["number()", doc.getElementById('FunctionNumberCaseNotNumber')]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[1], null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('number() conversion fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("number(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('sum()', function() {
        [
            ["sum(self::*)", doc.getElementById('FunctionNumberCaseNumber'), 123],
            ["sum(*)", doc.getElementById('FunctionNumberCaseNumberMultiple'), 100]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[1], null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[2]);
        });

        [
            ["sum(node())", doc.getElementById('FunctionNumberCaseNotNumberMultiple')],
            ["sum(*)", doc.getElementById('FunctionSumCaseJavarosa')]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], t[1], null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('sum() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("sum(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('sum() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("sum()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('floor()', function() {
        [
            ["floor(-1.55)", -2],
            ["floor(2.44)", 2],
            ["floor(0.001)", 0],
            ["floor(1.5)", 1],
            ["floor(5)", 5],
            ["floor(1.00)", 1],
            ["floor(-1.05)", -2]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });
    });

    it('floor() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("floor(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('floor failes when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("floor()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('ceiling()', function() {
        [
            ["ceiling(-1.55)", -1],
            ["ceiling(2.44)", 3],
            ["ceiling(0.001)", 1],
            ["ceiling(1.5)", 2],
            ["ceiling(5)", 5],
            ["ceiling(1.00)", 1],
            ["ceiling(-1.05)", -1]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });
    });

    it('ceiling() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("ceiling(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('ceiling() fails when not enough arguments are provided', function() {
        var test = function() {
            documentEvaluate("ceiling()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('round()', function() {
        [
            ["round(-1.55)", -2],
            ["round(2.44)", 2],
            ["round(0.001)", 0],
            ["round(1.5)", 2],
            ["round(5)", 5],
            ["round(1.00)", 1],
            ["round(-1.05)", -1]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });
    });

    // behaviour changed in OpenRosa
    xit('round() fails when too many arguments are provided', function() {
        var test = function() {
            documentEvaluate("round(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

    it('round() fails when too few arguments are provided', function() {
        var test = function() {
            documentEvaluate("round()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw(win.Error);
    });

});
