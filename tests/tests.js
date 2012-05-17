/**
 * Copyright (C) 2011 Andrej Pavlovic
 *
 * This file is part of XPathJS.
 *
 * XPathJS is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * XPathJS is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

YUI.add('xpathjs-test', function (Y) {
	
	Y.namespace("XPathJS.Test");
	
	Y.XPathJS.Test.generateTestSuite = function(win, doc, docEvaluate)
	{
		var tests = {},
			helpers = {
			getNextChildElementNode: function(parentNode)
			{
				var childNode = parentNode.firstChild;
				while(childNode.nodeName == '#text')
				{
					childNode = childNode.nextSibling;
				}
				return childNode;
			},
			
			setAttribute: function(node, namespace, name, value)
			{
				if (node.setAttributeNS)
				{
					// for XML documents
					node.setAttributeNS(namespace, name, value);
				}
				else
				{
					// normal HTML documents
					node.setAttribute(name, value);
				}
			},
			
			xhtmlResolver: {
				lookupNamespaceURI: function(prefix) {
					var namespaces = {
						'xhtml': 'http://www.w3.org/1999/xhtml',
						'ns2' : 'http://asdf/'
					}
					
					if (namespaces[prefix])
					{
						return namespaces[prefix];
					}
					
					var resolver = documentCreateNSResolver(doc.documentElement);
					return resolver.lookupNamespaceURI(prefix);  
				}
			},
			
			getComparableNode: function(node)
			{
				switch(node.nodeType)
				{
					case 2: // attribute
					case 13: // namespace
						// TODO: IE support
						//return node.ownerElement;
						throw new Error('Internal Error: getComparableNode - Node type not implemented: ' + node.nodeType);
						break;
						
					case 3: // text
					case 4: // CDATASection
					case 7: // processing instruction
					case 8: // comment
						return node.parentNode;
						break;
					
					case 1: // element
					case 9: // document
						// leave as is
						return node;
						break;
					
					default:
						throw new Error('Internal Error: getComparableNode - Node type not supported: ' + node.nodeType);
						break;
				}
			},
			
			/**
			 * @see http://ejohn.org/blog/comparing-document-position/
			 */
			comparePosition: function(a, b)
			{
				var a2,
					b2,
					result,
					ancestor,
					i,
					item
				;
				
				// check for native implementation
				if (a.compareDocumentPosition)
				{
					return a.compareDocumentPosition(b);
				}
				
				if (a === b)
				{
					return 0;
				}
				
				a2 = helpers.getComparableNode(a);
				b2 = helpers.getComparableNode(b);
				
				// handle document case
				if (a2.nodeType === 9)
				{
					if (b2.nodeType === 9)
					{
						if (a2 !== b2)
						{
							return 1; // different documents
						}
						else
						{
							result = 0; // same nodes
						}
					}
					else
					{
						if (a2 !== b2.ownerDocument)
						{
							return 1; // different documents
						}
						else
						{
							result = 4 + 16; // a2 before b2, a2 contains b2
						}
					}
				}
				else
				{
					if (b2.nodeType === 9)
					{
						if (b2 !== a2.ownerDocument)
						{
							return 1; // different documents
						}
						else
						{
							result = 2 + 8 // b2 before a2, b2 contains a2
						}
					}
					else
					{
						if (a2.ownerDocument !== b2.ownerDocument)
						{
							return 1; // different documents
						}
						else
						{
							// do a contains comparison for element nodes
							if (!a2.contains || typeof a2.sourceIndex === 'undefined' || !b2.contains || typeof b2.sourceIndex === 'undefined')
							{
								throw new Error('Cannot compare elements. Neither "compareDocumentPosition" nor "contains" available.');
							}
							else
							{
								result = 
									(a2 != b2 && a2.contains(b2) && 16) +
									(a2 != b2 && b2.contains(a2) && 8) +
									(a2.sourceIndex >= 0 && b2.sourceIndex >= 0
										? (a2.sourceIndex < b2.sourceIndex && 4) + (a2.sourceIndex > b2.sourceIndex && 2)
										: 1 ) +
									0 ;
							}
						}
					}
				}
				
				if (a === a2)
				{
					if (b === b2)
					{
						return result;
					}
					else
					{
						// if a contains b2 or a == b2
						if (result === 0 || (result & 16) === 16)
						{
							// return result
							return result;
						}
						// else if b2 contains a
						else if ((result & 8) === 8)
						{
							// find (ancestor-or-self::a) that is direct child of b2
							ancestor = a;
							while (ancestor.parentNode !== b2)
							{
								ancestor = ancestor.parentNode;
							}
							
							// return "a pre b" or "b pre a" depending on which is occurs first in b2.childNodes
							for(i=0; i<b2.childNodes.length; i++)
							{
								item = b2.childNodes.item(i);
								if (item === ancestor)
								{
									return 4;
								}
								else if (item === b)
								{
									return 2;
								}
							}
							
							throw new Error('Internal Error: should not get to here. 1');
						}
						else
						{
							// return result
							return result;
						}
					}
				}
				else
				{
					if (b === b2)
					{
						// if b contains a2 or b == a2
						if (result === 0 || (result & 8) === 8)
						{
							// return result
							return result;
						}
						// else if a2 contains b
						else if ((result & 16) === 16)
						{
							// find (ancestor-or-self::b) that is direct child of a2
							ancestor = b;
							while (ancestor.parentNode !== a2)
							{
								ancestor = ancestor.parentNode;
							}
							
							// return "a pre b" or "b pre a" depending on which is occurs first in a2.childNodes
							for(i=0; i<a2.childNodes.length; i++)
							{
								item = a2.childNodes.item(i);
								if (item === ancestor)
								{
									return 2;
								}
								else if (item === a)
								{
									return 4;
								}
							}
							
							throw new Error('Internal Error: should not get to here. 2');
						}
						else
						{
							// return result
							return result;
						}
					}
					else
					{
						// if a2 contains b2
						if ((result & 16) === 16)
						{
							// return "a pre b" or "b pre a" depending on a or (ancestor-or-self::b2) occurs first in a2.childNodes
							ancestor = b2;
							while (ancestor.parentNode !== a2)
							{
								ancestor = ancestor.parentNode;
							}
							
							for(i=0; i<a2.childNodes.length; i++)
							{
								item = a2.childNodes.item(i);
								if (item === ancestor)
								{
									return 2;
								}
								else if (item === a)
								{
									return 4;
								}
							}
							
							throw new Error('Internal Error: should not get to here. 3');
						}
						// else if b2 contains a2
						if ((result & 8) === 8)
						{
							// return "a pre b" or "b pre a" depending on b or (ancestor-or-self::a2) occurs first in b2.childNodes
							ancestor = a2;
							while (ancestor.parentNode !== b2)
							{
								ancestor = ancestor.parentNode;
							}
							
							for(i=0; i<b2.childNodes.length; i++)
							{
								item = b2.childNodes.item(i);
								if (item === ancestor)
								{
									return 4;
								}
								else if (item === b)
								{
									return 2;
								}
							}
							
							throw new Error('Internal Error: should not get to here. 3');
						}
						// else if a2 === b2
						else if (result === 0)
						{
							// return "a pre b" or "b pre a" depending on a or b occurs first in a2.childNodes
							for(i=0; i<a2.childNodes.length; i++)
							{
								item = a2.childNodes.item(i);
								if (item === b)
								{
									return 2;
								}
								else if (item === a)
								{
									return 4;
								}
							}
							
							throw new Error('Internal Error: should not get to here. 4');
						}	
						// else
						else
						{
							// return result
							return result;
						}
					}
				}
				
				throw new Error('Internal Error: should not get to here. 5');
			},
			
			getAllNodes: function(node)
			{
				var nodes = [],
					i
				;
				
				node = (node || doc);
				
				nodes.push(node);
				
				for (i = 0; i < node.childNodes.length; i++)
				{
					nodes.push.apply(nodes, helpers.getAllNodes(node.childNodes.item(i)));
				}
				
				return nodes;
			}
		},
		documentEvaluate = function(expression, contextNode, resolver, type, result)
		{
			return docEvaluate.call(doc, expression, contextNode, resolver, type, result);
		},
		
		documentCreateExpression = function(expression, resolver)
		{
			return doc.createExpression.call(doc, expression, resolver);
		},
		
		documentCreateNSResolver = function(node)
		{
			return doc.createNSResolver.call(doc, node);
		},
			
		filterAttributes = function(attributes)
		{
			var specifiedAttributes = [],
				i,
				name
			;
			
			for(i=0; i < attributes.length; i++)
			{
				if (!attributes[i].specified)
				{
					// ignore non-specified attributes
					continue;
				}
				
				name = attributes[i].nodeName.split(':');
				
				if (name[0] === 'xmlns')
				{
					// ignore namespaces
					continue;
				}
				
				specifiedAttributes.push(attributes[i]);
			}
			
			return specifiedAttributes;
		},
		
		filterSpecifiedAttributes = function(attributes)
		{
			var specifiedAttributes = [],
				i,
				name
			;
			
			for(i=0; i < attributes.length; i++)
			{
				if (!attributes[i].specified)
				{
					// ignore non-specified attributes
					continue;
				}
				
				specifiedAttributes.push(attributes[i]);
			}
			
			return specifiedAttributes;
		},
		
		checkNodeResultNamespace = function(expression, contextNode, expectedResult, resolver)
		{
			var j, result, item, res;
			
			res = (!resolver) ? null : resolver;
			
			result = documentEvaluate(expression, contextNode, res, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				
			Y.Assert.areSame(expectedResult.length, result.snapshotLength);
			
			for (j = 0; j < result.snapshotLength; j++) {
				item = result.snapshotItem(j);
				Y.Assert.areSame('#namespace', item.nodeName);
				Y.Assert.areSame(expectedResult[j][0], item.localName);
				Y.Assert.areSame(expectedResult[j][1], item.namespaceURI);
			}
		},
		
		checkNodeResult = function(expression, contextNode, expectedResult, resolver)
		{
			var result, j, item, res;
			
			res = (!resolver) ? null : resolver;
			
			result = documentEvaluate(expression, contextNode, res, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			
			Y.Assert.areSame(expectedResult.length, result.snapshotLength);
			
			for (j = 0; j < result.snapshotLength; j++) {
				item = result.snapshotItem(j);
				Y.Assert.areSame(expectedResult[j], item);
			}
		},
		
		parseNamespacesFromAttributes = function(attributes, namespaces)
		{
			var i,
				name
			;
			
			for(i=attributes.length-1; i>=0; i--)
			{
				name = attributes.item(i).nodeName.split(':');
				
				if (name[0] === 'xmlns')
				{
					if (name.length == 1)
					{
						namespaces.unshift([ '', attributes.item(i).nodeValue ]);
					}
					else
					{
						namespaces.push([ name[1], attributes.item(i).nodeValue ]);
					}
				}
			}
		},
		
		snapshotToArray = function(result) {
			var nodes = [], i;
			
			for (i=0; i < result.snapshotLength; i++)
			{
				nodes.push(result.snapshotItem(i));
			}
			
			return nodes;
		}
		;
		
		tests.FunctionStringCase = new Y.Test.Case({
			
			name: "String Function Tests",
			
			_should: {
				error: {
					testStringExceptionTooManyArgs: true,
					testNormalizeSpaceExceptionTooManyArgs: true,
					testConcatExceptionNotEnoughArgs1: true,
					testConcatExceptionNotEnoughArgs2: true,
					testStartsWithTooManyArgs: true,
					testStartsWithNotEnoughArgs1: true,
					testStartsWithNotEnoughArgs2: true,
					testContainsWithTooManyArgs: true,
					testContainsWithNotEnoughArgs1: true,
					testContainsWithNotEnoughArgs2: true,
					testSubstringBeforeWithTooManyArgs: true,
					testSubstringBeforeWithNotEnoughArgs1: true,
					testSubstringBeforeWithNotEnoughArgs2: true,
					testSubstringAfterWithTooManyArgs: true,
					testSubstringAfterWithNotEnoughArgs1: true,
					testSubstringAfterWithNotEnoughArgs2: true,
					testSubstringWithTooManyArgs: true,
					testSubstringWithNotEnoughArgs1: true,
					testSubstringWithNotEnoughArgs2: true,
					testStringLengthWithTooManyArgs: true,
					testNormalizeSpaceExceptionTooManyArgs: true,
					testTranslateExceptionTooManyArgs: true,
					testTranslateExceptionNotEnoughArgs1: true,
					testTranslateExceptionNotEnoughArgs2: true,
					testTranslateExceptionNotEnoughArgs3: true
				},
				ignore: {
				}
			},
			
			testStringString: function() {
				var result, input, i;
				
				input = [
					["string('-1.0')", "-1.0"],
					["string('1')", "1"],
					["string('  \nhello \n\r')", "  \nhello \n\r"],
					["string('')", ""],
					["string('As Df')", "As Df"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue);
				}
			},
			
			testStringNumber: function() {
				var result, input, i;
				
				input = [
					["string(number('-1.0a'))", "NaN"],
					["string(0)", "0"],
					["string(-0)", "0"],
					["string(1 div 0)", "Infinity"],
					["string(-1 div 0)", "-Infinity"],
					["string(-123)", "-123"],
					["string(123)", "123"],
					["string(123.)", "123"],
					["string(123.0)", "123"],
					["string(.123)", "0.123"],
					["string(-0.1000)", "-0.1"],
					["string(1.1)", "1.1"],
					["string(-1.1)", "-1.1"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue);
				}
			},
			
			testStringBoolean: function() {
				var result, input, i;
				
				input = [
					["string(true())", "true"],
					["string(false())", "false"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue);
				}
			},
			
			testStringNodeset: function() {
				var result, input, i,
					nodeWithAttributes = doc.getElementById('FunctionStringCaseStringNodesetAttribute')
				;
				
				input = [
					["string(/htmlnot)", doc, ""], // empty
					["string(self::node())", doc.getElementById('FunctionStringCaseStringNodesetElement'), "aaa"], // element
					["string()", doc.getElementById('FunctionStringCaseStringNodesetElement'), "aaa"], // element
					["string(node())", doc.getElementById('FunctionStringCaseStringNodesetElementNested'), "bbb"], // element nested
					["string(self::node())", doc.getElementById('FunctionStringCaseStringNodesetElementNested'), "bbbssscccddd"], // element nested
					["string()", doc.getElementById('FunctionStringCaseStringNodesetElementNested'), "bbbssscccddd"], // element nested
					["string()", doc.getElementById('FunctionStringCaseStringNodesetComment').firstChild, " hello world "], // comment
					["string()", doc.getElementById('FunctionStringCaseStringNodesetText').firstChild, "here is some text"], // text
					["string(attribute::node()[1])", nodeWithAttributes, filterAttributes(nodeWithAttributes.attributes)[0].nodeValue], // attribute
					["string(attribute::node()[3])", nodeWithAttributes, filterAttributes(nodeWithAttributes.attributes)[2].nodeValue] // attribute
				];
				
				// Processing Instruction
				node = doc.getElementById('FunctionStringCaseStringNodesetProcessingInstruction').firstChild;
				if (node && node.nodeType == 7)
				{
					input.push(["string()", node, 'type="text/xml" href="test.xsl"']);
				}
				
				// CDATASection
				node = doc.getElementById('FunctionStringCaseStringNodesetCData').firstChild
				if (node && node.nodeType == 4)
				{
					input.push(["string()", node, 'some cdata']);
				}
				
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][2], result.stringValue);
				}
			},
			
			testStringNodesetNamespace: function() {
				var result = documentEvaluate("string(namespace::node())", doc.getElementById('FunctionStringCaseStringNodesetNamespace'), null, win.XPathResult.STRING_TYPE, null);
				Y.Assert.areSame("http://www.w3.org/1999/xhtml", result.stringValue);
			},
			
			testStringExceptionTooManyArgs: function() {
				documentEvaluate("string(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			},
			
			testConcat: function() {
				var result, input, i;
				
				input = [
					["concat(0, 0)", "00"],
					["concat('', '', 'b')", "b"],
					["concat('a', '', 'c')", "ac"],
					["concat('a', 'b', 'c', 'd', 'e')", "abcde"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testConcatExceptionNotEnoughArgs1: function() {
				documentEvaluate("concat()", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			},
			
			testConcatExceptionNotEnoughArgs2: function() {
				documentEvaluate("concat(1)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			},
			
			testStartsWith: function() {
				var result, input, i;
				
				input = [
					["starts-with('', '')", true],
					["starts-with('a', '')", true],
					["starts-with('a', 'a')", true],
					["starts-with('a', 'b')", false],
					["starts-with('ba', 'b')", true],
					["starts-with('', 'b')", false]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][1], result.booleanValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testStartsWithTooManyArgs: function() {
				documentEvaluate("starts-with(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testStartsWithNotEnoughArgs1: function() {
				documentEvaluate("starts-with()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testStartsWithNotEnoughArgs2: function() {
				documentEvaluate("starts-with(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testContains: function() {
				var result, input, i;
				
				input = [
					["contains('', '')", true],
					["contains('', 'a')", false],
					["contains('a', 'a')", true],
					["contains('a', '')", true],
					["contains('asdf', 'sd')", true],
					["contains('asdf', 'af')", false]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][1], result.booleanValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testContainsWithTooManyArgs: function() {
				documentEvaluate("contains(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testContainsWithNotEnoughArgs1: function() {
				documentEvaluate("contains()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testContainsWithNotEnoughArgs2: function() {
				documentEvaluate("contains(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringBefore: function() {
				var result, input, i;
				
				input = [
					["substring-before('', '')", ''],
					["substring-before('', 'a')", ''],
					["substring-before('a', '')", ''],
					["substring-before('a', 'a')", ''],
					["substring-before('ab', 'a')", ''],
					["substring-before('ab', 'b')", 'a'],
					["substring-before('abb', 'b')", 'a'],
					["substring-before('ab', 'c')", '']
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testSubstringBeforeWithTooManyArgs: function() {
				documentEvaluate("substring-before(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringBeforeWithNotEnoughArgs1: function() {
				documentEvaluate("substring-before()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringBeforeWithNotEnoughArgs2: function() {
				documentEvaluate("substring-before(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringAfter: function() {
				var result, input, i;
				
				input = [
					["substring-after('', '')", ''],
					["substring-after('', 'a')", ''],
					["substring-after('a', '')", 'a'],
					["substring-after('a', 'a')", ''],
					["substring-after('ab', 'a')", 'b'],
					["substring-after('aab', 'a')", 'ab'],
					["substring-after('ab', 'b')", ''],
					["substring-after('ab', 'c')", '']
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testSubstringAfterWithTooManyArgs: function() {
				documentEvaluate("substring-after(1, 2, 3)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringAfterWithNotEnoughArgs1: function() {
				documentEvaluate("substring-after()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringAfterWithNotEnoughArgs2: function() {
				documentEvaluate("substring-after(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstring: function() {
				var result, input, i;
				
				input = [
					["substring('12345', 2, 3)", '234'],
					["substring('12345', 2)", '2345'],
					["substring('12345', -1)", '12345'],
					["substring('12345', 1 div 0)", ''],
					["substring('12345', 0 div 0)", ''],
					["substring('12345', -1 div 0)", '12345'],
					["substring('12345', 1.5, 2.6)", '234'],
					["substring('12345', 1.3, 2.3)", '12'],
					["substring('12345', 0, 3)", '12'],
					["substring('12345', 0, -1 div 0)", ''],
					["substring('12345', 0 div 0, 3)", ''],
					["substring('12345', 1, 0 div 0)", ''],
					["substring('12345', -42, 1 div 0)", '12345'],
					["substring('12345', -1 div 0, 1 div 0)", '']
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testSubstringWithTooManyArgs: function() {
				documentEvaluate("substring(1, 2, 3, 4)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringWithNotEnoughArgs1: function() {
				documentEvaluate("substring()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSubstringWithNotEnoughArgs2: function() {
				documentEvaluate("substring(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testStringLength: function() {
				var result, input, i;
				
				input = [
					["string-length('')", 0, doc],
					["string-length(' ')", 1, doc],
					["string-length('\r\n')", 2, doc],
					["string-length('a')", 1, doc],
					["string-length()", 0, doc.getElementById('FunctionStringCaseStringLength1')],
					["string-length()", 4, doc.getElementById('FunctionStringCaseStringLength2')]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][2], null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testStringLengthWithTooManyArgs: function() {
				documentEvaluate("string-length(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testNormalizeSpace: function() {
				var result, input, i;
				
				input = [
					["normalize-space('')", '', doc],
					["normalize-space('    ')", '', doc],
					["normalize-space('  a')", 'a', doc],
					["normalize-space('  a  ')", 'a', doc],
					["normalize-space('  a b  ')", 'a b', doc],
					["normalize-space('  a  b  ')", 'a b', doc],
					["normalize-space(' \r\n\t')", '', doc],
					["normalize-space(' \f\v ')", '\f\v', doc],
					["normalize-space('\na  \f \r\v  b\r\n\  ')", 'a \f \v b', doc],
					["normalize-space()", '', doc.getElementById('FunctionStringCaseStringNormalizeSpace1')],
					["normalize-space()", '', doc.getElementById('FunctionStringCaseStringNormalizeSpace2')],
					["normalize-space()", 'a b', doc.getElementById('FunctionStringCaseStringNormalizeSpace3')],
					["normalize-space()", 'a bc c', doc.getElementById('FunctionStringCaseStringNormalizeSpace4')]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][2], null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testNormalizeSpaceExceptionTooManyArgs: function() {
				documentEvaluate("normalize-space(1,2)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			},
			
			testTranslate: function() {
				var result, input, i;
				
				input = [
					["translate('', '', '')", ''],
					["translate('a', '', '')", 'a'],
					["translate('a', 'a', '')", ''],
					["translate('a', 'b', '')", 'a'],
					["translate('ab', 'a', 'A')", 'Ab'],
					["translate('ab', 'a', 'AB')", 'Ab'],
					["translate('aabb', 'ab', 'ba')", 'bbaa'],
					["translate('aa', 'aa', 'bc')", 'bb']
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testTranslateExceptionTooManyArgs: function() {
				documentEvaluate("translate(1, 2, 3, 4)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			},
			
			testTranslateExceptionNotEnoughArgs1: function() {
				documentEvaluate("translate()", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			},
			
			testTranslateExceptionNotEnoughArgs2: function() {
				documentEvaluate("translate(1)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			},
			
			testTranslateExceptionNotEnoughArgs3: function() {
				documentEvaluate("translate(1,2)", doc, helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
			}
		});
		
		tests.FunctionNumberCase = new Y.Test.Case({
			
			name: "Number Function Tests",
			
			_should: {
				error: {
					testNumberExceptionTooManyArgs: true,
					testSumExceptionTooManyArgs: true,
					testSumExceptionNotEnoughArgs: true,
					testFloorExceptionTooManyArgs: true,
					testFloorExceptionNotEnoughArgs: true,
					testCeilingExceptionTooManyArgs: true,
					testCeilingExceptionNotEnoughArgs: true,
					testRoundExceptionTooManyArgs: true,
					testRoundExceptionNotEnoughArgs: true
				},
				ignore: {
				}
			},
			
			testNumberNumber: function() {
				var result;
				
				result = documentEvaluate("number(-1.0)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(-1, result.numberValue);
				
				result = documentEvaluate("number(1)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
				
				result = documentEvaluate("number(0.199999)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0.199999, result.numberValue);
				
				result = documentEvaluate("number(-0.9991)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(-0.9991, result.numberValue);
				
				result = documentEvaluate("number(- 0.9991)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(-0.9991, result.numberValue);
				
				result = documentEvaluate("number(0.0)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
				
				result = documentEvaluate("number(.0)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
				
				result = documentEvaluate("number(0.)", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testNumberBoolean: function() {
				var result;
				
				result = documentEvaluate("number(true())", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
				
				result = documentEvaluate("number(false())", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testNumberString: function() {
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
				
				input = [
					["number('asdf')", Number.NaN],
					["number('1asdf')", Number.NaN],
					["number('1.1sd')", Number.NaN],
					["number('.1sd')", Number.NaN],
					["number(' . ')", Number.NaN]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testNumberNodeset: function() {
				var result, input, i;
				
				input = [
					["number(self::node())", doc.getElementById('FunctionNumberCaseNumber'), 123],
					["number(*)", doc.getElementById('FunctionNumberCaseNumberMultiple'), -10],
					["number()", doc.getElementById('FunctionNumberCaseNumber'), 123]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][2], result.numberValue);
				}
				
				input = [
					["number()", doc.getElementById('FunctionNumberCaseNotNumber')]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testNumberExceptionTooManyArgs: function() {
				documentEvaluate("number(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSum: function() {
				var result, input, i;
				
				input = [
					["sum(self::*)", doc.getElementById('FunctionNumberCaseNumber'), 123],
					["sum(*)", doc.getElementById('FunctionNumberCaseNumberMultiple'), 100]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][2], result.numberValue);
				}
				
				input = [
					["sum(node())", doc.getElementById('FunctionNumberCaseNotNumberMultiple')]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testSumExceptionTooManyArgs: function() {
				documentEvaluate("sum(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testSumExceptionNotEnoughArgs: function() {
				documentEvaluate("sum()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testFloor: function() {
				var result, input, i;
				
				input = [
					["floor(-1.55)", -2],
					["floor(2.44)", 2],
					["floor(0.001)", 0],
					["floor(1.5)", 1],
					["floor(5)", 5],
					["floor(1.00)", 1],
					["floor(-1.05)", -2]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
			},
			
			testFloorExceptionTooManyArgs: function() {
				documentEvaluate("floor(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testFloorExceptionNotEnoughArgs: function() {
				documentEvaluate("floor()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testCeiling: function() {
				var result, input, i;
				
				input = [
					["ceiling(-1.55)", -1],
					["ceiling(2.44)", 3],
					["ceiling(0.001)", 1],
					["ceiling(1.5)", 2],
					["ceiling(5)", 5],
					["ceiling(1.00)", 1],
					["ceiling(-1.05)", -1]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
			},
			
			testCeilingExceptionTooManyArgs: function() {
				documentEvaluate("ceiling(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testCeilingExceptionNotEnoughArgs: function() {
				documentEvaluate("ceiling()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testRound: function() {
				var result, input, i;
				
				input = [
					["round(-1.55)", -2],
					["round(2.44)", 2],
					["round(0.001)", 0],
					["round(1.5)", 2],
					["round(5)", 5],
					["round(1.00)", 1],
					["round(-1.05)", -1]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
			},
			
			testRoundExceptionTooManyArgs: function() {
				documentEvaluate("round(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testRoundExceptionNotEnoughArgs: function() {
				documentEvaluate("round()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			}
		});
		
		tests.FunctionBooleanCase = new Y.Test.Case({
			
			name: "Boolean Function Tests",
			
			_should: {
				error: {
					testTrueExceptionTooManyArgs: true,
					testFalseExceptionTooManyArgs: true,
					testBooleanExceptionNotEnoughArgs: true,
					testBooleanExceptionTooManyArgs: true,
					testNotExceptionNotEnoughArgs: true,
					testNotExceptionTooManyArgs: true,
					testLangExceptionNotEnoughArgs: true,
					testLangExceptionTooManyArgs: true
				},
				ignore: {
				}
			},
			
			testTrue: function() {
				var result;
				
				result = documentEvaluate("true()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testTrueExceptionTooManyArgs: function() {
				documentEvaluate("true(1)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			},
			
			testFalse: function() {
				var result;
				
				result = documentEvaluate("false()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
			},
			
			testFalseExceptionTooManyArgs: function() {
				documentEvaluate("false('a')", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			},
			
			testBooleanString: function() {
				var result;
				
				result = documentEvaluate("boolean('a')", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("boolean('')", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
			},
			
			testBooleanBoolean: function() {
				var result;
				
				result = documentEvaluate("boolean(true())", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("boolean(false())", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
			},
			
			testBooleanNumber: function() {
				var result;
				
				result = documentEvaluate("boolean(1)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("boolean(-1)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("boolean(1 div 0)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("boolean(0.1)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("boolean(0)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
				
				result = documentEvaluate("boolean(0.0)", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
				
				result = documentEvaluate("boolean(number(''))", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
			},
			
			testBooleanNodeset: function() {
				var result;
				
				result = documentEvaluate("boolean(/xhtml:html)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("boolean(/asdf)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
			},
			
			testBooleanExceptionNotEnoughArgs: function() {
				documentEvaluate("boolean()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			},
			
			testBooleanExceptionTooManyArgs: function() {
				documentEvaluate("boolean(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			},
			
			testNot: function() {
				var result;
				
				result = documentEvaluate("not(true())", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
				
				result = documentEvaluate("not(false())", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
				
				result = documentEvaluate("not(1)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(false, result.booleanValue);
			},
			
			testNotExceptionNotEnoughArgs: function() {
				documentEvaluate("not()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			},
			
			testNotExceptionTooManyArgs: function() {
				documentEvaluate("not(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			},
			
			testLang: function() {
				var result, input, i;
				
				input = [
					["lang('en')", doc.documentElement, true],
					["lang('EN')", doc.documentElement, true],
					["lang('EN-us')", doc.documentElement, true],
					["lang('EN-us-boont')", doc.documentElement, false],
					
					// hierarchy check
					["lang('EN')", doc.body, true],
					["lang('sr')", doc.getElementById('testLang2'), true],
					["lang('sr-Cyrl-bg')", doc.getElementById('testLang2'), true],
					["lang('fr')", doc.getElementById('testLang2'), false],
					
					// node check
					["lang('sl')", doc.getElementById('testLang3'), true],
					
					// attribute node check
					["lang('sr-Cyrl-bg')", filterAttributes(doc.getElementById('testLang4').attributes)[0], true]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][2], result.booleanValue, "Values should be the same. " + input[i][0]);
				}
			},
			
			testLangExceptionNotEnoughArgs: function() {
				documentEvaluate("lang()", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			},
			
			testLangExceptionTooManyArgs: function() {
				documentEvaluate("lang(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.BOOLEAN_TYPE, null);
			}
		});
		
		tests.FunctionNodesetCase = new Y.Test.Case({
			
			name : "XPathExpression.Evaluate Tests",
			
			_should: {
				error: {
					testLastExceptionTooManyArgs: true,
					testPositionExceptionTooManyArgs: true,
					testCountExceptionTooManyArgs: true,
					testCountExceptionNotEnoughArgs: true,
					testCountExceptionWrongArgType: true,
					testLocalNameExceptionTooManyArgs: true,
					testLocalNameExceptionWrongArgType: true,
					testNamespaceUriExceptionTooManyArgs: true,
					testNamespaceUriExceptionWrongArgType: true,
					testNameExceptionTooManyArgs: true,
					testNameExceptionWrongArgType: true
				},
				ignore: {
				}
			},
			
			testLast: function() {
				var result, input, i;
				
				input = [
					["last()", 1],
					["xhtml:p[last()]", 4],
					["xhtml:p[last()-last()+1]", 1]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
			},
			
			testLastExceptionTooManyArgs: function() {
				documentEvaluate("last(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testPosition: function() {
				var result, input, i;
				
				input = [
					["position()", 1],
					["*[position()=last()]", 4],
					["*[position()=2]", 2],
					["xhtml:p[position()=2]", 2]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
				
				input = [
					["*[position()=-1]", ""]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][1], result.stringValue);
				}
			},
			
			testPositionExceptionTooManyArgs: function() {
				documentEvaluate("position(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testCount: function() {
				var result, input, i;
				
				input = [
					["count(xhtml:p)", 4],
					["count(p)", 0]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc.getElementById('testFunctionNodeset2'), helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
			},
			
			testCountExceptionTooManyArgs: function() {
				documentEvaluate("count(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testCountExceptionNotEnoughArgs: function() {
				documentEvaluate("count()", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testCountExceptionWrongArgType: function() {
				documentEvaluate("count(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testLocalName: function() {
				var result, input, i, node,
					nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute'),
					nodeAttributes = filterAttributes(nodeWithAttributes.attributes),
					nodeAttributesIndex
				;
				
				for(i = 0; i < nodeAttributes.length; i++)
				{
					if (nodeAttributes[i].nodeName == 'ev:class')
					{
						nodeAttributesIndex = i;
						break;
					}
				}
				
				input = [
					["local-name(/htmlnot)", doc, ""], // empty
					["local-name()", doc, ""], // document
					["local-name()", doc.documentElement, "html"], // element
					["local-name(self::node())", doc.getElementById('testFunctionNodesetElement'), "div"], // element
					["local-name()", doc.getElementById('testFunctionNodesetElement'), "div"], // element
					["local-name()", doc.getElementById('testFunctionNodesetElementPrefix').firstChild, "div2"], // element
					["local-name(node())", doc.getElementById('testFunctionNodesetElementNested'), "span"], // element nested
					["local-name(self::node())", doc.getElementById('testFunctionNodesetElementNested'), "div"], // element nested
					["local-name()", doc.getElementById('testFunctionNodesetComment').firstChild, ""], // comment
					["local-name()", doc.getElementById('testFunctionNodesetText').firstChild, ""], // text
					["local-name(attribute::node())", nodeWithAttributes, nodeAttributes[0].nodeName], // attribute
					["local-name(attribute::node()["+ (nodeAttributesIndex+1) +"])", nodeWithAttributes, 'class'] // attribute
				];
				
				// Processing Instruction
				node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
				if (node && node.nodeType == 7)
				{
					input.push(["local-name()", node, 'xml-stylesheet']);
				}
				
				// CDATASection
				node = doc.getElementById('testFunctionNodesetCData').firstChild
				if (node && node.nodeType == 4)
				{
					input.push(["local-name()", node, '']);
				}
				
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][2], result.stringValue.toLowerCase(), 'Values should be the same. (' + i + ') ' + input[i][0]);
				}
			},
			
			testLocalNameNamespace: function() {
				var result, input, i,
					nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute')
				;
				
				input = [
					["local-name(namespace::node())", doc.getElementById('testFunctionNodesetNamespace'), ""],
					["local-name(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace'), "asdf"]
				];
				
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][2], result.stringValue.toLowerCase(), 'Values should be the same. (' + i + ') ' + input[i][0]);
				}
			},
			
			testLocalNameExceptionTooManyArgs: function() {
				documentEvaluate("local-name(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testLocalNameExceptionWrongArgType: function() {
				documentEvaluate("local-name(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testNamespaceUri: function() {
				var result, input, i, node,
					nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute'),
					nodeAttributes = filterAttributes(nodeWithAttributes.attributes),
					nodeAttributesIndex
				;
				
				for(i = 0; i < nodeAttributes.length; i++)
				{
					if (nodeAttributes[i].nodeName == 'ev:class')
					{
						nodeAttributesIndex = i;
						break;
					}
				}
				
				input = [
					["namespace-uri(/htmlnot)", doc, ""], // empty
					["namespace-uri()", doc, ""], // document
					["namespace-uri()", doc.documentElement, "http://www.w3.org/1999/xhtml"], // element
					["namespace-uri(self::node())", doc.getElementById('testFunctionNodesetElement'), "http://www.w3.org/1999/xhtml"], // element
					["namespace-uri()", doc.getElementById('testFunctionNodesetElement'), "http://www.w3.org/1999/xhtml"], // element
					["namespace-uri(node())", doc.getElementById('testFunctionNodesetElementNested'), "http://www.w3.org/1999/xhtml"], // element nested
					["namespace-uri(self::node())", doc.getElementById('testFunctionNodesetElementNested'), "http://www.w3.org/1999/xhtml"], // element nested
					["namespace-uri()", doc.getElementById('testFunctionNodesetElementPrefix').firstChild, "http://some-namespace.com/nss"], // element
					["namespace-uri()", doc.getElementById('testFunctionNodesetComment').firstChild, ""], // comment
					["namespace-uri()", doc.getElementById('testFunctionNodesetText').firstChild, ""], // text
					["namespace-uri(attribute::node())", nodeWithAttributes, ''], // attribute
					["namespace-uri(attribute::node()["+ (nodeAttributesIndex+1) +"])", nodeWithAttributes, 'http://some-namespace.com/nss'], // attribute
					["namespace-uri(namespace::node())", doc.getElementById('testFunctionNodesetNamespace'), ""], // namespace
					["namespace-uri(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace'), ""] // namespace
				];
				
				// Processing Instruction
				node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
				if (node && node.nodeType == 7)
				{
					input.push(["namespace-uri()", node, '']);
				}
				
				// CDATASection
				node = doc.getElementById('testFunctionNodesetCData').firstChild
				if (node && node.nodeType == 4)
				{
					input.push(["namespace-uri()", node, '']);
				}
				
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][2], result.stringValue, 'Values should be the same. (' + i + ') ' + input[i][0]);
				}
			},
			
			testNamespaceUriExceptionTooManyArgs: function() {
				documentEvaluate("namespace-uri(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testNamespaceUriExceptionWrongArgType: function() {
				documentEvaluate("namespace-uri(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testName: function() {
				var result, input, i, node,
					nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute'),
					nodeAttributes = filterAttributes(nodeWithAttributes.attributes),
					nodeAttributesIndex
				;
				
				for(i = 0; i < nodeAttributes.length; i++)
				{
					if (nodeAttributes[i].nodeName == 'ev:class')
					{
						nodeAttributesIndex = i;
						break;
					}
				}
				
				input = [
					["name(/htmlnot)", doc, ""], // empty
					["name()", doc, ""], // document
					["name()", doc.documentElement, "html"], // element
					["name(self::node())", doc.getElementById('testFunctionNodesetElement'), "div"], // element
					["name()", doc.getElementById('testFunctionNodesetElement'), "div"], // element
					["name(node())", doc.getElementById('testFunctionNodesetElementNested'), "span"], // element nested
					["name(self::node())", doc.getElementById('testFunctionNodesetElementNested'), "div"], // element nested
					["name()", doc.getElementById('testFunctionNodesetElementPrefix').firstChild, "ev:div2"], // element
					["name()", doc.getElementById('testFunctionNodesetComment').firstChild, ""], // comment
					["name()", doc.getElementById('testFunctionNodesetText').firstChild, ""], // text
					["name(attribute::node())", nodeWithAttributes, nodeAttributes[0].nodeName], // attribute
					["name(attribute::node()["+ (nodeAttributesIndex+1) +"])", nodeWithAttributes, 'ev:class'], // attribute
					["name(namespace::node())", doc.getElementById('testFunctionNodesetNamespace'), ""], // namespace
					["name(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace'), "asdf"] // namespace
				];
				
				// Processing Instruction
				node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
				if (node && node.nodeType == 7)
				{
					input.push(["name()", node, 'xml-stylesheet']);
				}
				
				// CDATASection
				node = doc.getElementById('testFunctionNodesetCData').firstChild
				if (node && node.nodeType == 4)
				{
					input.push(["name()", node, '']);
				}
				
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.STRING_TYPE, null);
					Y.Assert.areSame(input[i][2], result.stringValue, 'Values should be the same. (' + i + ') ' + input[i][0]);
				}
			},
			
			testNameExceptionTooManyArgs: function() {
				documentEvaluate("name(1, 2)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testNameExceptionWrongArgType: function() {
				documentEvaluate("name(1)", doc, helpers.xhtmlResolver, win.XPathResult.NUMBER_TYPE, null);
			}
		});
		
		tests.XPathExceptionCase = new Y.Test.Case({
			
			name : "XPathException Tests",
			
			_should: {
				error: {
					testConstructorException: new Error("Unsupported XPathException code: 99")
				}
			},
			
			testConstants : function() {
				Y.Assert.areSame(51, win.XPathException.INVALID_EXPRESSION_ERR);
				Y.Assert.areSame(52, win.XPathException.TYPE_ERR);
			},
			
			testConstructor : function() {
				var message = 'here is the message';
				var ex = new win.XPathException(win.XPathException.INVALID_EXPRESSION_ERR, message);
				
				// check code
				Y.Assert.areSame(win.XPathException.INVALID_EXPRESSION_ERR, ex.code);
				Y.Assert.areSame(51, ex.code);
				
				// check message
				Y.Assert.areSame(message, ex.message);
				
				// check toString
				Y.Assert.isInstanceOf(Function, ex.toString);
				Y.Assert.areSame(
					'XPathException: "' + ex.message + '", code: "' + ex.code + '", name: "INVALID_EXPRESSION_ERR"',
					ex.toString()
				);
			},
			
			testConstructorWithoutMessage : function() {
				var ex = new win.XPathException(win.XPathException.INVALID_EXPRESSION_ERR);
				Y.Assert.areSame("", ex.message);
			},
			
			testConstructorException : function() {
				new win.XPathException(99, 'message goes here');
			}
		});
		
		tests.XPathNSResolverCase = new Y.Test.Case({
			
			name : "XPathNSResolver Tests"
			
			,testLookupNamespaceURIElement : function () {
				var node = doc.getElementById("testXPathNSResolverNode");
				var resolver = documentCreateNSResolver(node);
				
				// check type
				Y.Assert.isInstanceOf(win.XPathNSResolver, resolver);
				Y.Assert.areSame("function", typeof resolver.lookupNamespaceURI);
				
				// check preconfigured namespaces
				Y.Assert.areSame('http://www.w3.org/XML/1998/namespace', resolver.lookupNamespaceURI('xml'));
				Y.Assert.areSame('http://www.w3.org/2000/xmlns/', resolver.lookupNamespaceURI('xmlns'));
				
				// check namespaces on current element
				Y.Assert.areSame('http://www.w3.org/2002/xforms', resolver.lookupNamespaceURI('xforms'));
				Y.Assert.areSame(null, resolver.lookupNamespaceURI('nsnotexists'));
				
				// check default namespace
				var resolver = documentCreateNSResolver(helpers.getNextChildElementNode(node));
				Y.Assert.areSame('http://www.w3.org/TR/REC-html40', resolver.lookupNamespaceURI(''));
			}
			
			,testLookupNamespaceURIDocument : function() {
				var resolver = documentCreateNSResolver(doc);
				
				Y.Assert.isInstanceOf(win.XPathNSResolver, resolver);
				Y.Assert.areSame("function", typeof resolver.lookupNamespaceURI);
				
				Y.Assert.areSame('http://some-namespace.com/nss', resolver.lookupNamespaceURI('ev'));
			}
			
			,testLookupNamespaceURIDocumentElement : function() {
				var node = doc.documentElement;
				var resolver = documentCreateNSResolver(node);
				
				Y.Assert.isInstanceOf(win.XPathNSResolver, resolver);
				Y.Assert.areSame("function", typeof resolver.lookupNamespaceURI);
				
				Y.Assert.areSame('http://some-namespace.com/nss', resolver.lookupNamespaceURI('ev'));
				Y.Assert.areSame('http://www.w3.org/1999/xhtml', resolver.lookupNamespaceURI(''));
				
				// Make sure default xhtml namespace is correct
				node.removeAttribute('xmlns');
				Y.Assert.areSame(null, resolver.lookupNamespaceURI(''));
				
				// Change default root namespace
				helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'some-namespace');
				Y.Assert.areSame('some-namespace', resolver.lookupNamespaceURI(''));
				
				// Revert back to default xhtml namespace
				helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/1999/xhtml');
				Y.Assert.areSame('http://www.w3.org/1999/xhtml', resolver.lookupNamespaceURI(''));
			}
			
			,testLookupNamespaceURIAttribute : function() {
				var attribute,
					node = doc.documentElement,
					i
				;
				
				// Check parent nodes for namespace prefix declarations
				for(i=0; i<node.attributes.length; i++)
				{
					if (node.attributes[i].specified)
					{
						attribute = node.attributes[i];
						break;
					}
				}
				
				Y.Assert.isObject(attribute);
				
				var resolver = documentCreateNSResolver(attribute);
				Y.Assert.areSame('http://some-namespace.com/nss', resolver.lookupNamespaceURI('ev'));
				
				// Check parent nodes for default namespace declaration
				attribute = null;
				node = doc.getElementById("testXPathNSResolverNode");
				for(i=0; i<node.attributes.length; i++)
				{
					if (node.attributes[i].specified)
					{
						attribute = node.attributes[i];
						break;
					}
				}
				
				Y.Assert.isObject(attribute);
				
				var resolver = documentCreateNSResolver(attribute);
				Y.Assert.areSame('http://www.w3.org/2002/xforms', resolver.lookupNamespaceURI('xforms'));
			}
			
			,testLookupNamespaceURIChangeNamespace : function()
			{
				var node = helpers.getNextChildElementNode(doc.getElementById("testXPathNSResolverNode"));
				var resolver = documentCreateNSResolver(node);
				
				Y.Assert.areSame('http://www.w3.org/TR/REC-html40', resolver.lookupNamespaceURI(''));
				
				// Remove default namespace
				node.removeAttribute('xmlns');
				Y.Assert.areSame('http://www.w3.org/1999/xhtml', resolver.lookupNamespaceURI(''));
				
				// Change default namespace to some other namespace
				helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'some-namespace');
				Y.Assert.areSame('some-namespace', resolver.lookupNamespaceURI(''));
				
				// No default namespace
				helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', '');
				Y.Assert.areSame('', resolver.lookupNamespaceURI(''));
				
				// Back to original
				helpers.setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/TR/REC-html40');
				Y.Assert.areSame('http://www.w3.org/TR/REC-html40', resolver.lookupNamespaceURI(''));
			}
			
			,testLookupNamespaceURIHierachical : function() {
				var node = doc.getElementById("testXPathNSResolverNode");
				var resolver = documentCreateNSResolver(node);
				
				// check prefix in parents
				Y.Assert.areSame('http://some-namespace.com/nss', resolver.lookupNamespaceURI('ev'));
				
				// check default prefix in parents
				Y.Assert.areSame('http://www.w3.org/1999/xhtml', resolver.lookupNamespaceURI(''));
				
				var resolver = documentCreateNSResolver(
					helpers.getNextChildElementNode(helpers.getNextChildElementNode(node))
				);
				Y.Assert.areSame('http://www.w3.org/TR/REC-html40', resolver.lookupNamespaceURI(''));
			}
		});
		
		tests.XPathEvaluatorCreateExpressionCase = new Y.Test.Case({
			
			name : "XPathEvaluator.createExpression Tests",
			
			_should: {
				error: {
					testParsingWithoutResolver: true
				}
			},
			
			testParsing : function() {
				var resolver = documentCreateNSResolver(doc.documentElement);
				var expression  = documentCreateExpression('1', resolver);
				
				Y.Assert.isInstanceOf(win.XPathExpression, expression);
			},
			
			testParsingInvalidExpressionException : function() {
				var resolver = documentCreateNSResolver(doc.documentElement);
				
				try {
					var expression = documentCreateExpression('aa&&aa', resolver);
					Y.Assert.fail("XPathException.INVALID_EXPRESSION_ERR should have been thrown.");
				} catch(ex) {
					if (ex.name === "Assert Error") // YUI3 exception
						throw ex;
					
					Y.Assert.areSame(win.XPathException.INVALID_EXPRESSION_ERR, ex.code);
					Y.Assert.areSame(51, ex.code);
				}
			},
			
			testParsingWithoutResolver : function() {
				var expression  = documentCreateExpression('xml:node');
			},
			
			testParsingNamespace : function() {
				var resolver = documentCreateNSResolver(doc.documentElement);
				var expression = documentCreateExpression('node1 | xml:node2 | ev:node2', resolver);
			},
			
			testParsingNamespaceException : function() {
				var resolver = documentCreateNSResolver(doc.documentElement);
				
				try {
					var expression = documentCreateExpression('as:node1 | ev:node2', resolver);
					Y.Assert.fail("DOMException.NAMESPACE_ERR should have been thrown.");
				} catch(ex) {
					if (ex.name === "Assert Error") // YUI3 exception
						throw ex;
					
					Y.Assert.areSame(14 /* DOMException.NAMESPACE_ERR */, ex.code);
				}
			}
		});
		
		tests.NumberOperatorCase = new Y.Test.Case({
			name: 'Number Operator Tests',
			
			_should: {
				error: {
					testMinusSpacing5: true,
					testModSpacing5: true
				},
				ignore: {
				}
			},
			
			testPlus: function() {
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
				
				input = [
					["number('a') + 0"],
					["0 + number('a')"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testMinusSpacing1: function() {
				var result = documentEvaluate("1-1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testMinusSpacing2: function() {
				var result = documentEvaluate("1 - 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testMinusSpacing3: function() {
				var result = documentEvaluate("1 -1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testMinusSpacing4: function() {
				var result = documentEvaluate("1- 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testMinusSpacing5: function() {
				var result = documentEvaluate("asdf- asdf", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.isTypeOf("number", result.numberValue);
				Y.Assert.isNaN(result.numberValue);
			},
			
			testMinusSpacing6: function() {
				var result = documentEvaluate("asdf -asdf", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.isTypeOf("number", result.numberValue);
				Y.Assert.isNaN(result.numberValue);
			},
			
			testMinusSpacing7: function() {
				var result = documentEvaluate("asdf - asdf", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.isTypeOf("number", result.numberValue);
				Y.Assert.isNaN(result.numberValue);
			},
			
			testMinus: function() {
				var result, input, i;
				
				input = [
					["1-1", 0],
					["0 -1", -1],
					["0-0", 0],
					["0- -0", 0],
					["-1-1", -2],
					["-1 --1", 0],
					["1.05-2.05", -0.9999999999999998],
					[".5-.5-.3", -.3],
					["5- 4-1--1--4", 5],
					["'1'-'1'", 0],
					[".55  - 0.56", -0.010000000000000009],
					["1.0-1.0", 0],
					["true()  \n\r\t -true()", 0],
					["false()-1", -1],
					["(1 div 0) - 1", Number.POSITIVE_INFINITY],
					["(-1 div 0) - 1", Number.NEGATIVE_INFINITY]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
				
				input = [
					["number('a') - 0"],
					["0 - number('a')"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testModSpacing1: function() {
				var result = documentEvaluate("1mod1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testModSpacing2: function() {
				var result = documentEvaluate("1 mod1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testModSpacing3: function() {
				var result = documentEvaluate("1mod 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testModSpacing4: function() {
				var result = documentEvaluate("'1'mod'1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testModSpacing5: function() {
				documentEvaluate("'1' mod/html'", doc, null, win.XPathResult.NUMBER_TYPE, null);
			},
			
			testModSpacing6: function() {
				var result = documentEvaluate("'1'mod '1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(0, result.numberValue);
			},
			
			testMod: function() {
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
				
				input = [
					["0 mod 0"],
					["1 mod 0"],
					["(1 div 0) mod 1"],
					["(-1 div 0) mod 1"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testDivSpacing1: function() {
				var result = documentEvaluate("1div1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
			},
			
			testDivSpacing2: function() {
				var result = documentEvaluate("1 div1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
			},
			
			testDivSpacing3: function() {
				var result = documentEvaluate("1div 1", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
			},
			
			testDivSpacing4: function() {
				var result = documentEvaluate("'1'div'1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
			},
			
			testDivSpacing5: function() {
				var result = documentEvaluate("'1' div'1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
			},
			
			testDivSpacing6: function() {
				var result = documentEvaluate("'1'div '1'", doc, null, win.XPathResult.NUMBER_TYPE, null);
				Y.Assert.areSame(1, result.numberValue);
			},
			
			testDiv: function() {
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
				
				input = [
					["0 div 0"],
					["0 div -0"],
					["number('a') div 0"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testMultiply: function() {
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
				
				input = [
					["number('a') * 0"]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.isTypeOf("number", result.numberValue);
					Y.Assert.isNaN(result.numberValue);
				}
			},
			
			testPrecendence: function() {
				var result, input, i;
				
				input = [
					["1+2*3", 7],
					["2*3+1", 7],
					["1-10 mod 3 div 3", 0.6666666666666667],
					["4-3*4+5-1", -4],
					["(4-3)*4+5-1", 8],
					["8 div 2 + 4", 8]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.NUMBER_TYPE, null);
					Y.Assert.areSame(input[i][1], result.numberValue);
				}
			}
		});
		
		tests.AndOrOperatorCase = new Y.Test.Case({
			name: 'And/Or Operator Tests',
			
			_should: {
				error: {
					testAndLetterCase: true,
					testOrLetterCase: true
				},
				ignore: {
				}
			},
			
			testAndSpacing1: function() {
				var result = documentEvaluate("1and1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testAndSpacing2: function() {
				var result = documentEvaluate("1 and1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testAndSpacing3: function() {
				var result = documentEvaluate("1 and\r\n\t1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testAndSpacing4: function() {
				var result = documentEvaluate("1and 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testAndSpacing5: function() {
				var result = documentEvaluate("'1'and'1'", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testAndLetterCase: function() {
				var result = documentEvaluate("1 And 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testAnd: function() {
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][1], result.booleanValue);
				}
			},
			
			testAndLaziness: function() {
				var result, input, i;
				
				input = [
					["false() and $some-made-up-var", false],
					["false() and $some-made-up-var and true()", false],
					["true() and false() and $some-made-up-var", false]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][1], result.booleanValue);
				}
			},
			
			testOrSpacing1: function() {
				var result = documentEvaluate("1or1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testOrSpacing2: function() {
				var result = documentEvaluate("1 or1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testOrSpacing3: function() {
				var result = documentEvaluate("1 or\r\n\t1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testOrSpacing4: function() {
				var result = documentEvaluate("1or 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testOrSpacing5: function() {
				var result = documentEvaluate("'1'or'1'", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testOrLetterCase: function() {
				var result = documentEvaluate("1 OR 1", doc, null, win.XPathResult.BOOLEAN_TYPE, null);
				Y.Assert.areSame(true, result.booleanValue);
			},
			
			testOr: function() {
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][1], result.booleanValue);
				}
			},
			
			testOrLaziness: function() {
				var result, input, i;
				
				input = [
					["true() or $some-made-up-var", true],
					["true() or $some-made-up-var and true()", true],
					["false() or true() or $some-made-up-var", true]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][1], result.booleanValue);
				}
			},
			
			testPrecendence: function() {
				var result, input, i;
				
				input = [
					["true() or true() and false()", true],
					["true() and false() or true()", true],
					["false() and false() or false()", false],
					["0 or 1 and 0", false],
					["0 or 1 and 0+1", true]
				];
				
				for(i=0; i<input.length; i++)
				{
					result = documentEvaluate(input[i][0], doc, null, win.XPathResult.BOOLEAN_TYPE, null);
					Y.Assert.areSame(input[i][1], result.booleanValue);
				}
			}
		});
		
		tests.XPathExpressionEvaluateCase = new Y.Test.Case({
			name: 'XPathExpression.evaluate Tests',
			
			_should: {
				error: {
					testContextNodeParameterExceptionDocumentFragment: true
				},
				ignore: {
				}
			},
			
			testContextNodeParameter: function()
			{
				var result, input, i;
				
				input = [
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
				];
				
				for(i=0; i<input.length; i++)
				{
					Y.Assert.areSame(input[i][2], input[i][1].nodeType);
					result = documentEvaluate(input[i][0], input[i][1], null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
					Y.Assert.areSame(input[i][1], result.singleNodeValue);
				}
			},
			
			testContextNodeParameterNamespace: function()
			{
				var result, i, item;
				
				// get a namespace node
				result = documentEvaluate("namespace::node()", doc.getElementById('testContextNodeParameterNamespace'), null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
				item = result.singleNodeValue;
				Y.Assert.isNotNull(item);
				Y.Assert.areSame(item.nodeType, 13);
				
				// use namespacenode as a context node
				result = documentEvaluate(".", item, null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
				Y.Assert.areSame(item, result.singleNodeValue);
			},
			
			testContextNodeParameterExceptionDocumentFragment: function()
			{
				documentEvaluate(".", doc.createDocumentFragment(), null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
			}
		});
		
		tests.StepAxisCase = new Y.Test.Case({
			name: 'Step Axis Tests',
			
			setUp: function()
			{
				this.getNodeAttribute = function()
				{
					var attribute,
						node = doc.getElementById('testStepAxisNodeAttribute'),
						i
					;
					
					for(i=0; i<node.attributes.length; i++)
					{
						if (node.attributes[i].specified)
						{
							attribute = node.attributes[i];
							break;
						}
					}
					
					Y.Assert.isObject(attribute);
					
					return attribute;
				}
				
				this.getNodeComment = function()
				{
					return doc.getElementById('testStepAxisNodeComment').firstChild;
				}
				
				this.getNodeCData = function()
				{
					return doc.getElementById('testStepAxisNodeCData').firstChild;
				}
				
				this.getNodeProcessingInstruction = function()
				{
					return doc.getElementById('testStepAxisNodeProcessingInstruction').firstChild;
				}
				
				this.getNodeNamespace = function()
				{
					var result;
					
					result = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace'), null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
					return result.singleNodeValue;
				}
				
				this.followingSiblingNodes = function(node) {
					var nodes = [],
						i
					;
					
					while(node = node.nextSibling)
					{
						nodes.push(node);
					}
					
					return nodes;
				}
				
				this.precedingSiblingNodes = function(node) {
					var nodes = [],
						i
					;
					
					while(node = node.previousSibling)
					{
						if (node.nodeType == 10)
							continue;
						nodes.push(node);
					}
					
					nodes.reverse();
					
					return nodes;
				}
				
				this.followingNodes = function(node)
				{
					var nodes = [],
						i,
						nodesAll,
						result,
						node2
					;
					
					nodesAll = helpers.getAllNodes();
					
					for(i=0; i < nodesAll.length; i++)
					{
						node2 = nodesAll[i];
						
						if (node2.nodeType == 10) // document type node
							continue;
							
						result = helpers.comparePosition(node, node2);
						if (4 === result)
						{
							nodes.push(node2);
						}
					}
					
					return nodes;
				}
				
				this.precedingNodes = function(node)
				{
					var nodes = [],
						i,
						nodesAll,
						result,
						node2
					;
					
					nodesAll = helpers.getAllNodes();
					
					for(i=0; i < nodesAll.length; i++)
					{
						node2 = nodesAll[i];
						
						if (node2.nodeType == 10) // document type node
							continue;
						
						result = helpers.comparePosition(node, node2);
						if (2 == result)
						{
							nodes.push(node2);
						}
					}
					
					return nodes;
				}
			},
			
			tearDown: function()
			{
			},
			
			_should: {
				error: {
					testSelfAxisDocumentFragment: true
				},
				ignore: {
					testSelfAxisNamespace: true,
					testChildAxisNamespace: true,
					testDescendantAxisNamespace: true,
					testDescendantOrSelfAxisNamespace: true,
					testParentAxisNamespace: true,
					testAncestorAxisNamespace: true,
					testAncestorOrSelfAxisNamespace: true,
					testFollowingSiblingAxisNamespace: true,
					testPrecedingSiblingAxisNamespace: true,
					testFollowingAxisNamespace: true,
					testPrecedingAxisNamespace: true,
					testAttributeAxisNamespace: true
				}
			},
			
			testSelfAxisDocument: function()
			{
				checkNodeResult("self::node()", doc, [doc]);
			},
			
			testSelfAxisDocumentElement: function()
			{
				checkNodeResult("self::node()", doc.documentElement, [doc.documentElement]);
			},
			
			testSelfAxisElement: function()
			{
				checkNodeResult("self::node()", doc.getElementById('testStepAxisChild'),
					[doc.getElementById('testStepAxisChild')]);
			},
			
			testSelfAxisAttribute: function()
			{
				checkNodeResult("self::node()", this.getNodeAttribute(), [this.getNodeAttribute()]);
			},
			
			testSelfAxisCData: function()
			{
				checkNodeResult("self::node()", this.getNodeCData(), [this.getNodeCData()]);
			},
			
			testSelfAxisComment: function()
			{
				checkNodeResult("self::node()", this.getNodeComment(), [this.getNodeComment()]);
			},
			
			testSelfAxisProcessingInstruction: function()
			{
				checkNodeResult("self::node()", this.getNodeProcessingInstruction(), [this.getNodeProcessingInstruction()]);
			},
			
			testSelfAxisNamespace: function()
			{
				checkNodeResult("self::node()", this.getNodeNamespace(), [this.getNodeNamespace()]);
			},
			
			testSelfAxisDocumentFragment: function()
			{
				var fragment = doc.createDocumentFragment();
				checkNodeResult("self::node()", fragment, [fragment]);
			},
			
			testChildAxisDocument: function()
			{
				var i, expectedResult = [];
				
				for(i=0; i < doc.childNodes.length; i++)
				{
					if (doc.childNodes.item(i).nodeType == 1 ||
					doc.childNodes.item(i).nodeType == 8)
					{
						expectedResult.push(doc.childNodes.item(i));
					}
				}
				
				checkNodeResult("child::node()", doc, expectedResult);
			},
			
			testChildAxisDocumentElement: function()
			{
				checkNodeResult("child::node()", doc.documentElement, doc.documentElement.childNodes);
			},
			
			testChildAxisElement: function()
			{
				checkNodeResult("child::node()", doc.getElementById('testStepAxisChild'),
					doc.getElementById('testStepAxisChild').childNodes);
			},
			
			testChildAxisAttribute: function()
			{
				checkNodeResult("child::node()", this.getNodeAttribute(), []);
			},
			
			testChildAxisCData: function()
			{
				checkNodeResult("child::node()", this.getNodeCData(), []);
			},
			
			testChildAxisComment: function()
			{
				checkNodeResult("child::node()", this.getNodeComment(), []);
			},
			
			testChildAxisProcessingInstruction: function()
			{
				checkNodeResult("child::node()", this.getNodeProcessingInstruction(), []);
			},
			
			testChildAxisNamespace: function()
			{
				checkNodeResult("child::node()", this.getNodeNamespace(), []);
			},
			
			testDescendantAxisElement: function()
			{
				var descendantNodes = function(node) {
					var nodes = [],
						i
					;
					
					for(i = 0; i < node.childNodes.length; i++)
					{
						nodes.push(node.childNodes.item(i));
						nodes.push.apply(nodes, descendantNodes(node.childNodes.item(i)));
					}
					
					return nodes;
				};
				
				checkNodeResult("descendant::node()", doc.getElementById('testStepAxisDescendant'),
					descendantNodes(doc.getElementById('testStepAxisDescendant')));
			},
			
			testDescendantAxisAttribute: function()
			{
				checkNodeResult("descendant::node()", this.getNodeAttribute(), []);
			},
			
			testDescendantAxisCData: function()
			{
				checkNodeResult("descendant::node()", this.getNodeCData(), []);
			},
			
			testDescendantAxisComment: function()
			{
				checkNodeResult("descendant::node()", this.getNodeComment(), []);
			},
			
			testDescendantAxisProcessingInstruction: function()
			{
				checkNodeResult("descendant::node()", this.getNodeProcessingInstruction(), []);
			},
			
			testDescendantAxisNamespace: function()
			{
				checkNodeResult("descendant::node()", this.getNodeNamespace(), []);
			},
			
			testDescendantOrSelfAxisElement: function()
			{
				var descendantNodes = function(node) {
					var nodes = [],
						i
					;
					
					for(i = 0; i < node.childNodes.length; i++)
					{
						nodes.push(node.childNodes.item(i));
						nodes.push.apply(nodes, descendantNodes(node.childNodes.item(i)));
					}
					
					return nodes;
				},
				nodes;
				
				nodes = descendantNodes(doc.getElementById('testStepAxisDescendant'));
				nodes.unshift(doc.getElementById('testStepAxisDescendant'));
				
				checkNodeResult("descendant-or-self::node()", doc.getElementById('testStepAxisDescendant'), nodes);
			},
			
			testDescendantOrSelfAxisAttribute: function()
			{
				checkNodeResult("descendant-or-self::node()", this.getNodeAttribute(), [
					this.getNodeAttribute()
				]);
			},
			
			testDescendantOrSelfAxisCData: function()
			{
				checkNodeResult("descendant-or-self::node()", this.getNodeCData(), [
					this.getNodeCData()
				]);
			},
			
			testDescendantOrSelfAxisComment: function()
			{
				checkNodeResult("descendant-or-self::node()", this.getNodeComment(), [
					this.getNodeComment()
				]);
			},
			
			testDescendantOrSelfAxisProcessingInstruction: function()
			{
				checkNodeResult("descendant-or-self::node()", this.getNodeProcessingInstruction(), [
					this.getNodeProcessingInstruction()
				]);
			},
			
			testDescendantOrSelfAxisNamespace: function()
			{
				checkNodeResult("descendant-or-self::node()", this.getNodeNamespace(), [
					this.getNodeNamespace()
				]);
			},
			
			testParentAxisDocument: function()
			{
				checkNodeResult("parent::node()", doc, []);
			},
			
			testParentAxisDocumentElement: function()
			{
				checkNodeResult("parent::node()", doc.documentElement, [doc]);
			},
			
			testParentAxisElement: function()
			{
				checkNodeResult("parent::node()", doc.getElementById('testStepAxisNodeElement'), [doc.getElementById('StepAxisCase')]);
			},
			
			testParentAxisAttribute: function()
			{
				checkNodeResult("parent::node()", this.getNodeAttribute(), [doc.getElementById('testStepAxisNodeAttribute')]);
			},
			
			testParentAxisCData: function()
			{
				checkNodeResult("parent::node()", this.getNodeCData(), [doc.getElementById('testStepAxisNodeCData')]);
			},
			
			testParentAxisComment: function()
			{
				checkNodeResult("parent::node()", this.getNodeComment(), [doc.getElementById('testStepAxisNodeComment')]);
			},
			
			testParentAxisProcessingInstruction: function()
			{
				checkNodeResult("parent::node()", this.getNodeProcessingInstruction(), [doc.getElementById('testStepAxisNodeProcessingInstruction')]);
			},
			
			testParentAxisNamespace: function()
			{
				checkNodeResult("parent::node()", this.getNodeNamespace(), [doc.getElementById('testStepAxisNodeNamespace')]);
			},
			
			testAncestorAxisDocument: function()
			{
				checkNodeResult("ancestor::node()", doc, []);
			},
			
			testAncestorAxisDocumentElement: function()
			{
				checkNodeResult("ancestor::node()", doc.documentElement, [
					doc
				]);
			},
			
			testAncestorAxisElement: function()
			{
				checkNodeResult("ancestor::node()", doc.getElementById('testStepAxisNodeElement'), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase')
				]);
			},
			
			testAncestorAxisAttribute: function()
			{
				checkNodeResult("ancestor::node()", this.getNodeAttribute(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeAttribute')
				]);
			},
			
			testAncestorAxisCData: function()
			{
				checkNodeResult("ancestor::node()", this.getNodeCData(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeCData')
				]);
			},
			
			testAncestorAxisComment: function()
			{
				checkNodeResult("ancestor::node()", this.getNodeComment(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeComment')
				]);
			},
			
			testAncestorAxisProcessingInstruction: function()
			{
				checkNodeResult("ancestor::node()", this.getNodeProcessingInstruction(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeProcessingInstruction')
				]);
			},
			
			testAncestorAxisNamespace: function()
			{
				checkNodeResult("ancestor::node()", this.getNodeNamespace(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeNamespace')
				]);
			},
			
			testAncestorOrSelfAxisDocument: function()
			{
				checkNodeResult("ancestor-or-self::node()", doc, [
					doc
				]);
			},
			
			testAncestorOrSelfAxisDocumentElement: function()
			{
				checkNodeResult("ancestor-or-self::node()", doc.documentElement, [
					doc,
					doc.documentElement
				]);
			},
			
			testAncestorOrSelfAxisElement: function()
			{
				checkNodeResult("ancestor-or-self::node()", doc.getElementById('testStepAxisNodeElement'), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeElement')
				]);
			},
			
			testAncestorOrSelfAxisAttribute: function()
			{
				checkNodeResult("ancestor-or-self::node()", this.getNodeAttribute(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeAttribute'),
					this.getNodeAttribute()
				]);
			},
			
			testAncestorOrSelfAxisCData: function()
			{
				checkNodeResult("ancestor-or-self::node()", this.getNodeCData(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeCData'),
					this.getNodeCData()
				]);
			},
			
			testAncestorOrSelfAxisComment: function()
			{
				checkNodeResult("ancestor-or-self::node()", this.getNodeComment(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeComment'),
					this.getNodeComment()
				]);
			},
			
			testAncestorOrSelfAxisProcessingInstruction: function()
			{
				checkNodeResult("ancestor-or-self::node()", this.getNodeProcessingInstruction(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeProcessingInstruction'),
					this.getNodeProcessingInstruction()
				]);
			},
			
			testAncestorOrSelfAxisNamespace: function()
			{
				checkNodeResult("ancestor-or-self::node()", this.getNodeNamespace(), [
					doc,
					doc.documentElement,
					doc.body,
					doc.getElementById('StepAxisCase'),
					doc.getElementById('testStepAxisNodeNamespace'),
					this.getNodeNamespace()
				]);
			},
			
			testFollowingSiblingAxisDocument: function()
			{
				checkNodeResult("following-sibling::node()", doc, [
				]);
			},
			
			testFollowingSiblingAxisDocumentElement: function()
			{
				checkNodeResult("following-sibling::node()", doc.documentElement, this.followingSiblingNodes(doc.documentElement));
			},
			
			testFollowingSiblingAxisElement: function()
			{
				checkNodeResult("following-sibling::node()", doc.getElementById('testStepAxisNodeElement'), this.followingSiblingNodes(doc.getElementById('testStepAxisNodeElement')));
			},
			
			testFollowingSiblingAxisAttribute: function()
			{
				checkNodeResult("following-sibling::node()", this.getNodeAttribute(), [
				]);
			},
			
			testFollowingSiblingAxisCData: function()
			{
				checkNodeResult("following-sibling::node()", this.getNodeCData(), this.followingSiblingNodes(this.getNodeCData()));
			},
			
			testFollowingSiblingAxisComment: function()
			{
				checkNodeResult("following-sibling::node()", this.getNodeComment(), this.followingSiblingNodes(this.getNodeComment()));
			},
			
			testFollowingSiblingAxisProcessingInstruction: function()
			{
				checkNodeResult("following-sibling::node()", this.getNodeProcessingInstruction(), this.followingSiblingNodes(this.getNodeProcessingInstruction()));
			},
			
			testFollowingSiblingAxisNamespace: function()
			{
				checkNodeResult("following-sibling::node()", this.getNodeNamespace(), [
				]);
			},
			
			testPrecedingSiblingAxisDocument: function()
			{
				checkNodeResult("preceding-sibling::node()", doc, [
				]);
			},
			
			testPrecedingSiblingAxisDocumentElement: function()
			{
				checkNodeResult("preceding-sibling::node()", doc.documentElement, this.precedingSiblingNodes(doc.documentElement));
			},
			
			testPrecedingSiblingAxisElement: function()
			{
				checkNodeResult("preceding-sibling::node()", doc.getElementById('testStepAxisNodeElement'), this.precedingSiblingNodes(doc.getElementById('testStepAxisNodeElement')));
			},
			
			testPrecedingSiblingAxisAttribute: function()
			{
				checkNodeResult("preceding-sibling::node()", this.getNodeAttribute(), [
				]);
			},
			
			testPrecedingSiblingAxisCData: function()
			{
				checkNodeResult("preceding-sibling::node()", this.getNodeCData(), this.precedingSiblingNodes(this.getNodeCData()));
			},
			
			testPrecedingSiblingAxisComment: function()
			{
				checkNodeResult("preceding-sibling::node()", this.getNodeComment(), this.precedingSiblingNodes(this.getNodeComment()));
			},
			
			testPrecedingSiblingAxisProcessingInstruction: function()
			{
				checkNodeResult("preceding-sibling::node()", this.getNodeProcessingInstruction(), this.precedingSiblingNodes(this.getNodeProcessingInstruction()));
			},
			
			testPrecedingSiblingAxisNamespace: function()
			{
				checkNodeResult("preceding-sibling::node()", this.getNodeNamespace(), [
				]);
			},
			
			testFollowingAxisDocument: function()
			{
				checkNodeResult("following::node()", doc, [
				]);
			},
			
			testFollowingAxisDocumentElement: function()
			{
				checkNodeResult("following::node()", doc.documentElement, this.followingNodes(doc.documentElement));
			},
			
			testFollowingAxisElement: function()
			{
				checkNodeResult("following::node()", doc.getElementById('testStepAxisNodeElement'), this.followingNodes(doc.getElementById('testStepAxisNodeElement')));
			},
			
			testFollowingAxisAttribute: function()
			{
				checkNodeResult("following::node()", this.getNodeAttribute(), this.followingNodes(doc.getElementById('testStepAxisNodeAttribute')));
			},
			
			testFollowingAxisCData: function()
			{
				checkNodeResult("following::node()", this.getNodeCData(), this.followingNodes(this.getNodeCData()));
			},
			
			testFollowingAxisComment: function()
			{
				checkNodeResult("following::node()", this.getNodeComment(), this.followingNodes(this.getNodeComment()));
			},
			
			testFollowingAxisProcessingInstruction: function()
			{
				checkNodeResult("following::node()", this.getNodeProcessingInstruction(), this.followingNodes(this.getNodeProcessingInstruction()));
			},
			
			testFollowingAxisNamespace: function()
			{
				checkNodeResult("following::node()", this.getNodeNamespace(), this.followingNodes(doc.getElementById('testStepAxisNodeNamespace')));
			},
			
			testPrecedingAxisDocument: function()
			{
				checkNodeResult("preceding::node()", doc, [
				]);
			},
			
			testPrecedingAxisDocumentElement: function()
			{
				checkNodeResult("preceding::node()", doc.documentElement, this.precedingNodes(doc.documentElement));
			},
			
			testPrecedingAxisElement: function()
			{
				checkNodeResult("preceding::node()", doc.getElementById('testStepAxisNodeElement'), this.precedingNodes(doc.getElementById('testStepAxisNodeElement')));
			},
			
			testPrecedingAxisAttribute: function()
			{
				checkNodeResult("preceding::node()", this.getNodeAttribute(), this.precedingNodes(doc.getElementById('testStepAxisNodeAttribute')));
			},
			
			testPrecedingAxisCData: function()
			{
				checkNodeResult("preceding::node()", this.getNodeCData(), this.precedingNodes(this.getNodeCData()));
			},
			
			testPrecedingAxisComment: function()
			{
				checkNodeResult("preceding::node()", this.getNodeComment(), this.precedingNodes(this.getNodeComment()));
			},
			
			testPrecedingAxisProcessingInstruction: function()
			{
				checkNodeResult("preceding::node()", this.getNodeProcessingInstruction(), this.precedingNodes(this.getNodeProcessingInstruction()));
			},
			
			testPrecedingAxisNamespace: function()
			{
				checkNodeResult("preceding::node()", this.getNodeNamespace(), this.precedingNodes(doc.getElementById('testStepAxisNodeNamespace')));
			},
			
			testAttributeAxisDocument: function()
			{
				checkNodeResult("attribute::node()", doc, []);
			},
			
			testAttributeAxisAttribute: function()
			{
				checkNodeResult("attribute::node()", this.getNodeAttribute(), []);
			},
			
			testAttributeAxisCData: function()
			{
				checkNodeResult("attribute::node()", this.getNodeCData(), []);
			},
			
			testAttributeAxisComment: function()
			{
				checkNodeResult("attribute::node()", this.getNodeComment(), []);
			},
			
			testAttributeAxisProcessingInstruction: function()
			{
				checkNodeResult("attribute::node()", this.getNodeProcessingInstruction(), []);
			},
			
			testAttributeAxisNamespace: function()
			{
				checkNodeResult("attribute::node()", this.getNodeNamespace(), []);
			},
			
			testAttributeAxis0: function()
			{
				checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttribute0'), filterAttributes(doc.getElementById('testStepAxisNodeAttribute0').attributes));
			},
			
			testAttributeAxis1: function()
			{
				checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttribute1'), filterAttributes(doc.getElementById('testStepAxisNodeAttribute1').attributes));
			},
			
			testAttributeAxis3: function()
			{
				checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttribute3'), filterAttributes(doc.getElementById('testStepAxisNodeAttribute3').attributes));
			},
			
			testAttributeAxisStartXml: function()
			{
				checkNodeResult("attribute::node()", doc.getElementById('testStepAxisNodeAttributeStartXml'), filterAttributes(doc.getElementById('testStepAxisNodeAttributeStartXml').attributes));
			},
			
			testNamespaceAxisDocument: function()
			{
				checkNodeResultNamespace("namespace::node()", doc, []);
			},
			
			testNamespaceAxisAttribute: function()
			{
				checkNodeResultNamespace("namespace::node()", this.getNodeAttribute(), []);
			},
			
			testNamespaceAxisCData: function()
			{
				checkNodeResultNamespace("namespace::node()", this.getNodeCData(), []);
			},
			
			testNamespaceAxisComment: function()
			{
				checkNodeResultNamespace("namespace::node()", this.getNodeComment(), []);
			},
			
			testNamespaceAxisProcessingInstruction: function()
			{
				checkNodeResultNamespace("namespace::node()", this.getNodeProcessingInstruction(), []);
			},
			
			testNamespaceAxisNamespace: function()
			{
				checkNodeResultNamespace("namespace::node()", this.getNodeNamespace(), []);
			},
			
			testNamespaceAxisDocumentElement: function()
			{
				checkNodeResultNamespace("namespace::node()", doc.documentElement, [
					['', 'http://www.w3.org/1999/xhtml'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			testNamespaceAxis0: function()
			{
				checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace0'), [
					['', 'http://www.w3.org/1999/xhtml'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testNamespaceAxis1: function()
			{
				checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), [
					['', 'http://www.w3.org/1999/xhtml'],
					['a', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testNamespaceAxis1default: function()
			{
				checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1defaultContainer').firstChild, [
					['', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testNamespaceAxis1default2: function()
			{
				checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1defaultContainer2').firstChild, [
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testNamespaceAxis3: function()
			{
				var namespaces = []
					contextNode = doc.getElementById('testStepAxisNodeNamespace3')
				;
				
				namespaces.push(['', 'http://www.w3.org/1999/xhtml']);
				parseNamespacesFromAttributes(contextNode.attributes, namespaces);
				namespaces.push(['ev', 'http://some-namespace.com/nss']);
				namespaces.push(['xml', 'http://www.w3.org/XML/1998/namespace']);
				
				checkNodeResultNamespace("namespace::node()", contextNode, namespaces);
			},
			
			testNamespaceAxis3default: function()
			{
				var namespaces = []
					contextNode = doc.getElementById('testStepAxisNodeNamespace3defaultContainer').firstChild
				;
				
				parseNamespacesFromAttributes(contextNode.attributes, namespaces);
				namespaces.push(['ev', 'http://some-namespace.com/nss']);
				namespaces.push(['xml', 'http://www.w3.org/XML/1998/namespace']);
				
				checkNodeResultNamespace("namespace::node()", contextNode, namespaces);
			},
			
			testNamespaceAxisXmlOverride: function()
			{
				checkNodeResultNamespace("namespace::node()", doc.getElementById('testStepAxisNodeNamespaceXmlOverride'), [
					['', 'http://www.w3.org/1999/xhtml'],
					['ev', 'http://some-other-namespace/'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testNamespaceAxisNoNamespaceNodeSharingAmongstElements: function()
			{
				var j, result, result2, item, item2, expectedResult;
				
				expectedResult = [
					['', 'http://www.w3.org/1999/xhtml'],
					['a', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				];
				
				result = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				result2 = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1b'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				
				Y.Assert.areSame(expectedResult.length, result.snapshotLength);
				Y.Assert.areSame(expectedResult.length, result2.snapshotLength);
				
				for (j = 0; j < result.snapshotLength; j++) {
					item = result.snapshotItem(j);
					item2 = result2.snapshotItem(j);
					
					Y.Assert.areSame('#namespace', item.nodeName);
					Y.Assert.areSame('#namespace', item2.nodeName);
					
					Y.Assert.areSame(expectedResult[j][0], item.localName);
					Y.Assert.areSame(expectedResult[j][0], item2.localName);
					
					Y.Assert.areSame(expectedResult[j][1], item.namespaceURI);
					Y.Assert.areSame(expectedResult[j][1], item2.namespaceURI);
					
					Y.Assert.areNotSame(item, item2);
				}
			},
			
			testNamespaceAxisSameNamespaceNodeOnSameElement: function()
			{
				var j, result, result2, item, item2, expectedResult;
				
				expectedResult = [
					['', 'http://www.w3.org/1999/xhtml'],
					['a', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				];
				
				result = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				result2 = documentEvaluate("namespace::node()", doc.getElementById('testStepAxisNodeNamespace1'), null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				
				Y.Assert.areSame(expectedResult.length, result.snapshotLength);
				Y.Assert.areSame(expectedResult.length, result2.snapshotLength);
				
				for (j = 0; j < result.snapshotLength; j++) {
					item = result.snapshotItem(j);
					item2 = result2.snapshotItem(j);
					
					Y.Assert.areSame('#namespace', item.nodeName);
					Y.Assert.areSame(expectedResult[j][0], item.localName);
					Y.Assert.areSame(expectedResult[j][1], item.namespaceURI);
					Y.Assert.areSame(item, item2);
				}
			},
			
			testStepAxisNodeAttrib1Ns1: function()
			{
				var attributes = [],
					i,
					contextNode
				;
				
				contextNode = doc.getElementById('testStepAxisNodeAttrib1Ns1');
				
				for(i=0; i<contextNode.attributes.length; i++)
				{
					if (!contextNode.attributes[i].specified)
					{
						continue;
					}
					if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns')
					{
						attributes.push(contextNode.attributes.item(i));
					}
				}
				
				checkNodeResult("attribute::node()", contextNode, attributes);
				
				checkNodeResultNamespace("namespace::node()", contextNode, [
					['', 'http://www.w3.org/1999/xhtml'],
					['a', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testStepAxisNodeAttrib1Ns1reversed: function()
			{
				var attributes = [],
					i,
					contextNode
				;
				
				contextNode = doc.getElementById('testStepAxisNodeAttrib1Ns1reversed');
				
				for(i=0; i<contextNode.attributes.length; i++)
				{
					if (!contextNode.attributes[i].specified)
					{
						continue;
					}
					if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns')
					{
						attributes.push(contextNode.attributes.item(i));
					}
				}
				
				checkNodeResult("attribute::node()", contextNode, attributes);
				
				checkNodeResultNamespace("namespace::node()", contextNode, [
					['', 'http://www.w3.org/1999/xhtml'],
					['a', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testStepAxisNodeAttrib2Ns1: function()
			{
				var attributes = [],
					i,
					contextNode
				;
				
				contextNode = doc.getElementById('testStepAxisNodeAttrib2Ns1');
				
				for(i=0; i<contextNode.attributes.length; i++)
				{
					if (!contextNode.attributes[i].specified)
					{
						continue;
					}
					if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns')
					{
						attributes.push(contextNode.attributes.item(i));
					}
				}
				
				checkNodeResult("attribute::node()", contextNode, attributes);
				
				checkNodeResultNamespace("namespace::node()", contextNode, [
					['', 'http://www.w3.org/1999/xhtml'],
					['c', 'asdf3'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testStepAxisNodeAttrib2Ns1reversed: function()
			{
				var attributes = [],
					i,
					contextNode
				;
				
				contextNode = doc.getElementById('testStepAxisNodeAttrib2Ns1reversedContainer').firstChild;
				
				for(i=0; i<contextNode.attributes.length; i++)
				{
					if (!contextNode.attributes[i].specified)
					{
						continue;
					}
					if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns')
					{
						attributes.push(contextNode.attributes.item(i));
					}
				}
				
				checkNodeResult("attribute::node()", contextNode, attributes);
				
				checkNodeResultNamespace("namespace::node()", contextNode, [
					['', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			},
			
			testStepAxisNodeAttrib2Ns2: function()
			{
				var attributes = [],
					i,
					contextNode
				;
				
				contextNode = doc.getElementById('testStepAxisNodeAttrib2Ns2Container').firstChild;
				
				for(i=0; i<contextNode.attributes.length; i++)
				{
					if (!contextNode.attributes[i].specified)
					{
						continue;
					}
					if (contextNode.attributes.item(i).nodeName.substring(0, 5) !== 'xmlns')
					{
						attributes.push(contextNode.attributes.item(i));
					}
				}
				
				checkNodeResult("attribute::node()", contextNode, attributes);
				
				checkNodeResultNamespace("namespace::node()", contextNode, [
					['', 'asdf2'],
					['a', 'asdf'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				]);
			}
		});
		
		tests.FunctionNodesetIdCase = new Y.Test.Case({
			
			name : "Nodset Function Id Tests",
			
			setUp: function()
			{
			},
			
			_should: {
				error: {
				},
				ignore: {
				}
			},
			
			testSimple: function() {
				var expectedResults,
					node,
					id
				;
				
				node = doc.getElementById('FunctionNodesetIdCaseSimple');
				Y.Assert.isObject(node);
				
				checkNodeResult("id('FunctionNodesetIdCaseSimple')", doc, [
					node
				]);
			},
			
			testDuplicate: function() {
				var expectedResults,
					node,
					id
				;
				
				node = doc.getElementById('FunctionNodesetIdCaseSimple');
				Y.Assert.isObject(node);
				
				checkNodeResult("id('FunctionNodesetIdCaseSimple FunctionNodesetIdCaseSimple')", doc, [
					node
				]);
			},
			
			testNoId: function() {
				checkNodeResult("id('FunctionNodesetIdCaseSimpleDoesNotExist')", doc, [
				]);
			},
			
			testNoDefaultNamespace: function() {
				var expectedResults,
					node,
					id
				;
				
				node = doc.getElementById('FunctionNodesetIdCaseNoDefaultNamespaceContainer').firstChild;
				Y.Assert.isObject(node);
				
				checkNodeResult("id('FunctionNodesetIdCaseNoDefaultNamespace')", doc, [
				]);
			},
			
			testXhtmlDefaultNamespace: function() {
				var expectedResults,
					node,
					id
				;
				
				node = doc.getElementById('FunctionNodesetIdCaseXhtmlDefaultNamespaceContainer').firstChild;
				Y.Assert.isObject(node);
				
				checkNodeResult("id('FunctionNodesetIdCaseXhtmlDefaultNamespace')", doc, [
					node
				]);
			},
			
			testXhtmlNamespace: function() {
				var expectedResults,
					node,
					id
				;
				
				node = doc.getElementById('FunctionNodesetIdCaseXhtmlNamespaceContainer').firstChild;
				Y.Assert.isObject(node);
				
				checkNodeResult("id('FunctionNodesetIdCaseXhtmlNamespace')", doc, [
					node
				]);
			},
			
			testXhtmlNamespaceParent: function() {
				var expectedResults,
					node,
					id
				;
				
				node = doc.getElementById('FunctionNodesetIdCaseXhtmlNamespaceParentContainer').firstChild;
				Y.Assert.isObject(node);
				
				checkNodeResult("id('FunctionNodesetIdCaseXhtmlNamespaceParent')", doc, [
					node
				]);
			},
			
			testXmlNamespace: function() {
				var expectedResults,
					node,
					id
				;
				
				node = doc.getElementById('FunctionNodesetIdXmlNamespaceContainer').firstChild;
				Y.Assert.isObject(node);
				
				checkNodeResult("id('FunctionNodesetIdXmlNamespace')", doc, [
					node
				]);
			},
			
			testMultiple: function() {
				checkNodeResult("id('FunctionNodesetIdCaseMultiple1 FunctionNodesetIdCaseMultiple2 FunctionNodesetIdCaseMultiple3')", doc, [
					doc.getElementById('FunctionNodesetIdCaseMultiple1'),
					doc.getElementById('FunctionNodesetIdCaseMultiple2'),
					doc.getElementById('FunctionNodesetIdCaseMultiple3')
				]);
			},
			
			testMultiple2: function() {
				checkNodeResult("id('  FunctionNodesetIdCaseMultiple1 sss FunctionNodesetIdCaseMultiple2\r\n\tFunctionNodesetIdCaseMultiple3\t')", doc, [
					doc.getElementById('FunctionNodesetIdCaseMultiple1'),
					doc.getElementById('FunctionNodesetIdCaseMultiple2'),
					doc.getElementById('FunctionNodesetIdCaseMultiple3')
				]);
			},
			
			testNodeset: function() {
				checkNodeResult("id(.)", doc.getElementById('FunctionNodesetIdCaseNodeset'), []);
				
				checkNodeResult("id(child::*)", doc.getElementById('FunctionNodesetIdCaseNodeset'), [
					doc.getElementById('FunctionNodesetIdCaseMultiple1'),
					doc.getElementById('FunctionNodesetIdCaseMultiple2'),
					doc.getElementById('FunctionNodesetIdCaseMultiple3'),
					doc.getElementById('FunctionNodesetIdCaseMultiple4')
				]);
			}
		});
		
		tests.StepNodeTestNodeTypeCase = new Y.Test.Case({
			name: 'Step Node Test - Node Type Tests',
			
			setUp: function()
			{
			},
			
			tearDown: function()
			{
			},
			
			_should: {
				error: {
				},
				ignore: {
				}
			},
			
			testNode: function()
			{
				var node = doc.getElementById('StepNodeTestNodeTypeCase');
				checkNodeResult("child::node()", node, node.childNodes);
			},
			
			testText: function()
			{
				var node = doc.getElementById('StepNodeTestNodeTypeCase')
					,nodes = []
					,i
				;
				
				for(i=0; i < node.childNodes.length; i++)
				{
					switch(node.childNodes[i].nodeType)
					{
						case 3: // text
						case 4: // cdata
							nodes.push(node.childNodes[i]);
							break;
					}
				}
				
				checkNodeResult("child::text()", node, nodes);
			},
			
			testComment: function()
			{
				var node = doc.getElementById('StepNodeTestNodeTypeCase')
					,nodes = []
					,i
				;
				
				for(i=0; i < node.childNodes.length; i++)
				{
					switch(node.childNodes[i].nodeType)
					{
						case 8: // comment
							nodes.push(node.childNodes[i]);
							break;
					}
				}
				
				checkNodeResult("child::comment()", node, nodes);
			},
			
			testProcessingInstructionAny: function()
			{
				var node = doc.getElementById('StepNodeTestNodeTypeCase')
					,nodes = []
					,i
				;
				
				for(i=0; i < node.childNodes.length; i++)
				{
					switch(node.childNodes[i].nodeType)
					{
						case 7: // processing instruction
							nodes.push(node.childNodes[i]);
							break;
					}
				}
				
				checkNodeResult("child::processing-instruction()", node, nodes);
			},
			
			testProcessingInstructionSpecific: function()
			{
				var node = doc.getElementById('StepNodeTestNodeTypeCase')
					,nodes = []
					,i
				;
				
				for(i=0; i < node.childNodes.length; i++)
				{
					switch(node.childNodes[i].nodeType)
					{
						case 7: // processing instruction
							if (node.childNodes[i].nodeName == 'custom-process-instruct')
							{
								nodes.push(node.childNodes[i]);
							}
							break;
					}
				}
				
				checkNodeResult("child::processing-instruction('custom-process-instruct')", node, nodes);
			}
		});
		
		tests.StepNodeTestNameTestCase = new Y.Test.Case({
			name: 'Step Node Test - Name Test Tests',
			
			setUp: function()
			{
				this.filterElementNodes = function(nodes)
				{
					var elementNodes = [],
						i
					;
					
					for(i=0; i < nodes.length; i++)
					{
						if (nodes[i].nodeType == 1)
						{
							elementNodes.push(nodes[i]);
						}
					}
					
					return elementNodes;
				}
			},
			
			tearDown: function()
			{
			},
			
			_should: {
				error: {
				},
				ignore: {
				}
			},
			
			testAnyAnyAttribute: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestAttribute')
				;
				checkNodeResult("attribute::*", node, filterAttributes(node.attributes));
			},
			
			testAnyAnyNamespace: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestNamespace'),
					namespaces = []
				;
				
				namespaces.push(['', 'http://www.w3.org/1999/xhtml']);
				parseNamespacesFromAttributes(node.attributes, namespaces);
				namespaces.push(['ev', 'http://some-namespace.com/nss']);
				namespaces.push(['xml', 'http://www.w3.org/XML/1998/namespace']);
				
				checkNodeResultNamespace("namespace::*", node, namespaces);
			},
			
			testAnyAnyChild: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestChild')
				;
				checkNodeResult("child::*", node, this.filterElementNodes(node.childNodes));
			},
			
			testAnyAnyAncestorOrSelfAttribute: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
					attributes = filterAttributes(node.attributes)
				;
				
				checkNodeResult("ancestor-or-self::*", attributes[0], [
					doc.documentElement,
					doc.body,
					doc.getElementById('StepNodeTestCaseNameTest'),
					doc.getElementById('StepNodeTestCaseNameTestAttribute')
				]);
			},
			
			testNamespaceAnyAttribute: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
					attributes = filterAttributes(node.attributes),
					i,
					name
				;
				
				for(i=attributes.length-1; i>=0;i--)
				{
					name = attributes[i].nodeName.split(':')
	
					if (name[0] != 'ev')
					{
						attributes.splice(i, 1);
					}
				}
				
				Y.Assert.areSame(2, attributes.length);
				
				checkNodeResult("attribute::ev:*", node, attributes, helpers.xhtmlResolver);
			},
			
			testNamespaceAnyNamespace: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestNamespace')
				;
				
				checkNodeResultNamespace("namespace::ns2:*", node, [], helpers.xhtmlResolver);
			},
			
			testNamespaceAnyChild: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestChild'),
					nodesFinal = []
				;
				
				nodesFinal = [
					node.childNodes[0],
					node.childNodes[1],
					node.childNodes[2]
				];
				
				checkNodeResult("child::ns2:*", node, nodesFinal, helpers.xhtmlResolver);
			},
			
			testNamespaceNameAttribute: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
					attributes = filterAttributes(node.attributes),
					i,
					name
				;
				
				for(i=attributes.length-1; i>=0;i--)
				{
					name = attributes[i].nodeName.split(':')
	
					if (name[0] != 'ev' || name[1] != 'attrib2')
					{
						attributes.splice(i, 1);
					}
				}
				
				Y.Assert.areSame(1, attributes.length);
				
				checkNodeResult("attribute::ev:attrib2", node, attributes, helpers.xhtmlResolver);
			},
			
			testNamespaceNameNamespace: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestNamespace')
				;
				
				checkNodeResultNamespace("namespace::ns2:ns2", node, [], helpers.xhtmlResolver);
			},
			
			testNamespaceNameChild: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestChild'),
					nodesFinal = []
				;
				
				nodesFinal = [
					node.childNodes[0],
					node.childNodes[1]
				];
				
				checkNodeResult("child::ns2:div", node, nodesFinal, helpers.xhtmlResolver);
			},
			
			testNameAttribute: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
					attributes = filterAttributes(node.attributes),
					i,
					name
				;
				
				for(i=attributes.length-1; i>=0;i--)
				{
					name = attributes[i].nodeName.split(':')
	
					if (name[0] != 'attrib3')
					{
						attributes.splice(i, 1);
					}
				}
				
				Y.Assert.areSame(1, attributes.length);
				
				checkNodeResult("attribute::attrib3", node, attributes, helpers.xhtmlResolver);
			},
			
			testNameNamespace: function()
			{
				var node = doc.getElementById('StepNodeTestCaseNameTestNamespace')
				;
				
				
				checkNodeResultNamespace("namespace::ns2", node, [[
					'ns2',
					'http://asdf/'
				]], helpers.xhtmlResolver);
			},
			
			testNameChild: function()
			{
				checkNodeResult("child::html", doc, [], helpers.xhtmlResolver);
				checkNodeResult("child::xhtml:html", doc, [doc.documentElement], helpers.xhtmlResolver);
			},
			
			testAncestorNodeName: function()
			{
				checkNodeResult("ancestor::xhtml:div", doc.getElementById('StepNodeTestCaseNameTest3'), [
					doc.getElementById('StepNodeTestCaseNameTest'),
					doc.getElementById('StepNodeTestCaseNameTest1'),
					doc.getElementById('StepNodeTestCaseNameTest2')
				], helpers.xhtmlResolver);
			},
			
			testAncestorNodeNameNoDefaultNamespace: function()
			{
				checkNodeResult("ancestor::div", doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild.firstChild.firstChild, [
					doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild,
					doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild.firstChild
				], helpers.xhtmlResolver);
			}
		});
		
		tests.LocationPathCase = new Y.Test.Case({
			name: 'Location Path Tests',
			
			setUp: function()
			{
				this.oneNamespaceNode = function(node)
				{
					var result, item;
					
					result = documentEvaluate("namespace::node()", node, null, win.XPathResult.ANY_UNORDERED_NODE_TYPE, null);
					item = result.singleNodeValue;
					Y.Assert.isNotNull(item);
					Y.Assert.areSame(item.nodeType, 13);
					
					return item;
				}
			},
			
			tearDown: function()
			{
			},
			
			_should: {
				error: {
				},
				ignore: {
					testNodeAttribute: true,
					testNodeNamespace: true
				}
			},
			
			testRoot: function()
			{
				var input = [
						[doc, [doc]], // Document
						[doc.documentElement, [doc]], // Element
						[doc.getElementById('LocationPathCase'), [doc]], // Element
						[doc.getElementById('LocationPathCaseText').firstChild, [doc]], // Text
						[doc.getElementById('LocationPathCaseComment').firstChild, [doc]], // Comment
						[filterAttributes(doc.getElementById('LocationPathCaseAttribute').attributes)[0], [doc]] // Attribute
					],
					i,
					node
				;
				
				// ProcessingInstruction
				node = doc.getElementById('LocationPathCaseProcessingInstruction').firstChild;
				if (node && node.nodeType == 7)
				{
					input.push([node, [doc]]);
				}
				
				// CDATASection
				node = doc.getElementById('LocationPathCaseCData').firstChild
				if (node && node.nodeType == 4)
				{
					input.push([node, [doc]]);
				}
				
				for(i=0; i < input.length; i++)
				{
					checkNodeResult("/", input[i][0], input[i][1]);
				}
			},
			
			testRootNamespace: function()
			{
				var input = [this.oneNamespaceNode(doc.getElementById('LocationPathCaseNamespace')), [doc]] // XPathNamespace
				;
				
				checkNodeResult("/", input[0], input[1]);
			},
			
			testRootNode: function()
			{
				checkNodeResult("/html", doc, [], helpers.xhtmlResolver);
				checkNodeResult("/xhtml:html", doc, [doc.documentElement], helpers.xhtmlResolver);
				checkNodeResult("/xhtml:html", doc.getElementById('LocationPathCase'), [doc.documentElement], helpers.xhtmlResolver);
				checkNodeResult("/htmlnot", doc.getElementById('LocationPathCase'), [], helpers.xhtmlResolver);
			},
			
			testRootNodeNode: function()
			{
				checkNodeResult("/xhtml:html/xhtml:body", doc.getElementById('LocationPathCase'), [doc.body], helpers.xhtmlResolver);
			},
			
			testNodeNode: function()
			{
				checkNodeResult("html", doc, [], helpers.xhtmlResolver);
				checkNodeResult("xhtml:html", doc, [doc.documentElement], helpers.xhtmlResolver);
				checkNodeResult("xhtml:html/xhtml:body", doc, [doc.body], helpers.xhtmlResolver);
			},
			
			testNodeAttribute: function()
			{
				var node = doc.getElementById('LocationPathCaseAttributeParent')
				;
				
				checkNodeResult("child::*/attribute::*", node, [
					filterAttributes(node.childNodes[0].attributes)[0],
					filterAttributes(node.childNodes[1].attributes)[0],
					filterAttributes(node.childNodes[1].attributes)[1],
					filterAttributes(node.childNodes[2].attributes)[0],
					filterAttributes(node.childNodes[3].attributes)[0]
				], helpers.xhtmlResolver);
			},
			
			testNodeNamespace: function()
			{
				var node = doc.getElementById('LocationPathCaseNamespaceParent')
				;
				
				checkNodeResultNamespace("child::* /namespace::*", node, [
					['', 'http://asdss/'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace'],
					['', 'http://www.w3.org/1999/xhtml'],
					['ab', 'hello/world2'],
					['a2', 'hello/world'],
					['aa', 'http://saa/'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace'],
					['', 'http://www.w3.org/1999/xhtml'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace'],
					['', 'http://www.w3.org/1999/xhtml'],
					['aa', 'http://saa/'],
					['ev', 'http://some-namespace.com/nss'],
					['xml', 'http://www.w3.org/XML/1998/namespace']
				], helpers.xhtmlResolver);
			},
			
			testDuplicates: function()
			{
				checkNodeResult("ancestor-or-self::* /ancestor-or-self::*", doc.getElementById('LocationPathCaseDuplicates'), [
					doc.documentElement,
					doc.body,
					doc.getElementById('LocationPathCase'),
					doc.getElementById('LocationPathCaseDuplicates')
				], helpers.xhtmlResolver);
			}
		});
		
		
		tests.ComparisonOperatorCase = new Y.Test.Case({
			name: 'Comparison Operator Tests',
			
			_should: {
				error: {
					testAndLetterCase: true,
					testOrLetterCase: true
				},
				ignore: {
				}
			},
			
			testEqualsAndNotEquals: function() {
				var result, input, i, expr, j, k,
					ops = ['=', '!=']
				;
				
				input = [
					[["1", "1"], [true, false], doc],
					[["1", "0"], [false, true], doc],
					[["1", "'1'"], [true, false], doc],
					[["1", "'0'"], [false, true], doc],
					[["1", "true()"], [true, false], doc],
					[["1", "false()"], [false, true], doc],
					[["0", "false()"], [true, false], doc],
					[["-10", "*"], [false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["4", "*"], [true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["4.3", "*"], [false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["0", "*"], [false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					
					[["true()", "true()"], [true, false], doc],
					[["false()", "false()"], [true, false], doc],
					[["true()", "false()"], [false, true], doc],
					[["true()", "'1'"], [true, false], doc],
					[["true()", "''"], [false, true], doc],
					[["false()", "'0'"], [false, true], doc],
					[["false()", "''"], [true, false], doc],
					[["true()", "*"], [true, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["false()", "*"], [false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["true()", "*"], [false, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					[["false()", "*"], [true, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					
					[["'1a'", "'1a'"], [true, false], doc],
					[["'1'", "'0'"], [false, true], doc],
					[["''", "''"], [true, false], doc],
					[["''", "'0'"], [false, true], doc],
					[["'aaa'", "*"], [true, true], doc.getElementById('ComparisonOperatorCaseNodesetStrings')],
					[["'bb'", "*"], [false, true], doc.getElementById('ComparisonOperatorCaseNodesetStrings')],
					[["''", "*"], [false, true], doc.getElementById('ComparisonOperatorCaseNodesetStrings')],
					[["''", "*"], [false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					
					[["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodesetEmpty')/*"], [false, false], doc],
					[["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset4to8')/*"], [true, true], doc],
					[["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset6to10')/*"], [false, true], doc]
				];
				
				for(k=0; k < ops.length; k++) // different operators
				{
					for(j=0; j < 2; j++) // switch parameter order
					{
						for(i=0; i<input.length; i++) // all cases
						{
							expr = input[i][0][j % 2] + " " + ops[k] + " " + input[i][0][(j+1) % 2];
							result = documentEvaluate(expr, input[i][2], null, win.XPathResult.BOOLEAN_TYPE, null);
							Y.Assert.areSame(input[i][1][k], result.booleanValue, 'Values should be the same. (xpath: "' + expr + '")');
						}
					}
				}
			},
			
			testLessGreaterEquals: function() {
				var result, input, i, expr, k,
					ops = ['<', '<=', '>', '>=']
				;
				
				input = [
					[["1", "2"], [true, true, false, false], doc],
					[["1", "1"], [false, true, false, true], doc],
					[["1", "0"], [false, false, true, true], doc],
					[["1", "'2'"], [true, true, false, false], doc],
					[["1", "'1'"], [false, true, false, true], doc],
					[["1", "'0'"], [false, false, true, true], doc],
					[["2", "true()"], [false, false, true, true], doc],
					[["1", "true()"], [false, true, false, true], doc],
					[["1", "false()"], [false, false, true, true], doc],
					[["0", "false()"], [false, true, false, true], doc],
					[["0", "true()"], [true, true, false, false], doc],
					[["-10", "*"], [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["10", "*"], [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["5", "*"], [false, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["2", "*"], [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["0", "*"], [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					
					[["true()", "2"], [true, true, false, false], doc],
					[["true()", "1"], [false, true, false, true], doc],
					[["false()", "1"], [true, true, false, false], doc],
					[["false()", "0"], [false, true, false, true], doc],
					[["true()", "0"], [false, false, true, true], doc],
					[["true()", "true()"], [false, true, false, true], doc],
					[["true()", "false()"], [false, false, true, true], doc],
					[["false()", "false()"], [false, true, false, true], doc],
					[["false()", "true()"], [true, true, false, false], doc],
					[["true()", "'1'"], [false, true, false, true], doc],
					[["true()", "''"], [false, false, false, false], doc],
					[["false()", "'0'"], [false, true, false, true], doc],
					[["false()", "''"], [false, false, false, false], doc],
					[["true()", "*"], [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["true()", "*"], [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					[["false()", "*"], [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["false()", "*"], [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					
					[["'2'", "1"], [false, false, true, true], doc],
					[["'1'", "1"], [false, true, false, true], doc],
					[["'0'", "1"], [true, true, false, false], doc],
					[["'1'", "true()"], [false, true, false, true], doc],
					[["''", "true()"], [false, false, false, false], doc],
					[["'0'", "false()"], [false, true, false, true], doc],
					[["''", "false()"], [false, false, false, false], doc],
					[["'1a'", "'1a'"], [false, false, false, false], doc],
					[["'1'", "'0'"], [false, false, true, true], doc],
					[["''", "''"], [false, false, false, false], doc],
					[["''", "'0'"], [false, false, false, false], doc],
					[["'4'", "*"], [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["'aaa'", "*"], [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetStrings')],
					[["''", "*"], [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					
					[["*", "-10"], [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["*", "10"], [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["*", "5"], [true, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["*", "2"], [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["*", "0"], [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					[["*", "true()"], [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["*", "true()"], [true, true, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					[["*", "false()"], [false, false, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["*", "false()"], [false, true, false, true], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					[["*", "'4'"], [true, true, true, true], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5')],
					[["*", "'aaa'"], [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetStrings')],
					[["*", "''"], [false, false, false, false], doc.getElementById('ComparisonOperatorCaseNodesetEmpty')],
					[["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodesetEmpty')/*"], [false, false, false, false], doc],
					[["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset4to8')/*"], [true, true, true, true], doc],
					[["id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset6to10')/*"], [true, true, false, false], doc]
				];
				
				for(k=0; k < ops.length; k++) // different operators
				{
					for(i=0; i<input.length; i++) // all cases
					{
						expr = input[i][0][0] + " " + ops[k] + " " + input[i][0][1];
						result = documentEvaluate(expr, input[i][2], null, win.XPathResult.BOOLEAN_TYPE, null);
						Y.Assert.areSame(input[i][1][k], result.booleanValue, 'Values should be the same. (xpath: "' + expr + '")');
					}
				}
			}
		});
		
		tests.UnionOperatorTestCase = new Y.Test.Case({
			name: 'Union Operator Tests',
			
			setUp: function()
			{
			},
			
			tearDown: function()
			{
			},
			
			_should: {
				error: {
				},
				ignore: {
				}
			},
			
			testElementNode: function()
			{
				checkNodeResult("id('eee40') | id('eee20') | id('eee25') | id('eee10') | id('eee30') | id('eee50')", doc, [
					doc.getElementById('eee10'),
					doc.getElementById('eee20'),
					doc.getElementById('eee25'),
					doc.getElementById('eee30'),
					doc.getElementById('eee40'),
					doc.getElementById('eee50')
				]);
			},
			
			testAttributeElementContains: function()
			{
				checkNodeResult("id('eee40')/attribute::*[1] | id('eee30')", doc, [
					doc.getElementById('eee30'),
					filterAttributes(doc.getElementById('eee40').attributes)[0]
				]);
			},
			
			testAttributeElementSame: function()
			{
				checkNodeResult("id('eee40')/attribute::*[1] | id('eee40')", doc, [
					doc.getElementById('eee40'),
					filterAttributes(doc.getElementById('eee40').attributes)[0]
				]);
			},
			
			testAttributeElementDifferentTrees: function()
			{
				checkNodeResult("id('eee40')/attribute::*[1] | id('eee20')", doc, [
					doc.getElementById('eee20'),
					filterAttributes(doc.getElementById('eee40').attributes)[0]
				]);
			},
			
			testAttributeElementUnderAttribute: function()
			{
				checkNodeResult("id('eee40') | id('eee30')/attribute::*[1]", doc, [
					filterAttributes(doc.getElementById('eee30').attributes)[0],
					doc.getElementById('eee40')
				]);
			},
			
			testAttributeElementBothUnderElement: function()
			{
				checkNodeResult("id('eee40') | id('eee35')/attribute::*[1]", doc, [
					filterAttributes(doc.getElementById('eee35').attributes)[0],
					doc.getElementById('eee40')
				]);
			},
			
			testAttributeAttributeDifferentElements: function()
			{
				checkNodeResult("id('eee35')/attribute::*[1] | id('eee40')/attribute::*[1]", doc, [
					filterAttributes(doc.getElementById('eee35').attributes)[0],
					filterAttributes(doc.getElementById('eee40').attributes)[0]
				]);
			},
			
			testAttributeAttributeContains: function()
			{
				checkNodeResult("id('eee30')/attribute::*[1] | id('eee40')/attribute::*[1]", doc, [
					filterAttributes(doc.getElementById('eee30').attributes)[0],
					filterAttributes(doc.getElementById('eee40').attributes)[0]
				]);
			},
			
			testAttributeAttributeContainsReverse: function()
			{
				checkNodeResult("id('eee40')/attribute::*[1] | id('eee30')/attribute::*[1]", doc, [
					filterAttributes(doc.getElementById('eee30').attributes)[0],
					filterAttributes(doc.getElementById('eee40').attributes)[0]
				]);
			},
			
			testAttributeAttributeSameElement: function()
			{
				checkNodeResult("id('eee40')/attribute::*[2] | id('eee40')/attribute::*[1]", doc, [
					filterAttributes(doc.getElementById('eee40').attributes)[0],
					filterAttributes(doc.getElementById('eee40').attributes)[1]
				]);
			},
			
			testNamespaceAttributeSameElement: function()
			{
				var result = documentEvaluate("id('nss25')/namespace::*", doc, null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				
				checkNodeResult("id('nss25')/namespace::* | id('nss25')/attribute::*", doc,
					snapshotToArray(result).concat(
						filterAttributes(doc.getElementById('nss25').attributes)
					)
				);
			},
			
			testNamespaceNamespaceSameElement: function()
			{
				var result = documentEvaluate("id('nss40')/namespace::*", doc, null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				
				checkNodeResult("id('nss40')/namespace::* | id('nss40')/namespace::*", doc,
					snapshotToArray(result)
				);
			},
			
			testNamespaceAttributeElement: function()
			{
				var result = documentEvaluate("id('nss40')/namespace::*", doc, null, win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				
				checkNodeResult("id('nss40')/namespace::* | id('nss25')/attribute::* | id('nss25')", doc, [
					doc.getElementById('nss25')].concat(
						filterAttributes(doc.getElementById('nss25').attributes)
					).concat(
						snapshotToArray(result)
					)
				);
			}
		});
		
		var suite = new Y.Test.Suite("DOM XPath Suite");
		//suite.add(tests.XPathExceptionCase);
		suite.add(tests.FunctionNodesetIdCase);
		suite.add(tests.StepNodeTestNameTestCase);
		suite.add(tests.XPathNSResolverCase);
		suite.add(tests.XPathEvaluatorCreateExpressionCase);
		suite.add(tests.FunctionBooleanCase);
		suite.add(tests.FunctionNumberCase);
		suite.add(tests.FunctionStringCase);
		suite.add(tests.FunctionNodesetCase);
		suite.add(tests.NumberOperatorCase);
		suite.add(tests.AndOrOperatorCase);
		suite.add(tests.XPathExpressionEvaluateCase);
		suite.add(tests.StepAxisCase);
		suite.add(tests.StepNodeTestNodeTypeCase);
		suite.add(tests.LocationPathCase);
		suite.add(tests.ComparisonOperatorCase);
		suite.add(tests.UnionOperatorTestCase);
		
		return suite;
	}
}, '0.0.1', {
	requires: ["node", "test"]
});
