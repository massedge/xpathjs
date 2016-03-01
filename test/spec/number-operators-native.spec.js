/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, documentCreateNSResolver, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('number operators', function() {

    it('+ works', function() {
        [
            ["1+1", 2],
            ["0+1", 1],
            ["0+0", 0],
            ["0+-0", 0],
            ["-1 + 1", 0],
            ["-1 +-1", -2],
            ["1.05+2.05", 3.0999999999999996],
            [".5   \n +.5+.3", 1.3],
            ["5+4+1+-1+-4", 5],
            ["'1'+'1'", 2],
            [".55+ 0.56", 1.11],
            ["1.0+1.0", 2],
            ["true()+true()", 2],
            ["false()+1", 1],
            ["(1 div 0) + 1", Number.POSITIVE_INFINITY],
            ["(-1 div 0) + 1", Number.NEGATIVE_INFINITY],
            ["1 + (-1 div 0)", Number.NEGATIVE_INFINITY]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });

        [
            ["number('a') + 0"],
            ["0 + number('a')"]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('- without spacing works', function() {
        var result = documentEvaluate("1-1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('- with spacing works', function() {
        var result = documentEvaluate("1 - 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('- with combo with/without spacing 1 works', function() {
        var result = documentEvaluate("1 -1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('- with combo with/without spacing 2 works', function() {
        var result = documentEvaluate("1- 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);

    });

    it('- with string without spacing BEFORE - fails', function() {
        var test = function() {
            documentEvaluate("asdf- asdf", doc, null, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw();
    });

    it('- with string without spacing AFTER - fails ', function() {
        var result = documentEvaluate("asdf -asdf", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.be.a('number');
        expect(result.numberValue).to.deep.equal(NaN);
    });

    it('- with strings', function() {
        var result = documentEvaluate("asdf - asdf", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.be.a('number');
        expect(result.numberValue).to.deep.equal(NaN);
    });

    it('- works as expected', function() {
        [
            ["1-1", 0],
            ["0 -1", -1],
            ["0-0", 0],
            ["0- -0", 0],
            ["-1-1", -2],
            ["-1 --1", 0],
            ["1.05-2.05", -0.9999999999999998],
            [".5-.5-.3", -0.3],
            ["5- 4-1--1--4", 5],
            ["'1'-'1'", 0],
            [".55  - 0.56", -0.010000000000000009],
            ["1.0-1.0", 0],
            ["true()  \n\r\t -true()", 0],
            ["false()-1", -1],
            ["(1 div 0) - 1", Number.POSITIVE_INFINITY],
            ["(-1 div 0) - 1", Number.NEGATIVE_INFINITY]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });

        [
            ["number('a') - 0"],
            ["0 - number('a')"]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('mod without spacing works', function() {
        var result = documentEvaluate("1mod1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('mod without spacing AFTER mod works', function() {
        var result = documentEvaluate("1 mod1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('mod without spacing BEFORE mod works', function() {
        var result = documentEvaluate("1mod 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('mod with numbers-as-string works', function() {
        var result = documentEvaluate("'1'mod'1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('mod without spacing after mod and a string fails', function() {
        var test = function() {
            documentEvaluate("'1' mod/html'", doc, null, win.XPathResult.NUMBER_TYPE, null);
        };
        expect(test).to.throw();
    });

    it('mod without spacing before mod and a string works', function() {
        var result = documentEvaluate("'1'mod '1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(0);
    });

    it('mod works as expected', function() {
        [
            ["5 mod 2", 1],
            ["5 mod -2 ", 1],
            ["-5 mod 2", -1],
            [" -5 mod -2 ", -1],
            ["5 mod 1.5", 0.5],
            ["6.4 mod 2.1", 0.10000000000000009],
            ["5.3 mod 1.1", 0.8999999999999995],
            ["-0.4 mod .2", 0],
            ["1 mod -1", 0],
            ["0 mod 1", 0],
            ["10 mod (1 div 0)", 10],
            ["-10 mod (-1 div 0)", -10]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });

        [
            ["0 mod 0"],
            ["1 mod 0"],
            ["(1 div 0) mod 1"],
            ["(-1 div 0) mod 1"]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('div without spacing', function() {
        var result = documentEvaluate("1div1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(1);
    });

    it('div without spacing AFTER div', function() {
        var result = documentEvaluate("1 div1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(1);
    });

    it('div without spacing BEFORE div', function() {
        var result = documentEvaluate("1div 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(1);
    });

    it('div without spacing and numbers-as-string', function() {
        var result = documentEvaluate("'1'div'1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(1);
    });

    it('div without spacing AFTER div and number-as-string', function() {
        var result = documentEvaluate("'1' div'1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(1);
    });

    it('div without spacing BEFORE div and number-as-string', function() {
        var result = documentEvaluate("'1'div '1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
        expect(result.numberValue).to.equal(1);
    });

    it('div works as expected', function() {
        [
            ["1div 1", 1],
            ["0 div 1", 0],
            ["-1 div 1", -1],
            ["-1 div 1", -1],
            ["1.05 div 2.05", 0.5121951219512195],
            [".5 div .5 div .3", 3.3333333333333335],
            ["5 div 4 div 1 div -1 div -4", 0.3125],
            ["'1' div '1'", 1],
            [".55 div 0.56", 0.9821428571428571],
            ["1.0 div 1.0", 1],
            ["true() div true()", 1],
            ["false() div 1", 0],
            ["1 div 0", Number.POSITIVE_INFINITY],
            ["-1 div 0", Number.NEGATIVE_INFINITY]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });

        [
            ["0 div 0"],
            ["0 div -0"],
            ["number('a') div 0"]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('* works as expected', function() {
        [
            ["1*1", 1],
            ["9 * 2", 18],
            ["9 * -1", -9],
            ["-10 *-11", 110],
            ["-1 * 1", -1],
            ["0*0", 0],
            ["0*1", 0],
            ["-1*0", 0],
            ["-15.*1.5", -22.5],
            ["1.5 * 3", 4.5],
            ["(1 div 0) * 1", Number.POSITIVE_INFINITY],
            ["(-1 div 0) * -1", Number.POSITIVE_INFINITY],
            ["(1 div 0) * -1", Number.NEGATIVE_INFINITY]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });

        [
            ["number('a') * 0"]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.be.a('number');
            expect(result.numberValue).to.deep.equal(NaN);
        });
    });

    it('*,+,-,mod,div precendence rules are applied correctly', function() {
        [
            ["1+2*3", 7],
            ["2*3+1", 7],
            ["1-10 mod 3 div 3", 0.6666666666666667],
            ["4-3*4+5-1", -4],
            ["(4-3)*4+5-1", 8],
            ["8 div 2 + 4", 8]
        ].forEach(function(t) {
            var result = documentEvaluate(t[0], doc, null, win.XPathResult.NUMBER_TYPE, null);
            expect(result.numberValue).to.equal(t[1]);
        });
    });
});
