/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('xpath exceptions', function() {

    it('Exception constants have expected values', function() {
        expect(win.XPathException.INVALID_EXPRESSION_ERR).to.equal(51);
        expect(win.XPathException.TYPE_ERR).to.equal(52);
    });

    it('Constructor is constructing nicely with a message', function() {
        var message = 'here is the message';
        var ex = new win.XPathException(win.XPathException.INVALID_EXPRESSION_ERR, message);

        // check code
        expect(ex.code).to.equal(win.XPathException.INVALID_EXPRESSION_ERR);
        expect(ex.code).to.equal(51);

        // check message
        expect(ex.message).to.equal(message);

        // check toString
        expect(ex.toString).to.be.an.instanceOf(win.Function);
        expect(ex.toString()).to.equal('XPathException: "' + ex.message + '", code: "' + ex.code + '", name: "INVALID_EXPRESSION_ERR"');
    });

    it('Constructor is constructing nicely without a message', function() {
        var ex = new win.XPathException(win.XPathException.INVALID_EXPRESSION_ERR);
        expect(ex.message).to.equal("");
    });

    it('Constructor throws exception when wrong arguments provided', function() {
        var test = function() {
            new win.XPathException(99, 'message goes here');
        };
        expect(test).to.throw(win.Error, /Unsupported XPathException code: 99/);
    });

});
