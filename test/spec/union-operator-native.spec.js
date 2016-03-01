/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, DOMException, XPathException, documentEvaluate, documentCreateExpression, documentCreateNSResolver, snapshotToArray, checkNodeResult, checkNodeResultNamespace, parseNamespacesFromAttributes, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('Union operator', function() {

    it('combines elements', function() {
        checkNodeResult("id('eee40') | id('eee20') | id('eee25') | id('eee10') | id('eee30') | id('eee50')", doc, [
            doc.getElementById('eee10'),
            doc.getElementById('eee20'),
            doc.getElementById('eee25'),
            doc.getElementById('eee30'),
            doc.getElementById('eee40'),
            doc.getElementById('eee50')
        ]);
    });

    it('combines elements and attributes', function() {
        checkNodeResult("id('eee40')/attribute::*[1] | id('eee30')", doc, [
            doc.getElementById('eee30'),
            filterAttributes(doc.getElementById('eee40').attributes)[0]
        ]);
    });

    it('combines elements and attributes if they refer to the same element', function() {
        checkNodeResult("id('eee40')/attribute::*[1] | id('eee40')", doc, [
            doc.getElementById('eee40'),
            filterAttributes(doc.getElementById('eee40').attributes)[0]
        ]);
    });

    it('combines elements and attributs if they refer to different trees', function() {
        checkNodeResult("id('eee40')/attribute::*[1] | id('eee20')", doc, [
            doc.getElementById('eee20'),
            filterAttributes(doc.getElementById('eee40').attributes)[0]
        ]);
    });

    it('combines elements and attributes if the attribute is on a parent element in the same tree', function() {
        checkNodeResult("id('eee40') | id('eee30')/attribute::*[1]", doc, [
            filterAttributes(doc.getElementById('eee30').attributes)[0],
            doc.getElementById('eee40')
        ]);
    });

    it('combines elements and attributes if both are (on) elements under the same parent', function() {
        checkNodeResult("id('eee40') | id('eee35')/attribute::*[1]", doc, [
            filterAttributes(doc.getElementById('eee35').attributes)[0],
            doc.getElementById('eee40')
        ]);
    });

    it('combines attributes that live on different elements', function() {
        checkNodeResult("id('eee35')/attribute::*[1] | id('eee40')/attribute::*[1]", doc, [
            filterAttributes(doc.getElementById('eee35').attributes)[0],
            filterAttributes(doc.getElementById('eee40').attributes)[0]
        ]);
    });

    it('combines attributes that live on descendent elements', function() {
        checkNodeResult("id('eee30')/attribute::*[1] | id('eee40')/attribute::*[1]", doc, [
            filterAttributes(doc.getElementById('eee30').attributes)[0],
            filterAttributes(doc.getElementById('eee40').attributes)[0]
        ]);
    });

    it('combines attributes that live on descendent element (reversed)', function() {
        checkNodeResult("id('eee40')/attribute::*[1] | id('eee30')/attribute::*[1]", doc, [
            filterAttributes(doc.getElementById('eee30').attributes)[0],
            filterAttributes(doc.getElementById('eee40').attributes)[0]
        ]);
    });

    it('combines different attributes on the same element', function() {
        checkNodeResult("id('eee40')/attribute::*[2] | id('eee40')/attribute::*[1]", doc, [
            filterAttributes(doc.getElementById('eee40').attributes)[0],
            filterAttributes(doc.getElementById('eee40').attributes)[1]
        ]);
    });

    it('combines a namespace and attribute on the same element', function() {
        var result = documentEvaluate("id('nss25')/namespace::*", doc, null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        checkNodeResult("id('nss25')/namespace::* | id('nss25')/attribute::*", doc,
            snapshotToArray(result).concat(
                filterAttributes(doc.getElementById('nss25').attributes)
            )
        );
    });

    it('combines two namespaces on the same element', function() {
        var result = documentEvaluate("id('nss40')/namespace::*", doc, null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); //

        checkNodeResult("id('nss40')/namespace::* | id('nss40')/namespace::*", doc,
            snapshotToArray(result)
        );
    });

    it('combines a namespace and attribute', function() {
        var result = documentEvaluate("id('nss40')/namespace::*", doc, null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); //

        checkNodeResult("id('nss40')/namespace::* | id('nss25')/attribute::* | id('nss25')", doc, [
            doc.getElementById('nss25')
        ].concat(
            filterAttributes(doc.getElementById('nss25').attributes)
        ).concat(
            snapshotToArray(result)
        ));
    });

});
