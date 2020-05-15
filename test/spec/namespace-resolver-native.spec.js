/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, documentCreateNSResolver, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('namespace resolver', function() {

    it('looks up the namespaceURIElement', function() {
        var node = doc.getElementById("testXPathNSResolverNode");
        var resolver = documentCreateNSResolver(node);

        // check type
        expect(resolver).to.be.an.instanceOf(win.XPathNSResolver);
        expect(resolver.lookupNamespaceURI).to.be.a('function');

        // check preconfigured namespaces
        expect(resolver.lookupNamespaceURI('xml')).to.equal('http://www.w3.org/XML/1998/namespace');
        expect(resolver.lookupNamespaceURI('xmlns')).to.equal('http://www.w3.org/2000/xmlns/');

        // check namespaces on current element
        expect(resolver.lookupNamespaceURI('xforms')).to.equal('http://www.w3.org/2002/xforms');
        expect(resolver.lookupNamespaceURI('nsnotexists')).to.equal(null);

        // check default namespace
        resolver = documentCreateNSResolver(helpers.getNextChildElementNode(node));
        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/TR/REC-html40');
        //Y.Assert.areSame('http://www.w3.org/TR/REC-html40', resolver.lookupNamespaceURI(''));
    });

    it('looks up the namespaceURIDocument', function() {
        var resolver = documentCreateNSResolver(doc);

        expect(resolver).to.be.an.instanceOf(win.XPathNSResolver);

        expect(resolver.lookupNamespaceURI).to.be.a('function');

        expect(resolver.lookupNamespaceURI('ev')).to.equal('http://some-namespace.com/nss');
    });

    it('looks up the namespaceURIDocumentElement', function() {
        var node = doc.documentElement;
        var resolver = documentCreateNSResolver(node);

        expect(resolver).to.be.an.instanceOf(win.XPathNSResolver);
        expect(resolver.lookupNamespaceURI).to.be.a('function');

        expect(resolver.lookupNamespaceURI('ev')).to.equal('http://some-namespace.com/nss');
        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/1999/xhtml');

        // Make sure default xhtml namespace is correct
        node.removeAttribute('xmlns');
        expect(resolver.lookupNamespaceURI('')).to.equal(null);

        // Change default root namespace
        helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'some-namespace');
        expect(resolver.lookupNamespaceURI('')).to.equal('some-namespace');

        // Revert back to default xhtml namespace
        helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/1999/xhtml');
        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/1999/xhtml');
    });

    it('looks up the namespaceURIAttribute', function() {
        var attribute, i, resolver,
            node = doc.documentElement;

        // Check parent nodes for namespace prefix declarations
        for (i = 0; i < node.attributes.length; i++) {
            if (node.attributes[i].specified) {
                attribute = node.attributes[i];
                break;
            }
        }

        expect(attribute).to.be.an('object');

        resolver = documentCreateNSResolver(attribute);
        expect(resolver.lookupNamespaceURI('ev')).to.equal('http://some-namespace.com/nss');

        // Check parent nodes for default namespace declaration
        attribute = null;
        node = doc.getElementById("testXPathNSResolverNode");

        for (i = 0; i < node.attributes.length; i++) {
            if (node.attributes[i].specified) {
                attribute = node.attributes[i];
                break;
            }
        }

        expect(attribute).to.be.an('object');

        resolver = documentCreateNSResolver(attribute);
        expect(resolver.lookupNamespaceURI('xforms')).to.equal('http://www.w3.org/2002/xforms');
    });

    it('looks up namespaceURIs that have changed', function() {
        var node = helpers.getNextChildElementNode(doc.getElementById("testXPathNSResolverNode"));
        var resolver = documentCreateNSResolver(node);

        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/TR/REC-html40');

        // Remove default namespace
        node.removeAttribute('xmlns');
        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/1999/xhtml');

        // Change default namespace to some other namespace
        helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'some-namespace');
        expect(resolver.lookupNamespaceURI('')).to.equal('some-namespace');

        // No default namespace
        helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', '');
        expect(resolver.lookupNamespaceURI('')).to.equal('');

        // Back to original
        helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/TR/REC-html40');
        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/TR/REC-html40');
    });

    it('looks up a hierarchical namespaceURI', function() {
        var node = doc.getElementById("testXPathNSResolverNode");
        var resolver = documentCreateNSResolver(node);

        // check prefix in parents
        expect(resolver.lookupNamespaceURI('ev')).to.equal('http://some-namespace.com/nss');

        // check default prefix in parents
        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/1999/xhtml');

        resolver = documentCreateNSResolver(
            helpers.getNextChildElementNode(helpers.getNextChildElementNode(node))
        );
        expect(resolver.lookupNamespaceURI('')).to.equal('http://www.w3.org/TR/REC-html40');
    });
});
