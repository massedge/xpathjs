/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, documentEvaluate, window, document, loadXMLFile, helpers, XPathJS*/
"use strict";

var doc, win, docEvaluate;

before(function(done) {
    console.log('running before');

    var iframe = document.createElement('iframe');
    iframe.setAttribute('id', 'testdoc');
    iframe.setAttribute('src', '/base/test/doc.xml');

    iframe.onload = function() {
        var script = document.createElement('script');
        // TODO: should load parser and engine separately to facilitate development
        script.setAttribute('src', '/base/dist/xpathjs.js');

        script.onload = function() {
            win = iframe.contentWindow;
            doc = win.document;
            win.XPathJS.bindDomLevel3XPath();
            docEvaluate = doc.evaluate;
            done();
        };

        iframe.contentWindow.document.querySelector('body').appendChild(script);
    };
    document.body.appendChild(iframe);

    /*
    loadXMLFile('/base/test/doc.xml', function(xmlStr) {
        var parser = new window.DOMParser();
        win = window;
        win.XPathJS.bindDomLevel3XPath();
        doc = parser.parseFromString(xmlStr, "text/xml");
        docEvaluate = win.document.evaluate;
        done();
    });*/

});
