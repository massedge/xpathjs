/* global define, describe, xdescribe, require, it, xit, before, after, beforeEach, afterEach, expect, Blob, doc, win, docEvaluate, documentEvaluate, documentCreateNSResolver, checkNodeResult, checkNodeResultNamespace, parseNamespacesFromAttributes, window, filterAttributes, loadXMLFile, helpers, XPathJS*/
"use strict";

describe('XPath expression evaluation', function() {

	it('works with different types of context paramaters', function() {
		var result;

		[
			[".", doc, 9], // Document
			[".", doc.documentElement, 1], // Element
			[".", doc.getElementById('testContextNodeParameter'), 1], // Element
			[".", filterAttributes(doc.getElementById('testContextNodeParameter').attributes)[0], 2], // Attribute
			[".", doc.getElementById('testContextNodeParameterText').firstChild, 3], // Text

			// TODO: See for more details http://reference.sitepoint.com/javascript/CDATASection
			// [".", doc.getElementById('testContextNodeParameterCData').firstChild, 4] // CDATASection

			// TODO: See for more details http://reference.sitepoint.com/javascript/ProcessingInstruction
			//[".", doc.getElementById('testContextNodeParameterProcessingInstruction').firstChild, 7], // ProcessingInstruction

			[".", doc.getElementById('testContextNodeParameterComment').firstChild, 8] // Comment
		].forEach(function(t) {
			expect(t[1].nodeType).to.equal(t[2]);
			result = documentEvaluate(t[0], t[1], null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
			expect(result.singleNodeValue).to.equal(t[1]);
		});
	});

	it('works with different context paramater namespaces', function() {
		var result, item;

		// get a namespace node
		result = documentEvaluate("namespace::node()", doc.getElementById('testContextNodeParameterNamespace'), null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
		item = result.singleNodeValue;
		expect(item).to.not.equal(null);
		expect(item.nodeType).to.equal(13);

		// use namespacenode as a context node
		result = documentEvaluate(".", item, null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
		expect(result.singleNodeValue).to.equal(item);
	});


	it('fails if the context is document fragment', function() {
		var test = function() {
			documentEvaluate(".", doc.createDocumentFragment(), null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
		};
		expect(test).to.throw(win.Error);
	});

});
